import type { Direction, Position } from '../game-types'

export type BotState = {
  snake: Position[]
  food: Position
  gridSize: number
  direction: Direction
}

export type AnalysisResult = {
  reachableArea: number
  canReachTail: boolean
  pathToFood: number | null
}

export type BotHelpers = {
  simulateMove: (snake: Position[], direction: Direction, food: Position) => Position[] | null
  analyzePosition: (
    start: Position,
    snake: Position[],
    targets: { tail: Position; food: Position }
  ) => AnalysisResult
  getCandidateDirections: (currentDirection: Direction) => Direction[]
}

export type SnakeBot = {
  id: string
  name: string
  description: string
  chooseDirection: (state: BotState, helpers: BotHelpers) => Direction | null
}
