import type { Direction, Position } from '../game-types'

export type BotState = {
  snake: Position[]
  food: Position
  gridSize: number
  direction: Direction
}

export type BotHelpers = {
  simulateMove: (snake: Position[], direction: Direction, food: Position) => Position[] | null
  countReachableArea: (start: Position, snake: Position[]) => number
  hasPath: (start: Position, target: Position, snake: Position[], allowTargetOccupied: boolean) => boolean
  findShortestPathLength: (
    start: Position,
    target: Position,
    snake: Position[],
    allowTargetOccupied: boolean
  ) => number | null
  getCandidateDirections: (currentDirection: Direction) => Direction[]
}

export type SnakeBot = {
  id: string
  name: string
  description: string
  chooseDirection: (state: BotState, helpers: BotHelpers) => Direction | null
}
