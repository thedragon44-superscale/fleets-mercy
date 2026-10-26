package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

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

func GetMapsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	rows, err := db.Conn.Query("SELECT map_id, map_key, map_name, description, width, height FROM maps ORDER BY map_id ASC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var maps []models.MapDefinition
	for rows.Next() {
		var m models.MapDefinition
		if err := rows.Scan(&m.ID, &m.MapKey, &m.Name, &m.Description, &m.Width, &m.Height); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		maps = append(maps, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(maps)
}

func GetMapDetailHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	mapIdStr := r.URL.Query().Get("id")
	mapId, err := strconv.Atoi(mapIdStr)
	if err != nil {
		http.Error(w, "Missing or invalid map id parameter", http.StatusBadRequest)
		return
	}

	var m models.MapDefinition
	err = db.Conn.QueryRow("SELECT map_id, map_key, map_name, description, width, height FROM maps WHERE map_id = $1", mapId).
		Scan(&m.ID, &m.MapKey, &m.Name, &m.Description, &m.Width, &m.Height)
	if err == sql.ErrNoRows {
		http.Error(w, "Map not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	structRows, err := db.Conn.Query(
		`SELECT ms.structure_id, ms.map_id, es.structure_key, ms.pos_x, ms.pos_y, ms.radius, ms.custom_props 
		 FROM map_structures ms 
		 JOIN environmental_structures es ON ms.environmental_structure_id = es.id 
		 WHERE ms.map_id = $1`, 
		mapId,
	)
	if err == nil {
		defer structRows.Close()
		for structRows.Next() {
			var s models.MapStructure
			var props []byte
			if err := structRows.Scan(&s.ID, &s.MapID, &s.StructureType, &s.PosX, &s.PosY, &s.Radius, &props); err == nil {
				s.CustomProps = props
				m.Structures = append(m.Structures, s)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m)
}

type SaveMapRequest struct {
	ID          *int    `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
	Structures  []struct {
		Type   string  `json:"type"`
		X      float64 `json:"x"`
		Y      float64 `json:"y"`
		Radius float64 `json:"radius"`
	} `json:"structures"`
}

func SaveCustomMapHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var req SaveMapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ SaveCustomMapHandler JSON Decode Error: %v", err)
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	tx, err := db.Conn.Begin()
	if err != nil {
		log.Printf("❌ SaveCustomMapHandler DB Begin Error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var mapID int

	if req.ID != nil && *req.ID > 0 {
		mapID = *req.ID
		_, err = tx.Exec(
			"UPDATE maps SET map_name = $1, description = $2, width = $3, height = $4 WHERE map_id = $5",
			req.Name, req.Description, req.Width, req.Height, mapID,
		)
		if err != nil {
			log.Printf("❌ SaveCustomMapHandler Map Update Error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		_, err = tx.Exec("DELETE FROM map_structures WHERE map_id = $1", mapID)
		if err != nil {
			log.Printf("❌ SaveCustomMapHandler Clear Structures Error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		mapKey := "custom_" + strconv.FormatInt(time.Now().UnixNano(), 36)
		err = tx.QueryRow(
			"INSERT INTO maps (map_key, map_name, description, width, height) VALUES ($1, $2, $3, $4, $5) RETURNING map_id",
			mapKey, req.Name, req.Description, req.Width, req.Height,
		).Scan(&mapID)
		if err != nil {
			log.Printf("❌ SaveCustomMapHandler Map Insert Error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	for _, s := range req.Structures {
		var structureID int
		err = tx.QueryRow("SELECT id FROM environmental_structures WHERE structure_key = $1", s.Type).Scan(&structureID)
		if err != nil {
			log.Printf("❌ SaveCustomMapHandler Structure Lookup Error for type '%s': %v", s.Type, err)
			http.Error(w, "Invalid structure type: "+s.Type, http.StatusBadRequest)
			return
		}

		_, err = tx.Exec(
			"INSERT INTO map_structures (map_id, environmental_structure_id, pos_x, pos_y, radius) VALUES ($1, $2, $3, $4, $5)",
			mapID, structureID, s.X, s.Y, s.Radius,
		)
		if err != nil {
			log.Printf("❌ SaveCustomMapHandler Structure Insert Error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("❌ SaveCustomMapHandler Commit Error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "mapId": mapID})
}

func GetTemplatesHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	rows, err := db.Conn.Query(`
		SELECT 
			unit_class, ai_default_state,
			weight_class, vision_range, sensor_range, aggro_range, aggro_threat_weight, retreat_morale_threshold, squad_cohesion_leash_range,
			shield_base, hull_base, quadrant_shielding_enabled, quadrant_shield_pools_enabled, quadrant_hull_pools_enabled, 
			shield_regen_rate, shield_recharge_delay_ticks, directional_shield_arc, armor_mitigation, armor_hardness_rating, ablative_plating_durability,
			speed, strafing_speed, turn_rate, angular_velocity, lateral_thrust_power, reverse_thrust_power, drift_coefficient, acceleration_curve,
			dps, max_cooldown, projectile_range, projectile_speed, optimal_range, max_range, engagement_range_cap, ammo_capacity, initial_ordnance_capacity, 
			turret_traverse_speed, weapon_dispersion_bloom, projectile_tracking_capability, shield_penetration_factor, sustained_fire_limit_seconds, 
			barrel_cooling_duration_seconds, burst_salvo_cooldown, beam_raycast_duration, max_thermal_capacity, thermal_dissipation_rate, power_grid_allocation_weight,
			radar_cross_section, sensor_resolution_tier, jamming_susceptibility, target_lock_time, radar_immunity_active, shield_gated_stealth_threshold, 
			decloak_on_action_flag, stealth_recovery_delay_seconds,
			resource_harvesting_type, requires_recon_telemetry, requires_anchor_drone, requires_recon_anchor, port_docking_bay_status, 
			starboard_deployment_bay_status, salvageable_upon_destruction, cryo_gas_radius, cryo_effect_duration, graviton_vortex_duration, 
			warp_canister_capacity, emergency_warp_evacuation_target
		FROM unit_templates
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	templatesMap := make(map[string]map[string]interface{})
	for rows.Next() {
		var class, aiState string
		var weightClass, visionRange int
		var sensorRange float64
		var aggroRange, aggroThreatWeight, retreatMoraleThreshold, squadCohesionLeashRange float64
		var shieldBase, hullBase, shieldRegenRate, armorMitigation, armorHardnessRating, ablativePlatingDurability float64
		var quadrantShieldingEnabled, quadrantShieldPoolsEnabled, quadrantHullPoolsEnabled bool
		var shieldRechargeDelayTicks int
		var directionalShieldArc float64
		var speed, strafingSpeed, turnRate, angularVelocity, lateralThrustPower, reverseThrustPower, driftCoefficient, accelerationCurve float64
		var dps, projectileRange, projectileSpeed, optimalRange, maxRange, engagementRangeCap float64
		var maxCooldown, ammoCap, initialOrdnanceCapacity int
		var turretTraverseSpeed, weaponDispersionBloom, projectileTrackingCapability, shieldPenetrationFactor float64
		var sustainedFireLimitSeconds, barrelCoolingDurationSeconds, burstSalvoCooldown, beamRaycastDuration float64
		var thermalCap, thermalDiss, powerGridAllocationWeight float64
		var radarCrossSection, sensorResolutionTier, jammingSusceptibility, targetLockTime float64
		var radarImmune, decloakOnActionFlag, emergencyWarpEvacuationTarget bool
		var shieldGatedStealthThreshold float64
		var stealthDelay float64
		var resourceHarvestingType int
		var requiresReconTelemetry, requiresAnchorDrone, requiresReconAnchor, portDockingBayStatus, starboardDeploymentBayStatus, salvageableUponDestruction bool
		var cryoGasRadius, cryoEffectDuration, gravitonVortexDuration float64
		var warpCanisterCapacity int

		if err := rows.Scan(
			&class, &aiState,
			&weightClass, &visionRange, &sensorRange, &aggroRange, &aggroThreatWeight, &retreatMoraleThreshold, &squadCohesionLeashRange,
			&shieldBase, &hullBase, &quadrantShieldingEnabled, &quadrantShieldPoolsEnabled, &quadrantHullPoolsEnabled, 
			&shieldRegenRate, &shieldRechargeDelayTicks, &directionalShieldArc, &armorMitigation, &armorHardnessRating, &ablativePlatingDurability,
			&speed, &strafingSpeed, &turnRate, &angularVelocity, &lateralThrustPower, &reverseThrustPower, &driftCoefficient, &accelerationCurve,
			&dps, &maxCooldown, &projectileRange, &projectileSpeed, &optimalRange, &maxRange, &engagementRangeCap, &ammoCap, &initialOrdnanceCapacity, 
			&turretTraverseSpeed, &weaponDispersionBloom, &projectileTrackingCapability, &shieldPenetrationFactor, &sustainedFireLimitSeconds, 
			&barrelCoolingDurationSeconds, &burstSalvoCooldown, &beamRaycastDuration, &thermalCap, &thermalDiss, &powerGridAllocationWeight,
			&radarCrossSection, &sensorResolutionTier, &jammingSusceptibility, &targetLockTime, &radarImmune, &shieldGatedStealthThreshold, 
			&decloakOnActionFlag, &stealthDelay,
			&resourceHarvestingType, &requiresReconTelemetry, &requiresAnchorDrone, &requiresReconAnchor, &portDockingBayStatus, 
			&starboardDeploymentBayStatus, &salvageableUponDestruction, &cryoGasRadius, &cryoEffectDuration, &gravitonVortexDuration, 
			&warpCanisterCapacity, &emergencyWarpEvacuationTarget,
		); err != nil {
			continue
		}

		templatesMap[class] = map[string]interface{}{
			"unitClass":                   class,
			"aiDefaultState":              aiState,
			"weightClass":                 weightClass,
			"visionRange":                 visionRange,
			"sensorRange":                 sensorRange,
			"aggroRange":                  aggroRange,
			"aggroThreatWeight":           aggroThreatWeight,
			"retreatMoraleThreshold":      retreatMoraleThreshold,
			"squadCohesionLeashRange":     squadCohesionLeashRange,
			"shieldBase":                  shieldBase,
			"hullBase":                    hullBase,
			"quadrantShieldingEnabled":    quadrantShieldingEnabled,
			"quadrantShieldPoolsEnabled":  quadrantShieldPoolsEnabled,
			"quadrantHullPoolsEnabled":    quadrantHullPoolsEnabled,
			"shieldRegenRate":             shieldRegenRate,
			"shieldRechargeDelayTicks":    shieldRechargeDelayTicks,
			"directionalShieldArc":        directionalShieldArc,
			"armorMitigation":             armorMitigation,
			"armorHardnessRating":         armorHardnessRating,
			"ablativePlatingDurability":   ablativePlatingDurability,
			"speed":                       speed,
			"strafingSpeed":               strafingSpeed,
			"turnRate":                    turnRate,
			"angularVelocity":             angularVelocity,
			"lateralThrustPower":          lateralThrustPower,
			"reverseThrustPower":          reverseThrustPower,
			"driftCoefficient":            driftCoefficient,
			"accelerationCurve":           accelerationCurve,
			"dps":                         dps,
			"maxCooldown":                 maxCooldown,
			"projectileRange":             projectileRange,
			"projectileSpeed":             projectileSpeed,
			"optimalRange":                optimalRange,
			"maxRange":                    maxRange,
			"engagementRangeCap":          engagementRangeCap,
			"ammoCapacity":                ammoCap,
			"initialOrdnanceCapacity":     initialOrdnanceCapacity,
			"turretTraverseSpeed":         turretTraverseSpeed,
			"weaponDispersionBloom":       weaponDispersionBloom,
			"projectileTrackingCapability": projectileTrackingCapability,
			"shieldPenetrationFactor":     shieldPenetrationFactor,
			"sustainedFireLimitSeconds":   sustainedFireLimitSeconds,
			"barrelCoolingDurationSeconds": barrelCoolingDurationSeconds,
			"burstSalvoCooldown":          burstSalvoCooldown,
			"beamRaycastDuration":         beamRaycastDuration,
			"maxThermalCapacity":          thermalCap,
			"thermalDissipationRate":      thermalDiss,
			"powerGridAllocationWeight":   powerGridAllocationWeight,
			"radarCrossSection":           radarCrossSection,
			"sensorResolutionTier":        sensorResolutionTier,
			"jammingSusceptibility":       jammingSusceptibility,
			"targetLockTime":              targetLockTime,
			"radarImmunityActive":         radarImmune,
			"shieldGatedStealthThreshold": shieldGatedStealthThreshold,
			"decloakOnActionFlag":         decloakOnActionFlag,
			"stealthRecoveryDelaySeconds": stealthDelay,
			"resourceHarvestingType":      resourceHarvestingType,
			"requiresReconTelemetry":      requiresReconTelemetry,
			"requiresAnchorDrone":         requiresAnchorDrone,
			"requiresReconAnchor":         requiresReconAnchor,
			"portDockingBayStatus":        portDockingBayStatus,
			"starboardDeploymentBayStatus": starboardDeploymentBayStatus,
			"salvageableUponDestruction":  salvageableUponDestruction,
			"cryoGasRadius":               cryoGasRadius,
			"cryoEffectDuration":          cryoEffectDuration,
			"gravitonVortexDuration":      gravitonVortexDuration,
			"warpCanisterCapacity":        warpCanisterCapacity,
			"emergencyWarpEvacuationTarget": emergencyWarpEvacuationTarget,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templatesMap)
}

func SaveTemplateHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" { return }

	if r.Method != "POST" {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	unitType := r.URL.Query().Get("type")
	if unitType == "" {
		http.Error(w, "Missing unit type parameter", http.StatusBadRequest)
		return
	}

	var req map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	getFloat := func(key string) float64 {
		if v, ok := req[key].(float64); ok { return v }
		return 0
	}
	getInt := func(key string) int {
		if v, ok := req[key].(float64); ok { return int(v) }
		return 0
	}
	getBool := func(key string) bool {
		if v, ok := req[key].(bool); ok { return v }
		return false
	}

	query := `
		UPDATE unit_templates SET 
			weight_class = $1, vision_range = $2, aggro_range = $3, aggro_threat_weight = $4, retreat_morale_threshold = $5, squad_cohesion_leash_range = $6,
			shield_base = $7, hull_base = $8, quadrant_shielding_enabled = $9, quadrant_shield_pools_enabled = $10, quadrant_hull_pools_enabled = $11, 
			shield_regen_rate = $12, shield_recharge_delay_ticks = $13, directional_shield_arc = $14, armor_mitigation = $15, armor_hardness_rating = $16, ablative_plating_durability = $17,
			speed = $18, strafing_speed = $19, turn_rate = $20, angular_velocity = $21, lateral_thrust_power = $22, reverse_thrust_power = $23, drift_coefficient = $24, acceleration_curve = $25,
			dps = $26, max_cooldown = $27, projectile_range = $28, projectile_speed = $29, optimal_range = $30, max_range = $31, engagement_range_cap = $32, ammo_capacity = $33, initial_ordnance_capacity = $34, 
			turret_traverse_speed = $35, weapon_dispersion_bloom = $36, projectile_tracking_capability = $37, shield_penetration_factor = $38, sustained_fire_limit_seconds = $39, 
			barrel_cooling_duration_seconds = $40, burst_salvo_cooldown = $41, beam_raycast_duration = $42, max_thermal_capacity = $43, thermal_dissipation_rate = $44, power_grid_allocation_weight = $45,
			radar_cross_section = $46, sensor_resolution_tier = $47, jamming_susceptibility = $48, target_lock_time = $49, radar_immunity_active = $50, shield_gated_stealth_threshold = $51, 
			decloak_on_action_flag = $52, stealth_recovery_delay_seconds = $53,
			resource_harvesting_type = $54, requires_recon_telemetry = $55, requires_anchor_drone = $56, requires_recon_anchor = $57, port_docking_bay_status = $58, 
			starboard_deployment_bay_status = $59, salvageable_upon_destruction = $60, cryo_gas_radius = $61, cryo_effect_duration = $62, graviton_vortex_duration = $63, 
			warp_canister_capacity = $64, emergency_warp_evacuation_target = $65, sensor_range = $66
		WHERE unit_class = $67
	`

	_, err := db.Conn.Exec(query,
		getInt("weightClass"), getInt("visionRange"), getFloat("aggroRange"), getFloat("aggroThreatWeight"), getFloat("retreatMoraleThreshold"), getFloat("squadCohesionLeashRange"),
		getFloat("shieldBase"), getFloat("hullBase"), getBool("quadrantShieldingEnabled"), getBool("quadrantShieldPoolsEnabled"), getBool("quadrantHullPoolsEnabled"),
		getFloat("shieldRegenRate"), getInt("shieldRechargeDelayTicks"), getFloat("directionalShieldArc"), getFloat("armorMitigation"), getFloat("armorHardnessRating"), getFloat("ablativePlatingDurability"),
		getFloat("speed"), getFloat("strafingSpeed"), getFloat("turnRate"), getFloat("angularVelocity"), getFloat("lateralThrustPower"), getFloat("reverseThrustPower"), getFloat("driftCoefficient"), getFloat("accelerationCurve"),
		getFloat("dps"), getInt("maxCooldown"), getFloat("projectileRange"), getFloat("projectileSpeed"), getFloat("optimalRange"), getFloat("maxRange"), getFloat("engagementRangeCap"), getInt("ammoCapacity"), getInt("initialOrdnanceCapacity"),
		getFloat("turretTraverseSpeed"), getFloat("weaponDispersionBloom"), getFloat("projectileTrackingCapability"), getFloat("shieldPenetrationFactor"), getFloat("sustainedFireLimitSeconds"),
		getFloat("barrelCoolingDurationSeconds"), getFloat("burstSalvoCooldown"), getFloat("beamRaycastDuration"), getFloat("maxThermalCapacity"), getFloat("thermalDissipationRate"), getFloat("powerGridAllocationWeight"),
		getFloat("radarCrossSection"), getFloat("sensorResolutionTier"), getFloat("jammingSusceptibility"), getFloat("targetLockTime"), getBool("radarImmunityActive"), getFloat("shieldGatedStealthThreshold"),
		getBool("decloakOnActionFlag"), getFloat("stealthRecoveryDelaySeconds"),
		getInt("resourceHarvestingType"), getBool("requiresReconTelemetry"), getBool("requiresAnchorDrone"), getBool("requiresReconAnchor"), getBool("portDockingBayStatus"),
		getBool("starboardDeploymentBayStatus"), getBool("salvageableUponDestruction"), getFloat("cryoGasRadius"), getFloat("cryoEffectDuration"), getFloat("gravitonVortexDuration"),
		getInt("warpCanisterCapacity"), getBool("emergencyWarpEvacuationTarget"), getFloat("sensorRange"),
		unitType,
	)

	if err != nil {
		log.Printf("❌ SaveTemplateHandler Error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Immediately sync the in-memory template cache so active rooms reflect changes without rebooting
	if tmpl, exists := db.Templates[unitType]; exists {
		tmpl.WeightClass = getInt("weightClass")
		tmpl.VisionRange = getInt("visionRange")
		tmpl.SensorRange = getFloat("sensorRange")
		tmpl.AggroRange = getFloat("aggroRange")
		tmpl.RetreatMoraleThreshold = getFloat("retreatMoraleThreshold")
		tmpl.SquadCohesionLeashRange = getFloat("squadCohesionLeashRange")
		tmpl.ShieldBase = getFloat("shieldBase")
		tmpl.HullBase = getFloat("hullBase")
		tmpl.ShieldRegenRate = getFloat("shieldRegenRate")
		tmpl.ShieldRechargeDelayTicks = getInt("shieldRechargeDelayTicks")
		tmpl.ArmorMitigation = getFloat("armorMitigation")
		tmpl.Speed = getFloat("speed")
		tmpl.StrafingSpeed = getFloat("strafingSpeed")
		tmpl.TurnRate = getFloat("turnRate")
		tmpl.AngularVelocity = getFloat("angularVelocity")
		tmpl.LateralThrustPower = getFloat("lateralThrustPower")
		tmpl.ReverseThrustPower = getFloat("reverseThrustPower")
		tmpl.DriftCoefficient = getFloat("driftCoefficient")
		tmpl.AccelerationCurve = getFloat("accelerationCurve")
		tmpl.DPS = getFloat("dps")
		tmpl.MaxCooldown = getInt("maxCooldown")
		tmpl.ProjectileRange = getFloat("projectileRange")
		tmpl.ProjectileSpeed = getFloat("projectileSpeed")
		tmpl.MaxThermalCapacity = getFloat("maxThermalCapacity")
		tmpl.MaxAmmoCapacity = getInt("ammoCapacity")
		tmpl.ResourceHarvestingType = getInt("resourceHarvestingType")
		tmpl.WarpCanisterCapacity = getInt("warpCanisterCapacity")
		tmpl.PortDockingBayStatus = getBool("portDockingBayStatus")
		tmpl.StarboardDeploymentBayStatus = getBool("starboardDeploymentBayStatus")
		tmpl.SalvageableUponDestruction = getBool("salvageableUponDestruction")
		tmpl.RequiresReconTelemetry = getBool("requiresReconTelemetry")
		db.Templates[unitType] = tmpl
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
