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

  let score = 0
  score += ateFood ? 20000 : 0
  score += analysis.pathToFood !== null ? 9000 - analysis.pathToFood * 50 : -6000
  score -= distanceToFood * 12
  score += analysis.reachableArea * 8
  score += analysis.canReachTail ? 3000 : -100000
  if (direction === state.direction) {
    score += 5
  }
  return score
}

export const hunterBot: SnakeBot = {
  id: 'hunter',
  name: 'Hunter',
  description: 'Pushes hard toward food and still rejects moves that would trap itself immediately.',
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
