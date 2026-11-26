package teamDeathMatch

// CheckWinConditions scans active units and evaluates whether either faction has been fully eliminated.
// Returns the winning faction string ("player", "enemy", or "draw"), or "" if the match is still ongoing.
func CheckWinConditions(r *TDMRoom) string {
	playerAliveCount := 0
	enemyAliveCount := 0

	for _, unit := range r.GetUnits() {
		if unit.IsDestroyed {
			continue
		}
		if unit.OwnerID == "player" {
			playerAliveCount++
		} else if unit.OwnerID == "enemy" {
			enemyAliveCount++
		}
	}

	if playerAliveCount == 0 && enemyAliveCount > 0 {
		return "enemy"
	}

	if enemyAliveCount == 0 && playerAliveCount > 0 {
		return "player"
	}

	if playerAliveCount == 0 && enemyAliveCount == 0 {
		return "draw"
	}

	return ""
}
