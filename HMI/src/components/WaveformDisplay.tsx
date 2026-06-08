import { useRef, useEffect } from 'react'
import { useSerial } from '../hooks/SerialContext'
import './styles/WaveformDisplay.css'

export default function WaveformDisplay() {
  const { waveformData, sampleRate } = useSerial()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return

    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)

    const padding = { top: 10, right: 10, bottom: 18, left: 38 }
    const drawW = w - padding.left - padding.right
    const drawH = h - padding.top - padding.bottom

    if (drawW <= 0 || drawH <= 0) return

    const centerY = padding.top + drawH / 2

    let maxDev = 10
    for (const v of waveformData) {
      const dev = Math.abs(v - 128)
      if (dev > maxDev) maxDev = dev
    }
    const yRange = maxDev * 1.2

    ctx.strokeStyle = 'rgba(107, 140, 66, 0.15)'
    ctx.lineWidth = 0.5

    ctx.beginPath()
    ctx.moveTo(padding.left, centerY)
    ctx.lineTo(padding.left + drawW, centerY)
    ctx.stroke()

    const topY = padding.top
    const botY = padding.top + drawH
    ctx.beginPath()
    ctx.moveTo(padding.left, topY)
    ctx.lineTo(padding.left + drawW, topY)
    ctx.moveTo(padding.left, botY)
    ctx.lineTo(padding.left + drawW, botY)
    ctx.stroke()

    ctx.font = '10px "Share Tech Mono", monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#7a8190'
    ctx.fillText(`+${Math.round(maxDev)}`, padding.left - 4, topY + 4)
    ctx.fillText('0', padding.left - 4, centerY + 3)
    ctx.fillText(`-${Math.round(maxDev)}`, padding.left - 4, botY + 4)

    ctx.beginPath()
    ctx.strokeStyle = '#6b8c42'
    ctx.lineWidth = 1
    const step = waveformData.length / drawW
    for (let px = 0; px < drawW; px++) {
      const sampleIdx = Math.floor(px * step)
      const v = waveformData[sampleIdx]
      const y = centerY - ((v - 128) / yRange) * (drawH / 2)
      if (px === 0) ctx.moveTo(padding.left + px, y)
      else ctx.lineTo(padding.left + px, y)
    }
    ctx.stroke()

    const durationMs = ((waveformData.length / sampleRate) * 1000).toFixed(0)
    ctx.fillStyle = '#7a8190'
    ctx.font = '10px "Share Tech Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('0ms', padding.left, h - 3)
    ctx.textAlign = 'right'
    ctx.fillText(`${durationMs}ms`, padding.left + drawW, h - 3)
  }, [waveformData, sampleRate])

  return (
    <div className="panel waveform-display">
      <div className="panel-title">Waveform — Amplitud vs Tiempo</div>
      <div className="waveform-content">
        <div className="waveform-canvas-container" ref={containerRef}>
          <canvas ref={canvasRef} className="waveform-canvas" />
        </div>
      </div>
    </div>
  )
}
