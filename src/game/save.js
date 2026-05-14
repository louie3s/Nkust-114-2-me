import { GAME_CONFIG } from '../data/gameConfig'

const SAVE_KEY = 'idle_bounce_save_data'

const defaultSaveData = {
  coins: GAME_CONFIG.defaultCoins,
  gems: GAME_CONFIG.defaultGems,
  ballCount: GAME_CONFIG.defaultBallCount,
  stage: GAME_CONFIG.defaultStage,
  failedBossStage: null,
  battle: null,
  shop: {
    remainingSeconds: 0,
    gemReward: GAME_CONFIG.shopInitialGemReward,
  },
  weapons: {
    1: {
      unlocked: true,
      level: 1,
    },
    2: {
      unlocked: false,
      level: 0,
    },
    3: {
      unlocked: false,
      level: 0,
    },
  },
}

function mergeWeapons(savedWeapons = {}) {
  return Object.fromEntries(
    Object.entries(defaultSaveData.weapons).map(([weaponId, defaultWeapon]) => [
      weaponId,
      {
        ...defaultWeapon,
        ...(savedWeapons[weaponId] ?? {}),
      },
    ])
  )
}

function getLegacyRemainingSeconds(savedShop = {}) {
  if (typeof savedShop.remainingSeconds === 'number') {
    return savedShop.remainingSeconds
  }

  if (typeof savedShop.nextClaimAt === 'number') {
    return Math.max(Math.ceil((savedShop.nextClaimAt - Date.now()) / 1000), 0)
  }

  return defaultSaveData.shop.remainingSeconds
}

function mergeShop(savedShop = {}) {
  return {
    remainingSeconds: getLegacyRemainingSeconds(savedShop),
    gemReward: savedShop.gemReward ?? defaultSaveData.shop.gemReward,
  }
}

export function loadSaveData() {
  const rawData = localStorage.getItem(SAVE_KEY)

  if (!rawData) {
    return structuredClone(defaultSaveData)
  }

  try {
    const parsedData = JSON.parse(rawData)
    const isLegacySave = parsedData.stage === undefined

    return {
      coins: isLegacySave
        ? Math.max(parsedData.coins ?? defaultSaveData.coins, defaultSaveData.coins)
        : parsedData.coins ?? defaultSaveData.coins,
      gems: parsedData.gems ?? defaultSaveData.gems,
      ballCount: parsedData.ballCount ?? defaultSaveData.ballCount,
      stage: parsedData.stage ?? defaultSaveData.stage,
      failedBossStage: parsedData.failedBossStage ?? defaultSaveData.failedBossStage,
      battle: parsedData.battle ?? defaultSaveData.battle,
      shop: mergeShop(parsedData.shop),
      weapons: mergeWeapons(parsedData.weapons),
    }
  } catch (error) {
    console.error('讀取存檔失敗，已重置存檔', error)
    return structuredClone(defaultSaveData)
  }
}

export function saveGameData(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}

export function resetSaveData() {
  localStorage.removeItem(SAVE_KEY)
}
