import type { Direction } from '../game-types'
import type { BotHelpers, BotState, SnakeBot } from './bot-types'

function scoreDirection(state: BotState, helpers: BotHelpers, direction: Direction): number {
  const simulatedSnake = helpers.simulateMove(state.snake, direction, state.food)
  if (!simulatedSnake) {
    return -Infinity
  }

  const nextHead = simulatedSnake[0]
  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y
  const tail = simulatedSnake[simulatedSnake.length - 1]

  const analysis = helpers.analyzePosition(nextHead, simulatedSnake, { tail, food: state.food })
  const distanceToFood = Math.abs(nextHead.x - state.food.x) + Math.abs(nextHead.y - state.food.y)

  // Center of the grid is our ambush point
  const center = (state.gridSize - 1) / 2
  const distanceToCenter = Math.abs(nextHead.x - center) + Math.abs(nextHead.y - center)

  // Must always be able to reach our tail — survival is non-negotiable
  if (!analysis.canReachTail) {
    return -200000 + analysis.reachableArea * 20
  }

  let score = 0

  // Always eat food we're right next to
  score += ateFood ? 30000 : 0

  // Strike range: if food is close enough, go for it
  const strikeThreshold = Math.max(3, Math.floor(state.gridSize * 0.3))
  if (distanceToFood <= strikeThreshold) {
    // Within strike range — pursue food aggressively
    score += analysis.pathToFood !== null ? 10000 - analysis.pathToFood * 60 : -5000
    score -= distanceToFood * 20
  } else {
    // Food is far — drift toward it but prefer a central route
    score -= distanceToFood * 12
    // Tiebreaker: prefer staying closer to center while approaching
    score -= distanceToCenter * 5
  }

  // Keep enough space to stay safe
  score += analysis.reachableArea * 6

  // Prefer staying still (same direction) to avoid unnecessary movement
  if (direction === state.direction) {
    score += 10
  }

  return score
}

export const ambusherBot: SnakeBot = {
  id: 'ambusher',
  name: 'Ambusher',
  description: 'Lurks near the center and minimizes movement, striking only when food spawns nearby.',
  chooseDirection(state, helpers) {
    const candidates = helpers.getCandidateDirections(state.direction)
    let bestDirection: Direction | null = null
    let bestScore = -Infinity

    for (const direction of candidates) {
      const score = scoreDirection(state, helpers, direction)
      if (score > bestScore) {
        bestScore = score
        bestDirection = direction
      }
    }

    return bestDirection
  }
}
