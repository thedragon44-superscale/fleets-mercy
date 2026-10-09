package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"
)

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	var id int
	var storedHash string
	err := db.Conn.QueryRow("SELECT id, password_hash FROM players WHERE username = $1", req.Username).Scan(&id, &storedHash)

	w.Header().Set("Content-Type", "application/json")

	if err == sql.ErrNoRows || storedHash != req.Password {
		json.NewEncoder(w).Encode(models.LoginResponse{Success: false, Message: "Invalid credentials"})
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(models.LoginResponse{
		Success:  true,
		PlayerID: id,
		Username: req.Username,
	})
}

func GetLoadoutsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	playerIDStr := r.URL.Query().Get("playerId")
	playerID, err := strconv.Atoi(playerIDStr)
	if err != nil {
		http.Error(w, "Missing or invalid playerId parameter", http.StatusBadRequest)
		return
	}

	rows, err := db.Conn.Query(
		"SELECT id, player_id, loadout_index, name, fleet_composition, squad_1, squad_2, squad_3, squad_4 FROM player_loadouts WHERE player_id = $1 ORDER BY loadout_index ASC", 
		playerID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var loadouts []models.PlayerLoadout
	for rows.Next() {
		var l models.PlayerLoadout
		var comp, s1, s2, s3, s4 []byte
		if err := rows.Scan(&l.ID, &l.PlayerID, &l.LoadoutIndex, &l.Name, &comp, &s1, &s2, &s3, &s4); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		l.FleetComposition = comp; l.Squad1 = s1; l.Squad2 = s2; l.Squad3 = s3; l.Squad4 = s4
		loadouts = append(loadouts, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(loadouts)
}

func SaveLoadoutHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req models.SaveLoadoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO player_loadouts (player_id, loadout_index, name, fleet_composition, squad_1, squad_2, squad_3, squad_4)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (player_id, loadout_index) 
		DO UPDATE SET name = $3, fleet_composition = $4, squad_1 = $5, squad_2 = $6, squad_3 = $7, squad_4 = $8;
	`

	_, err := db.Conn.Exec(query, req.PlayerID, req.LoadoutIndex, req.Name, req.FleetComposition, req.Squad1, req.Squad2, req.Squad3, req.Squad4)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

