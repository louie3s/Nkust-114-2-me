import { GAME_CONFIG } from '../data/gameConfig'
import { WEAPON_LIST } from '../data/weapons'

export function createWeaponPanel(saveData) {
  return `
    <div class="weapon-grid">
      ${WEAPON_LIST.map((weapon) => {
        const weaponState = saveData.weapons[weapon.id]
        const isUnlocked = weaponState?.unlocked ?? false
        const level = weaponState?.level ?? 0

        return `
          <div class="weapon-card">
            <div class="weapon-name">
              ${isUnlocked ? `${weapon.name}+${level}` : weapon.name}
            </div>

            <div class="weapon-image">武器圖</div>

            <button
              class="action-btn ${isUnlocked ? 'upgrade' : 'locked'}"
              data-weapon-id="${weapon.id}"
            >
              ${isUnlocked ? '升級' : '解鎖'}
            </button>
          </div>
        `
      }).join('')}
    </div>
  `
}

export function createHeroPanel(saveData) {
  const isMax = saveData.ballCount >= GAME_CONFIG.maxBallCount
  const buttonText = isMax
    ? '已達上限'
    : `購買英雄（${GAME_CONFIG.heroBuyCost} 鑽石）`

  return `
    <div class="hero-panel">
      <div class="hero-info-card">
        <div class="hero-info-title">英雄資訊</div>
        <div class="hero-info-row">英雄：${saveData.ballCount}</div>
        <div class="hero-info-row">球數：${saveData.ballCount}</div>
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

export function createWeaponModal(weapon, weaponState) {
  const level = weaponState?.level ?? 0
  const isUnlocked = weaponState?.unlocked ?? false
  const weaponTitle = isUnlocked ? `${weapon.name}+${level}` : weapon.name

  return `
    <div class="weapon-modal-overlay" id="weaponModalOverlay">
      <div class="weapon-modal">
        <button class="weapon-modal-close" id="closeWeaponModalBtn">✕</button>

        <div class="weapon-modal-title">${weaponTitle}</div>

        <div class="weapon-modal-top">
          <div class="weapon-modal-image">武器圖</div>
          <div class="weapon-modal-desc">
            ${weapon.baseDescription}
          </div>
        </div>

        <div class="weapon-modal-block">
          <div class="weapon-modal-block-title">基礎屬性</div>
          <div class="weapon-modal-stat">目前等級：+${level}</div>
          ${weapon.basicStats.map((stat) => `
            <div class="weapon-modal-stat">${stat}</div>
          `).join('')}
        </div>

        <div class="weapon-modal-block">
          <div class="weapon-modal-block-title">附加說明</div>
          <div class="weapon-modal-stat">每升 1 級，武器等級 +1</div>
        </div>

        <div class="weapon-modal-actions">
          <button
            class="weapon-upgrade-btn"
            id="confirmWeaponUpgradeBtn"
            data-weapon-id="${weapon.id}"
            ${isUnlocked ? '' : 'disabled'}
          >
            ${isUnlocked ? '升級武器' : '尚未解鎖'}
          </button>
        </div>
      </div>
    </div>
  `
}