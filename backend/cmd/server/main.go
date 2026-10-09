package main

import (
	"log"
	"net/http"
	"space-tactics-server/internal/api"
	"space-tactics-server/internal/db"
	"space-tactics-server/internal/game"
)

func main() {
	db.InitDB()
	
	// Standard game room (Map ID 1)
	standardRoom := game.NewGameRoom(1, false)
	go standardRoom.Run()

	// Dedicated unit testing sandbox room (Map ID 1, no enemies, free spawning)
	sandboxRoom := game.NewGameRoom(1, true)
	go sandboxRoom.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		mode := r.URL.Query().Get("mode")
		if mode == "sandbox" {
			sandboxRoom.HandleWS(w, r)
		} else {
			standardRoom.HandleWS(w, r)
		}
	})

	http.HandleFunc("/api/login", api.LoginHandler)
	http.HandleFunc("/api/loadouts", api.GetLoadoutsHandler)
	http.HandleFunc("/api/loadouts/save", api.SaveLoadoutHandler)
	
	// Maps endpoint handles both fetching (GET) and saving custom maps (POST)
	http.HandleFunc("/api/maps", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			api.SaveCustomMapHandler(w, r)
		} else {
			api.GetMapsHandler(w, r)
		}
	})
	
	http.HandleFunc("/api/map-detail", api.GetMapDetailHandler)

	log.Println("🚀 Space Tactics Server running on :8080 (Standard & Sandbox WS enabled)")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
