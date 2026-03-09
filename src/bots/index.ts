import type { SnakeBot } from './bot-types'
import { explorerBot } from './explorer-bot'
import { hunterBot } from './hunter-bot'
import { survivalBot } from './survival-bot'

export const AVAILABLE_BOTS: SnakeBot[] = [survivalBot, hunterBot, explorerBot]
export const DEFAULT_BOT_ID = survivalBot.id

export function getBotById(id: string): SnakeBot | undefined {
  return AVAILABLE_BOTS.find(bot => bot.id === id)
}
