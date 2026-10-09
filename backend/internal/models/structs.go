package models

import "encoding/json"

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message,omitempty"`
	PlayerID int    `json:"playerId,omitempty"`
	Username string `json:"username,omitempty"`
}

type SaveLoadoutRequest struct {
	PlayerID         int             `json:"playerId"`
	LoadoutIndex     int             `json:"loadoutIndex"`
	Name             string          `json:"name"`
	FleetComposition json.RawMessage `json:"fleetComposition"`
	Squad1           json.RawMessage `json:"squad1"`
	Squad2           json.RawMessage `json:"squad2"`
	Squad3           json.RawMessage `json:"squad3"`
	Squad4           json.RawMessage `json:"squad4"`
}

type PlayerLoadout struct {
	ID               int             `json:"id"`
	PlayerID         int             `json:"playerId"`
	LoadoutIndex     int             `json:"loadoutIndex"`
	Name             string          `json:"name"`
	FleetComposition json.RawMessage `json:"fleetComposition"`
	Squad1           json.RawMessage `json:"squad1"`
	Squad2           json.RawMessage `json:"squad2"`
	Squad3           json.RawMessage `json:"squad3"`
	Squad4           json.RawMessage `json:"squad4"`
}

type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type QuadrantStats struct {
	Front     float64 `json:"front"`
	Rear      float64 `json:"rear"`
	Port      float64 `json:"port"`
	Starboard float64 `json:"starboard"`
}

type FleetUnit struct {
	ID          string        `json:"id"`
	Type        string        `json:"type"`
	OwnerID     string        `json:"ownerId"`
	Pos         Vector2D      `json:"pos"`
	Vel         Vector2D      `json:"vel"`
	Angle       float64       `json:"angle"`
	Shields     QuadrantStats `json:"shields"`
	Hull        QuadrantStats `json:"hull"`
	IsFiring    bool          `json:"isFiring"`
	IsDestroyed bool          `json:"isDestroyed"`
	Cooldown    int           `json:"cooldown"`
	MaxCooldown int           `json:"-"`
	Speed       float64       `json:"-"`
	AIState     string        `json:"aiState"`
	WeightClass int           `json:"weightClass"`
	VisionRange int           `json:"visionRange"`
	DPS         float64       `json:"dps"`
}

type Projectile struct {
	ID      string   `json:"id"`
	Pos     Vector2D `json:"pos"`
	Vel     Vector2D `json:"vel"`
	OwnerID string   `json:"ownerId"`
	Type    string   `json:"type"`
	Life    int      `json:"life"`
	Damage  float64  `json:"-"`
}

type ClientInput struct {
	W        bool    `json:"w"`
	S        bool    `json:"s"`
	A        bool    `json:"a"`
	D        bool    `json:"d"`
	Angle    float64 `json:"angle"`
	IsFiring bool    `json:"isFiring"`
	Reset    bool    `json:"reset"`
	Deploy   string  `json:"deploy"`
}

type ServerState struct {
	Units       []*FleetUnit `json:"units"`
	Projectiles []Projectile `json:"projectiles"`
	MapBounds   struct { Width float64 `json:"width"`; Height float64 `json:"height"` } `json:"mapBounds"`
	Tick        uint64       `json:"tick"`
}
