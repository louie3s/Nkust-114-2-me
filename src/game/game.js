import { Ball } from './ball'

const BALL_CONFIG = {
  radius: 16,
  speed: 5,
  minAngle: -120,
  maxAngle: -60,
}

let canvas = null
let ctx = null
let balls = []
let animationId = null

function createBall(canvasWidth, canvasHeight) {
  const startX = canvasWidth / 2
  const startY = canvasHeight - BALL_CONFIG.radius - 10

  const randomAngle =
    Math.random() * (BALL_CONFIG.maxAngle - BALL_CONFIG.minAngle) + BALL_CONFIG.minAngle

  const radian = randomAngle * Math.PI / 180
  const vx = Math.cos(radian) * BALL_CONFIG.speed
  const vy = Math.sin(radian) * BALL_CONFIG.speed

  return new Ball(startX, startY, BALL_CONFIG.radius, vx, vy)
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#e5bf58'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function gameLoop() {
  drawBackground()

  for (const ball of balls) {
    ball.update(canvas.width, canvas.height)
    ball.draw(ctx)
  }

  animationId = requestAnimationFrame(gameLoop)
}

export function initGame(ballCount = 1) {
  canvas = document.querySelector('#battleCanvas')
  if (!canvas) return

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

  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  gameLoop()
}

export function addOneBall() {
  if (!canvas) return
  balls.push(createBall(canvas.width, canvas.height))
}