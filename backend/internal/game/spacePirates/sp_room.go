package spacePirates

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/game/envphysics"
	SpacePirates "space-tactics-server/internal/generated/SpacePirates"
	"space-tactics-server/internal/models"

	"github.com/gorilla/websocket"
)

const (
	spGameMode          = "space_pirates"
	defaultTableID      = "sp-table-1"
	payoutEventTTLTicks = 12 // ~200ms at 60Hz; clients deduplicate by event_id
	dbWriteBufferSize   = 1024
	clientSendQueueSize = 1
)

var spUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// --- THREAD-SAFE ROOM MANAGER ---

var (
	roomsMu     sync.Mutex
	activeRooms = make(map[string]*SpacePiratesRoom)
)

// GetOrCreateRoom returns the live SpacePiratesRoom for tableID, spawning and starting it on first access.
func GetOrCreateRoom(tableID string) *SpacePiratesRoom {
	if tableID == "" {
		tableID = defaultTableID
	}

	roomsMu.Lock()
	defer roomsMu.Unlock()

	if room, ok := activeRooms[tableID]; ok {
		return room
	}

	room := NewSpacePiratesRoom(tableID)
	go room.Run()
	activeRooms[tableID] = room
	log.Printf("🏴‍☠️ Spawned Space Pirates room for table %q", tableID)
	return room
}

// HandleTableWS upgrades incoming WebSocket connections for /ws/casino/space-pirates?tableId=<id>.
func HandleTableWS(w http.ResponseWriter, req *http.Request) {
	tableID := req.URL.Query().Get("tableId")
	room := GetOrCreateRoom(tableID)
	room.HandleWS(w, req)
}

// --- INTERNAL TYPES ---

type spClient struct {
	conn   *websocket.Conn
	mu     sync.Mutex
	send   chan []byte
	closed bool
}

// enqueue delivers payload using head-drop (latest-frame-wins) semantics so slow LAN links
// never build up stale frames and concurrent closeSend() can never panic on a closed channel.
func (c *spClient) enqueue(payload []byte) {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	select {
	case c.send <- payload:
	default:
		select {
		case <-c.send:
		default:
		}
		select {
		case c.send <- payload:
		default:
		}
	}
	c.mu.Unlock()
}

func (c *spClient) closeSend() {
	c.mu.Lock()
	if !c.closed {
		c.closed = true
		close(c.send)
	}
	c.mu.Unlock()
}

func (c *spClient) writePump() {
	defer c.conn.Close()
	for payload := range c.send {
		_ = c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := c.conn.WriteMessage(websocket.BinaryMessage, payload); err != nil {
			return
		}
	}
}

type dbOpKind uint8

const (
	dbOpAdjustWallet dbOpKind = iota + 1
	dbOpCloseSession
)

type dbWriteOp struct {
	kind               dbOpKind
	seatIndex          int8
	sessionID          int64
	playerID           int
	deltaCents         int64
	entryType          string
	note               string
	endingBalanceCents int64
	totalWageredCents  int64
	totalWonCents      int64
	unitsDeployed      int
	unitsForfeited     int
}

type timedPayoutEvent struct {
	event    PayoutEvent
	ttlTicks int
}

// SpacePiratesRoom is the authoritative 60Hz game server for one Space Pirates casino table.
type SpacePiratesRoom struct {
	tableID string

	mu             sync.Mutex
	tick           uint64
	world          *WorldState
	codec          *Codec
	clients        map[*spClient]bool
	seats          [MaxSeats]Seat
	seatReserved   [MaxSeats]bool
	seatPendingOps [MaxSeats]int

	units        map[string]*Unit
	projectiles  []*Projectile
	payoutBuffer []timedPayoutEvent

	nextUnitSeq       uint64
	nextProjSeq       uint64
	nextPayoutEventID uint64
	harvSpawnCooldown int

	bossMeterCurrent         uint32
	bossActive               bool
	bossID                   string
	bossEscapeTicksRemaining uint32

	dbWriteCh chan dbWriteOp
}

// NewSpacePiratesRoom constructs a SpacePiratesRoom hydrated from PostgreSQL's live SPCache.
func NewSpacePiratesRoom(tableID string) *SpacePiratesRoom {
	if tableID == "" {
		tableID = defaultTableID
	}

	rs := currentRuleset()
	arenaW, arenaH := rs.ArenaWidth, rs.ArenaHeight
	if arenaW <= 0 {
		arenaW = 2400.0
	}
	if arenaH <= 0 {
		arenaH = 1600.0
	}

	r := &SpacePiratesRoom{
		tableID:      tableID,
		world:        NewWorldState(arenaW, arenaH),
		codec:        NewCodec(),
		clients:      make(map[*spClient]bool),
		units:        make(map[string]*Unit, 64),
		projectiles:  make([]*Projectile, 0, 128),
		payoutBuffer: make([]timedPayoutEvent, 0, 16),
		dbWriteCh:    make(chan dbWriteOp, dbWriteBufferSize),
	}
	for i := 0; i < MaxSeats; i++ {
		r.seats[i].SeatIndex = int8(i)
	}
	return r
}

func currentRuleset() models.SPRuleset {
	db.SPCache.Mu.RLock()
	rs := db.SPCache.Ruleset
	db.SPCache.Mu.RUnlock()
	if rs.ArenaWidth <= 0 {
		rs.ArenaWidth = 2400.0
	}
	if rs.ArenaHeight <= 0 {
		rs.ArenaHeight = 1600.0
	}
	if rs.BossExpendedThreshold <= 0 {
		rs.BossExpendedThreshold = 40
	}
	if rs.BossEscapeSeconds <= 0 {
		rs.BossEscapeSeconds = 50
	}
	if rs.MaxActiveHarvesters <= 0 {
		rs.MaxActiveHarvesters = 8
	}
	if len(rs.AllowedMultipliers) == 0 {
		rs.AllowedMultipliers = []int{1, 2, 5, 10, 25}
	}
	return rs
}

// Run starts the dedicated async PostgreSQL writer goroutine and the 60Hz simulation ticker.
func (r *SpacePiratesRoom) Run() {
	go r.dbWriterLoop()

	ticker := time.NewTicker(time.Second / TickRateHz)
	defer ticker.Stop()

	for range ticker.C {
		r.stepTick()
	}
}

// ============================================================================
// 1. ASYNC POSTGRESQL WRITER (NEVER BLOCKS 60Hz LOOP)
// ============================================================================

func (r *SpacePiratesRoom) enqueueDBOp(op dbWriteOp) {
	select {
	case r.dbWriteCh <- op:
	default:
		// Channel saturated — queue asynchronously back into dbWriteCh so single-writer
		// FIFO ordering in dbWriterLoop is preserved without blocking the 60Hz tick.
		log.Printf("⚠️ SpacePirates[%s] dbWriteCh full; queuing async handoff for op=%d", r.tableID, op.kind)
		go func(pending dbWriteOp) {
			r.dbWriteCh <- pending
		}(op)
	}
}

func (r *SpacePiratesRoom) dbWriterLoop() {
	syncTicker := time.NewTicker(3 * time.Second)
	defer syncTicker.Stop()

	for {
		select {
		case op := <-r.dbWriteCh:
			r.executeDBOp(op)
		case <-syncTicker.C:
			r.refreshIdleSeatBalances()
		}
	}
}

func (r *SpacePiratesRoom) executeDBOp(op dbWriteOp) {
	switch op.kind {
	case dbOpAdjustWallet:
		mode := spGameMode
		sessID := op.sessionID
		var sessPtr *int64
		if sessID > 0 {
			sessPtr = &sessID
		}
		note := op.note
		newBal, err := db.AdjustWalletAtomic(op.playerID, op.deltaCents, op.entryType, &mode, sessPtr, nil, &note)
		if err != nil {
			log.Printf("⚠️ SpacePirates[%s] AdjustWalletAtomic failed (player=%d type=%s delta=%d): %v",
				r.tableID, op.playerID, op.entryType, op.deltaCents, err)
		}

		if op.seatIndex >= 0 && int(op.seatIndex) < MaxSeats {
			r.mu.Lock()
			seat := &r.seats[op.seatIndex]
			if seat.Occupied && seat.SessionID == op.sessionID {
				if r.seatPendingOps[op.seatIndex] > 0 {
					r.seatPendingOps[op.seatIndex]--
				}
				if err == nil && r.seatPendingOps[op.seatIndex] == 0 {
					seat.BalanceCents = newBal
				}
			}
			r.mu.Unlock()
		}

	case dbOpCloseSession:
		if err := db.CloseTableSession(
			op.sessionID,
			op.endingBalanceCents,
			op.totalWageredCents,
			op.totalWonCents,
			op.unitsDeployed,
			op.unitsForfeited,
		); err != nil {
			log.Printf("⚠️ SpacePirates[%s] CloseTableSession(%d) failed: %v", r.tableID, op.sessionID, err)
		}
	}
}

// refreshIdleSeatBalances syncs seated players' balances from PostgreSQL when no DB ops are in flight,
// so live house_admin currency mints/revokes appear at the table within ~3 seconds.
func (r *SpacePiratesRoom) refreshIdleSeatBalances() {
	type idleSeatRef struct {
		seatIndex int8
		playerID  int
		sessionID int64
	}

	r.mu.Lock()
	refs := make([]idleSeatRef, 0, MaxSeats)
	for i := 0; i < MaxSeats; i++ {
		if r.seats[i].Occupied && r.seatPendingOps[i] == 0 {
			refs = append(refs, idleSeatRef{
				seatIndex: int8(i),
				playerID:  r.seats[i].PlayerID,
				sessionID: r.seats[i].SessionID,
			})
		}
	}
	r.mu.Unlock()

	for _, ref := range refs {
		w, err := db.GetWalletByPlayerID(ref.playerID)
		if err != nil {
			continue
		}
		r.mu.Lock()
		seat := &r.seats[ref.seatIndex]
		if seat.Occupied && seat.SessionID == ref.sessionID && r.seatPendingOps[ref.seatIndex] == 0 {
			seat.BalanceCents = w.BalanceCents
		}
		r.mu.Unlock()
	}
}

// ============================================================================
// 2. WEBSOCKET LIFECYCLE & CLIENT ACTIONS (PURE FLATBUFFERS)
// ============================================================================

func (r *SpacePiratesRoom) HandleWS(w http.ResponseWriter, req *http.Request) {
	conn, err := spUpgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("⚠️ SpacePirates[%s] WS upgrade failed: %v", r.tableID, err)
		return
	}

	client := &spClient{
		conn: conn,
		send: make(chan []byte, clientSendQueueSize),
	}

	r.mu.Lock()
	r.clients[client] = true
	r.mu.Unlock()

	go client.writePump()
	log.Printf("🔌 SpacePirates[%s] client connected: %s", r.tableID, conn.RemoteAddr())

	defer func() {
		r.mu.Lock()
		delete(r.clients, client)
		if seatIdx := r.findSeatByConnLocked(conn); seatIdx >= 0 {
			r.vacateSeatLocked(seatIdx, "disconnect")
		}
		r.mu.Unlock()
		client.closeSend()
		log.Printf("❌ SpacePirates[%s] client disconnected: %s", r.tableID, conn.RemoteAddr())
	}()

	for {
		msgType, payload, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if msgType != websocket.BinaryMessage {
			continue
		}

		act, err := DecodeClientAction(payload)
		if err != nil {
			log.Printf("⚠️ SpacePirates[%s] malformed client action from %s: %v", r.tableID, conn.RemoteAddr(), err)
			continue
		}

		switch act.Action {
		case SpacePirates.ClientActionTypeJoinSeat:
			r.handleJoinSeat(client, act.PlayerID, act.SeatIndex)
		case SpacePirates.ClientActionTypeLeaveSeat:
			r.mu.Lock()
			if seatIdx := r.findSeatByConnLocked(conn); seatIdx >= 0 {
				r.vacateSeatLocked(seatIdx, "leave_seat")
			}
			r.mu.Unlock()
		case SpacePirates.ClientActionTypeSetMultiplier:
			r.mu.Lock()
			r.handleSetMultiplierLocked(conn, act.Multiplier)
			r.mu.Unlock()
		case SpacePirates.ClientActionTypeDeployUnit:
			r.mu.Lock()
			r.handleDeployUnitLocked(conn, act.UnitType)
			r.mu.Unlock()
		}
	}
}

func (r *SpacePiratesRoom) findSeatByConnLocked(conn *websocket.Conn) int8 {
	for i := 0; i < MaxSeats; i++ {
		if r.seats[i].Occupied && r.seats[i].Conn == conn {
			return int8(i)
		}
	}
	return -1
}

// handleJoinSeat loads real wallet balance and opens a table_sessions row outside r.mu.
func (r *SpacePiratesRoom) handleJoinSeat(client *spClient, playerID int, preferredSeat int8) {
	if playerID <= 0 {
		return
	}

	// Step 1: Reserve a corner seat under lock (prevents duplicate seating & seat race).
	r.mu.Lock()
	if !r.clients[client] {
		r.mu.Unlock()
		return
	}
	if r.findSeatByConnLocked(client.conn) >= 0 {
		r.mu.Unlock()
		return
	}
	for i := 0; i < MaxSeats; i++ {
		if r.seats[i].Occupied && r.seats[i].PlayerID == playerID {
			r.mu.Unlock()
			return
		}
	}

	chosen := int8(-1)
	if preferredSeat >= 0 && int(preferredSeat) < MaxSeats && !r.seats[preferredSeat].Occupied && !r.seatReserved[preferredSeat] {
		chosen = preferredSeat
	} else {
		for i := 0; i < MaxSeats; i++ {
			if !r.seats[i].Occupied && !r.seatReserved[i] {
				chosen = int8(i)
				break
			}
		}
	}
	if chosen < 0 {
		r.mu.Unlock()
		return
	}
	r.seatReserved[chosen] = true
	r.mu.Unlock()

	// Step 2: Query PostgreSQL outside r.mu so the 60Hz tick is never blocked.
	wallet, err := db.GetWalletByPlayerID(playerID)
	if err != nil {
		log.Printf("⚠️ SpacePirates[%s] JoinSeat failed wallet lookup (player=%d): %v", r.tableID, playerID, err)
		r.mu.Lock()
		r.seatReserved[chosen] = false
		r.mu.Unlock()
		return
	}

	sessionID, err := db.OpenTableSession(r.tableID, playerID, chosen, wallet.BalanceCents)
	if err != nil {
		log.Printf("⚠️ SpacePirates[%s] OpenTableSession failed (player=%d table=%s): %v", r.tableID, playerID, r.tableID, err)
		r.mu.Lock()
		r.seatReserved[chosen] = false
		r.mu.Unlock()
		return
	}

	rs := currentRuleset()
	defaultMult := uint8(1)
	if len(rs.AllowedMultipliers) > 0 && rs.AllowedMultipliers[0] > 0 && rs.AllowedMultipliers[0] <= 255 {
		defaultMult = uint8(rs.AllowedMultipliers[0])
	}

	// Step 3: Commit seat under lock (guard against disconnect while DB call was in flight).
	r.mu.Lock()
	r.seatReserved[chosen] = false
	if !r.clients[client] {
		r.mu.Unlock()
		r.enqueueDBOp(dbWriteOp{
			kind:               dbOpCloseSession,
			sessionID:          sessionID,
			endingBalanceCents: wallet.BalanceCents,
		})
		return
	}

	r.seats[chosen] = Seat{
		SeatIndex:        chosen,
		Occupied:         true,
		Conn:             client.conn,
		PlayerID:         playerID,
		SessionID:        sessionID,
		Username:         wallet.Username,
		BalanceCents:     wallet.BalanceCents,
		ActiveMultiplier: defaultMult,
	}
	r.seatPendingOps[chosen] = 0
	r.mu.Unlock()

	log.Printf("🪑 SpacePirates[%s] %s (player=%d) joined seat %d (session=%d, bal=%dc)",
		r.tableID, wallet.Username, playerID, chosen, sessionID, wallet.BalanceCents)
}

// vacateSeatLocked enforces Forfeit-on-Exit, removes all seat entities, and queues session close.
func (r *SpacePiratesRoom) vacateSeatLocked(seatIdx int8, reason string) {
	if seatIdx < 0 || int(seatIdx) >= MaxSeats {
		return
	}
	seat := r.seats[seatIdx]
	if !seat.Occupied {
		return
	}

	// 1. Immediately delete all active player units for this seat (no refund, no Boss Meter credit)
	forfeited := 0
	for id, u := range r.units {
		if !u.IsHouse && u.SeatIndex == seatIdx {
			delete(r.units, id)
			forfeited++
		}
	}

	// 2. Immediately delete all in-flight projectiles for this seat
	keptProj := r.projectiles[:0]
	for _, p := range r.projectiles {
		if !p.IsHouse && p.SeatIndex == seatIdx {
			continue
		}
		keptProj = append(keptProj, p)
	}
	r.projectiles = keptProj

	// 3. Delete active Cryo clouds for this seat so no ghost kill payout fires after session close
	if r.world != nil {
		keptClouds := r.world.CryoClouds[:0]
		for _, cl := range r.world.CryoClouds {
			if cl.SeatIndex == seatIdx {
				continue
			}
			keptClouds = append(keptClouds, cl)
		}
		r.world.CryoClouds = keptClouds
	}

	seat.UnitsForfeited += forfeited

	// 4. Queue SESSION_FORFEIT audit row if active ships were forfeited
	if forfeited > 0 {
		r.enqueueDBOp(dbWriteOp{
			kind:       dbOpAdjustWallet,
			seatIndex:  -1, // seat is vacating; do not touch live seat state on completion
			sessionID:  seat.SessionID,
			playerID:   seat.PlayerID,
			deltaCents: 0,
			entryType:  "SESSION_FORFEIT",
			note:       fmt.Sprintf("Forfeited %d active units on %s", forfeited, reason),
		})
	}

	// 5. Queue CloseTableSession (runs strictly after prior wallet ops in single dbWriter goroutine)
	r.enqueueDBOp(dbWriteOp{
		kind:               dbOpCloseSession,
		sessionID:          seat.SessionID,
		endingBalanceCents: seat.BalanceCents,
		totalWageredCents:  seat.TotalWagered,
		totalWonCents:      seat.TotalWon,
		unitsDeployed:      seat.UnitsDeployed,
		unitsForfeited:     seat.UnitsForfeited,
	})

	// 6. Clear seat slot
	r.seats[seatIdx] = Seat{SeatIndex: seatIdx}
	r.seatPendingOps[seatIdx] = 0

	log.Printf("🚪 SpacePirates[%s] %s vacated seat %d (%s, forfeited=%d, endBal=%dc)",
		r.tableID, seat.Username, seatIdx, reason, forfeited, seat.BalanceCents)
}

func (r *SpacePiratesRoom) handleSetMultiplierLocked(conn *websocket.Conn, mult uint8) {
	seatIdx := r.findSeatByConnLocked(conn)
	if seatIdx < 0 {
		return
	}

	rs := currentRuleset()
	allowed := false
	for _, m := range rs.AllowedMultipliers {
		if m == int(mult) {
			allowed = true
			break
		}
	}
	if !allowed {
		return
	}
	r.seats[seatIdx].ActiveMultiplier = mult
}

func (r *SpacePiratesRoom) handleDeployUnitLocked(conn *websocket.Conn, unitType string) {
	seatIdx := r.findSeatByConnLocked(conn)
	if seatIdx < 0 {
		return
	}

	cfg, ok := GetUnitConfig("player", unitType)
	if !ok || !cfg.IsEnabled {
		return
	}

	seat := &r.seats[seatIdx]
	mult := seat.ActiveMultiplier
	if mult == 0 {
		mult = 1
	}

	costCents := cfg.BaseCostCents * int64(mult)
	if costCents <= 0 || seat.BalanceCents < costCents {
		return
	}

	// Immediately update in-memory wallet & session stats and dispatch async DB ledger write
	seat.BalanceCents -= costCents
	seat.TotalWagered += costCents
	seat.UnitsDeployed++
	r.seatPendingOps[seatIdx]++

	r.enqueueDBOp(dbWriteOp{
		kind:       dbOpAdjustWallet,
		seatIndex:  seatIdx,
		sessionID:  seat.SessionID,
		playerID:   seat.PlayerID,
		deltaCents: -costCents,
		entryType:  "UNIT_DEPLOY",
		note:       fmt.Sprintf("Deploy %s @ %dx", unitType, mult),
	})

	// Spawn ship at the player's corner base facing arena center
	spawns := SeatSpawnPoints(r.world.ArenaWidth, r.world.ArenaHeight)
	base := spawns[seatIdx]
	spawnPos := Vec2{
		X: base.X + (rand.Float64()*2-1)*22.0,
		Y: base.Y + (rand.Float64()*2-1)*22.0,
	}
	centerAngle := math.Atan2(r.world.ArenaHeight/2-spawnPos.Y, r.world.ArenaWidth/2-spawnPos.X)

	r.nextUnitSeq++
	id := fmt.Sprintf("p%d-%d", seatIdx, r.nextUnitSeq)
	u := &Unit{
		ID:              id,
		UnitType:        cfg.UnitClass,
		FactionRole:     cfg.FactionRole,
		OwnerID:         fmt.Sprintf("seat-%d", seatIdx),
		SeatIndex:       seatIdx,
		IsHouse:         false,
		WeightClass:     cfg.WeightClass,
		Pos:             spawnPos,
		Angle:           centerAngle,
		Shields:         NewUniformVitals(cfg.ShieldBase),
		Hull:            NewUniformVitals(cfg.HullBase),
		Speed:           cfg.Speed,
		TurnRate:        cfg.TurnRate,
		AIState:         "DEPLOY",
		MaxCooldown:     cfg.MaxCooldown,
		CurrentAmmo:     cfg.MaxAmmo,
		MaxAmmo:         cfg.MaxAmmo,
		DamagePerShot:   cfg.DamagePerShot,
		ProjectileSpeed: cfg.ProjectileSpeed,
		ProjectileRange: cfg.ProjectileRange,
		OptimalRange:    cfg.OptimalRange,
		ProjType:        cfg.ProjType,
		CanFire:         cfg.CanFire,
		BetMultiplier:   mult,
		CryoRadius:      cfg.CryoRadius,
		CryoDuration:    int(math.Round(cfg.CryoDurationSeconds * TickRateHz)),
		CryoSlow:        cfg.CryoSlowFactor,
	}
	r.units[id] = u
}

// ============================================================================
// 3. 60Hz SIMULATION LOOP
// ============================================================================

func (r *SpacePiratesRoom) stepTick() {
	r.mu.Lock()
	r.tick++

	rs := currentRuleset()

	// 1. Advance drifting asteroid clusters, edge wraps & Cryo cloud timers
	detachedClusters := r.world.Step()

	// 2. Maintain House harvesters + escorts and check Boss Meter trigger / countdown
	r.stepHouseSpawnersLocked(rs)

	// 3. Autonomous AI (House Harvesters, Escorts, Boss, Per-Seat Player Dynamic Squads)
	StepAI(r.units, r.world, detachedClusters, r.bossEscapeTicksRemaining)

	// 4. Universal 60Hz Environmental Physics (Gravity, Repulsion, Gas Giant layers, Nebula stealth/drag, Belts, Comets)
	for _, u := range r.units {
		if u.IsDestroyed {
			continue
		}
		if StepUnitEnvPhysics(u, r.world) && !u.IsHouse && !r.bossActive {
			r.bossMeterCurrent++
		}
	}

	// 5. Asymmetric WeightClass Ship-to-Ship Shoving Collisions (zero collision damage)
	r.resolveShipShovingLocked()

	// 5. Weapons firing & player finite-ammo self-destruct
	r.stepWeaponsLocked()

	// 6. Projectiles, asteroid cover blocking & directional combat damage
	r.stepProjectilesLocked()

	// 7. Cryo cloud AoE DoT ticks & last-hit attribution
	r.stepCryoCloudsLocked()

	// 8. Prune destroyed/escaped units & update Boss status
	r.cleanupDestroyedLocked()

	// 9. Advance payout event TTLs and collect active events for snapshot
	activePayouts := r.collectPayoutEventsLocked()

	// Skip FlatBuffers encoding & broadcast when no clients are connected
	if len(r.clients) == 0 {
		r.mu.Unlock()
		return
	}

	// 10. Serialize pure binary FlatBuffers snapshot, release lock, then fan out non-blockingly
	snap := ServerStateSnapshot{
		Tick:                     r.tick,
		TableID:                  r.tableID,
		World:                    r.world,
		Units:                    r.units,
		Projectiles:              r.projectiles,
		Seats:                    r.seats,
		PayoutEvents:             activePayouts,
		BossMeterCurrent:         r.bossMeterCurrent,
		BossMeterThreshold:       uint32(rs.BossExpendedThreshold),
		BossActive:               r.bossActive,
		BossEscapeTicksRemaining: r.bossEscapeTicksRemaining,
	}
	frame := r.codec.EncodeServerState(snap)

	clients := make([]*spClient, 0, len(r.clients))
	for c := range r.clients {
		clients = append(clients, c)
	}
	r.mu.Unlock()

	for _, c := range clients {
		c.enqueue(frame)
	}
}

// --- HOUSE SPAWNERS & BOSS METER ---

func (r *SpacePiratesRoom) stepHouseSpawnersLocked(rs models.SPRuleset) {
	// Boss Meter trigger & active escape countdown
	if r.bossActive {
		if r.bossEscapeTicksRemaining > 0 {
			r.bossEscapeTicksRemaining--
		}
	} else if r.bossMeterCurrent >= uint32(rs.BossExpendedThreshold) {
		r.spawnJackpotBossLocked(rs)
	}

	// Harvester + Escort wave director
	activeHarvesters := 0
	for _, u := range r.units {
		if !u.IsDestroyed && u.IsHouse && u.IsHarvester {
			activeHarvesters++
		}
	}

	if r.harvSpawnCooldown > 0 {
		r.harvSpawnCooldown--
		return
	}
	if activeHarvesters >= rs.MaxActiveHarvesters {
		return
	}

	harvClass := r.pickAvailableHarvesterClassLocked()
	if harvClass == "" {
		r.harvSpawnCooldown = 60
		return
	}

	r.spawnHarvesterWithEscortsLocked(harvClass)
	if activeHarvesters+1 < 3 {
		r.harvSpawnCooldown = 45 // Populate quickly when arena is sparse
	} else {
		r.harvSpawnCooldown = 120 // Steady 2-second cadence
	}
}

func (r *SpacePiratesRoom) pickAvailableHarvesterClassLocked() string {
	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	candidates := make([]string, 0, 12)
	for _, obj := range r.world.Env.Objects {
		for _, c := range obj.Components {
			if !c.IsNode || c.ResourceKey == "" {
				continue
			}
			if c.Pos.X < 60 || c.Pos.X > r.world.ArenaWidth-60 || c.Pos.Y < 60 || c.Pos.Y > r.world.ArenaHeight-60 {
				continue
			}
			if res, ok := resources[c.ResourceKey]; ok && res.HarvesterUnitClass != "" {
				candidates = append(candidates, res.HarvesterUnitClass)
			}
		}
	}
	if len(candidates) == 0 {
		return ""
	}
	return candidates[rand.Intn(len(candidates))]
}

func (r *SpacePiratesRoom) spawnHarvesterWithEscortsLocked(harvClass string) {
	cfg, ok := GetUnitConfig("house_harvester", harvClass)
	if !ok || !cfg.IsEnabled {
		return
	}

	pos, heading := r.world.RandomEdgeSpawn()
	r.nextUnitSeq++
	harvID := fmt.Sprintf("h-harv-%d", r.nextUnitSeq)

	harv := &Unit{
		ID:                harvID,
		UnitType:          cfg.UnitClass,
		FactionRole:       cfg.FactionRole,
		OwnerID:           "house",
		SeatIndex:         -1,
		IsHouse:           true,
		IsHarvester:       true,
		WeightClass:       cfg.WeightClass,
		Pos:               pos,
		Angle:             heading,
		Shields:           NewUniformVitals(cfg.ShieldBase),
		Hull:              NewUniformVitals(cfg.HullBase),
		Speed:             cfg.Speed,
		TurnRate:          cfg.TurnRate,
		AIState:           "APPROACH",
		MaxAmmo:           -1,
		CurrentAmmo:       -1,
		CanFire:           cfg.CanFire,
		FillDurationTicks: cfg.FillDurationSeconds * TickRateHz,
		BaseBountyCents:   cfg.BaseBountyCents,
	}
	r.units[harvID] = harv

	// Spawn linked House escorts ("cutting the pie")
	escortCount := 1
	if harvClass == "grav_extractor" {
		escortCount = 2
	}
	r.spawnHouseEscortsLocked("viper_interceptor", harvID, pos, heading, escortCount)
}

func (r *SpacePiratesRoom) spawnJackpotBossLocked(rs models.SPRuleset) {
	cfg, ok := GetUnitConfig("house_boss", "flagship")
	if !ok || !cfg.IsEnabled {
		return
	}

	pos, heading := r.world.RandomEdgeSpawn()
	r.nextUnitSeq++
	bossID := fmt.Sprintf("h-boss-%d", r.nextUnitSeq)

	boss := &Unit{
		ID:              bossID,
		UnitType:        cfg.UnitClass,
		FactionRole:     cfg.FactionRole,
		OwnerID:         "house",
		SeatIndex:       -1,
		IsHouse:         true,
		IsBoss:          true,
		WeightClass:     cfg.WeightClass,
		Pos:             pos,
		Angle:           heading,
		Shields:         NewUniformVitals(cfg.ShieldBase),
		Hull:            NewUniformVitals(cfg.HullBase),
		Speed:           cfg.Speed,
		TurnRate:        cfg.TurnRate,
		AIState:         "BOSS_PATROL",
		MaxCooldown:     cfg.MaxCooldown,
		MaxAmmo:         -1,
		CurrentAmmo:     -1,
		DamagePerShot:   cfg.DamagePerShot,
		ProjectileSpeed: cfg.ProjectileSpeed,
		ProjectileRange: cfg.ProjectileRange,
		OptimalRange:    cfg.OptimalRange,
		ProjType:        cfg.ProjType,
		CanFire:         cfg.CanFire,
		BaseBountyCents: cfg.BaseBountyCents,
		SweepPhase:      rand.Float64() * 2 * math.Pi,
	}
	r.units[bossID] = boss

	r.bossActive = true
	r.bossID = bossID
	r.bossMeterCurrent = 0
	r.bossEscapeTicksRemaining = uint32(rs.BossEscapeSeconds * TickRateHz)

	r.spawnHouseEscortsLocked("command_escort", bossID, pos, heading, 2)
	log.Printf("👑 SpacePirates[%s] JACKPOT BOSS spawned (%s, escape=%ds)", r.tableID, bossID, rs.BossEscapeSeconds)
}

func (r *SpacePiratesRoom) spawnHouseEscortsLocked(unitClass, vipID string, origin Vec2, heading float64, count int) {
	cfg, ok := GetUnitConfig("house_escort", unitClass)
	if !ok || !cfg.IsEnabled {
		return
	}
	for i := 0; i < count; i++ {
		r.nextUnitSeq++
		escID := fmt.Sprintf("h-esc-%d", r.nextUnitSeq)
		offsetAngle := heading + math.Pi*0.5*float64(i*2-1)
		spawnPos := Vec2{
			X: clampFloat(origin.X+math.Cos(offsetAngle)*55.0, 25, r.world.ArenaWidth-25),
			Y: clampFloat(origin.Y+math.Sin(offsetAngle)*55.0, 25, r.world.ArenaHeight-25),
		}
		r.units[escID] = &Unit{
			ID:              escID,
			UnitType:        cfg.UnitClass,
			FactionRole:     cfg.FactionRole,
			OwnerID:         "house",
			SeatIndex:       -1,
			IsHouse:         true,
			WeightClass:     cfg.WeightClass,
			Pos:             spawnPos,
			Angle:           heading,
			Shields:         NewUniformVitals(cfg.ShieldBase),
			Hull:            NewUniformVitals(cfg.HullBase),
			Speed:           cfg.Speed,
			TurnRate:        cfg.TurnRate,
			AIState:         "ESCORT",
			BuddyID:         vipID,
			MaxCooldown:     cfg.MaxCooldown,
			MaxAmmo:         -1,
			CurrentAmmo:     -1,
			DamagePerShot:   cfg.DamagePerShot,
			ProjectileSpeed: cfg.ProjectileSpeed,
			ProjectileRange: cfg.ProjectileRange,
			OptimalRange:    cfg.OptimalRange,
			ProjType:        cfg.ProjType,
			CanFire:         cfg.CanFire,
			BaseBountyCents: cfg.BaseBountyCents,
			SweepPhase:      float64(i) * math.Pi,
		}
	}
}

// --- ASYMMETRIC WEIGHTCLASS SHOVING COLLISIONS ---

func shipCollisionRadius(unitType string, weightClass int) float64 {
	return envphysics.ShipHitboxRadius(unitType, weightClass)
}

func (r *SpacePiratesRoom) resolveShipShovingLocked() {
	alive := make([]*Unit, 0, len(r.units))
	for _, u := range r.units {
		if !u.IsDestroyed {
			alive = append(alive, u)
		}
	}

	n := len(alive)
	for i := 0; i < n; i++ {
		a := alive[i]
		rA := shipCollisionRadius(a.UnitType, a.WeightClass)
		wA := float64(a.WeightClass)
		if wA < 1 {
			wA = 1
		}

		for j := i + 1; j < n; j++ {
			b := alive[j]
			dx := a.Pos.X - b.Pos.X
			dy := a.Pos.Y - b.Pos.Y
			minDist := rA + shipCollisionRadius(b.UnitType, b.WeightClass)
			distSq := dx*dx + dy*dy
			if distSq >= minDist*minDist {
				continue
			}

			var nx, ny, dist float64
			if distSq < 0.0001 {
				ang := float64((i+j)%8) * (math.Pi / 4.0)
				nx, ny = math.Cos(ang), math.Sin(ang)
				dist = 0.01
			} else {
				dist = math.Sqrt(distSq)
				nx, ny = dx/dist, dy/dist
			}

			overlap := minDist - dist
			wB := float64(b.WeightClass)
			if wB < 1 {
				wB = 1
			}
			totalW := wA + wB

			// Heavier units shove lighter units proportionally more; zero collision damage.
			ratioA := wB / totalW
			ratioB := wA / totalW
			pushA := overlap * ratioA
			pushB := overlap * ratioB

			a.Pos.X += nx * pushA
			a.Pos.Y += ny * pushA
			b.Pos.X -= nx * pushB
			b.Pos.Y -= ny * pushB

			// Cancel inward relative normal velocity on hitbox touch so ships do not bounce or grind.
			relVx := a.Vel.X - b.Vel.X
			relVy := a.Vel.Y - b.Vel.Y
			relNormal := relVx*nx + relVy*ny
			if relNormal < 0 {
				a.Vel.X -= nx * relNormal * ratioA
				a.Vel.Y -= ny * relNormal * ratioA
				b.Vel.X += nx * relNormal * ratioB
				b.Vel.Y += ny * relNormal * ratioB
			}

			if a.AIState != "ESCAPE" {
				a.Pos.X = clampFloat(a.Pos.X, 25, r.world.ArenaWidth-25)
				a.Pos.Y = clampFloat(a.Pos.Y, 25, r.world.ArenaHeight-25)
			}
			if b.AIState != "ESCAPE" {
				b.Pos.X = clampFloat(b.Pos.X, 25, r.world.ArenaWidth-25)
				b.Pos.Y = clampFloat(b.Pos.Y, 25, r.world.ArenaHeight-25)
			}
		}
	}
}

// --- WEAPONS, FINITE AMMO SELF-DESTRUCT, PROJECTILES & CRYO CLOUDS ---

func (r *SpacePiratesRoom) stepWeaponsLocked() {
	for _, u := range r.units {
		if u.IsDestroyed {
			continue
		}
		if u.Cooldown > 0 {
			u.Cooldown--
		}
		if !u.IsFiring || !u.CanFire || u.Cooldown > 0 || u.ProjectileSpeed <= 0 {
			continue
		}

		// Spawn projectile stamped with unit's locked BetMultiplier & SeatIndex
		r.nextProjSeq++
		life := int(math.Ceil(u.ProjectileRange / u.ProjectileSpeed))
		if life < 10 {
			life = 10
		}
		muzzle := shipCollisionRadius(u.UnitType, u.WeightClass) + 6.0
		p := &Projectile{
			ID:            fmt.Sprintf("pr-%d", r.nextProjSeq),
			OwnerID:       u.OwnerID,
			SeatIndex:     u.SeatIndex,
			IsHouse:       u.IsHouse,
			ProjType:      u.ProjType,
			Pos:           Vec2{X: u.Pos.X + math.Cos(u.Angle)*muzzle, Y: u.Pos.Y + math.Sin(u.Angle)*muzzle},
			Vel:           Vec2{X: math.Cos(u.Angle) * u.ProjectileSpeed, Y: math.Sin(u.Angle) * u.ProjectileSpeed},
			Life:          life,
			Damage:        u.DamagePerShot,
			BetMultiplier: u.BetMultiplier,
			CryoRadius:    u.CryoRadius,
			CryoDuration:  u.CryoDuration,
			CryoSlow:      u.CryoSlow,
		}
		r.projectiles = append(r.projectiles, p)
		u.Cooldown = u.MaxCooldown

		// Finite Ammo Self-Destruct for deployed player ships
		if !u.IsHouse && u.MaxAmmo > 0 {
			u.CurrentAmmo--
			if u.CurrentAmmo <= 0 {
				u.IsDestroyed = true
				if !r.bossActive {
					r.bossMeterCurrent++
				}
			}
		}
	}
}

func (r *SpacePiratesRoom) stepProjectilesLocked() {
	kept := r.projectiles[:0]

	for _, p := range r.projectiles {
		p.Pos.X += p.Vel.X
		p.Pos.Y += p.Vel.Y
		p.Life--

		// Remove projectiles that exit the arena frame
		if p.Pos.X < -60 || p.Pos.X > r.world.ArenaWidth+60 || p.Pos.Y < -60 || p.Pos.Y > r.world.ArenaHeight+60 {
			continue
		}

		// Tactical Cover & Singularity Rift Projectile Refraction
		if ApplyProjectileEnvPhysics(p, r.world) {
			continue
		}

		hit := false
		for _, u := range r.units {
			if u.IsDestroyed || u.IsHouse == p.IsHouse {
				continue // Everyone vs. The House: players never hit players, House never hits House
			}
			hitR := shipCollisionRadius(u.UnitType, u.WeightClass)
			dx := u.Pos.X - p.Pos.X
			dy := u.Pos.Y - p.Pos.Y
			if dx*dx+dy*dy <= hitR*hitR {
				hit = true
				if p.ProjType == "cryo" {
					r.world.SpawnCryoCloud(
						p.OwnerID, p.SeatIndex, p.Pos,
						p.CryoRadius, p.CryoDuration, p.CryoSlow, p.Damage, p.BetMultiplier,
					)
				} else if applyDirectionalDamage(u, p.Pos, p.Damage) {
					r.handleUnitKilledLocked(u, p.SeatIndex, p.BetMultiplier)
				}
				break
			}
		}
		if hit {
			continue
		}

		if p.Life <= 0 {
			// Cryo flak airbursts into an AoE cloud at max range if not blocked by cover
			if p.ProjType == "cryo" {
				r.world.SpawnCryoCloud(
					p.OwnerID, p.SeatIndex, p.Pos,
					p.CryoRadius, p.CryoDuration, p.CryoSlow, p.Damage, p.BetMultiplier,
				)
			}
			continue
		}

		kept = append(kept, p)
	}

	r.projectiles = kept
}

func (r *SpacePiratesRoom) stepCryoCloudsLocked() {
	for _, cl := range r.world.CryoClouds {
		if cl.DamagePerTick <= 0 {
			continue
		}
		rSq := cl.Radius * cl.Radius
		for _, u := range r.units {
			if u.IsDestroyed || !u.IsHouse {
				continue
			}
			dx := u.Pos.X - cl.Pos.X
			dy := u.Pos.Y - cl.Pos.Y
			if dx*dx+dy*dy <= rSq {
				if applyDirectionalDamage(u, cl.Pos, cl.DamagePerTick) {
					r.handleUnitKilledLocked(u, cl.SeatIndex, cl.BetMultiplier)
				}
			}
		}
	}
}

// applyDirectionalDamage applies shield-first then hull damage to the impacted quadrant.
// Returns true if this hit breached a hull quadrant and destroyed the unit.
func applyDirectionalDamage(target *Unit, hitPos Vec2, damage float64) bool {
	if target.IsDestroyed || damage <= 0 {
		return false
	}

	impactAngle := math.Atan2(hitPos.Y-target.Pos.Y, hitPos.X-target.Pos.X)
	rel := math.Mod(impactAngle-target.Angle+math.Pi*3, math.Pi*2) - math.Pi

	var shieldPtr, hullPtr *float64
	switch {
	case rel >= -math.Pi/4 && rel <= math.Pi/4:
		shieldPtr, hullPtr = &target.Shields.Front, &target.Hull.Front
	case rel > math.Pi/4 && rel < 3*math.Pi/4:
		shieldPtr, hullPtr = &target.Shields.Starboard, &target.Hull.Starboard
	case rel < -math.Pi/4 && rel > -3*math.Pi/4:
		shieldPtr, hullPtr = &target.Shields.Port, &target.Hull.Port
	default:
		shieldPtr, hullPtr = &target.Shields.Rear, &target.Hull.Rear
	}

	if *shieldPtr > 0 {
		if *shieldPtr >= damage {
			*shieldPtr -= damage
			damage = 0
		} else {
			damage -= *shieldPtr
			*shieldPtr = 0
		}
	}
	if damage > 0 {
		*hullPtr -= damage
		if *hullPtr < 0 {
			*hullPtr = 0
		}
	}

	if target.Hull.Front <= 0 || target.Hull.Rear <= 0 || target.Hull.Port <= 0 || target.Hull.Starboard <= 0 {
		target.IsDestroyed = true
		return true
	}
	return false
}

// handleUnitKilledLocked attributes last-hit bounties for House kills and Boss Meter credit for player losses.
func (r *SpacePiratesRoom) handleUnitKilledLocked(victim *Unit, killerSeatIdx int8, killerMult uint8) {
	if !victim.IsHouse {
		// Player ship destroyed by House fire fills the Boss Meter (when Boss is not active)
		if !r.bossActive {
			r.bossMeterCurrent++
		}
		return
	}

	// House unit destroyed: clear Boss flag if this was the Jackpot Boss
	if victim.IsBoss {
		r.bossActive = false
		r.bossID = ""
		r.bossEscapeTicksRemaining = 0
	}

	if killerSeatIdx < 0 || int(killerSeatIdx) >= MaxSeats {
		return
	}
	seat := &r.seats[killerSeatIdx]
	if !seat.Occupied {
		return
	}

	mult := killerMult
	if mult == 0 {
		mult = 1
	}
	bounty1x := UnitCurrentBountyCents(victim)
	payoutCents := bounty1x * int64(mult)
	if payoutCents <= 0 {
		return
	}

	seat.BalanceCents += payoutCents
	seat.TotalWon += payoutCents
	r.seatPendingOps[killerSeatIdx]++

	r.enqueueDBOp(dbWriteOp{
		kind:       dbOpAdjustWallet,
		seatIndex:  killerSeatIdx,
		sessionID:  seat.SessionID,
		playerID:   seat.PlayerID,
		deltaCents: payoutCents,
		entryType:  "KILL_PAYOUT",
		note:       fmt.Sprintf("Kill %s @ %dx", victim.UnitType, mult),
	})

	r.nextPayoutEventID++
	r.payoutBuffer = append(r.payoutBuffer, timedPayoutEvent{
		event: PayoutEvent{
			EventID:     r.nextPayoutEventID,
			SeatIndex:   killerSeatIdx,
			UnitType:    victim.UnitType,
			Pos:         victim.Pos,
			PayoutCents: payoutCents,
			Multiplier:  mult,
			WasBoss:     victim.IsBoss,
		},
		ttlTicks: payoutEventTTLTicks,
	})
}

func (r *SpacePiratesRoom) cleanupDestroyedLocked() {
	for id, u := range r.units {
		if u.IsDestroyed {
			if u.IsBoss && id == r.bossID {
				r.bossActive = false
				r.bossID = ""
				r.bossEscapeTicksRemaining = 0
			}
			delete(r.units, id)
		}
	}
}

func (r *SpacePiratesRoom) collectPayoutEventsLocked() []PayoutEvent {
	if len(r.payoutBuffer) == 0 {
		return nil
	}
	out := make([]PayoutEvent, 0, len(r.payoutBuffer))
	kept := r.payoutBuffer[:0]
	for _, item := range r.payoutBuffer {
		out = append(out, item.event)
		item.ttlTicks--
		if item.ttlTicks > 0 {
			kept = append(kept, item)
		}
	}
	r.payoutBuffer = kept
	return out
}

func clampFloat(v, minV, maxV float64) float64 {
	if v < minV {
		return minV
	}
	if v > maxV {
		return maxV
	}
	return v
}
