package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"

	"golang.org/x/crypto/bcrypt"
)

func enableCasinoCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// RegisterHandler lets players self-register (starts with role='player' and $0.00 balance).
func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if len(req.Username) < 3 || len(req.Password) < 4 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.AuthResponse{
			Success: false,
			Message: "Username must be at least 3 characters and password at least 4 characters.",
		})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	playerID, walletID, err := db.CreatePlayerWithWallet(req.Username, string(hash))
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		json.NewEncoder(w).Encode(models.AuthResponse{
			Success: false,
			Message: "Username is already taken.",
		})
		return
	}

	json.NewEncoder(w).Encode(models.AuthResponse{
		Success:      true,
		PlayerID:     playerID,
		Username:     req.Username,
		Role:         "player",
		WalletID:     walletID,
		BalanceCents: 0,
	})
}

// CasinoLoginHandler verifies bcrypt OR legacy plaintext passwords (auto-upgrading legacy hashes on login)
// and returns role + wallet balance.
func CasinoLoginHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
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
	var storedHash, role string
	var isActive bool
	err := db.Conn.QueryRow(
		`SELECT id, password_hash, role, is_active FROM players WHERE username = $1`,
		req.Username,
	).Scan(&id, &storedHash, &role, &isActive)

	w.Header().Set("Content-Type", "application/json")
	if err == sql.ErrNoRows || !isActive {
		json.NewEncoder(w).Encode(models.AuthResponse{Success: false, Message: "Invalid credentials"})
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	valid := false
	if strings.HasPrefix(storedHash, "$2a$") || strings.HasPrefix(storedHash, "$2b$") {
		valid = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)) == nil
	} else if storedHash == req.Password {
		valid = true
		// Transparently upgrade legacy plaintext password (e.g., admin01) to bcrypt
		if upgraded, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost); err == nil {
			_, _ = db.Conn.Exec(`UPDATE players SET password_hash = $1 WHERE id = $2`, string(upgraded), id)
		}
	}

	if !valid {
		json.NewEncoder(w).Encode(models.AuthResponse{Success: false, Message: "Invalid credentials"})
		return
	}

	_, _ = db.Conn.Exec(`UPDATE players SET last_login_at = NOW() WHERE id = $1`, id)

	wallet, err := db.GetWalletByPlayerID(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(models.AuthResponse{
		Success:      true,
		PlayerID:     id,
		Username:     req.Username,
		Role:         role,
		WalletID:     wallet.WalletID,
		BalanceCents: wallet.BalanceCents,
	})
}

// GetWalletHandler returns the player's current balance and recent ledger entries.
func GetWalletHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	playerID, err := strconv.Atoi(r.URL.Query().Get("playerId"))
	if err != nil {
		http.Error(w, "Missing or invalid playerId", http.StatusBadRequest)
		return
	}

	wallet, err := db.GetWalletByPlayerID(playerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	ledger, _ := db.GetWalletLedger(playerID, 25)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"wallet": wallet,
		"ledger": ledger,
	})
}

// AdminListPlayersHandler returns all accounts & balances for the house_admin panel.
func AdminListPlayersHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	adminID, err := strconv.Atoi(r.URL.Query().Get("adminPlayerId"))
	if err != nil || db.VerifyHouseAdmin(adminID) != nil {
		http.Error(w, "Unauthorized: house_admin required", http.StatusForbidden)
		return
	}

	players, err := db.ListAllPlayerWallets()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(players)
}

// AdminAdjustWalletHandler gives house_admin unlimited currency minting or revoking power.
func AdminAdjustWalletHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req models.AdminWalletAdjustRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if err := db.VerifyHouseAdmin(req.AdminPlayerID); err != nil {
		http.Error(w, "Unauthorized: house_admin required", http.StatusForbidden)
		return
	}
	if req.DeltaCents == 0 {
		http.Error(w, "deltaCents cannot be zero", http.StatusBadRequest)
		return
	}

	targetID, err := db.GetPlayerIDByUsername(strings.TrimSpace(req.TargetUsername))
	if err != nil {
		http.Error(w, "Target player not found", http.StatusNotFound)
		return
	}

	entryType := "HOUSE_MINT"
	if req.DeltaCents < 0 {
		entryType = "HOUSE_REVOKE"
	}
	note := req.Note
	if note == "" {
		note = "Admin adjustment"
	}

	newBal, err := db.AdjustWalletAtomic(targetID, req.DeltaCents, entryType, nil, nil, &req.AdminPlayerID, &note)
	if errors.Is(err, db.ErrInsufficientFunds) {
		http.Error(w, "Cannot revoke more than player's current balance", http.StatusBadRequest)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"targetId":     targetID,
		"balanceCents": newBal,
	})
}

// GetSPConfigHandler returns live Space Pirates ruleset, units, and resources for the frontend.
func GetSPConfigHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	db.SPCache.Mu.RLock()
	resp := map[string]interface{}{
		"ruleset":   db.SPCache.Ruleset,
		"units":     db.SPCache.Units,
		"resources": db.SPCache.Resources,
	}
	db.SPCache.Mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// SPClustersHandler provides GET / POST / DELETE CRUD for the Asteroid Cluster Designer.
func SPClustersHandler(w http.ResponseWriter, r *http.Request) {
	enableCasinoCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		list, err := db.GetAllClusterVariants(true)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)

	case "POST":
		var req models.SPClusterVariant
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(req.Name) == "" || len(req.NodesLayout) == 0 {
			http.Error(w, "Cluster name and at least one rock/node are required", http.StatusBadRequest)
			return
		}

		id, err := db.UpsertClusterVariant(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":        true,
			"variantId":      id,
			"boundingRadius": req.BoundingRadius,
		})

	case "DELETE":
		id, err := strconv.Atoi(r.URL.Query().Get("id"))
		if err != nil {
			http.Error(w, "Missing or invalid id", http.StatusBadRequest)
			return
		}
		if err := db.DeleteClusterVariant(id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
