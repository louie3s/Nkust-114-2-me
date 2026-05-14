import {
  canChallengeNextBoss,
  getBossCoinReward,
  getBossHp,
  getMonsterCoinReward,
  getMonsterHp,
  isBossStage,
} from '../data/balance'
import { GAME_CONFIG } from '../data/gameConfig'
import bossImageSrc from '../assets/images/bosses/purple-dragon-boss.png'
import monsterImageSrc from '../assets/images/monsters/purple-dragon.png'
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

const monsterImage = new Image()
monsterImage.src = monsterImageSrc

const bossImage = new Image()
bossImage.src = bossImageSrc

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
let getDamage = () => 5
let onEnemyKilled = () => {}
let onStageChange = () => {}
let onBossTimerChange = () => {}
let onBossFailed = () => {}
let onBossDefeated = () => {}
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

function createNormalStage(stage) {
  const enemyCount =
    Math.floor(Math.random() * (GAME_CONFIG.monsterMaxCount - GAME_CONFIG.monsterMinCount + 1)) +
    GAME_CONFIG.monsterMinCount
  const maxHp = getMonsterHp(stage)
  bossDeadline = null
  onBossTimerChange(null)

  enemies = shuffle(getMonsterPositions(canvas.width, canvas.height))
    .slice(0, enemyCount)
    .map((position, index) => ({
      id: `monster-${stage}-${index}-${Date.now()}`,
      type: 'monster',
      ...position,
      size: ENEMY_CONFIG.monsterSize,
      hp: maxHp,
      maxHp,
      isDead: false,
      hitFlashUntil: 0,
    }))
}

function createBossStage(stage, currentTime = performance.now()) {
  const maxHp = getBossHp(stage)
  bossDeadline = currentTime + GAME_CONFIG.bossTimeLimitSeconds * 1000
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
      isDead: false,
      hitFlashUntil: 0,
    },
  ]
}

function createStage(stage, currentTime = performance.now()) {
  currentStage = stage

  if (isBossStage(stage)) {
    createBossStage(stage, currentTime)
  } else {
    createNormalStage(stage)
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
  const image = enemy.type === 'boss' ? bossImage : monsterImage

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
  onBossTimerChange(remainingSeconds)

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
    onBossTimerChange(null)
    const nextStage = currentStage + 1
    onStageChange(nextStage)
    createStage(nextStage, currentTime)
    return
  }

  onEnemyKilled(getMonsterCoinReward(enemy.maxHp))
}

function handleCollisions(currentTime) {
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
    getCurrentDamage = () => 5,
    handleEnemyKilled = () => {},
    handleStageChange = () => {},
    handleBossTimerChange = () => {},
    handleBossFailed = () => {},
    handleBossDefeated = () => {},
    canAutoEnterBoss = () => true,
  } = options

  getDamage = getCurrentDamage
  onEnemyKilled = handleEnemyKilled
  onStageChange = handleStageChange
  onBossTimerChange = handleBossTimerChange
  onBossFailed = handleBossFailed
  onBossDefeated = handleBossDefeated
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

  createStage(stage)

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
