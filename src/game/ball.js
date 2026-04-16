import ballImageSrc from '../assets/images/ball/ball.png'

const ballImage = new Image()
ballImage.src = ballImageSrc

export class Ball {
  constructor(x, y, radius, vx, vy) {
    this.x = x
    this.y = y
    this.radius = radius
    this.vx = vx
    this.vy = vy
  }

  update(canvasWidth, canvasHeight, deltaTime) {
    this.x += this.vx * deltaTime
    this.y += this.vy * deltaTime

    if (this.x - this.radius <= 0) {
      this.x = this.radius
      this.vx *= -1
    }

    if (this.x + this.radius >= canvasWidth) {
      this.x = canvasWidth - this.radius
      this.vx *= -1
    }

    if (this.y - this.radius <= 0) {
      this.y = this.radius
      this.vy *= -1
    }

    if (this.y + this.radius >= canvasHeight) {
      this.y = canvasHeight - this.radius
      this.vy *= -1
    }
  }

  draw(ctx) {
    const size = this.radius * 2
    const drawX = this.x - this.radius
    const drawY = this.y - this.radius

    ctx.save()

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    if (ballImage.complete && ballImage.naturalWidth > 0) {
      ctx.drawImage(ballImage, drawX, drawY, size, size)
    } else {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.closePath()
    }

    ctx.restore()

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.strokeStyle = '#777777'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.arc(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.25,
      0,
      Math.PI * 2
    )
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.fill()
    ctx.closePath()
  }
}