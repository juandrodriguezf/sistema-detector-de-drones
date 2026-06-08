import { useRef, useState, useEffect } from 'react'
import { useSerial } from '../hooks/SerialContext'
import './styles/AudioTemplate.css'

export default function AudioTemplate() {
  const { detectionMode, setDetectionMode, template, templateName, similarity, setTemplate, clearTemplate, addLog, onSimilarity, setOnSimilarity, templatePeaks, matchingPeaks, minMatchingPeaks, setMinMatchingPeaks } = useSerial()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const processingRef = useRef(false)
  const progressRef = useRef(0)

  useEffect(() => {
    if (!processing) return
    const interval = setInterval(() => {
      setProgress(progressRef.current)
    }, 100)
    return () => clearInterval(interval)
  }, [processing])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || processingRef.current) return

    processingRef.current = true
    setProcessing(true)
    setProgress(0)
    progressRef.current = 0
    addLog(`PROCESANDO: ${file.name}...`, 'info')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new AudioContext()
      if (audioCtx.state === 'suspended') await audioCtx.resume()
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)

      const durSec = decodedBuffer.duration
      if (durSec < 0.5) {
        addLog('ERROR: El audio es demasiado corto (< 0.5s)', 'error')
        audioCtx.close()
        processingRef.current = false
        setProcessing(false)
        return
      }

      const source = audioCtx.createBufferSource()
      source.buffer = decodedBuffer
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 4096
      const gain = audioCtx.createGain()
      gain.gain.value = 0

      source.connect(analyser)
      analyser.connect(gain)
      gain.connect(audioCtx.destination)

      const frames: Float32Array[] = []
      const maxFrames = Math.min(Math.floor(durSec * 20), 200)
      let captured = 0

      const captureInterval = setInterval(() => {
        if (captured >= maxFrames) return
        const data = new Float32Array(analyser.frequencyBinCount)
        analyser.getFloatFrequencyData(data)
        frames.push(data)
        captured++
        progressRef.current = Math.round((captured / maxFrames) * 90)
      }, 50)

      source.start()

      await new Promise<void>((resolve) => {
        source.onended = () => {
          clearInterval(captureInterval)
          resolve()
        }
      })

      await audioCtx.close()

      if (frames.length === 0) {
        addLog('ERROR: No se pudieron capturar frames del audio', 'error')
        processingRef.current = false
        setProcessing(false)
        return
      }

      progressRef.current = 90
      setProgress(90)

      const binCount = frames[0].length
      const avg = new Float32Array(binCount)
      for (let i = 0; i < binCount; i++) {
        let sum = 0
        for (const f of frames) sum += f[i]
        avg[i] = sum / frames.length
      }

      // Detect peaks in template
      const hzPerBin = audioCtx.sampleRate / 4096
      const peaks: number[] = []
      let sum = 0
      for (let i = 0; i < binCount; i++) sum += isFinite(avg[i]) ? avg[i] : -100
      const mean = sum / binCount
      for (let i = 3; i < binCount - 3; i++) {
        const v = isFinite(avg[i]) ? avg[i] : -100
        if (v > avg[i - 1] && v > avg[i + 1] &&
            v > avg[i - 2] && v > avg[i + 2] &&
            v > avg[i - 3] && v > avg[i + 3] &&
            v > mean + 8) {
          peaks.push(Math.round(i * hzPerBin))
        }
      }

      setTemplate(avg, file.name, peaks)
      progressRef.current = 100
      setProgress(100)
      addLog(`TEMPLATE creado: ${file.name} (${frames.length} frames, ${peaks.length} picos)`, 'info')
    } catch (err: any) {
      addLog(`ERROR procesando audio: ${err.message}`, 'error')
    }

    processingRef.current = false
    setProcessing(false)
    progressRef.current = 0
  }

  const handleRemove = () => {
    clearTemplate()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const simPct = (similarity * 100).toFixed(0)
  const simThresholdPct = Math.round(onSimilarity * 100)
  const offThresholdPct = Math.round((onSimilarity - 0.2) * 100)

  const simClass = similarity > onSimilarity ? 'sim-high' : similarity > onSimilarity - 0.2 ? 'sim-mid' : 'sim-low'

  return (
    <div className="template-section">
      <div className="control-header">
        <span className="control-name">MODO DETECCIÓN</span>
      </div>
      <div className="detection-mode-row">
        <button
          className={`btn mode-btn ${detectionMode === 'generic' ? 'mode-active-gen' : ''}`}
          onClick={() => setDetectionMode('generic')}
        >
          GENÉRICO
          <span className="mode-sub mono">600-900Hz</span>
        </button>
        <button
          className={`btn mode-btn ${detectionMode === 'custom' ? 'mode-active-cus' : ''}`}
          onClick={() => setDetectionMode('custom')}
          disabled={!template}
        >
          PERSONALIZADO
          <span className="mode-sub mono">Template</span>
        </button>
      </div>

      <div className="template-area">
        {processing ? (
          <div className="template-processing">
            <div className="spinner"></div>
            <span className="mono processing-label">PROCESANDO AUDIO...</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="mono progress-pct">{progress}%</span>
          </div>
        ) : template ? (
          <div className="template-loaded">
            <div className="template-file mono">{templateName}</div>
            {detectionMode === 'custom' && (
              <>
                <div className="template-sim mono">
                  <span>SIMILITUD:</span>
                  <span className={`sim-num ${simClass}`}>{simPct}%</span>
                </div>
                {templatePeaks.length > 0 && (
                  <div className="template-peaks mono">
                    <span>PICOS: {templatePeaks.slice(0, 6).map(h => `${h}Hz`).join(', ')}{templatePeaks.length > 6 ? '...' : ''}</span>
                  </div>
                )}
                <div className="template-peak-match mono">
                  <span>ARMÓNICOS: {matchingPeaks}/{templatePeaks.length}</span>
                </div>
                <div className="template-sensitivity">
                  <label className="mono">SENSIBILIDAD: {simThresholdPct}%</label>
                  <input
                    type="range"
                    min="30"
                    max="95"
                    value={simThresholdPct}
                    onChange={(e) => setOnSimilarity(Number(e.target.value) / 100)}
                  />
                  <span className="mono sens-hint">ON &gt;{simThresholdPct}% &middot; OFF &lt;{offThresholdPct}%</span>
                </div>
                <div className="template-sensitivity">
                  <label className="mono">MÍN ARMÓNICOS: {minMatchingPeaks}</label>
                  <input
                    type="range"
                    min="1"
                    max={Math.max(2, templatePeaks.length)}
                    value={minMatchingPeaks}
                    onChange={(e) => setMinMatchingPeaks(Number(e.target.value))}
                  />
                </div>
              </>
            )}
            <button className="btn btn-danger template-remove" onClick={handleRemove}>
              QUITAR TEMPLATE
            </button>
          </div>
        ) : (
          <div className="template-empty">
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} hidden />
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              CARGAR AUDIO
            </button>
            <span className="mono template-hint">Sube un audio del dron (WAV/MP3)</span>
          </div>
        )}
      </div>
    </div>
  )
}
