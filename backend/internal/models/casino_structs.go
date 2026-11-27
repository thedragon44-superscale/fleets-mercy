package models

import (
	"encoding/json"
	"time"
)

// --- AUTH & WALLET ---

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message,omitempty"`
	PlayerID     int    `json:"playerId,omitempty"`
	Username     string `json:"username,omitempty"`
	Role         string `json:"role,omitempty"`
	WalletID     int    `json:"walletId,omitempty"`
	BalanceCents int64  `json:"balanceCents"`
}

type WalletSummary struct {
	WalletID     int       `json:"walletId"`
	PlayerID     int       `json:"playerId"`
	Username     string    `json:"username"`
	Role         string    `json:"role"`
	BalanceCents int64     `json:"balanceCents"`
	Version      int       `json:"version"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type LedgerEntry struct {
	LedgerID          int64     `json:"ledgerId"`
	WalletID          int       `json:"walletId"`
	EntryType         string    `json:"entryType"`
	DeltaCents        int64     `json:"deltaCents"`
	BalanceAfterCents int64     `json:"balanceAfterCents"`
	GameMode          *string   `json:"gameMode,omitempty"`
	SessionID         *int64    `json:"sessionId,omitempty"`
	IssuedByPlayerID  *int      `json:"issuedByPlayerId,omitempty"`
	Note              *string   `json:"note,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
}

type AdminWalletAdjustRequest struct {
	AdminPlayerID  int    `json:"adminPlayerId"`
	TargetUsername string `json:"targetUsername"`
	DeltaCents     int64  `json:"deltaCents"` // Positive = HOUSE_MINT, Negative = HOUSE_REVOKE
	Note           string `json:"note"`
}

// --- SPACE PIRATES CONFIGS ---

type SPRuleset struct {
	RulesetID             int     `json:"rulesetId"`
	Name                  string  `json:"name"`
	ArenaWidth            float64 `json:"arenaWidth"`
	ArenaHeight           float64 `json:"arenaHeight"`
	AllowedMultipliers    []int   `json:"allowedMultipliers"`
	BossExpendedThreshold int     `json:"bossExpendedThreshold"`
	BossEscapeSeconds     int     `json:"bossEscapeSeconds"`
	MaxActiveHarvesters   int     `json:"maxActiveHarvesters"`
	TargetClusterCount    int     `json:"targetClusterCount"`
}

type SPUnitConfig struct {
	UnitClass           string  `json:"unitClass"`
	FactionRole         string  `json:"factionRole"`
	WeightClass         int     `json:"weightClass"`
	BaseCostCents       int64   `json:"baseCostCents"`
	BaseBountyCents     int64   `json:"baseBountyCents"`
	MaxAmmo             int     `json:"maxAmmo"`
	DamagePerShot       float64 `json:"damagePerShot"`
	MaxCooldown         int     `json:"maxCooldown"`
	ShieldBase          float64 `json:"shieldBase"`
	HullBase            float64 `json:"hullBase"`
	Speed               float64 `json:"speed"`
	TurnRate            float64 `json:"turnRate"`
	ProjectileSpeed     float64 `json:"projectileSpeed"`
	ProjectileRange     float64 `json:"projectileRange"`
	OptimalRange        float64 `json:"optimalRange"`
	ProjType            string  `json:"projType"`
	CanFire             bool    `json:"canFire"`
	FillDurationSeconds int     `json:"fillDurationSeconds"`
	CryoRadius          float64 `json:"cryoRadius"`
	CryoDurationSeconds float64 `json:"cryoDurationSeconds"`
	CryoSlowFactor      float64 `json:"cryoSlowFactor"`
	IsEnabled           bool    `json:"isEnabled"`
}

type SPResource struct {
	ResourceKey         string `json:"resourceKey"`
	EnumCode            uint8  `json:"enumCode"`
	DisplayName         string `json:"displayName"`
	Tier                string `json:"tier"`
	HarvesterUnitClass  string `json:"harvesterUnitClass"`
	MaxCargoBountyCents int64  `json:"maxCargoBountyCents"`
	SpawnWeight         int    `json:"spawnWeight"`
	ColorHex            string `json:"colorHex"`
}

type ClusterNodeSpec struct {
	DX             float64 `json:"dx"`
	DY             float64 `json:"dy"`
	Radius         float64 `json:"radius"`
	IsNode         bool    `json:"is_node"`
	SlotTier       *string `json:"slot_tier"`       // "common", "mid", "rare", "any", or null
	PinnedResource *string `json:"pinned_resource"` // Optional resource_key override
}

type SPClusterVariant struct {
	VariantID      int               `json:"variantId"`
	Name           string            `json:"name"`
	NodesLayout    []ClusterNodeSpec `json:"nodesLayout"`
	BoundingRadius float64           `json:"boundingRadius"`
	ScaleMin       float64           `json:"scaleMin"`
	ScaleMax       float64           `json:"scaleMax"`
	SpeedMin       float64           `json:"speedMin"`
	SpeedMax       float64           `json:"speedMax"`
	SpinRate       float64           `json:"spinRate"`
	MinWraps       int               `json:"minWraps"`
	MaxWraps       int               `json:"maxWraps"`
	SpawnWeight    int               `json:"spawnWeight"`
	MaxConcurrent  int               `json:"maxConcurrent"`
	IsEnabled      bool              `json:"isEnabled"`
	RawLayout      json.RawMessage   `json:"-"`
}
