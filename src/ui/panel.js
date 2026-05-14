import { GAME_CONFIG } from '../data/gameConfig'
import { WEAPON_LIST, getTotalWeaponDamage, getWeaponUpgradeCost } from '../data/weapons'
import gemIcon from '../assets/images/resources/gem.png'
import axeImage from '../assets/images/weapons/axe.png'
import spearImage from '../assets/images/weapons/spear.png'
import hammerImage from '../assets/images/weapons/hammer.png'

const weaponImageMap = {
  1: axeImage,
  2: spearImage,
  3: hammerImage,
}

export function getHeroBuyCost(ballCount) {
  const boughtCount = Math.max(ballCount - GAME_CONFIG.defaultBallCount, 0)
  return Math.ceil(GAME_CONFIG.heroBuyCost * (GAME_CONFIG.heroBuyCostMultiplier ** boughtCount))
}

export function createWeaponPanel(saveData) {
  return `
    <div class="weapon-summary">
      <div>總傷害：${getTotalWeaponDamage(saveData)}</div>
      <div>武器最高 ${WEAPON_LIST[0].maxLevel} 等</div>
    </div>
    <div class="weapon-grid">
      ${WEAPON_LIST.map((weapon) => {
        const weaponState = saveData.weapons[weapon.id]
        const isUnlocked = weaponState?.unlocked ?? false
        const level = weaponState?.level ?? 0
        const isMaxLevel = level >= weapon.maxLevel
        const upgradeCost = getWeaponUpgradeCost(weapon, level)

        return `
          <div class="weapon-card">
            <div class="weapon-name">
              ${isUnlocked ? `${weapon.name}+${level}` : weapon.name}
            </div>

            <div class="weapon-image">
              <img src="${weaponImageMap[weapon.id]}" alt="${weapon.name}" class="weapon-img" />
            </div>

            <div class="weapon-cost">
              ${isUnlocked
                ? isMaxLevel
                  ? '已滿等'
                  : `升級 ${upgradeCost} 金幣`
                : `解鎖 ${weapon.unlockCost} 鑽石`}
            </div>

            <button
              class="action-btn ${isUnlocked ? 'upgrade' : 'locked'}"
              data-weapon-id="${weapon.id}"
              ${isUnlocked && isMaxLevel ? 'disabled' : ''}
            >
              ${isUnlocked ? (isMaxLevel ? '滿等' : '升級') : '解鎖'}
            </button>
          </div>
        `
      }).join('')}
    </div>
  `
}

export function createHeroPanel(saveData) {
  const isMax = saveData.ballCount >= GAME_CONFIG.maxBallCount
  const heroBuyCost = getHeroBuyCost(saveData.ballCount)
  const buttonText = isMax ? '已達上限' : `購買英雄 ${heroBuyCost} 鑽石`

  return `
    <div class="hero-panel">
      <div class="hero-info-card">
        <div class="hero-info-title">英雄</div>
        <div class="hero-info-row">數量：${saveData.ballCount}</div>
        <div class="hero-info-row">關卡：${saveData.stage}</div>
        <div class="hero-info-row">鑽石：${saveData.gems}</div>
        <div class="hero-info-row">上限：${GAME_CONFIG.maxBallCount}</div>
      </div>

      <button
        id="buyHeroBtn"
        class="buy-hero-btn ${isMax ? 'disabled' : ''}"
        ${isMax ? 'disabled' : ''}
      >
        ${buttonText}
      </button>
    </div>
  `
}

export function createShopPanel(saveData) {
  const remainingSeconds = saveData.shop.remainingSeconds
  const canClaim = remainingSeconds <= 0

  return `
    <div class="shop-panel">
      <div class="shop-claim-card">
        <div class="shop-gem-aura">
          <img src="${gemIcon}" alt="鑽石" class="shop-gem-img" />
        </div>
        <div class="shop-reward">+${saveData.shop.gemReward}</div>
        <button
          id="claimShopGemBtn"
          class="shop-claim-btn"
          type="button"
          ${canClaim ? '' : 'disabled'}
        >
          ${canClaim ? '領取' : `${remainingSeconds}s`}
        </button>
      </div>
    </div>
  `
}

export function createSettingsPanel() {
  return `
    <div class="settings-panel">
      <button id="resetGameBtn" class="reset-game-btn" type="button">
        重置遊戲
      </button>
    </div>
  `
}

export function createWeaponModal(weapon, weaponState, saveData) {
  const level = weaponState?.level ?? 0
  const isUnlocked = weaponState?.unlocked ?? false
  const isMaxLevel = level >= weapon.maxLevel
  const weaponTitle = isUnlocked ? `${weapon.name}+${level}` : weapon.name
  const upgradeCost = getWeaponUpgradeCost(weapon, level)
  const canUpgrade = isUnlocked && !isMaxLevel && saveData.coins >= upgradeCost
  const canUnlock = !isUnlocked && saveData.gems >= weapon.unlockCost

  return `
    <div class="weapon-modal-overlay" id="weaponModalOverlay">
      <div class="weapon-modal">
        <button class="weapon-modal-close" id="closeWeaponModalBtn">X</button>

        <div class="weapon-modal-title">${weaponTitle}</div>

        <div class="weapon-modal-top">
          <div class="weapon-modal-image">
            <img src="${weaponImageMap[weapon.id]}" alt="${weapon.name}" class="weapon-modal-img" />
          </div>
          <div class="weapon-modal-desc">
            ${weapon.baseDescription}
          </div>
        </div>

        <div class="weapon-modal-block">
          <div class="weapon-modal-block-title">能力</div>
          <div class="weapon-modal-stat">等級：${level}/${weapon.maxLevel}</div>
          <div class="weapon-modal-stat">每級傷害：${weapon.damagePerLevel}</div>
          ${weapon.basicStats.map((stat) => `
            <div class="weapon-modal-stat">${stat}</div>
          `).join('')}
        </div>

        <div class="weapon-modal-block">
          <div class="weapon-modal-block-title">費用</div>
          <div class="weapon-modal-stat">
            ${isUnlocked
              ? isMaxLevel
                ? '已達最高等級'
                : `下一級需要 ${upgradeCost} 金幣`
              : `解鎖需要 ${weapon.unlockCost} 鑽石`}
          </div>
        </div>

        <div class="weapon-modal-actions">
          <button
            class="weapon-upgrade-btn"
            id="confirmWeaponUpgradeBtn"
            data-weapon-id="${weapon.id}"
            data-action="${isUnlocked ? 'upgrade' : 'unlock'}"
            ${(isUnlocked ? canUpgrade : canUnlock) ? '' : 'disabled'}
          >
            ${isUnlocked ? (isMaxLevel ? '滿等' : '升級武器') : '解鎖武器'}
          </button>
        </div>
      </div>
    </div>
  `
}
