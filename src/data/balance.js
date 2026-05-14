import { GAME_CONFIG } from './gameConfig'

export function getMonsterHp(stage) {
  const scaledHp = GAME_CONFIG.monsterBaseHp * (GAME_CONFIG.monsterHpGrowthRate ** (stage - 1))
  const flatHp = GAME_CONFIG.monsterHpFlatGrowth * (stage - 1)
  return Math.round(scaledHp + flatHp)
}

export function getMonsterCoinReward(maxHp) {
  return Math.ceil(maxHp * GAME_CONFIG.monsterCoinRewardRate)
}
