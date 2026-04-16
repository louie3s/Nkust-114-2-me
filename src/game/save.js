import { GAME_CONFIG } from '../data/gameConfig'

const SAVE_KEY = 'idle_bounce_save_data'

const defaultSaveData = {
  coins: GAME_CONFIG.defaultCoins,
  gems: GAME_CONFIG.defaultGems,
  ballCount: GAME_CONFIG.defaultBallCount,
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

export function loadSaveData() {
  const rawData = localStorage.getItem(SAVE_KEY)

  if (!rawData) {
    return structuredClone(defaultSaveData)
  }

  try {
    const parsedData = JSON.parse(rawData)

    return {
      coins: parsedData.coins ?? defaultSaveData.coins,
      gems: parsedData.gems ?? defaultSaveData.gems,
      ballCount: parsedData.ballCount ?? defaultSaveData.ballCount,
      weapons: parsedData.weapons ?? structuredClone(defaultSaveData.weapons),
    }
  } catch (error) {
    console.error('讀取存檔失敗，改用預設資料：', error)
    return structuredClone(defaultSaveData)
  }
}

export function saveGameData(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}