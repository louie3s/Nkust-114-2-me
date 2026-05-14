import { GAME_CONFIG } from './gameConfig'

export function getMonsterHp(stage) {
  const scaledHp = GAME_CONFIG.monsterBaseHp * (GAME_CONFIG.monsterHpGrowthRate ** (stage - 1))
  const flatHp = GAME_CONFIG.monsterHpFlatGrowth * (stage - 1)
  return Math.round(scaledHp + flatHp)
}

export function getMonsterCoinReward(maxHp) {
  return Math.ceil(maxHp * GAME_CONFIG.monsterCoinRewardRate)
}

export function isBossStage(stage) {
  return stage % GAME_CONFIG.bossStageInterval === 0
}

export function canChallengeNextBoss(stage) {
  return isBossStage(stage + 1)
}

export function getBossHp(stage) {
  return Math.round(getMonsterHp(stage) * GAME_CONFIG.bossHpMultiplier)
}

export function getBossCoinReward(maxHp) {
  return Math.ceil(maxHp * GAME_CONFIG.bossCoinRewardRate)
}
