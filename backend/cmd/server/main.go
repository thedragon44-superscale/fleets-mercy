package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"

	"space-tactics-server/internal/api"
	"space-tactics-server/internal/db"
	"space-tactics-server/internal/game"
	"space-tactics-server/internal/game/spacePirates"
	"space-tactics-server/internal/game/teamDeathMatch"
)

var (
	roomMu      sync.Mutex
	activeRooms = make(map[int]*game.GameRoom)
)

func getOrCreateSandboxRoom(mapID int) *game.GameRoom {
	roomMu.Lock()
	defer roomMu.Unlock()

	if room, exists := activeRooms[mapID]; exists {
		return room
	}

	room := game.NewGameRoom(mapID)
	go room.Run()
	activeRooms[mapID] = room
	log.Printf("🗺️ Spawned Unit Testing Sandbox room for Map ID %d", mapID)
	return room
}

func main() {
	db.InitDB()
	if err := db.LoadSPConfigCache(); err != nil {
		log.Printf("⚠️ Failed to load Space Pirates DB config: %v", err)
	}
	if err := db.LoadEnvCache(); err != nil {
		log.Printf("⚠️ Failed to load Universal EnvCache (run migration 002 if pending): %v", err)
	}

	// --- WEBSOCKET ROUTES ---

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		mapIDStr := r.URL.Query().Get("mapId")
		mapID := 1
		if mapIDStr != "" {
			fmt.Sscanf(mapIDStr, "%d", &mapID)
		}

		room := getOrCreateSandboxRoom(mapID)
		room.HandleWS(w, r)
	})

	// Dedicated WebSocket route for 20v20 Team Deathmatch Mode
	http.HandleFunc("/ws/tdm", func(w http.ResponseWriter, r *http.Request) {
		mapIDStr := r.URL.Query().Get("mapId")
		if mapIDStr == "" {
			mapIDStr = r.URL.Query().Get("map")
		}
		mapID := 1
		if mapIDStr != "" {
			fmt.Sscanf(mapIDStr, "%d", &mapID)
		}

		pilotedUnit := r.URL.Query().Get("unit")
		if pilotedUnit == "" {
			pilotedUnit = "viper_interceptor"
		}

		poolStr := r.URL.Query().Get("pool")
		var customPool []string
		if poolStr != "" {
			customPool = strings.Split(poolStr, ",")
		}

		// Instantiate a fresh Team Deathmatch room instance and start its 60Hz ticker loop
		room := teamDeathMatch.NewTDMRoom(mapID, pilotedUnit, customPool)
		go room.Run()
		room.HandleWS(w, r)
	})

	// Dedicated pure-FlatBuffers WebSocket route for Space Pirates Casino Mode
	http.HandleFunc("/ws/casino/space-pirates", spacePirates.HandleTableWS)

	// --- AUTH, WALLET & ADMIN ROUTES ---

	http.HandleFunc("/api/login", api.CasinoLoginHandler)
	http.HandleFunc("/api/register", api.RegisterHandler)
	http.HandleFunc("/api/wallet", api.GetWalletHandler)
	http.HandleFunc("/api/admin/players", api.AdminListPlayersHandler)
	http.HandleFunc("/api/admin/wallet/adjust", api.AdminAdjustWalletHandler)

	// --- SPACE PIRATES CONFIG & SPAWN POOL ROUTES ---

	http.HandleFunc("/api/casino/sp/config", api.GetSPConfigHandler)
	http.HandleFunc("/api/casino/sp/clusters", api.SPClustersHandler)
	http.HandleFunc("/api/casino/sp/pool", api.SPEnvPoolHandler)

	// --- UNIVERSAL ENVIRONMENT BLUEPRINT & MAP ROUTES ---

	http.HandleFunc("/api/env/blueprints", api.EnvBlueprintsHandler)
	http.HandleFunc("/api/env/pools", api.EnvPoolsHandler)
	http.HandleFunc("/api/env/placements", api.EnvPlacementsHandler)

	// --- EXISTING FLEET'S MERCY ROUTES ---

	http.HandleFunc("/api/loadouts", api.GetLoadoutsHandler)
	http.HandleFunc("/api/loadouts/save", api.SaveLoadoutHandler)

	http.HandleFunc("/api/maps", api.UniversalMapsHandler)
	http.HandleFunc("/api/map-detail", api.UniversalMapDetailHandler)

	http.HandleFunc("/api/templates", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			api.SaveTemplateHandler(w, r)
		} else {
			api.GetTemplatesHandler(w, r)
		}
	})

	log.Println("Fleet's Mercy Server running on :8080 (Dynamic Map WS, TDM, Casino Auth/Wallet & Space Pirates WS/Config enabled)")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
