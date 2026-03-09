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
  const reachableArea = helpers.countReachableArea(nextHead, simulatedSnake)
  const canReachTail = helpers.hasPath(nextHead, tail, simulatedSnake, true)
  const pathToFood = ateFood ? 0 : helpers.findShortestPathLength(nextHead, state.food, simulatedSnake, true)
  const distanceToFood = Math.abs(nextHead.x - state.food.x) + Math.abs(nextHead.y - state.food.y)

  let score = 0
  score += reachableArea * 25
  score += canReachTail ? 100000 : -100000
  score += ateFood ? 30000 : 0
  score += pathToFood !== null ? 6000 - pathToFood * 25 : -2000
  score -= distanceToFood * 5
  if (direction === state.direction) {
    score += 10
  }
  return score
}

export const survivalBot: SnakeBot = {
  id: 'survival',
  name: 'Survival',
  description: 'Stays alive by maximizing open space and avoiding dead ends before chasing food.',
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
