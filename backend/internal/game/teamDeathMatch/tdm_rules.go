package teamDeathMatch

// CheckWinConditions scans active units and evaluates whether either faction has been fully eliminated.
// Returns the winning faction string ("player" or "enemy"), or "" if the match is still ongoing.
func CheckWinConditions(r *TDMRoom) string {
	playerAliveCount := 0
	enemyAliveCount := 0

	for _, unit := range r.units {
		if unit.IsDestroyed {
			continue
		}
		if unit.OwnerID == "player" {
			playerAliveCount++
		} else if unit.OwnerID == "enemy" {
			enemyAliveCount++
		}
	}

	// If player team is completely wiped out, enemy wins
	if playerAliveCount == 0 && enemyAliveCount > 0 {
		return "enemy"
	}

	// If enemy team is completely wiped out, player wins
	if enemyAliveCount == 0 && playerAliveCount > 0 {
		return "player"
	}

	// Edge case: simultaneous wipeout fallback
	if playerAliveCount == 0 && enemyAliveCount == 0 {
		return "enemy"
	}

	return ""
}
