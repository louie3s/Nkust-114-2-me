import { GAME_CONFIG } from '../data/gameConfig'
import { getMonsterCoinReward, getMonsterHp } from '../data/balance'
import monsterImageSrc from '../assets/images/monsters/purple-dragon.png'
import { Ball } from './ball'

const BALL_CONFIG = {
  radius: 16,
  speed: 260,
  minAngle: -120,
  maxAngle: -60,
}

const MONSTER_CONFIG = {
  size: 84,
  hitFlashDuration: 140,
  hitCooldown: 180,
}

const monsterImage = new Image()
monsterImage.src = monsterImageSrc

let canvas = null
let ctx = null
let balls = []
let monsters = []
let animationId = null
let lastTime = 0
let currentStage = GAME_CONFIG.defaultStage
let getDamage = () => 5
let onMonsterKilled = () => {}
let onStageClear = () => {}

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

function createStageMonsters(stage) {
  const monsterCount =
    Math.floor(Math.random() * (GAME_CONFIG.monsterMaxCount - GAME_CONFIG.monsterMinCount + 1)) +
    GAME_CONFIG.monsterMinCount
  const maxHp = getMonsterHp(stage)

  monsters = shuffle(getMonsterPositions(canvas.width, canvas.height))
    .slice(0, monsterCount)
    .map((position, index) => ({
      id: `${stage}-${index}-${Date.now()}`,
      ...position,
      size: MONSTER_CONFIG.size,
      hp: maxHp,
      maxHp,
      isDead: false,
      hitFlashUntil: 0,
    }))
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#e5bf58'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawMonster(monster, currentTime) {
  const size = monster.size
  const drawX = monster.x - size / 2
  const drawY = monster.y - size / 2
  const hpPercent = Math.max(monster.hp / monster.maxHp, 0)
  const isHit = currentTime < monster.hitFlashUntil

  ctx.save()
  ctx.globalAlpha = isHit ? 0.72 : 1

  if (monsterImage.complete && monsterImage.naturalWidth > 0) {
    ctx.drawImage(monsterImage, drawX, drawY, size, size)
  } else {
    ctx.beginPath()
    ctx.arc(monster.x, monster.y, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#7b3fd1'
    ctx.fill()
  }

  ctx.restore()

  const barWidth = size
  const barHeight = 8
  const barX = monster.x - barWidth / 2
  const barY = drawY - 14

  ctx.fillStyle = 'rgba(40, 20, 20, 0.65)'
  ctx.fillRect(barX, barY, barWidth, barHeight)
  ctx.fillStyle = '#e64848'
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barWidth, barHeight)

  ctx.font = 'bold 13px Microsoft JhengHei, Arial'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#3a220b'
  ctx.fillText(`${monster.hp}/${monster.maxHp}`, monster.x, barY - 4)
}

function getBallSquareCollision(ball, monster) {
  const halfSize = monster.size / 2
  const left = monster.x - halfSize
  const right = monster.x + halfSize
  const top = monster.y - halfSize
  const bottom = monster.y + halfSize
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

function handleCollisions(currentTime) {
  for (const ball of balls) {
    if (!ball.monsterHitTimes) {
      ball.monsterHitTimes = {}
    }

    for (const monster of monsters) {
      if (monster.isDead) continue

      const lastHitTime = ball.monsterHitTimes[monster.id] ?? 0
      if (currentTime - lastHitTime < MONSTER_CONFIG.hitCooldown) continue

      const collision = getBallSquareCollision(ball, monster)

      if (!collision) continue

      monster.hp = Math.max(monster.hp - getDamage(), 0)
      monster.hitFlashUntil = currentTime + MONSTER_CONFIG.hitFlashDuration

      const velocityDotNormal = ball.vx * collision.normalX + ball.vy * collision.normalY

      ball.x += collision.normalX * collision.pushDistance
      ball.y += collision.normalY * collision.pushDistance

      if (velocityDotNormal < 0) {
        ball.vx -= 2 * velocityDotNormal * collision.normalX
        ball.vy -= 2 * velocityDotNormal * collision.normalY
      }

      ball.monsterHitTimes[monster.id] = currentTime

      if (monster.hp <= 0) {
        monster.isDead = true
        onMonsterKilled(getMonsterCoinReward(monster.maxHp))
      }
    }
  }

  monsters = monsters.filter((monster) => !monster.isDead)

  if (monsters.length === 0) {
    currentStage += 1
    onStageClear(currentStage)
    createStageMonsters(currentStage)
  }
}

function gameLoop(currentTime) {
  if (!lastTime) {
    lastTime = currentTime
  }

  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  drawBackground()

  for (const monster of monsters) {
    drawMonster(monster, currentTime)
  }

  for (const ball of balls) {
    ball.update(canvas.width, canvas.height, deltaTime)
    ball.draw(ctx)
  }

  handleCollisions(currentTime)

  animationId = requestAnimationFrame(gameLoop)
}

export function initGame(options = {}) {
  canvas = document.querySelector('#battleCanvas')
  if (!canvas) return

  const {
    ballCount = 1,
    stage = GAME_CONFIG.defaultStage,
    getCurrentDamage = () => 5,
    handleMonsterKilled = () => {},
    handleStageClear = () => {},
  } = options

  getDamage = getCurrentDamage
  onMonsterKilled = handleMonsterKilled
  onStageClear = handleStageClear
  currentStage = stage

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

  createStageMonsters(currentStage)

  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  lastTime = 0
  animationId = requestAnimationFrame(gameLoop)
}

export function addOneBall() {
  if (!canvas) return
  balls.push(createBall(canvas.width, canvas.height))
}
