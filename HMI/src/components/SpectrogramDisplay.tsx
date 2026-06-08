import { useRef, useEffect, useMemo } from 'react'
import { useSerial } from '../hooks/SerialContext'
import './styles/SpectrogramDisplay.css'

const COLOR_STOPS: [number, number, number, number][] = [
  [0.00, 5, 10, 5],
  [0.15, 15, 30, 10],
  [0.30, 30, 55, 20],
  [0.45, 60, 90, 40],
  [0.60, 107, 140, 66],
  [0.72, 160, 180, 50],
  [0.82, 220, 200, 40],
  [0.90, 255, 150, 30],
  [1.00, 255, 60, 60],
]

const COLORMAP_SIZE = 256

function buildColormap(): Uint8Array {
  const cmap = new Uint8Array(COLORMAP_SIZE * 3)
  for (let i = 0; i < COLORMAP_SIZE; i++) {
    const t = i / (COLORMAP_SIZE - 1)
    let s0 = COLOR_STOPS[0]
    let s1 = COLOR_STOPS[COLOR_STOPS.length - 1]
    for (let j = 0; j < COLOR_STOPS.length - 1; j++) {
      if (t >= COLOR_STOPS[j][0] && t <= COLOR_STOPS[j + 1][0]) {
        s0 = COLOR_STOPS[j]
        s1 = COLOR_STOPS[j + 1]
        break
      }
    }
    const f = s1[0] === s0[0] ? 0 : (t - s0[0]) / (s1[0] - s0[0])
    cmap[i * 3] = Math.round(s0[1] + f * (s1[1] - s0[1]))
    cmap[i * 3 + 1] = Math.round(s0[2] + f * (s1[2] - s0[2]))
    cmap[i * 3 + 2] = Math.round(s0[3] + f * (s1[3] - s0[3]))
  }
  return cmap
}

export default function SpectrogramDisplay() {
  const { spectrogramData, sampleRate, dbMin, dbMax } = useSerial()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorbarRef = useRef<HTMLCanvasElement>(null)
  const colormap = useMemo(() => buildColormap(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const SIZE = 64
    const imageData = ctx.createImageData(SIZE, SIZE)

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const val = spectrogramData[row]?.[col] ?? 0
        const idx = Math.round(Math.max(0, Math.min(1, val)) * (COLORMAP_SIZE - 1)) * 3
        const y = SIZE - 1 - row
        const px = (y * SIZE + col) * 4
        imageData.data[px] = colormap[idx]
        imageData.data[px + 1] = colormap[idx + 1]
        imageData.data[px + 2] = colormap[idx + 2]
        imageData.data[px + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [spectrogramData, colormap])

  useEffect(() => {
    const canvas = colorbarRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = 16
    const H = 256
    canvas.width = W
    canvas.height = H
    const imageData = ctx.createImageData(W, H)
    for (let y = 0; y < H; y++) {
      const t = (H - 1 - y) / (H - 1)
      const idx = Math.round(t * (COLORMAP_SIZE - 1)) * 3
      for (let x = 0; x < W; x++) {
        const px = (y * W + x) * 4
        imageData.data[px] = colormap[idx]
        imageData.data[px + 1] = colormap[idx + 1]
        imageData.data[px + 2] = colormap[idx + 2]
        imageData.data[px + 3] = 255
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }, [colormap])

  const nyquist = Math.round(sampleRate / 2)

  const freqLabelsY: { hz: number; label: string }[] = []
  const landmarks = [0, 1000, 2000, 5000, 10000, 20000]
  for (const hz of landmarks) {
    if (hz <= nyquist) {
      freqLabelsY.push({ hz, label: hz >= 1000 ? `${hz / 1000}k` : `${hz}` })
    }
  }

  return (
    <div className="panel spectrogram-display">
      <div className="panel-title">Espectrograma — Frecuencia vs Tiempo</div>
      <div className="spectrogram-content">
        <div className="spectrogram-y-labels mono">
          {freqLabelsY.slice().reverse().map((fl, i) => (
            <span key={i}>{fl.label}{fl.hz === 0 ? 'Hz' : ''}</span>
          ))}
        </div>
        <div className="spectrogram-canvas-wrapper">
          <canvas ref={canvasRef} width={64} height={64} className="spectrogram-canvas" />
          <div className="spectrogram-x-labels mono">
            <span>-3.2s</span>
            <span>-1.6s</span>
            <span>now</span>
          </div>
        </div>
        <div className="spectrogram-colorbar">
          <span className="colorbar-label mono">{dbMax.toFixed(0)}</span>
          <canvas ref={colorbarRef} className="colorbar-canvas" />
          <span className="colorbar-label mono">{dbMin.toFixed(0)}</span>
        </div>
      </div>
    </div>
  )
}
