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
  const marginToWall = Math.min(
    nextHead.x,
    nextHead.y,
    state.gridSize - 1 - nextHead.x,
    state.gridSize - 1 - nextHead.y
  )

  let score = 0
  score += analysis.reachableArea * 35
  score += marginToWall * 120
  score += analysis.canReachTail ? 90000 : -100000
  score += ateFood ? 8000 : 0
  score += analysis.pathToFood !== null ? 2500 - analysis.pathToFood * 8 : -1500
  return score
}

export const explorerBot: SnakeBot = {
  id: 'explorer',
  name: 'Explorer',
  description: 'Roams open lanes and keeps distance from walls for a calmer, lower-risk style.',
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
