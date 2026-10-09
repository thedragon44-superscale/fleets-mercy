package db

import (
	"database/sql"
	"log"

	"space-tactics-server/internal/models"
	_ "github.com/lib/pq"
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

	rows, err := Conn.Query("SELECT unit_class, speed, max_cooldown, shield_base, hull_base, ai_default_state, weight_class, vision_range, dps FROM unit_templates")
	if err != nil {
		log.Fatal("❌ Failed to query unit_templates:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var class, aiState string
		var speed, shieldBase, hullBase, dps float64
		var maxCooldown, weightClass, visionRange int
		if err := rows.Scan(&class, &speed, &maxCooldown, &shieldBase, &hullBase, &aiState, &weightClass, &visionRange, &dps); err != nil {
			log.Fatal(err)
		}
		Templates[class] = models.FleetUnit{
			Speed: speed, MaxCooldown: maxCooldown, AIState: aiState,
			Shields: models.QuadrantStats{Front: shieldBase, Rear: shieldBase, Port: shieldBase, Starboard: shieldBase},
			Hull:    models.QuadrantStats{Front: hullBase, Rear: hullBase, Port: hullBase, Starboard: hullBase},
			WeightClass: weightClass,
			VisionRange: visionRange,
			DPS:         dps,
		}
	}
	log.Printf("🗄️ PostgreSQL connected: Loaded %d unit blueprints into memory.", len(Templates))
}
