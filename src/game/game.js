import {
  canChallengeNextBoss,
  getBossCoinReward,
  getBossHp,
  getMonsterCoinReward,
  getMonsterHp,
  isBossStage,
} from '../data/balance'
import { GAME_CONFIG } from '../data/gameConfig'
import fireBossImageSrc from '../assets/images/bosses/fire-boss.png'
import iceBossImageSrc from '../assets/images/bosses/ice-boss.png'
import lightningBossImageSrc from '../assets/images/bosses/lightning-boss.png'
import natureFireBossImageSrc from '../assets/images/bosses/nature-fire-boss.png'
import purpleBossImageSrc from '../assets/images/bosses/purple-dragon-boss.png'
import fireDragonImageSrc from '../assets/images/monsters/fire-dragon.png'
import forestDragonImageSrc from '../assets/images/monsters/forest-dragon.png'
import iceDragonImageSrc from '../assets/images/monsters/ice-dragon.png'
import lightningDragonImageSrc from '../assets/images/monsters/lightning-dragon.png'
import purpleDragonImageSrc from '../assets/images/monsters/purple-dragon.png'
import { Ball } from './ball'

const BALL_CONFIG = {
  radius: 16,
  speed: 260,
  minAngle: -120,
  maxAngle: -60,
}

const ENEMY_CONFIG = {
  monsterSize: 84,
  bossSize: 170,
  hitFlashDuration: 140,
  hitCooldown: 180,
  updateStepSeconds: 1 / 60,
  simulationTickMs: 250,
  maxCatchUpSeconds: 120,
}

function createImage(src) {
  const image = new Image()
  image.src = src
  return image
}

const monsterImageEntries = [
  { key: 'purple-dragon', image: createImage(purpleDragonImageSrc) },
  { key: 'lightning-dragon', image: createImage(lightningDragonImageSrc) },
  { key: 'fire-dragon', image: createImage(fireDragonImageSrc) },
  { key: 'ice-dragon', image: createImage(iceDragonImageSrc) },
  { key: 'forest-dragon', image: createImage(forestDragonImageSrc) },
]

const bossImageEntries = [
  { key: 'purple-dragon-boss', image: createImage(purpleBossImageSrc) },
  { key: 'fire-boss', image: createImage(fireBossImageSrc) },
  { key: 'nature-fire-boss', image: createImage(natureFireBossImageSrc) },
  { key: 'lightning-boss', image: createImage(lightningBossImageSrc) },
  { key: 'ice-boss', image: createImage(iceBossImageSrc) },
]

const imageMap = new Map(
  [...monsterImageEntries, ...bossImageEntries].map((entry) => [entry.key, entry.image])
)

let canvas = null
let ctx = null
let balls = []
let enemies = []
let animationId = null
let simulationTimer = null
let lastSimulationTime = 0
let accumulatedSeconds = 0
let currentStage = GAME_CONFIG.defaultStage
let bossDeadline = null
let lastBossRemainingSeconds = null
let getDamage = () => 5
let onEnemyKilled = () => {}
let onStageChange = () => {}
let onBossTimerChange = () => {}
let onBossFailed = () => {}
let onBossDefeated = () => {}
let onBattleStateChange = () => {}
let shouldAutoEnterBoss = () => true

function createBall(canvasWidth, canvasHeight) {
  const startX = canvasWidth / 2
  const startY = canvasHeight - BALL_CONFIG.radius - 10
  const randomAngle =
    Math.random() * (BALL_CONFIG.maxAngle - BALL_CONFIG.minAngle) + BALL_CONFIG.minAngle
  const radian = randomAngle * Math.PI / 180

  return new Ball(
    startX,
    startY,
    BALL_CONFIG.radius,
    Math.cos(radian) * BALL_CONFIG.speed,
    Math.sin(radian) * BALL_CONFIG.speed
  )
}

function getMonsterPositions(canvasWidth, canvasHeight) {
  return [
    { x: canvasWidth * 0.3, y: canvasHeight * 0.2 },
    { x: canvasWidth * 0.7, y: canvasHeight * 0.2 },
    { x: canvasWidth * 0.5, y: canvasHeight * 0.42 },
    { x: canvasWidth * 0.3, y: canvasHeight * 0.66 },
    { x: canvasWidth * 0.7, y: canvasHeight * 0.66 },
  ]
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function getRandomEntry(entries) {
  return entries[Math.floor(Math.random() * entries.length)]
}

function getImageByKey(imageKey, enemyType) {
  const fallbackEntries = enemyType === 'boss' ? bossImageEntries : monsterImageEntries
  return imageMap.get(imageKey) ?? fallbackEntries[0].image
}

function getResetHp(enemyType, stage) {
  return enemyType === 'boss' ? getBossHp(stage) : getMonsterHp(stage)
}

function toSavedEnemy(enemy) {
  return {
    id: enemy.id,
    type: enemy.type,
    x: enemy.x,
    y: enemy.y,
    size: enemy.size,
    imageKey: enemy.imageKey,
  }
}

function hydrateEnemy(savedEnemy, stage, index) {
  const type = savedEnemy.type === 'boss' ? 'boss' : 'monster'
  const maxHp = getResetHp(type, stage)
  const fallbackEntry = type === 'boss' ? bossImageEntries[0] : monsterImageEntries[0]
  const imageKey = savedEnemy.imageKey ?? fallbackEntry.key

  return {
    id: savedEnemy.id ?? `${type}-${stage}-${index}-${Date.now()}`,
    type,
    x: Number.isFinite(savedEnemy.x) ? savedEnemy.x : canvas.width * 0.5,
    y: Number.isFinite(savedEnemy.y) ? savedEnemy.y : canvas.height * 0.4,
    size: savedEnemy.size ?? (type === 'boss' ? ENEMY_CONFIG.bossSize : ENEMY_CONFIG.monsterSize),
    hp: maxHp,
    maxHp,
    imageKey,
    image: getImageByKey(imageKey, type),
    isDead: false,
    hitFlashUntil: 0,
  }
}

function serializeBattleState(currentTime = performance.now()) {
  const aliveEnemies = enemies.filter((enemy) => !enemy.isDead)

  if (!canvas || aliveEnemies.length === 0) {
    return null
  }

  return {
    stage: currentStage,
    bossRemainingMs: bossDeadline
      ? Math.max(Math.ceil(bossDeadline - currentTime), 0)
      : null,
    enemies: aliveEnemies.map(toSavedEnemy),
  }
}

function notifyBattleStateChange(currentTime = performance.now()) {
  onBattleStateChange(serializeBattleState(currentTime))
}

function restoreBattleState(battleState, currentTime = performance.now()) {
  if (!battleState || !Array.isArray(battleState.enemies) || battleState.enemies.length === 0) {
    return false
  }

  const stage = Number(battleState.stage)
  if (!Number.isFinite(stage) || stage < 1) {
    return false
  }

  currentStage = stage
  enemies = battleState.enemies.map((enemy, index) => hydrateEnemy(enemy, stage, index))

  if (isBossStage(stage)) {
    const remainingMs =
      typeof battleState.bossRemainingMs === 'number'
        ? Math.max(battleState.bossRemainingMs, 0)
        : GAME_CONFIG.bossTimeLimitSeconds * 1000

    bossDeadline = currentTime + remainingMs
    lastBossRemainingSeconds = Math.ceil(remainingMs / 1000)
    onBossTimerChange(lastBossRemainingSeconds)
  } else {
    bossDeadline = null
    lastBossRemainingSeconds = null
    onBossTimerChange(null)
  }

  notifyBattleStateChange(currentTime)
  return true
}

function createNormalStage(stage, shouldNotify = true) {
  const enemyCount =
    Math.floor(Math.random() * (GAME_CONFIG.monsterMaxCount - GAME_CONFIG.monsterMinCount + 1)) +
    GAME_CONFIG.monsterMinCount
  const maxHp = getMonsterHp(stage)
  bossDeadline = null
  lastBossRemainingSeconds = null
  onBossTimerChange(null)

  enemies = shuffle(getMonsterPositions(canvas.width, canvas.height))
    .slice(0, enemyCount)
    .map((position, index) => {
      const imageEntry = getRandomEntry(monsterImageEntries)

      return {
        id: `monster-${stage}-${index}-${Date.now()}`,
        type: 'monster',
        ...position,
        size: ENEMY_CONFIG.monsterSize,
        hp: maxHp,
        maxHp,
        imageKey: imageEntry.key,
        image: imageEntry.image,
        isDead: false,
        hitFlashUntil: 0,
      }
    })

  if (shouldNotify) notifyBattleStateChange()
}

function createBossStage(stage, currentTime = performance.now(), shouldNotify = true) {
  const maxHp = getBossHp(stage)
  const imageEntry = getRandomEntry(bossImageEntries)

  bossDeadline = currentTime + GAME_CONFIG.bossTimeLimitSeconds * 1000
  lastBossRemainingSeconds = GAME_CONFIG.bossTimeLimitSeconds
  onBossTimerChange(GAME_CONFIG.bossTimeLimitSeconds)

  enemies = [
    {
      id: `boss-${stage}-${Date.now()}`,
      type: 'boss',
      x: canvas.width * 0.5,
      y: canvas.height * 0.38,
      size: ENEMY_CONFIG.bossSize,
      hp: maxHp,
      maxHp,
      imageKey: imageEntry.key,
      image: imageEntry.image,
      isDead: false,
      hitFlashUntil: 0,
    },
  ]

  if (shouldNotify) notifyBattleStateChange(currentTime)
}

function createStage(stage, currentTime = performance.now(), shouldNotify = true) {
  currentStage = stage

  if (isBossStage(stage)) {
    createBossStage(stage, currentTime, shouldNotify)
  } else {
    createNormalStage(stage, shouldNotify)
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#e5bf58'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawEnemy(enemy, currentTime) {
  const size = enemy.size
  const drawX = enemy.x - size / 2
  const drawY = enemy.y - size / 2
  const hpPercent = Math.max(enemy.hp / enemy.maxHp, 0)
  const isHit = currentTime < enemy.hitFlashUntil
  const image = enemy.image

  ctx.save()
  ctx.globalAlpha = isHit ? 0.72 : 1

  if (image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, drawX, drawY, size, size)
  } else {
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = enemy.type === 'boss' ? '#57208f' : '#7b3fd1'
    ctx.fill()
  }

  ctx.restore()

  const barWidth = size
  const barHeight = enemy.type === 'boss' ? 10 : 8
  const barX = enemy.x - barWidth / 2
  const barY = drawY - 14

  ctx.fillStyle = 'rgba(40, 20, 20, 0.65)'
  ctx.fillRect(barX, barY, barWidth, barHeight)
  ctx.fillStyle = enemy.type === 'boss' ? '#b218de' : '#e64848'
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barWidth, barHeight)

  ctx.font = `bold ${enemy.type === 'boss' ? 15 : 13}px Microsoft JhengHei, Arial`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#3a220b'
  ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, enemy.x, barY - 4)
}

function getBallSquareCollision(ball, enemy) {
  const halfSize = enemy.size / 2
  const left = enemy.x - halfSize
  const right = enemy.x + halfSize
  const top = enemy.y - halfSize
  const bottom = enemy.y + halfSize
  const closestX = Math.max(left, Math.min(ball.x, right))
  const closestY = Math.max(top, Math.min(ball.y, bottom))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  const distance = Math.hypot(dx, dy)

  if (distance > ball.radius) return null

  if (distance > 0) {
    return {
      normalX: dx / distance,
      normalY: dy / distance,
      pushDistance: ball.radius - distance,
    }
  }

  const distancesToSides = [
    { normalX: -1, normalY: 0, distance: Math.abs(ball.x - left) },
    { normalX: 1, normalY: 0, distance: Math.abs(right - ball.x) },
    { normalX: 0, normalY: -1, distance: Math.abs(ball.y - top) },
    { normalX: 0, normalY: 1, distance: Math.abs(bottom - ball.y) },
  ]
  const nearestSide = distancesToSides.sort((a, b) => a.distance - b.distance)[0]

  return {
    normalX: nearestSide.normalX,
    normalY: nearestSide.normalY,
    pushDistance: ball.radius + nearestSide.distance,
  }
}

function handleBossTimer(currentTime) {
  if (!bossDeadline || !isBossStage(currentStage)) return

  const remainingSeconds = Math.max(Math.ceil((bossDeadline - currentTime) / 1000), 0)

  if (remainingSeconds !== lastBossRemainingSeconds) {
    lastBossRemainingSeconds = remainingSeconds
    onBossTimerChange(remainingSeconds)
    notifyBattleStateChange(currentTime)
  }

  if (remainingSeconds > 0) return

  const failedBossStage = currentStage
  const previousStage = currentStage - 1
  onBossFailed(failedBossStage, previousStage)
  onStageChange(previousStage)
  createStage(previousStage, currentTime)
}

function handleEnemyDefeated(enemy, currentTime) {
  enemy.isDead = true

  if (enemy.type === 'boss') {
    onBossDefeated(currentStage)
    onEnemyKilled(getBossCoinReward(enemy.maxHp))
    bossDeadline = null
    lastBossRemainingSeconds = null
    onBossTimerChange(null)
    const nextStage = currentStage + 1
    onStageChange(nextStage)
    createStage(nextStage, currentTime)
    return
  }

  onEnemyKilled(getMonsterCoinReward(enemy.maxHp))
}

function handleCollisions(currentTime) {
  let removedEnemy = false

  for (const ball of balls) {
    if (!ball.enemyHitTimes) {
      ball.enemyHitTimes = {}
    }

    for (const enemy of enemies) {
      if (enemy.isDead) continue

      const lastHitTime = ball.enemyHitTimes[enemy.id] ?? 0
      if (currentTime - lastHitTime < ENEMY_CONFIG.hitCooldown) continue

      const collision = getBallSquareCollision(ball, enemy)

      if (!collision) continue

      enemy.hp = Math.max(enemy.hp - getDamage(), 0)
      enemy.hitFlashUntil = currentTime + ENEMY_CONFIG.hitFlashDuration

      const velocityDotNormal = ball.vx * collision.normalX + ball.vy * collision.normalY

      ball.x += collision.normalX * collision.pushDistance
      ball.y += collision.normalY * collision.pushDistance

      if (velocityDotNormal < 0) {
        ball.vx -= 2 * velocityDotNormal * collision.normalX
        ball.vy -= 2 * velocityDotNormal * collision.normalY
      }

      ball.enemyHitTimes[enemy.id] = currentTime

      if (enemy.hp <= 0) {
        removedEnemy = true
        handleEnemyDefeated(enemy, currentTime)
      }
    }
  }

  enemies = enemies.filter((enemy) => !enemy.isDead)

  if (enemies.length === 0 && !isBossStage(currentStage)) {
    const nextStage = currentStage + 1

    if (isBossStage(nextStage) && !shouldAutoEnterBoss(nextStage)) {
      onStageChange(currentStage)
      createStage(currentStage)
      return
    }

    onStageChange(nextStage)
    createStage(nextStage)
    return
  }

  if (removedEnemy) {
    notifyBattleStateChange(currentTime)
  }
}

function updateWorld(currentTime, deltaTime) {
  for (const ball of balls) {
    ball.update(canvas.width, canvas.height, deltaTime)
  }

  handleCollisions(currentTime)
  handleBossTimer(currentTime)
}

function runSimulationTick() {
  const currentTime = performance.now()

  if (!lastSimulationTime) {
    lastSimulationTime = currentTime
    return
  }

  let simulatedTime = lastSimulationTime
  const elapsedSeconds = Math.min(
    (currentTime - lastSimulationTime) / 1000,
    ENEMY_CONFIG.maxCatchUpSeconds
  )
  lastSimulationTime = currentTime
  accumulatedSeconds += elapsedSeconds

  while (accumulatedSeconds >= ENEMY_CONFIG.updateStepSeconds) {
    simulatedTime += ENEMY_CONFIG.updateStepSeconds * 1000
    updateWorld(simulatedTime, ENEMY_CONFIG.updateStepSeconds)
    accumulatedSeconds -= ENEMY_CONFIG.updateStepSeconds
  }
}

function renderLoop(currentTime) {
  if (!document.hidden) {
    runSimulationTick()
  }

  drawBackground()

  for (const enemy of enemies) {
    drawEnemy(enemy, currentTime)
  }

  for (const ball of balls) {
    ball.draw(ctx)
  }

  animationId = requestAnimationFrame(renderLoop)
}

export function initGame(options = {}) {
  canvas = document.querySelector('#battleCanvas')
  if (!canvas) return

  const {
    ballCount = 1,
    stage = GAME_CONFIG.defaultStage,
    battleState = null,
    getCurrentDamage = () => 5,
    handleEnemyKilled = () => {},
    handleStageChange = () => {},
    handleBossTimerChange = () => {},
    handleBossFailed = () => {},
    handleBossDefeated = () => {},
    handleBattleStateChange = () => {},
    canAutoEnterBoss = () => true,
  } = options

  getDamage = getCurrentDamage
  onEnemyKilled = handleEnemyKilled
  onStageChange = handleStageChange
  onBossTimerChange = handleBossTimerChange
  onBossFailed = handleBossFailed
  onBossDefeated = handleBossDefeated
  onBattleStateChange = handleBattleStateChange
  shouldAutoEnterBoss = canAutoEnterBoss

  ctx = canvas.getContext('2d')

  const battleArea = canvas.parentElement
  const width = battleArea.clientWidth
  const height = battleArea.clientHeight

  canvas.width = width
  canvas.height = height

  balls = []

  for (let i = 0; i < ballCount; i++) {
    balls.push(createBall(width, height))
  }

  const now = performance.now()
  if (!restoreBattleState(battleState, now)) {
    createStage(stage, now)
  }

  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  if (simulationTimer) {
    clearInterval(simulationTimer)
  }

  lastSimulationTime = performance.now()
  accumulatedSeconds = 0
  simulationTimer = setInterval(() => {
    if (document.hidden) {
      runSimulationTick()
    }
  }, ENEMY_CONFIG.simulationTickMs)
  animationId = requestAnimationFrame(renderLoop)
}

export function getBattleState() {
  return serializeBattleState()
}

export function addOneBall() {
  if (!canvas) return
  balls.push(createBall(canvas.width, canvas.height))
}

export function challengeNextBoss() {
  if (!canvas || !canChallengeNextBoss(currentStage)) return false

  const nextStage = currentStage + 1
  onStageChange(nextStage)
  createStage(nextStage, performance.now())
  return true
}
