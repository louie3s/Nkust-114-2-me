export const WEAPON_MAX_LEVEL = 50

export const WEAPON_LIST = [
  {
    id: 1,
    name: '訓練斧',
    baseDescription: '穩定好上手的初始武器，適合用來清理前期小怪。',
    basicStats: [
      '每級傷害 +2',
      '升級消耗金幣，每級需求增加 20%',
    ],
    unlockCost: 0,
    upgradeBaseCost: 30,
    damagePerLevel: 2,
    maxLevel: WEAPON_MAX_LEVEL,
  },
  {
    id: 2,
    name: '鋼鐵長槍',
    baseDescription: '傷害比訓練斧更高，解鎖後能更快推進關卡。',
    basicStats: [
      '每級傷害 +3',
      '使用鑽石解鎖，之後用金幣升級',
    ],
    unlockCost: 100,
    upgradeBaseCost: 80,
    damagePerLevel: 3,
    maxLevel: WEAPON_MAX_LEVEL,
  },
  {
    id: 3,
    name: '烈焰戰錘',
    baseDescription: '重型武器，單級提供最多傷害，適合挑戰高血量小怪。',
    basicStats: [
      '每級傷害 +5',
      '最高 50 等，高傷害回報',
    ],
    unlockCost: 150,
    upgradeBaseCost: 150,
    damagePerLevel: 5,
    maxLevel: WEAPON_MAX_LEVEL,
  },
]

export function getWeaponUpgradeCost(weapon, level) {
  if (level >= weapon.maxLevel) return null

  const currentLevel = Math.max(level, 1)
  return Math.ceil(weapon.upgradeBaseCost * (1.2 ** (currentLevel - 1)))
}

export function getTotalWeaponDamage(saveData) {
  return WEAPON_LIST.reduce((total, weapon) => {
    const weaponState = saveData.weapons[weapon.id]
    if (!weaponState?.unlocked) return total

    return total + weapon.damagePerLevel * Math.min(weaponState.level, weapon.maxLevel)
  }, 5)
}
