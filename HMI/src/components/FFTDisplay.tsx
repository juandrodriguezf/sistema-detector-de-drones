import { useRef, useEffect } from 'react'
import { useSerial } from '../hooks/SerialContext'
import './styles/FFTDisplay.css'

export default function FFTDisplay() {
  const { fftBins, smoothedFftBins, peakFrequency, dbMin, dbMax, targetDisplayBin, sampleRate, detectionMinHz, detectionMaxHz } = useSerial()
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

    const padding = { top: 22, right: 10, bottom: 20, left: 38 }
    const drawW = w - padding.left - padding.right
    const drawH = h - padding.top - padding.bottom

    if (drawW <= 0 || drawH <= 0) return

    const NUM_BINS = 64
    const gap = 1
    const barW = Math.max(1, (drawW - gap * (NUM_BINS - 1)) / NUM_BINS)
    const dbRange = dbMax - dbMin || 1

    ctx.font = '10px "Share Tech Mono", monospace'

    const dbStep = Math.max(5, Math.ceil(dbRange / 5 / 5) * 5)
    for (let db = Math.ceil(dbMin / dbStep) * dbStep; db <= dbMax; db += dbStep) {
      const y = padding.top + drawH - ((db - dbMin) / dbRange) * drawH
      ctx.strokeStyle = 'rgba(107, 140, 66, 0.15)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + drawW, y)
      ctx.stroke()
      ctx.fillStyle = '#7a8190'
      ctx.textAlign = 'right'
      ctx.fillText(`${db.toFixed(0)}`, padding.left - 4, y + 3)
    }

    const zoneStartX = padding.left + targetDisplayBin.start * (barW + gap)
    const zoneEndX = padding.left + (targetDisplayBin.end + 1) * (barW + gap)
    const zoneWidth = zoneEndX - zoneStartX
    ctx.fillStyle = 'rgba(192, 57, 43, 0.1)'
    ctx.fillRect(zoneStartX, padding.top, zoneWidth, drawH)

    for (let i = 0; i < NUM_BINS; i++) {
      const x = padding.left + i * (barW + gap)
      const barH = Math.max(0, ((fftBins[i] - dbMin) / dbRange) * drawH)
      const y = padding.top + drawH - barH

      const isInRange = i >= targetDisplayBin.start && i <= targetDisplayBin.end
      if (isInRange) {
        ctx.fillStyle = 'rgba(192, 57, 43, 0.85)'
      } else {
        ctx.fillStyle = 'rgba(107, 140, 66, 0.55)'
      }
      ctx.fillRect(x, y, barW, barH)
    }

    ctx.beginPath()
    ctx.strokeStyle = '#8abf52'
    ctx.lineWidth = 1.5
    for (let i = 0; i < NUM_BINS; i++) {
      const x = padding.left + i * (barW + gap) + barW / 2
      const val = Math.max(0, ((smoothedFftBins[i] - dbMin) / dbRange) * drawH)
      const y = padding.top + drawH - val
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    if (peakFrequency > 0 && fftBins[0] > -90) {
      const HZ_PER_BIN = sampleRate / 4096
      const binsPerGroup = Math.floor(2048 / NUM_BINS)
      const peakDisplayBin = Math.min(NUM_BINS - 1, Math.floor(peakFrequency / (binsPerGroup * HZ_PER_BIN)))
      const peakX = padding.left + peakDisplayBin * (barW + gap) + barW / 2

      ctx.fillStyle = '#ff4d4d'
      ctx.beginPath()
      ctx.moveTo(peakX, padding.top - 2)
      ctx.lineTo(peakX - 5, padding.top - 10)
      ctx.lineTo(peakX + 5, padding.top - 10)
      ctx.closePath()
      ctx.fill()

      ctx.font = '9px "Share Tech Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ff4d4d'
      const label = peakFrequency >= 1000
        ? `${(peakFrequency / 1000).toFixed(1)}kHz`
        : `${peakFrequency.toFixed(0)}Hz`
      ctx.fillText(label, peakX, padding.top - 12)
    }

    const labelRangeX = zoneStartX + zoneWidth / 2
    ctx.font = '9px "Share Tech Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff4d4d'
    ctx.fillText(`${detectionMinHz}-${detectionMaxHz}Hz`, labelRangeX, padding.top + drawH + 14)

    ctx.font = '8px "Share Tech Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff4d4d'
    ctx.fillText(`${detectionMinHz}Hz`, zoneStartX + barW / 2, padding.top - 4)
    ctx.fillText(`${detectionMaxHz}Hz`, zoneEndX - barW / 2, padding.top - 4)

    ctx.fillStyle = '#7a8190'
    ctx.font = '10px "Share Tech Mono", monospace'
    ctx.textAlign = 'center'
    const freqLabels = [
      { hz: 0, label: '0' },
      { hz: 2000, label: '2k' },
      { hz: 5000, label: '5k' },
      { hz: 10000, label: '10k' },
      { hz: 20000, label: '20k' },
    ]
    const HZ_PER_BIN = sampleRate / 4096
    const binsPerGroup = Math.floor(2048 / NUM_BINS)
    const freqPerDisplayBin = binsPerGroup * HZ_PER_BIN
    for (const fl of freqLabels) {
      const binIdx = Math.min(NUM_BINS - 1, Math.floor(fl.hz / freqPerDisplayBin))
      const x = padding.left + binIdx * (barW + gap) + barW / 2
      ctx.fillText(fl.label, x, h - 3)
    }
  }, [fftBins, smoothedFftBins, peakFrequency, dbMin, dbMax, targetDisplayBin, sampleRate, detectionMinHz, detectionMaxHz])

  return (
    <div className="panel fft-display">
      <div className="panel-title">FFT Spectrum — Magnitud vs Frecuencia</div>
      <div className="fft-content">
        <div className="fft-canvas-container" ref={containerRef}>
          <canvas ref={canvasRef} className="fft-canvas" />
        </div>
      </div>
    </div>
  )
}
