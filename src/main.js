import './style.css'
import { createBattleArea } from './ui/battleArea'
import { initGame, addOneBall } from './game/game'
import { loadSaveData, saveGameData } from './game/save'
import { createWeaponPanel, createHeroPanel, createWeaponModal } from './ui/panel'
import { GAME_CONFIG } from './data/gameConfig'
import { WEAPON_LIST } from './data/weapons'

let currentTab = 'weapon'
let saveData = loadSaveData()
let selectedWeaponId = null

function renderApp() {
  document.querySelector('#app').innerHTML = `
    <div class="phone-frame">
      <div class="game-screen">
        
        <header class="top-bar">
          <div class="stage-box">關卡 1</div>

          <div class="resource-box coin-box">
            <span class="icon">🪙</span>
            <span id="coinCountText">${saveData.coins}</span>
          </div>

          <div class="resource-box gem-box">
            <span class="icon">💎</span>
            <span id="gemCountText">${saveData.gems}</span>
          </div>
        </header>

        <div class="boss-area">
          <button class="boss-btn">挑戰BOSS</button>
        </div>

        ${createBattleArea()}

        <nav class="tab-bar">
          <button class="tab-btn ${currentTab === 'hero' ? 'active' : ''}" id="heroTabBtn">英雄</button>
          <button class="tab-btn ${currentTab === 'weapon' ? 'active' : ''}" id="weaponTabBtn">武器</button>
          <button class="tab-btn">商店</button>
          <button class="tab-btn">設置</button>
        </nav>

        <section class="panel-area" id="panelArea"></section>
        <div id="modalRoot"></div>
      </div>
    </div>
  `

  renderPanel()
  bindEvents()
  initGame(saveData.ballCount)
}

function renderPanel() {
  const panelArea = document.querySelector('#panelArea')
  if (!panelArea) return

  panelArea.innerHTML =
    currentTab === 'hero'
      ? createHeroPanel(saveData)
      : createWeaponPanel(saveData)

  bindPanelEvents()
  updateTabActiveState()
}

function updateTopBar() {
  const coinCountText = document.querySelector('#coinCountText')
  const gemCountText = document.querySelector('#gemCountText')

  if (coinCountText) {
    coinCountText.textContent = saveData.coins
  }

  if (gemCountText) {
    gemCountText.textContent = saveData.gems
  }
}

function updateTabActiveState() {
  const heroTabBtn = document.querySelector('#heroTabBtn')
  const weaponTabBtn = document.querySelector('#weaponTabBtn')

  if (heroTabBtn) {
    heroTabBtn.classList.toggle('active', currentTab === 'hero')
  }

  if (weaponTabBtn) {
    weaponTabBtn.classList.toggle('active', currentTab === 'weapon')
  }
}

function openWeaponModal(weaponId) {
  selectedWeaponId = weaponId

  const weapon = WEAPON_LIST.find((item) => item.id === weaponId)
  const weaponState = saveData.weapons[weaponId]

  const modalRoot = document.querySelector('#modalRoot')
  if (!modalRoot || !weapon) return

  modalRoot.innerHTML = createWeaponModal(weapon, weaponState)
  bindWeaponModalEvents()
}

function closeWeaponModal() {
  const modalRoot = document.querySelector('#modalRoot')
  if (!modalRoot) return

  modalRoot.innerHTML = ''
  selectedWeaponId = null
}

function bindEvents() {
  const heroTabBtn = document.querySelector('#heroTabBtn')
  const weaponTabBtn = document.querySelector('#weaponTabBtn')

  if (heroTabBtn) {
    heroTabBtn.addEventListener('click', () => {
      currentTab = 'hero'
      renderPanel()
    })
  }

  if (weaponTabBtn) {
    weaponTabBtn.addEventListener('click', () => {
      currentTab = 'weapon'
      renderPanel()
    })
  }
}

function bindPanelEvents() {
  const buyHeroBtn = document.querySelector('#buyHeroBtn')
  const weaponButtons = document.querySelectorAll('.action-btn[data-weapon-id]')

  if (buyHeroBtn) {
    buyHeroBtn.addEventListener('click', () => {
      if (saveData.ballCount >= GAME_CONFIG.maxBallCount) {
        alert('英雄已達上限')
        return
      }

      if (saveData.gems < GAME_CONFIG.heroBuyCost) {
        alert('鑽石不足')
        return
      }

      saveData.gems -= GAME_CONFIG.heroBuyCost
      saveData.ballCount += 1

      saveGameData(saveData)
      updateTopBar()
      addOneBall()
      renderPanel()
    })
  }

  weaponButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const weaponId = Number(button.dataset.weaponId)
      openWeaponModal(weaponId)
    })
  })
}

function bindWeaponModalEvents() {
  const closeWeaponModalBtn = document.querySelector('#closeWeaponModalBtn')
  const confirmWeaponUpgradeBtn = document.querySelector('#confirmWeaponUpgradeBtn')

  if (closeWeaponModalBtn) {
    closeWeaponModalBtn.addEventListener('click', () => {
      closeWeaponModal()
    })
  }

  if (confirmWeaponUpgradeBtn) {
    confirmWeaponUpgradeBtn.addEventListener('click', () => {
      const weaponId = Number(confirmWeaponUpgradeBtn.dataset.weaponId)
      const weaponState = saveData.weapons[weaponId]

      if (!weaponState) return
      if (!weaponState.unlocked) return

      weaponState.level += 1

      saveGameData(saveData)
      renderPanel()
      openWeaponModal(weaponId)
    })
  }
}

renderApp()