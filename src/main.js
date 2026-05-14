import './style.css'
import { GAME_CONFIG } from './data/gameConfig'
import { WEAPON_LIST, getTotalWeaponDamage, getWeaponUpgradeCost } from './data/weapons'
import { addOneBall, initGame } from './game/game'
import { loadSaveData, saveGameData } from './game/save'
import { createBattleArea } from './ui/battleArea'
import { createHeroPanel, createWeaponModal, createWeaponPanel } from './ui/panel'

let currentTab = 'weapon'
let saveData = loadSaveData()
let selectedWeaponId = null

function persistAndRefresh() {
  saveGameData(saveData)
  updateTopBar()
  renderPanel()

  if (selectedWeaponId) {
    openWeaponModal(selectedWeaponId)
  }
}

function renderApp() {
  document.querySelector('#app').innerHTML = `
    <div class="phone-frame">
      <div class="game-screen">
        <header class="top-bar">
          <div class="stage-box">關卡 <span id="stageText">${saveData.stage}</span></div>

          <div class="resource-box coin-box">
            <span class="icon">金</span>
            <span id="coinCountText">${saveData.coins}</span>
          </div>

          <div class="resource-box gem-box">
            <span class="icon">鑽</span>
            <span id="gemCountText">${saveData.gems}</span>
          </div>
        </header>

        <div class="boss-area">
          <button class="boss-btn" type="button">BOSS</button>
        </div>

        ${createBattleArea()}

        <nav class="tab-bar">
          <button class="tab-btn ${currentTab === 'hero' ? 'active' : ''}" id="heroTabBtn" type="button">英雄</button>
          <button class="tab-btn ${currentTab === 'weapon' ? 'active' : ''}" id="weaponTabBtn" type="button">武器</button>
          <button class="tab-btn" type="button">技能</button>
          <button class="tab-btn" type="button">設定</button>
        </nav>

        <section class="panel-area" id="panelArea"></section>
        <div id="modalRoot"></div>
      </div>
    </div>
  `

  renderPanel()
  bindEvents()
  initGame({
    ballCount: saveData.ballCount,
    stage: saveData.stage,
    getCurrentDamage: () => getTotalWeaponDamage(saveData),
    handleMonsterKilled: (coinReward) => {
      saveData.coins += coinReward
      persistAndRefresh()
    },
    handleStageClear: (nextStage) => {
      saveData.stage = nextStage
      persistAndRefresh()
    },
  })
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
  const stageText = document.querySelector('#stageText')
  const coinCountText = document.querySelector('#coinCountText')
  const gemCountText = document.querySelector('#gemCountText')

  if (stageText) {
    stageText.textContent = saveData.stage
  }

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

  modalRoot.innerHTML = createWeaponModal(weapon, weaponState, saveData)
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
        alert('英雄數量已達上限')
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
      openWeaponModal(Number(button.dataset.weaponId))
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
      const action = confirmWeaponUpgradeBtn.dataset.action
      const weapon = WEAPON_LIST.find((item) => item.id === weaponId)
      const weaponState = saveData.weapons[weaponId]

      if (!weapon || !weaponState) return

      if (action === 'unlock') {
        if (saveData.gems < weapon.unlockCost) {
          alert('鑽石不足')
          return
        }

        saveData.gems -= weapon.unlockCost
        weaponState.unlocked = true
        weaponState.level = 1
        persistAndRefresh()
        return
      }

      const upgradeCost = getWeaponUpgradeCost(weapon, weaponState.level)
      if (saveData.coins < upgradeCost) {
        alert('金幣不足')
        return
      }

      saveData.coins -= upgradeCost
      weaponState.level += 1
      persistAndRefresh()
    })
  }
}

renderApp()
