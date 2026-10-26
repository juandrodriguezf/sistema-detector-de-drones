import { useState, useRef, useCallback, useEffect } from 'react'
import { useSerial } from '../hooks/SerialContext'
import { AudioEngine } from '../audio/audioEngine'
import { extractMFCC, mfccToArray } from '../utils/audioFeatures'
import { predict, loadWeights, validateWeights, type MLPWeights } from '../utils/mlp'
import './styles/MLCalibration.css'

type Tab = 'record' | 'dataset' | 'model' | 'test'

interface RecordedClip {
  id: string
  label: 'dron' | 'no_dron'
  timestamp: number
  mfcc: number[]
}

export default function MLCalibration() {
  const {
    detectionMode, setDetectionMode,
    mlModel, setMLModel,
    mlOnThreshold, setMLOnThreshold,
    mlOffThreshold, setMLOffThreshold,
    addLog,
  } = useSerial()

  const [activeTab, setActiveTab] = useState<Tab>('record')

  // Mic
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const [micActive, setMicActive] = useState(false)
  const testTimerRef = useRef<number | null>(null)
  const [liveMfcc, setLiveMfcc] = useState<number[]>([])
  const [liveConfidence, setLiveConfidence] = useState(0)
  const sampleRateRef = useRef(44100)

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordLabel, setRecordLabel] = useState<'dron' | 'no_dron'>('dron')
  const [recordedClips, setRecordedClips] = useState<RecordedClip[]>([])
  const recordBufferRef = useRef<Float32Array[]>([])
  const recordFramesRef = useRef(0)
  const RECORD_FRAMES = 30

  // Model
  const [modelFileName, setModelFileName] = useState('')
  const [modelValidationErr, setModelValidationErr] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Thresholds local copy for testing
  const [testOnThresh, setTestOnThresh] = useState(0.9)
  const [testOffThresh, setTestOffThresh] = useState(0.5)

  const modelRef = useRef<MLPWeights | null>(null)

  const startMic = useCallback(async () => {
    try {
      const engine = new AudioEngine()
      await engine.start()
      audioEngineRef.current = engine
      sampleRateRef.current = engine.getSampleRate()
      setMicActive(true)
      addLog('ML CALIB: Micrófono iniciado', 'info')

      testTimerRef.current = window.setInterval(() => {
        const eng = audioEngineRef.current
        if (!eng || !eng.isActive()) return
        const floatData = eng.getFloatFrequencyData()
        const sr = sampleRateRef.current
        const mfcc = extractMFCC(floatData, sr)
        const arr = mfccToArray(mfcc)
        setLiveMfcc(arr)

        const localModel = modelRef.current
        if (localModel) {
          const probs = predict(arr, localModel)
          setLiveConfidence(probs[1])
        }
      }, 100)
    } catch (err: any) {
      addLog(`ML CALIB: Error micrófono — ${err.message}`, 'error')
    }
  }, [addLog])

  const stopMic = useCallback(() => {
    if (testTimerRef.current !== null) {
      clearInterval(testTimerRef.current)
      testTimerRef.current = null
    }
    audioEngineRef.current?.stop()
    audioEngineRef.current = null
    setMicActive(false)
    setLiveMfcc([])
    setLiveConfidence(0)
    addLog('ML CALIB: Micrófono detenido', 'info')
  }, [addLog])

  useEffect(() => {
    return () => { stopMic() }
  }, [stopMic])

  // Recording
  const startRecording = useCallback(() => {
    if (!micActive) return
    setIsRecording(true)
    recordBufferRef.current = []
    recordFramesRef.current = 0
    addLog('ML CALIB: Grabando...', 'info')

    const collect = () => {
      const eng = audioEngineRef.current
      if (!eng || !eng.isActive()) {
        setIsRecording(false)
        return
      }
      recordBufferRef.current.push(eng.getFloatFrequencyData())
      recordFramesRef.current++
      if (recordFramesRef.current >= RECORD_FRAMES) {
        setIsRecording(false)
        processRecording()
      } else {
        setTimeout(collect, 50)
      }
    }
    collect()
  }, [micActive, addLog])

  const processRecording = useCallback(() => {
    const frames = recordBufferRef.current
    if (frames.length === 0) return
    const sr = sampleRateRef.current
    const avgFloat = new Float32Array(frames[0].length)
    for (const frame of frames) {
      for (let i = 0; i < frame.length; i++) {
        avgFloat[i] += frame[i] / frames.length
      }
    }
    const mfcc = extractMFCC(avgFloat, sr)
    const arr = mfccToArray(mfcc)
    const clip: RecordedClip = {
      id: `clip_${Date.now()}`,
      label: recordLabel,
      timestamp: Date.now(),
      mfcc: arr,
    }
    setRecordedClips(prev => [...prev, clip])
    addLog(`ML CALIB: Clip guardado — ${clip.label}`, 'info')
  }, [recordLabel, addLog])

  const exportDataset = useCallback(() => {
    if (recordedClips.length === 0) return
    const dataset = {
      sampleRate: sampleRateRef.current,
      fftSize: 4096,
      numFilters: 26,
      numCoeffs: 13,
      clips: recordedClips,
    }
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dataset_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    addLog(`ML CALIB: Dataset exportado (${recordedClips.length} clips)`, 'info')
  }, [recordedClips, addLog])

  const clearDataset = useCallback(() => {
    setRecordedClips([])
    addLog('ML CALIB: Dataset limpiado', 'info')
  }, [addLog])

  // Model upload
  const handleModelFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const weights = loadWeights(json)
      const err = validateWeights(weights)
      if (err) {
        setModelValidationErr(err)
        addLog(`ML CALIB: Error en modelo — ${err}`, 'error')
        return
      }
      setModelValidationErr(null)
      setModelFileName(file.name)
      modelRef.current = weights
      setMLModel(weights)
      setDetectionMode('ml')
      addLog(`ML CALIB: Modelo cargado — ${file.name}`, 'info')
    } catch (e: any) {
      setModelValidationErr(e.message)
      addLog(`ML CALIB: Error al cargar modelo — ${e.message}`, 'error')
    }
  }, [setMLModel, setDetectionMode, addLog])

  useEffect(() => {
    modelRef.current = mlModel
  }, [mlModel])

  const removeModel = useCallback(() => {
    modelRef.current = null
    setMLModel(null)
    setModelFileName('')
    setModelValidationErr(null)
    setLiveConfidence(0)
    if (detectionMode === 'ml') setDetectionMode('generic')
    addLog('ML CALIB: Modelo eliminado', 'info')
  }, [setMLModel, setDetectionMode, detectionMode, addLog])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) handleModelFile(file)
  }, [handleModelFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleModelFile(file)
  }, [handleModelFile])

  // Apply thresholds
  const applyThresholds = useCallback(() => {
    setMLOnThreshold(testOnThresh)
    setMLOffThreshold(testOffThresh)
    addLog(`ML CALIB: Umbrales aplicados ON=${testOnThresh} OFF=${testOffThresh}`, 'info')
  }, [testOnThresh, testOffThresh, setMLOnThreshold, setMLOffThreshold, addLog])

  const clipCount = recordedClips.length
  const dronCount = recordedClips.filter(c => c.label === 'dron').length
  const noDronCount = clipCount - dronCount

  const barStyle = (v: number, i: number, max: number) => ({
    height: `${Math.max(3, ((v + max) / (2 * max)) * 100)}%`,
    background: i === 0 ? 'var(--accent-olive-glow)' : 'var(--accent-olive-dim)',
  })

  return (
    <div className="ml-calibration">
      {/* Header */}
      <div className="ml-header">
        <div className="ml-header-brand">
          <span className="ml-header-icon">◇</span>
          <h1 className="ml-header-title">ML Calibration</h1>
          <span className="ml-header-sub mono">SISTEMA DE ENTRENAMIENTO Y DETECCIÓN</span>
        </div>
        <div className="ml-header-actions">
          <a href="/" className="btn btn-back">← DASHBOARD</a>
        </div>
      </div>

      <div className="ml-wip-banner">
        <span className="ml-wip-tag mono">WIP</span>
        <span>Experimental: pipeline ML en desarrollo, no validado en campo.</span>
      </div>

      {/* Status Bar */}
      <div className="ml-status-bar">
        <div className="ml-status-item">
          <span className={`ml-status-dot ${micActive ? 'dot-ok' : 'dot-idle'}`} />
          <span className="mono">MIC: {micActive ? 'ACTIVE' : 'OFF'}</span>
        </div>
        <div className="ml-status-item">
          <span className={`ml-status-dot ${mlModel ? 'dot-ok' : 'dot-idle'}`} />
          <span className="mono">MODEL: {mlModel ? modelFileName || 'LOADED' : 'NONE'}</span>
        </div>
        <div className="ml-status-item">
          <span className="mono">DATASET: {clipCount} clips ({dronCount} DRON / {noDronCount} NO)</span>
        </div>
        <div className="ml-status-item">
          <span className="mono">MODE: {detectionMode.toUpperCase()}</span>
        </div>
        <div className="ml-status-actions">
          {!micActive ? (
            <button className="btn btn-primary" onClick={startMic}>INICIAR MIC</button>
          ) : (
            <button className="btn btn-danger" onClick={stopMic}>DETENER MIC</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="ml-tabs">
        {(['record', 'dataset', 'model', 'test'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`ml-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'record' && '🎙 GRABAR'}
            {tab === 'dataset' && '📊 DATASET'}
            {tab === 'model' && '🧠 MODELO'}
            {tab === 'test' && '🔬 TEST'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ml-tab-content">
        {activeTab === 'record' && (
          <div className="ml-tab-panel">
            <div className="ml-section">
              <div className="ml-section-title">Grabar Clip</div>
              <div className="ml-record-controls">
                <div className="ml-label-select">
                  <span className="mono">Etiqueta:</span>
                  <select
                    className="mono"
                    value={recordLabel}
                    onChange={e => setRecordLabel(e.target.value as 'dron' | 'no_dron')}
                    disabled={isRecording}
                  >
                    <option value="dron">DRON</option>
                    <option value="no_dron">NO DRON</option>
                  </select>
                </div>
                <button
                  className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                  onClick={startRecording}
                  disabled={!micActive || isRecording}
                >
                  {isRecording ? 'GRABANDO...' : 'RECORD (1.5s)'}
                </button>
              </div>
            </div>

            {liveMfcc.length > 0 && (
              <div className="ml-section">
                <div className="ml-section-title">MFCC en Vivo (13 coeffs)</div>
                <div className="ml-mfcc-bars">
                  {liveMfcc.map((v, i) => {
                    const max = Math.max(...liveMfcc.map(Math.abs), 0.01)
                    return (
                      <div key={i} className="ml-mfcc-bar-container">
                        <div
                          className="ml-mfcc-bar"
                          style={barStyle(v, i, max)}
                        />
                        <span className="ml-mfcc-label mono">{i}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="ml-section">
              <div className="ml-section-title">Clips esta sesión</div>
              <div className="mono ml-summary">
                Total: {clipCount} | DRON: {dronCount} | NO DRON: {noDronCount}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dataset' && (
          <div className="ml-tab-panel">
            <div className="ml-section">
              <div className="ml-section-title">Dataset</div>
              {recordedClips.length === 0 ? (
                <div className="mono ml-empty">No hay clips grabados. Ve a la pestaña GRABAR.</div>
              ) : (
                <div className="ml-dataset-table">
                  <div className="ml-dataset-header mono">
                    <span>#</span>
                    <span>Label</span>
                    <span>MFCC (primeros 5)</span>
                    <span>Hora</span>
                  </div>
                  {recordedClips.map((clip, i) => (
                    <div key={clip.id} className="ml-dataset-row mono">
                      <span>{i + 1}</span>
                      <span className={clip.label === 'dron' ? 'txt-danger' : 'txt-olive'}>
                        {clip.label === 'dron' ? 'DRON' : 'NO DRON'}
                      </span>
                      <span className="ml-mfcc-preview">
                        [{clip.mfcc.slice(0, 5).map(v => v.toFixed(1)).join(', ')}...]
                      </span>
                      <span>{new Date(clip.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-section-actions">
              <button className="btn btn-primary" onClick={exportDataset} disabled={clipCount === 0}>
                EXPORTAR DATASET JSON
              </button>
              <button className="btn btn-danger" onClick={clearDataset} disabled={clipCount === 0}>
                LIMPIAR TODO
              </button>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="ml-tab-panel">
            <div className="ml-section">
              <div className="ml-section-title">Cargar Modelo</div>
              <div
                className={`ml-dropzone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('ml-file-input')?.click()}
              >
                {mlModel ? (
                  <div className="ml-dropzone-content">
                    <div className="ml-model-loaded mono">
                      ✅ {modelFileName}
                    </div>
                    <div className="ml-model-info mono">
                      13 MFCC → {mlModel.W1.length} → {mlModel.W2.length} → {mlModel.W3.length} clases
                    </div>
                  </div>
                ) : (
                  <div className="ml-dropzone-content">
                    <div className="ml-dropzone-icon">📁</div>
                    <div className="mono">Arrastra weights.json aquí</div>
                    <div className="mono ml-dropzone-hint">o haz clic para seleccionar</div>
                  </div>
                )}
                <input
                  id="ml-file-input"
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
              {modelValidationErr && (
                <div className="ml-error mono">Error: {modelValidationErr}</div>
              )}
            </div>
            {mlModel && (
              <div className="ml-section-actions">
                <button className="btn btn-danger" onClick={removeModel}>
                  ELIMINAR MODELO
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="ml-tab-panel">
            {!mlModel ? (
              <div className="mono ml-empty">Carga un modelo primero en la pestaña MODELO.</div>
            ) : !micActive ? (
              <div className="mono ml-empty">Activa el micrófono para empezar.</div>
            ) : (
              <>
                <div className="ml-section">
                  <div className="ml-section-title">MFCC en Vivo</div>
                  <div className="ml-mfcc-bars">
                    {liveMfcc.map((v, i) => {
                      const max = Math.max(...liveMfcc.map(Math.abs), 0.01)
                      return (
                        <div key={i} className="ml-mfcc-bar-container">
                          <div
                            className="ml-mfcc-bar"
                            style={barStyle(v, i, max)}
                          />
                          <span className="ml-mfcc-label mono">{i}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="ml-section">
                  <div className="ml-section-title">Confianza</div>
                  <div className="ml-confidence-meter">
                    <div className="ml-confidence-labels mono">
                      <span>NO DRON</span>
                      <span>DRON</span>
                    </div>
                    <div className="ml-confidence-bar-bg">
                      <div
                        className="ml-confidence-bar"
                        style={{ width: `${liveConfidence * 100}%` }}
                      />
                    </div>
                    <div className="ml-confidence-value mono">
                      {(liveConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="ml-section">
                  <div className="ml-section-title">Umbrales de Detección</div>
                  <div className="ml-thresholds">
                    <div className="ml-threshold-row">
                      <span className="mono">ON (detectar):</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(testOnThresh * 100)}
                        onChange={e => setTestOnThresh(Number(e.target.value) / 100)}
                      />
                      <span className="mono">{testOnThresh.toFixed(2)}</span>
                    </div>
                    <div className="ml-threshold-row">
                      <span className="mono">OFF (perder):</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(testOffThresh * 100)}
                        onChange={e => setTestOffThresh(Number(e.target.value) / 100)}
                      />
                      <span className="mono">{testOffThresh.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-primary" onClick={applyThresholds}>
                      APLICAR UMBRALES
                    </button>
                  </div>
                </div>

                <div className="ml-section">
                  <div className="ml-section-title">Estado</div>
                  <div className={`ml-detection-status mono ${liveConfidence > mlOnThreshold ? 'status-danger' : ''}`}>
                    {liveConfidence > mlOnThreshold
                      ? 'DRONE DETECTADO'
                      : liveConfidence < mlOffThreshold
                      ? 'SIN DETECCIÓN'
                      : 'ZONA DE TRANSICIÓN'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
