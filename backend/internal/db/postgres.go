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
			unit_class, ai_default_state,
			weight_class, vision_range, aggro_range, aggro_threat_weight, retreat_morale_threshold, squad_cohesion_leash_range,
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
	`

	rows, err := Conn.Query(query)
	if err != nil {
		log.Fatal("❌ Failed to query unit_templates:", err)
	}
	defer rows.Close()

	for rows.Next() {
		var class, aiState string
		var weightClass, visionRange int
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
		var radarImmune, decloakOnActionFlag bool
		var shieldGatedStealthThreshold float64
		var stealthDelay float64
		var resourceHarvestingType int
		var requiresReconTelemetry, requiresAnchorDrone, requiresReconAnchor, portDockingBayStatus, starboardDeploymentBayStatus, salvageableUponDestruction bool
		var cryoGasRadius, cryoEffectDuration, gravitonVortexDuration float64
		var warpCanisterCapacity int
		var emergencyWarpEvacuationTarget bool

		if err := rows.Scan(
			&class, &aiState,
			&weightClass, &visionRange, &aggroRange, &aggroThreatWeight, &retreatMoraleThreshold, &squadCohesionLeashRange,
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
			log.Fatal(err)
		}

		Templates[class] = models.FleetUnit{
			Type:                         class,
			AIState:                      aiState,
			WeightClass:                  weightClass,
			VisionRange:                  visionRange,
			AggroRange:                   aggroRange,
			RetreatMoraleThreshold:       retreatMoraleThreshold,
			SquadCohesionLeashRange:      squadCohesionLeashRange,
			Shields:                      models.QuadrantStats{Front: shieldBase, Rear: shieldBase, Port: shieldBase, Starboard: shieldBase},
			Hull:                         models.QuadrantStats{Front: hullBase, Rear: hullBase, Port: hullBase, Starboard: hullBase},
			ShieldBase:                   shieldBase,
			HullBase:                     hullBase,
			ShieldRegenRate:              shieldRegenRate,
			ShieldRechargeDelayTicks:     shieldRechargeDelayTicks,
			ArmorMitigation:              armorMitigation,
			Speed:                        speed,
			StrafingSpeed:                strafingSpeed,
			TurnRate:                     turnRate,
			AngularVelocity:              angularVelocity,
			LateralThrustPower:           lateralThrustPower,
			ReverseThrustPower:           reverseThrustPower,
			DriftCoefficient:             driftCoefficient,
			AccelerationCurve:            accelerationCurve,
			DPS:                          dps,
			MaxCooldown:                  maxCooldown,
			ProjectileRange:              projectileRange,
			ProjectileSpeed:              projectileSpeed,
			OptimalRange:                 optimalRange,
			MaxRange:                     maxRange,
			EngagementRangeCap:           engagementRangeCap,
			MaxAmmoCapacity:              ammoCap,
			CurrentAmmo:                  ammoCap,
			MaxThermalCapacity:           thermalCap,
			CurrentThermal:               0.0,
			RadarImmunityActive:          radarImmune,
			StealthTimer:                 stealthDelay,
			ResourceHarvestingType:       resourceHarvestingType,
			WarpCanisterCapacity:         warpCanisterCapacity,
			PortDockingBayStatus:         portDockingBayStatus,
			StarboardDeploymentBayStatus: starboardDeploymentBayStatus,
			SalvageableUponDestruction:   salvageableUponDestruction,
			RequiresReconTelemetry:       requiresReconTelemetry,
		}
	}
	log.Printf("🗄️ PostgreSQL connected: Loaded %d unit blueprints into memory with full schema mapping.", len(Templates))
}

func SaveTemplateOverride(unitType string, t models.FleetUnit) {
	if Conn == nil {
		return
	}
	query := `UPDATE unit_templates SET 
		speed = $1, strafing_speed = $2, turn_rate = $3, angular_velocity = $4, acceleration_curve = $5,
		dps = $6, max_cooldown = $7, projectile_range = $8, projectile_speed = $9, max_thermal_capacity = $10,
		shield_base = $11, hull_base = $12, shield_regen_rate = $13, shield_recharge_delay_ticks = $14, armor_mitigation = $15,
		vision_range = $16, aggro_range = $17, retreat_morale_threshold = $18, squad_cohesion_leash_range = $19,
		resource_harvesting_type = $20, warp_canister_capacity = $21, port_docking_bay_status = $22, starboard_deployment_bay_status = $23,
		salvageable_upon_destruction = $24, requires_recon_telemetry = $25
		WHERE unit_class = $26`
	
	_, err := Conn.Exec(query,
		t.Speed, t.StrafingSpeed, t.TurnRate, t.AngularVelocity, t.AccelerationCurve,
		t.DPS, t.MaxCooldown, t.ProjectileRange, t.ProjectileSpeed, t.MaxThermalCapacity,
		t.ShieldBase, t.HullBase, t.ShieldRegenRate, t.ShieldRechargeDelayTicks, t.ArmorMitigation,
		t.VisionRange, t.AggroRange, t.RetreatMoraleThreshold, t.SquadCohesionLeashRange,
		t.ResourceHarvestingType, t.WarpCanisterCapacity, t.PortDockingBayStatus, t.StarboardDeploymentBayStatus,
		t.SalvageableUponDestruction, t.RequiresReconTelemetry,
		unitType,
	)
	if err != nil {
		log.Printf("⚠️ Failed to persist template override for %s to PostgreSQL: %v", unitType, err)
	} else {
		log.Printf("💾 Persisted template override for %s to PostgreSQL", unitType)
	}
}
