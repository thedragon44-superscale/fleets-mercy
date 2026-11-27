package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"
)

// EnvBlueprintsHandler serves GET / POST / DELETE /api/env/blueprints.
func EnvBlueprintsHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		list, err := db.GetAllEnvBlueprints(true)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.EnvBlueprint
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" || req.ObjectType == "" || len(req.Components) == 0 {
			http.Error(w, "name, objectType, and at least one component are required", http.StatusBadRequest)
			return
		}
		id, err := db.UpsertEnvBlueprint(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":        true,
			"blueprintId":    id,
			"boundingRadius": req.BoundingRadius,
		})

	case "DELETE":
		id, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil || id <= 0 {
			http.Error(w, "Missing or invalid id", http.StatusBadRequest)
			return
		}
		if err := db.DeleteEnvBlueprint(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// EnvPoolsHandler serves GET / POST / DELETE /api/env/pools.
func EnvPoolsHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		gameMode := r.URL.Query().Get("gameMode")
		if gameMode == "" {
			gameMode = "space_pirates"
		}
		rulesetID, _ := strconv.Atoi(r.URL.Query().Get("rulesetId"))
		list, err := db.GetModeEnvPools(gameMode, rulesetID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.ModeEnvPoolEntry
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		if req.BlueprintID <= 0 {
			http.Error(w, "blueprintId is required", http.StatusBadRequest)
			return
		}
		poolID, err := db.UpsertModeEnvPool(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"poolId":  poolID,
		})

	case "DELETE":
		poolID, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil || poolID <= 0 {
			http.Error(w, "Missing or invalid id", http.StatusBadRequest)
			return
		}
		if err := db.DeleteModeEnvPool(poolID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// EnvPlacementsHandler serves GET / POST /api/env/placements for the Universal Map Builder.
func EnvPlacementsHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		mapID, err := strconv.Atoi(r.URL.Query().Get("mapId"))
		if err != nil || mapID <= 0 {
			http.Error(w, "Missing or invalid mapId", http.StatusBadRequest)
			return
		}
		list, err := db.GetMapEnvPlacements(mapID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.SaveMapPlacementsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		if req.MapID <= 0 {
			http.Error(w, "mapId is required", http.StatusBadRequest)
			return
		}
		saved, err := db.ReplaceMapEnvPlacements(req.MapID, req.Placements)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":    true,
			"placements": saved,
		})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
