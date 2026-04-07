import type { SnakeBot } from './bot-types'
import { ambusherBot } from './ambusher-bot'
import { chaserBot } from './chaser-bot'
import { coilerBot } from './coiler-bot'
import { edgeRunnerBot } from './edge-runner-bot'
import { explorerBot } from './explorer-bot'
import { hunterBot } from './hunter-bot'
import { nomadBot } from './nomad-bot'
import { survivalBot } from './survival-bot'


export const AVAILABLE_BOTS: SnakeBot[] = [survivalBot, hunterBot, explorerBot, coilerBot, edgeRunnerBot, ambusherBot, chaserBot, nomadBot]

export const DEFAULT_BOT_ID = survivalBot.id

export function getBotById(id: string): SnakeBot | undefined {
  return AVAILABLE_BOTS.find(bot => bot.id === id)
}
