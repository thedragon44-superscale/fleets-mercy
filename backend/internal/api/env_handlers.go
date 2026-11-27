package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"
)

// OnMapUpdated is an optional callback wired by main.go so live cached Sandbox rooms
// immediately reload their envphysics.World when a map is saved in Universal Map Builder.
var OnMapUpdated func(mapID int)

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
		if OnMapUpdated != nil {
			OnMapUpdated(req.MapID)
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

// SPEnvPoolHandler serves GET / POST / DELETE /api/casino/sp/pool for Space Pirates' customizable spawn pool.
func SPEnvPoolHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		rulesetID, _ := strconv.Atoi(r.URL.Query().Get("rulesetId"))
		list, err := db.GetSPEnvPool(rulesetID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.SPEnvPoolEntry
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		if req.BlueprintID <= 0 {
			http.Error(w, "blueprintId is required", http.StatusBadRequest)
			return
		}
		id, err := db.UpsertSPEnvPoolEntry(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"poolId":  id,
		})

	case "DELETE":
		poolID, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil || poolID <= 0 {
			http.Error(w, "Missing or invalid id", http.StatusBadRequest)
			return
		}
		if err := db.DeleteSPEnvPoolEntry(poolID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// UniversalMapsHandler serves GET / POST / DELETE /api/maps backed by maps + map_env_placements.
func UniversalMapsHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		list, err := db.ListUniversalMaps()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.SaveUniversalMapRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		req.Name = strings.TrimSpace(req.Name)
		if req.Name == "" {
			http.Error(w, "Map name is required", http.StatusBadRequest)
			return
		}
		saved, err := db.SaveUniversalMap(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if OnMapUpdated != nil {
			OnMapUpdated(saved.ID)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"mapId":   saved.ID,
			"map":     saved,
		})

	case "DELETE":
		mapID, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil || mapID <= 0 {
			http.Error(w, "Missing or invalid id", http.StatusBadRequest)
			return
		}
		if err := db.DeleteUniversalMap(mapID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// UniversalMapDetailHandler serves GET /api/map-detail?id=<id> with hydrated blueprint placements.
func UniversalMapDetailHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	mapID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || mapID <= 0 {
		http.Error(w, "Missing or invalid map id parameter", http.StatusBadRequest)
		return
	}

	detail, err := db.GetUniversalMapDetail(mapID)
	if err == sql.ErrNoRows {
		http.Error(w, "Map not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(detail)
}
