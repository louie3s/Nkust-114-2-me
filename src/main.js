import './style.css'
import { canChallengeNextBoss } from './data/balance'
import { GAME_CONFIG } from './data/gameConfig'
import { WEAPON_LIST, getTotalWeaponDamage, getWeaponUpgradeCost } from './data/weapons'
import { addOneBall, challengeNextBoss, getBattleState, initGame } from './game/game'
import { loadSaveData, saveGameData } from './game/save'
import coinIcon from './assets/images/resources/coin.png'
import gemIcon from './assets/images/resources/gem.png'
import { createBattleArea } from './ui/battleArea'
import {
  createHeroPanel,
  createShopPanel,
  createWeaponModal,
  createWeaponPanel,
  getHeroBuyCost,
} from './ui/panel'

let currentTab = 'weapon'
let saveData = loadSaveData()
let selectedWeaponId = null
let bossRemainingSeconds = null
let toastTimer = null
let shopTimer = null
let lastShopTick = Date.now()

function saveOnly() {
  saveGameData(saveData)
}

function persistAndRefresh() {
  saveData.battle = getBattleState() ?? saveData.battle
  saveOnly()
  updateTopBar()
  renderPanel()

  if (selectedWeaponId) {
    openWeaponModal(selectedWeaponId)
  }
}

function showToast(message) {
  const toast = document.querySelector('#toastMessage')
  if (!toast) return

  toast.textContent = message
  toast.classList.add('show')

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
  }, 1000)
}

function renderApp() {
  document.querySelector('#app').innerHTML = `
    <div class="phone-frame">
      <div class="game-screen">
        <header class="top-bar">
          <div class="stage-box">關卡 <span id="stageText">${saveData.stage}</span></div>

          <div class="resource-box coin-box">
            <img class="resource-icon" src="${coinIcon}" alt="金幣" />
            <span id="coinCountText">${saveData.coins}</span>
          </div>

          <div class="resource-box gem-box">
            <img class="resource-icon" src="${gemIcon}" alt="鑽石" />
            <span id="gemCountText">${saveData.gems}</span>
          </div>
        </header>

        <div class="boss-area">
          <button class="boss-btn" id="bossChallengeBtn" type="button">BOSS</button>
          <div class="boss-timer" id="bossTimerText"></div>
        </div>

        ${createBattleArea()}

        <nav class="tab-bar">
          <button class="tab-btn ${currentTab === 'hero' ? 'active' : ''}" id="heroTabBtn" type="button">英雄</button>
          <button class="tab-btn ${currentTab === 'weapon' ? 'active' : ''}" id="weaponTabBtn" type="button">武器</button>
          <button class="tab-btn ${currentTab === 'shop' ? 'active' : ''}" id="shopTabBtn" type="button">商店</button>
          <button class="tab-btn" type="button">設定</button>
        </nav>

        <section class="panel-area" id="panelArea"></section>
        <div class="toast-message" id="toastMessage"></div>
        <div id="modalRoot"></div>
      </div>
    </div>
  `

  renderPanel()
  bindEvents()
  updateTopBar()
  startShopTimer()
  initGame({
    ballCount: saveData.ballCount,
    stage: saveData.stage,
    battleState: saveData.battle,
    getCurrentDamage: () => getTotalWeaponDamage(saveData),
    handleEnemyKilled: (coinReward) => {
      saveData.coins += coinReward
      saveOnly()
      updateTopBar()
      renderPanel()
    },
    handleStageChange: (nextStage) => {
      saveData.stage = nextStage
      saveOnly()
      updateTopBar()
      renderPanel()
    },
    handleBossTimerChange: (remainingSeconds) => {
      bossRemainingSeconds = remainingSeconds
      updateTopBar()
    },
    handleBossFailed: (failedBossStage, previousStage) => {
      saveData.failedBossStage = failedBossStage
      saveData.stage = previousStage
      saveOnly()
      updateTopBar()
      renderPanel()
      showToast('挑戰失敗')
    },
    handleBossDefeated: (bossStage) => {
      if (saveData.failedBossStage === bossStage) {
        saveData.failedBossStage = null
        saveOnly()
      }
    },
    handleBattleStateChange: (battleState) => {
      saveData.battle = battleState

      if (battleState?.stage) {
        saveData.stage = battleState.stage
      }

      saveOnly()
      updateTopBar()
    },
    canAutoEnterBoss: (bossStage) => saveData.failedBossStage !== bossStage,
  })
}

function renderPanel() {
  const panelArea = document.querySelector('#panelArea')
  if (!panelArea) return

  if (currentTab === 'hero') {
    panelArea.innerHTML = createHeroPanel(saveData)
  } else if (currentTab === 'shop') {
    panelArea.innerHTML = createShopPanel(saveData)
  } else {
    panelArea.innerHTML = createWeaponPanel(saveData)
  }

  bindPanelEvents()
  updateTabActiveState()
}

function startShopTimer() {
  if (shopTimer) {
    clearInterval(shopTimer)
  }

  lastShopTick = Date.now()
  shopTimer = setInterval(() => {
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - lastShopTick) / 1000)

    if (elapsedSeconds <= 0) return

    lastShopTick += elapsedSeconds * 1000

    if (saveData.shop.remainingSeconds <= 0) return

    saveData.shop.remainingSeconds = Math.max(saveData.shop.remainingSeconds - elapsedSeconds, 0)
    saveOnly()

    if (currentTab === 'shop') {
      renderPanel()
    }
  }, 250)
}

function updateTopBar() {
  const stageText = document.querySelector('#stageText')
  const coinCountText = document.querySelector('#coinCountText')
  const gemCountText = document.querySelector('#gemCountText')
  const bossChallengeBtn = document.querySelector('#bossChallengeBtn')
  const bossTimerText = document.querySelector('#bossTimerText')

  if (stageText) {
    stageText.textContent = saveData.stage
  }

  if (coinCountText) {
    coinCountText.textContent = saveData.coins
  }

  if (gemCountText) {
    gemCountText.textContent = saveData.gems
  }

  if (bossChallengeBtn) {
    const canChallenge = canChallengeNextBoss(saveData.stage)
    bossChallengeBtn.disabled = !canChallenge
    bossChallengeBtn.textContent = canChallenge ? `挑戰 ${saveData.stage + 1} 關 BOSS` : 'BOSS'
  }

  if (bossTimerText) {
    bossTimerText.textContent =
      bossRemainingSeconds === null ? '' : `Boss 倒數 ${bossRemainingSeconds}s`
  }
}

function updateTabActiveState() {
  const heroTabBtn = document.querySelector('#heroTabBtn')
  const weaponTabBtn = document.querySelector('#weaponTabBtn')
  const shopTabBtn = document.querySelector('#shopTabBtn')

  if (heroTabBtn) {
    heroTabBtn.classList.toggle('active', currentTab === 'hero')
  }

  if (weaponTabBtn) {
    weaponTabBtn.classList.toggle('active', currentTab === 'weapon')
  }

  if (shopTabBtn) {
    shopTabBtn.classList.toggle('active', currentTab === 'shop')
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
  const shopTabBtn = document.querySelector('#shopTabBtn')
  const bossChallengeBtn = document.querySelector('#bossChallengeBtn')

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

  if (shopTabBtn) {
    shopTabBtn.addEventListener('click', () => {
      currentTab = 'shop'
      renderPanel()
    })
  }

  if (bossChallengeBtn) {
    bossChallengeBtn.addEventListener('click', () => {
      challengeNextBoss()
    })
  }
}

function bindPanelEvents() {
  const buyHeroBtn = document.querySelector('#buyHeroBtn')
  const claimShopGemBtn = document.querySelector('#claimShopGemBtn')
  const weaponButtons = document.querySelectorAll('.action-btn[data-weapon-id]')

  if (buyHeroBtn) {
    buyHeroBtn.addEventListener('click', () => {
      const heroBuyCost = getHeroBuyCost(saveData.ballCount)

      if (saveData.ballCount >= GAME_CONFIG.maxBallCount) {
        alert('英雄已達上限')
        return
      }

      if (saveData.gems < heroBuyCost) {
        alert('鑽石不足')
        return
      }

      saveData.gems -= heroBuyCost
      saveData.ballCount += 1

      saveOnly()
      updateTopBar()
      addOneBall()
      renderPanel()
    })
  }

  if (claimShopGemBtn) {
    claimShopGemBtn.addEventListener('click', () => {
      if (saveData.shop.remainingSeconds > 0) return

      saveData.gems += saveData.shop.gemReward
      saveData.shop.gemReward += GAME_CONFIG.shopGemRewardIncrease
      saveData.shop.remainingSeconds = GAME_CONFIG.shopClaimCooldownSeconds
      persistAndRefresh()
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

      if (weaponState.level >= weapon.maxLevel) {
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

window.addEventListener('beforeunload', () => {
  saveData.battle = getBattleState() ?? saveData.battle
  saveOnly()
})

renderApp()
