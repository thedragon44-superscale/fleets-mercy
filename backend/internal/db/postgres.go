package db

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
	"space-tactics-server/internal/models"
)

var Templates = make(map[string]models.FleetUnit)
var Conn *sql.DB

func InitDB() {
	connStr := "user=gameadmin password=tactics123 dbname=spacetactics sslmode=disable"
	var err error
	Conn, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ Failed to open DB:", err)
	}
	
	if err = Conn.Ping(); err != nil {
		log.Fatal("❌ Failed to connect to PostgreSQL:", err)
	}

	query := `
		SELECT 
			unit_class, speed, max_cooldown, shield_base, hull_base, 
			ai_default_state, weight_class, vision_range, dps,
			max_thermal_capacity, thermal_dissipation_rate, ammo_capacity,
			radar_immunity_active, stealth_recovery_delay_seconds
		FROM unit_templates
	`

	rows, err := Conn.Query(query)
	if err != nil {
		log.Fatal("❌ Failed to query unit_templates:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var class, aiState string
		var speed, shieldBase, hullBase, dps, thermalCap, thermalDiss, stealthDelay float64
		var maxCooldown, weightClass, visionRange, ammoCap int
		var radarImmune bool

		if err := rows.Scan(
			&class, &speed, &maxCooldown, &shieldBase, &hullBase, 
			&aiState, &weightClass, &visionRange, &dps,
			&thermalCap, &thermalDiss, &ammoCap,
			&radarImmune, &stealthDelay,
		); err != nil {
			log.Fatal(err)
		}

		Templates[class] = models.FleetUnit{
			Type:                class,
			Speed:               speed,
			MaxCooldown:         maxCooldown,
			AIState:             aiState,
			Shields:             models.QuadrantStats{Front: shieldBase, Rear: shieldBase, Port: shieldBase, Starboard: shieldBase},
			Hull:                models.QuadrantStats{Front: hullBase, Rear: hullBase, Port: hullBase, Starboard: hullBase},
			WeightClass:         weightClass,
			VisionRange:         visionRange,
			DPS:                 dps,
			MaxThermalCapacity:  thermalCap,
			CurrentThermal:      0.0,
			MaxAmmoCapacity:     ammoCap,
			CurrentAmmo:         ammoCap,
			RadarImmunityActive: radarImmune,
			StealthTimer:        stealthDelay,
		}
	}
	log.Printf("🗄️ PostgreSQL connected: Loaded %d unit blueprints into memory.", len(Templates))
}
