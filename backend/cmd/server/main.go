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
	"space-tactics-server/internal/game/teamDeathMatch"
)

var (
	roomMu    sync.Mutex
	activeRooms = make(map[string]*game.GameRoom)
)

func getOrCreateRoom(mapID int, isSandbox bool) *game.GameRoom {
	roomMu.Lock()
	defer roomMu.Unlock()

	key := fmt.Sprintf("%d-%v", mapID, isSandbox)
	if room, exists := activeRooms[key]; exists {
		return room
	}

	room := game.NewGameRoom(mapID, isSandbox)
	go room.Run()
	activeRooms[key] = room
	log.Printf("🗺️ Spawned dynamic GameRoom for Map ID %d (Sandbox: %v)", mapID, isSandbox)
	return room
}

func main() {
	db.InitDB()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		mapIDStr := r.URL.Query().Get("mapId")
		mapID := 1
		if mapIDStr != "" {
			fmt.Sscanf(mapIDStr, "%d", &mapID)
		}

		mode := r.URL.Query().Get("mode")
		isSandbox := (mode == "sandbox")

		room := getOrCreateRoom(mapID, isSandbox)
		room.HandleWS(w, r)
	})

	// Dedicated WebSocket route for 20v20 Team Deathmatch Mode
	http.HandleFunc("/ws/tdm", func(w http.ResponseWriter, r *http.Request) {
		mapIDStr := r.URL.Query().Get("mapId")
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

	http.HandleFunc("/api/login", api.LoginHandler)
	http.HandleFunc("/api/loadouts", api.GetLoadoutsHandler)
	http.HandleFunc("/api/loadouts/save", api.SaveLoadoutHandler)
	
	http.HandleFunc("/api/maps", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			api.SaveCustomMapHandler(w, r)
		} else {
			api.GetMapsHandler(w, r)
		}
	})
	
	http.HandleFunc("/api/map-detail", api.GetMapDetailHandler)

	http.HandleFunc("/api/templates", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			api.SaveTemplateHandler(w, r)
		} else {
			api.GetTemplatesHandler(w, r)
		}
	})

	log.Println("Fleet's Mercy Server running on :8080 (Dynamic Map WS, TDM Mode & Template Inspector enabled)")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
