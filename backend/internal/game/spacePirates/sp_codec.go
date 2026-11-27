package spacePirates

import (
	"errors"
	"fmt"

	SpacePirates "space-tactics-server/internal/generated/SpacePirates"

	flatbuffers "github.com/google/flatbuffers/go"
)

var (
	ErrInvalidActionPayload = errors.New("invalid Space Pirates FlatBuffers action payload")
	ErrUnknownClientAction  = errors.New("unknown Space Pirates client action type")
)

// ServerStateSnapshot holds the per-tick room state serialized into SPServerState.
type ServerStateSnapshot struct {
	Tick                     uint64
	TableID                  string
	World                    *WorldState
	Units                    map[string]*Unit
	Projectiles              []*Projectile
	Seats                    [MaxSeats]Seat
	PayoutEvents             []PayoutEvent
	BossMeterCurrent         uint32
	BossMeterThreshold       uint32
	BossActive               bool
	BossEscapeTicksRemaining uint32
}

// DecodedClientAction is the parsed Go representation of an upstream SPClientAction message.
type DecodedClientAction struct {
	Action     SpacePirates.ClientActionType
	PlayerID   int
	SeatIndex  int8
	Multiplier uint8
	UnitType   string
}

// Codec reuses a FlatBuffers builder and scratch offset slices to keep 60Hz encoding low-allocation.
type Codec struct {
	builder        *flatbuffers.Builder
	unitOffsets    []flatbuffers.UOffsetT
	projOffsets    []flatbuffers.UOffsetT
	rockOffsets    []flatbuffers.UOffsetT
	envObjOffsets  []flatbuffers.UOffsetT
	envCompOffsets []flatbuffers.UOffsetT
	cryoOffsets    []flatbuffers.UOffsetT
	seatOffsets    [MaxSeats]flatbuffers.UOffsetT
	payOffsets     []flatbuffers.UOffsetT
}

func NewCodec() *Codec {
	return &Codec{
		builder:        flatbuffers.NewBuilder(12288),
		unitOffsets:    make([]flatbuffers.UOffsetT, 0, 64),
		projOffsets:    make([]flatbuffers.UOffsetT, 0, 128),
		rockOffsets:    make([]flatbuffers.UOffsetT, 0, 48),
		envObjOffsets:  make([]flatbuffers.UOffsetT, 0, 16),
		envCompOffsets: make([]flatbuffers.UOffsetT, 0, 16),
		cryoOffsets:    make([]flatbuffers.UOffsetT, 0, 16),
		payOffsets:     make([]flatbuffers.UOffsetT, 0, 16),
	}
}

// EncodeServerState serializes a tick snapshot into a standalone binary SPServerState payload.
func (c *Codec) EncodeServerState(snap ServerStateSnapshot) []byte {
	b := c.builder
	b.Reset()

	// 1. Units (also tallies active player unit counts per seat)
	c.unitOffsets = c.unitOffsets[:0]
	var activeCounts [MaxSeats]uint16

	for _, u := range snap.Units {
		if u == nil || u.IsDestroyed {
			continue
		}
		if !u.IsHouse && u.SeatIndex >= 0 && int(u.SeatIndex) < MaxSeats {
			activeCounts[u.SeatIndex]++
		}

		idOff := b.CreateString(u.ID)
		unitTypeOff := b.CreateString(u.UnitType)
		ownerOff := b.CreateString(u.OwnerID)
		aiStateOff := b.CreateString(u.AIState)

		var cargoRatio float32
		if u.IsHarvester && u.FillDurationTicks > 0 {
			r := float32(u.HarvestTicks) / float32(u.FillDurationTicks)
			if r < 0 {
				r = 0
			} else if r > 1 {
				r = 1
			}
			cargoRatio = r
		}

		var bountyCents int64
		if u.IsHouse {
			bountyCents = UnitCurrentBountyCents(u)
		}

		SpacePirates.SPUnitStart(b)
		SpacePirates.SPUnitAddId(b, idOff)
		SpacePirates.SPUnitAddUnitType(b, unitTypeOff)
		SpacePirates.SPUnitAddOwnerId(b, ownerOff)
		SpacePirates.SPUnitAddSeatIndex(b, u.SeatIndex)
		SpacePirates.SPUnitAddIsHouse(b, u.IsHouse)
		SpacePirates.SPUnitAddPos(b, SpacePirates.CreateVec2(b, float32(u.Pos.X), float32(u.Pos.Y)))
		SpacePirates.SPUnitAddVel(b, SpacePirates.CreateVec2(b, float32(u.Vel.X), float32(u.Vel.Y)))
		SpacePirates.SPUnitAddAngle(b, float32(u.Angle))
		SpacePirates.SPUnitAddShields(b, SpacePirates.CreateShields(
			b,
			float32(u.Shields.Front),
			float32(u.Shields.Rear),
			float32(u.Shields.Port),
			float32(u.Shields.Starboard),
		))
		SpacePirates.SPUnitAddHull(b, SpacePirates.CreateHull(
			b,
			float32(u.Hull.Front),
			float32(u.Hull.Rear),
			float32(u.Hull.Port),
			float32(u.Hull.Starboard),
		))
		SpacePirates.SPUnitAddIsFiring(b, u.IsFiring)
		SpacePirates.SPUnitAddIsSquadLeader(b, u.IsSquadLeader)
		SpacePirates.SPUnitAddSquadId(b, u.SquadID)
		SpacePirates.SPUnitAddAiState(b, aiStateOff)
		SpacePirates.SPUnitAddCurrentAmmo(b, int32(u.CurrentAmmo))
		SpacePirates.SPUnitAddMaxAmmo(b, int32(u.MaxAmmo))
		SpacePirates.SPUnitAddBetMultiplier(b, u.BetMultiplier)
		SpacePirates.SPUnitAddResourceType(b, u.ResourceType)
		SpacePirates.SPUnitAddCargoRatio(b, cargoRatio)
		SpacePirates.SPUnitAddCurrentBountyCents(b, bountyCents)
		SpacePirates.SPUnitAddIsStealthed(b, u.IsStealthed)
		c.unitOffsets = append(c.unitOffsets, SpacePirates.SPUnitEnd(b))
	}

	SpacePirates.SPServerStateStartUnitsVector(b, len(c.unitOffsets))
	for i := len(c.unitOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.unitOffsets[i])
	}
	unitsVec := b.EndVector(len(c.unitOffsets))

	// 2. Projectiles
	c.projOffsets = c.projOffsets[:0]
	for _, p := range snap.Projectiles {
		if p == nil {
			continue
		}
		idOff := b.CreateString(p.ID)
		ownerOff := b.CreateString(p.OwnerID)
		projTypeOff := b.CreateString(p.ProjType)

		SpacePirates.SPProjectileStart(b)
		SpacePirates.SPProjectileAddId(b, idOff)
		SpacePirates.SPProjectileAddOwnerId(b, ownerOff)
		SpacePirates.SPProjectileAddSeatIndex(b, p.SeatIndex)
		SpacePirates.SPProjectileAddIsHouse(b, p.IsHouse)
		SpacePirates.SPProjectileAddProjType(b, projTypeOff)
		SpacePirates.SPProjectileAddPos(b, SpacePirates.CreateVec2(b, float32(p.Pos.X), float32(p.Pos.Y)))
		SpacePirates.SPProjectileAddVel(b, SpacePirates.CreateVec2(b, float32(p.Vel.X), float32(p.Vel.Y)))
		SpacePirates.SPProjectileAddBetMultiplier(b, p.BetMultiplier)
		c.projOffsets = append(c.projOffsets, SpacePirates.SPProjectileEnd(b))
	}

	SpacePirates.SPServerStateStartProjectilesVector(b, len(c.projOffsets))
	for i := len(c.projOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.projOffsets[i])
	}
	projectilesVec := b.EndVector(len(c.projOffsets))

	// 3. Universal EnvObjects (plus legacy SPAsteroidNode projection) & 4. Cryo Clouds
	c.rockOffsets = c.rockOffsets[:0]
	c.envObjOffsets = c.envObjOffsets[:0]
	c.cryoOffsets = c.cryoOffsets[:0]
	var arenaW, arenaH float32

	if snap.World != nil && snap.World.Env != nil {
		arenaW = float32(snap.World.ArenaWidth)
		arenaH = float32(snap.World.ArenaHeight)

		for _, obj := range snap.World.Env.Objects {
			if obj == nil {
				continue
			}

			c.envCompOffsets = c.envCompOffsets[:0]
			for _, comp := range obj.Components {
				if comp == nil {
					continue
				}
				colorOff := b.CreateString(comp.ColorHex)
				SpacePirates.SPEnvComponentStart(b)
				SpacePirates.SPEnvComponentAddId(b, comp.ID)
				SpacePirates.SPEnvComponentAddKind(b, SpacePirates.EnvComponentKind(comp.KindCode))
				SpacePirates.SPEnvComponentAddPos(b, SpacePirates.CreateVec2(b, float32(comp.Pos.X), float32(comp.Pos.Y)))
				SpacePirates.SPEnvComponentAddVel(b, SpacePirates.CreateVec2(b, float32(comp.Vel.X), float32(comp.Vel.Y)))
				SpacePirates.SPEnvComponentAddRadius(b, float32(comp.Radius))
				SpacePirates.SPEnvComponentAddInnerRadius(b, float32(comp.InnerRadius))
				SpacePirates.SPEnvComponentAddIsNode(b, comp.IsNode)
				SpacePirates.SPEnvComponentAddResourceType(b, SpacePirates.ResourceType(comp.ResourceEnumCode))
				SpacePirates.SPEnvComponentAddColorHex(b, colorOff)
				c.envCompOffsets = append(c.envCompOffsets, SpacePirates.SPEnvComponentEnd(b))

				if obj.ObjectType == "asteroid_cluster" {
					SpacePirates.SPAsteroidNodeStart(b)
					SpacePirates.SPAsteroidNodeAddId(b, comp.ID)
					SpacePirates.SPAsteroidNodeAddClusterId(b, obj.ID)
					SpacePirates.SPAsteroidNodeAddPos(b, SpacePirates.CreateVec2(b, float32(comp.Pos.X), float32(comp.Pos.Y)))
					SpacePirates.SPAsteroidNodeAddVel(b, SpacePirates.CreateVec2(b, float32(comp.Vel.X), float32(comp.Vel.Y)))
					SpacePirates.SPAsteroidNodeAddRadius(b, float32(comp.Radius))
					SpacePirates.SPAsteroidNodeAddIsNode(b, comp.IsNode)
					SpacePirates.SPAsteroidNodeAddResourceType(b, SpacePirates.ResourceType(comp.ResourceEnumCode))
					c.rockOffsets = append(c.rockOffsets, SpacePirates.SPAsteroidNodeEnd(b))
				}
			}

			SpacePirates.SPEnvObjectStartComponentsVector(b, len(c.envCompOffsets))
			for i := len(c.envCompOffsets) - 1; i >= 0; i-- {
				b.PrependUOffsetT(c.envCompOffsets[i])
			}
			compsVec := b.EndVector(len(c.envCompOffsets))

			SpacePirates.SPEnvObjectStart(b)
			SpacePirates.SPEnvObjectAddId(b, obj.ID)
			SpacePirates.SPEnvObjectAddBlueprintId(b, int32(obj.BlueprintID))
			SpacePirates.SPEnvObjectAddObjectType(b, SpacePirates.EnvObjectType(obj.ObjectTypeCode))
			SpacePirates.SPEnvObjectAddPos(b, SpacePirates.CreateVec2(b, float32(obj.Center.X), float32(obj.Center.Y)))
			SpacePirates.SPEnvObjectAddVel(b, SpacePirates.CreateVec2(b, float32(obj.Vel.X), float32(obj.Vel.Y)))
			SpacePirates.SPEnvObjectAddAngle(b, float32(obj.Angle))
			SpacePirates.SPEnvObjectAddBoundingRadius(b, float32(obj.BoundingRadius))
			SpacePirates.SPEnvObjectAddParentObjectId(b, obj.ParentObjectID)
			SpacePirates.SPEnvObjectAddOrbitRadius(b, float32(obj.OrbitRadius))
			SpacePirates.SPEnvObjectAddComponents(b, compsVec)
			c.envObjOffsets = append(c.envObjOffsets, SpacePirates.SPEnvObjectEnd(b))
		}

		for _, cloud := range snap.World.CryoClouds {
			if cloud == nil {
				continue
			}
			ownerOff := b.CreateString(cloud.OwnerID)

			SpacePirates.SPCryoCloudStart(b)
			SpacePirates.SPCryoCloudAddId(b, cloud.ID)
			SpacePirates.SPCryoCloudAddOwnerId(b, ownerOff)
			SpacePirates.SPCryoCloudAddSeatIndex(b, cloud.SeatIndex)
			SpacePirates.SPCryoCloudAddPos(b, SpacePirates.CreateVec2(b, float32(cloud.Pos.X), float32(cloud.Pos.Y)))
			SpacePirates.SPCryoCloudAddRadius(b, float32(cloud.Radius))
			SpacePirates.SPCryoCloudAddRemainingTicks(b, cloud.RemainingTicks)
			SpacePirates.SPCryoCloudAddMaxTicks(b, cloud.MaxTicks)
			c.cryoOffsets = append(c.cryoOffsets, SpacePirates.SPCryoCloudEnd(b))
		}
	}

	SpacePirates.SPServerStateStartAsteroidsVector(b, len(c.rockOffsets))
	for i := len(c.rockOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.rockOffsets[i])
	}
	asteroidsVec := b.EndVector(len(c.rockOffsets))

	SpacePirates.SPServerStateStartEnvObjectsVector(b, len(c.envObjOffsets))
	for i := len(c.envObjOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.envObjOffsets[i])
	}
	envObjectsVec := b.EndVector(len(c.envObjOffsets))

	SpacePirates.SPServerStateStartCryoCloudsVector(b, len(c.cryoOffsets))
	for i := len(c.cryoOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.cryoOffsets[i])
	}
	cryoVec := b.EndVector(len(c.cryoOffsets))

	// 5. Seats
	for i := 0; i < MaxSeats; i++ {
		s := snap.Seats[i]
		usernameOff := b.CreateString(s.Username)

		SpacePirates.SPSeatStateStart(b)
		SpacePirates.SPSeatStateAddSeatIndex(b, int8(i))
		SpacePirates.SPSeatStateAddOccupied(b, s.Occupied)
		SpacePirates.SPSeatStateAddPlayerId(b, int32(s.PlayerID))
		SpacePirates.SPSeatStateAddUsername(b, usernameOff)
		SpacePirates.SPSeatStateAddBalanceCents(b, s.BalanceCents)
		SpacePirates.SPSeatStateAddActiveMultiplier(b, s.ActiveMultiplier)
		SpacePirates.SPSeatStateAddActiveUnitCount(b, activeCounts[i])
		c.seatOffsets[i] = SpacePirates.SPSeatStateEnd(b)
	}

	SpacePirates.SPServerStateStartSeatsVector(b, MaxSeats)
	for i := MaxSeats - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.seatOffsets[i])
	}
	seatsVec := b.EndVector(MaxSeats)

	// 6. Payout Events
	c.payOffsets = c.payOffsets[:0]
	for _, ev := range snap.PayoutEvents {
		unitTypeOff := b.CreateString(ev.UnitType)

		SpacePirates.SPPayoutEventStart(b)
		SpacePirates.SPPayoutEventAddEventId(b, ev.EventID)
		SpacePirates.SPPayoutEventAddSeatIndex(b, ev.SeatIndex)
		SpacePirates.SPPayoutEventAddUnitType(b, unitTypeOff)
		SpacePirates.SPPayoutEventAddPos(b, SpacePirates.CreateVec2(b, float32(ev.Pos.X), float32(ev.Pos.Y)))
		SpacePirates.SPPayoutEventAddPayoutCents(b, ev.PayoutCents)
		SpacePirates.SPPayoutEventAddMultiplier(b, ev.Multiplier)
		SpacePirates.SPPayoutEventAddWasBoss(b, ev.WasBoss)
		c.payOffsets = append(c.payOffsets, SpacePirates.SPPayoutEventEnd(b))
	}

	SpacePirates.SPServerStateStartPayoutEventsVector(b, len(c.payOffsets))
	for i := len(c.payOffsets) - 1; i >= 0; i-- {
		b.PrependUOffsetT(c.payOffsets[i])
	}
	payoutsVec := b.EndVector(len(c.payOffsets))

	// 7. Root SPServerState table
	tableIDOff := b.CreateString(snap.TableID)

	SpacePirates.SPServerStateStart(b)
	SpacePirates.SPServerStateAddTick(b, snap.Tick)
	SpacePirates.SPServerStateAddTableId(b, tableIDOff)
	SpacePirates.SPServerStateAddArenaWidth(b, arenaW)
	SpacePirates.SPServerStateAddArenaHeight(b, arenaH)
	SpacePirates.SPServerStateAddUnits(b, unitsVec)
	SpacePirates.SPServerStateAddProjectiles(b, projectilesVec)
	SpacePirates.SPServerStateAddAsteroids(b, asteroidsVec)
	SpacePirates.SPServerStateAddCryoClouds(b, cryoVec)
	SpacePirates.SPServerStateAddSeats(b, seatsVec)
	SpacePirates.SPServerStateAddPayoutEvents(b, payoutsVec)
	SpacePirates.SPServerStateAddBossMeterCurrent(b, snap.BossMeterCurrent)
	SpacePirates.SPServerStateAddBossMeterThreshold(b, snap.BossMeterThreshold)
	SpacePirates.SPServerStateAddBossActive(b, snap.BossActive)
	SpacePirates.SPServerStateAddBossEscapeTicksRemaining(b, snap.BossEscapeTicksRemaining)
	SpacePirates.SPServerStateAddEnvObjects(b, envObjectsVec)
	root := SpacePirates.SPServerStateEnd(b)

	b.Finish(root)
	finished := b.FinishedBytes()
	out := make([]byte, len(finished))
	copy(out, finished)
	return out
}

// DecodeClientAction safely parses a binary SPClientAction WebSocket frame.
func DecodeClientAction(buf []byte) (act DecodedClientAction, err error) {
	if len(buf) < 8 {
		return act, ErrInvalidActionPayload
	}

	defer func() {
		if r := recover(); r != nil {
			act = DecodedClientAction{}
			err = fmt.Errorf("%w: %v", ErrInvalidActionPayload, r)
		}
	}()

	raw := SpacePirates.GetRootAsSPClientAction(buf, 0)
	actionType := raw.Action()

	switch actionType {
	case SpacePirates.ClientActionTypeJoinSeat,
		SpacePirates.ClientActionTypeLeaveSeat,
		SpacePirates.ClientActionTypeSetMultiplier,
		SpacePirates.ClientActionTypeDeployUnit:
	default:
		return DecodedClientAction{}, fmt.Errorf("%w: %d", ErrUnknownClientAction, actionType)
	}

	act = DecodedClientAction{
		Action:     actionType,
		PlayerID:   int(raw.PlayerId()),
		SeatIndex:  raw.SeatIndex(),
		Multiplier: raw.Multiplier(),
		UnitType:   string(raw.UnitType()),
	}
	return act, nil
}
