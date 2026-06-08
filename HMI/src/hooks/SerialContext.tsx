import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { AudioEngine } from '../audio/audioEngine'

function spectralSimilarity(a: Float32Array, b: Float32Array, hzPerBin: number): number {
  const n = Math.min(a.length, b.length)
  const startBin = Math.max(0, Math.floor(100 / hzPerBin))
  const endBin = Math.min(n, Math.ceil(5000 / hzPerBin))
  if (endBin - startBin < 5) return 0

  const FLOOR = -80
  let dot = 0, normA = 0, normB = 0
  for (let i = startBin; i < endBin; i++) {
    const va = (isFinite(a[i]) ? a[i] : FLOOR) + 100
    const vb = (isFinite(b[i]) ? b[i] : FLOOR) + 100
    dot += va * vb
    normA += va * va
    normB += vb * vb
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  const sim = denom < 1e-10 ? 0 : dot / denom
  return isFinite(sim) ? Math.max(0, Math.min(1, sim)) : 0
}

function detectPeaks(data: Float32Array, hzPerBin: number): number[] {
  const peaks: number[] = []
  const n = data.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += isFinite(data[i]) ? data[i] : -100
  const mean = sum / n

  for (let i = 3; i < n - 3; i++) {
    const v = isFinite(data[i]) ? data[i] : -100
    if (v > data[i - 1] && v > data[i + 1] &&
        v > data[i - 2] && v > data[i + 2] &&
        v > data[i - 3] && v > data[i + 3] &&
        v > mean + 8) {
      peaks.push(i * hzPerBin)
    }
  }
  return peaks
}

function countMatchingPeaks(livePeaks: number[], templatePeaks: number[], tolerance: number): number {
  let matches = 0
  for (const tp of templatePeaks) {
    for (const lp of livePeaks) {
      if (Math.abs(lp - tp) <= tolerance) {
        matches++
        break
      }
    }
  }
  return matches
}

export interface SerialData {
  angle?: number
  target?: number
  state?: string
  raw: string
  timestamp: number
}

export interface SerialLog {
  message: string
  timestamp: number
  type: 'info' | 'tx' | 'rx' | 'error'
}

interface SerialContextType {
  isSupported: boolean
  rotaConnected: boolean
  transConnected: boolean
  rotaPortInfo: string
  transPortInfo: string
  rotaData: SerialData | null
  transData: SerialData | null
  logs: SerialLog[]
  connectRota: () => Promise<void>
  connectTrans: () => Promise<void>
  disconnectRota: () => Promise<void>
  disconnectTrans: () => Promise<void>
  sendRota: (cmd: string) => Promise<void>
  sendTrans: (cmd: string) => Promise<void>
  sendBoth: (cmd: string) => Promise<void>
  clearLogs: () => void
  isMicActive: boolean
  startMic: () => Promise<void>
  stopMic: () => void
  audioDevices: MediaDeviceInfo[]
  selectedDeviceId: string
  setSelectedDeviceId: (id: string) => void
  refreshAudioDevices: () => Promise<void>
  fftBins: number[]
  smoothedFftBins: number[]
  peakFrequency: number
  timelineValues: number[]
  spectrogramData: number[][]
  dbMin: number
  dbMax: number
  waveformData: number[]
  targetDisplayBin: { start: number; end: number }
  sampleRate: number
  droneDetected: boolean
  energy700: number
  detectionMinHz: number
  detectionMaxHz: number
  setDetectionMinHz: (hz: number) => void
  setDetectionMaxHz: (hz: number) => void
  rotaSweeping: boolean
  transSweeping: boolean
  setRotaSweeping: (v: boolean) => void
  setTransSweeping: (v: boolean) => void
  confirmFrames: number
  detectionMode: 'generic' | 'custom'
  setDetectionMode: (mode: 'generic' | 'custom') => void
  template: Float32Array | null
  templateName: string
  similarity: number
  setTemplate: (data: Float32Array, name: string, peaks?: number[]) => void
  clearTemplate: () => void
  addLog: (message: string, type?: SerialLog['type']) => void
  onSimilarity: number
  offSimilarity: number
  setOnSimilarity: (v: number) => void
  setOffSimilarity: (v: number) => void
  templatePeaks: number[]
  matchingPeaks: number
  minMatchingPeaks: number
  setMinMatchingPeaks: (v: number) => void
}

const SerialContext = createContext<SerialContextType | undefined>(undefined)

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const [isSupported] = useState(() => 'serial' in navigator)
  const [rotaConnected, setRotaConnected] = useState(false)
  const [transConnected, setTransConnected] = useState(false)
  const [rotaPortInfo, setRotaPortInfo] = useState('')
  const [transPortInfo, setTransPortInfo] = useState('')
  const [rotaData, setRotaData] = useState<SerialData | null>(null)
  const [transData, setTransData] = useState<SerialData | null>(null)
  const [logs, setLogs] = useState<SerialLog[]>([])

  // Audio / mic state
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const [isMicActive, setIsMicActive] = useState(false)
  const micTimerRef = useRef<number | null>(null)
  const droneDetectedRef = useRef(false)
  const confirmFramesRef = useRef(0)
  const [confirmFrames, setConfirmFrames] = useState(0)
  const sendBothRef = useRef<(cmd: string) => Promise<void>>(async () => {})
  const sendRotaRef = useRef<(cmd: string) => Promise<void>>(async () => {})
  const sendTransRef = useRef<(cmd: string) => Promise<void>>(async () => {})

  const rotaSweepRef = useRef(false)
  const transSweepRef = useRef(false)
  const [rotaSweeping, setRotaSweeping] = useState(false)
  const [transSweeping, setTransSweeping] = useState(false)

  // Detection confidence window (frames at 50ms each)
  const CONFIRM_FRAMES = 10 // 10 × 50ms = 500ms
  const ON_THRESHOLD = 60
  const OFF_THRESHOLD = 35
  const ON_SIMILARITY_DEFAULT = 0.7
  const OFF_SIMILARITY_DEFAULT = 0.5

  const [onSimilarity, setOnSimilarity] = useState(ON_SIMILARITY_DEFAULT)
  const [offSimilarity, setOffSimilarity] = useState(OFF_SIMILARITY_DEFAULT)
  const onSimilarityRef = useRef(ON_SIMILARITY_DEFAULT)
  const offSimilarityRef = useRef(OFF_SIMILARITY_DEFAULT)

  // Template matching
  const [detectionMode, setDetectionMode] = useState<'generic' | 'custom'>('generic')
  const detectionModeRef = useRef<'generic' | 'custom'>('generic')
  const [template, setTemplateState] = useState<Float32Array | null>(null)
  const [templateName, setTemplateName] = useState('')
  const templateRef = useRef<Float32Array | null>(null)
  const [similarity, setSimilarity] = useState(0)
  const [templatePeaks, setTemplatePeaks] = useState<number[]>([])
  const templatePeaksRef = useRef<number[]>([])
  const [matchingPeaks, setMatchingPeaks] = useState(0)
  const [minMatchingPeaks, setMinMatchingPeaks] = useState(2)
  const minMatchingPeaksRef = useRef(2)
  const PEAK_TOLERANCE = 30

  const DISPLAY_BINS = 64
  const SPECTROGRAM_COLS = 64
  const smoothedBinsRef = useRef<number[]>(Array(64).fill(-100))
  const spectrogramRawRef = useRef<number[][]>(
    Array.from({ length: 64 }, () => Array(64).fill(-100))
  )

  const [fftBins, setFftBins] = useState<number[]>(Array(64).fill(-100))
  const [smoothedFftBins, setSmoothedFftBins] = useState<number[]>(Array(64).fill(-100))
  const [peakFrequency, setPeakFrequency] = useState(0)
  const [timelineValues, setTimelineValues] = useState<number[]>(Array(60).fill(0))
  const [spectrogramData, setSpectrogramData] = useState<number[][]>(
    Array.from({ length: 64 }, () => Array(64).fill(0))
  )
  const [dbMin, setDbMin] = useState(-80)
  const [dbMax, setDbMax] = useState(-20)
  const [waveformData, setWaveformData] = useState<number[]>(Array(4096).fill(128))
  const [targetDisplayBin, setTargetDisplayBin] = useState<{ start: number; end: number }>({ start: 2, end: 3 })
  const [sampleRate, setSampleRate] = useState(44100)
  const [droneDetected, setDroneDetected] = useState(false)
  const [energy700, setEnergy700] = useState(0)
  const [detectionMinHz, setDetectionMinHz] = useState(600)
  const [detectionMaxHz, setDetectionMaxHz] = useState(900)
  const detectionMinHzRef = useRef(600)
  const detectionMaxHzRef = useRef(900)

  // Audio device selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const selectedDeviceIdRef = useRef('')

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter(d => d.kind === 'audioinput')
      setAudioDevices(mics)
      if (!selectedDeviceIdRef.current && mics.length > 0) {
        setSelectedDeviceId(mics[0].deviceId)
        selectedDeviceIdRef.current = mics[0].deviceId
      }
    } catch {}
  }, [])

  const rotaPortRef = useRef<any>(null)
  const transPortRef = useRef<any>(null)
  const rotaReaderRef = useRef<any>(null)
  const transReaderRef = useRef<any>(null)
  const rotaReadActiveRef = useRef(false)
  const transReadActiveRef = useRef(false)

  const addLog = useCallback((message: string, type: SerialLog['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-99), { message, timestamp: Date.now(), type }])
  }, [])

  const setTemplate = useCallback((data: Float32Array, name: string, peaks?: number[]) => {
    templateRef.current = data
    setTemplateState(data)
    setTemplateName(name)
    setSimilarity(0)
    if (peaks && peaks.length > 0) {
      templatePeaksRef.current = peaks
      setTemplatePeaks(peaks)
      addLog(`TEMPLATE picos detectados: ${peaks.map(h => `${h.toFixed(0)}Hz`).join(', ')}`, 'info')
    }
    addLog(`TEMPLATE cargado: ${name} (${data.length} bins)`, 'info')
  }, [addLog])

  const clearTemplate = useCallback(() => {
    templateRef.current = null
    setTemplateState(null)
    setTemplateName('')
    setSimilarity(0)
    templatePeaksRef.current = []
    setTemplatePeaks([])
    setMatchingPeaks(0)
    if (detectionModeRef.current === 'custom') {
      setDetectionMode('generic')
      detectionModeRef.current = 'generic'
    }
    addLog('TEMPLATE eliminado', 'info')
  }, [addLog])

  // ---- Audio / Mic ----
  const processAudioFrame = useCallback(() => {
    const engine = audioEngineRef.current
    if (!engine || !engine.isActive()) return

    const SAMPLE_RATE = engine.getSampleRate()
    const FFT_SIZE = 4096
    const HZ_PER_BIN = SAMPLE_RATE / FFT_SIZE
    const binCount = FFT_SIZE / 2
    const binsPerGroup = Math.floor(binCount / DISPLAY_BINS)

    const byteData = engine.getFrequencyData()
    if (byteData.length === 0) return

    const startBin = Math.floor(detectionMinHzRef.current / HZ_PER_BIN)
    const endBin = Math.ceil(detectionMaxHzRef.current / HZ_PER_BIN)
    let energy700Val = 0
    let count = 0
    for (let i = startBin; i <= endBin; i++) {
      if (i >= 0 && i < byteData.length) {
        energy700Val += byteData[i]
        count++
      }
    }
    energy700Val = count > 0 ? energy700Val / count : 0

    setEnergy700(energy700Val)
    setTimelineValues(prev => [...prev.slice(1), energy700Val])

    const floatData = engine.getFloatFrequencyData()
    const rawBins = new Array(DISPLAY_BINS)
    for (let j = 0; j < DISPLAY_BINS; j++) {
      let sum = 0
      for (let k = 0; k < binsPerGroup; k++) {
        sum += floatData[j * binsPerGroup + k]
      }
      rawBins[j] = sum / binsPerGroup
    }

    const ALPHA = 0.1
    const smoothed = smoothedBinsRef.current
    for (let j = 0; j < DISPLAY_BINS; j++) {
      smoothed[j] = ALPHA * rawBins[j] + (1 - ALPHA) * smoothed[j]
    }

    let peakIdx = 1
    let peakVal = floatData[1]
    for (let i = 2; i < floatData.length; i++) {
      if (floatData[i] > peakVal) {
        peakVal = floatData[i]
        peakIdx = i
      }
    }
    const peakFreq = peakIdx * HZ_PER_BIN

    const specRaw = spectrogramRawRef.current
    for (let r = 0; r < DISPLAY_BINS; r++) {
      specRaw[r].shift()
      specRaw[r].push(rawBins[r])
    }

    const recentValues: number[] = []
    for (let r = 0; r < DISPLAY_BINS; r++) {
      for (let c = SPECTROGRAM_COLS - 16; c < SPECTROGRAM_COLS; c++) {
        recentValues.push(specRaw[r][c])
      }
    }
    recentValues.sort((a, b) => a - b)
    const p5idx = Math.floor(recentValues.length * 0.05)
    const p95idx = Math.floor(recentValues.length * 0.95)
    const newDbMin = recentValues[p5idx] - 10
    const newDbMax = recentValues[p95idx] + 10

    const range = newDbMax - newDbMin || 1
    const newSpectrogramData = specRaw.map(row =>
      row.map(v => Math.max(0, Math.min(1, (v - newDbMin) / range)))
    )

    const timeData = engine.getTimeDomainData()

    setFftBins(rawBins)
    setSmoothedFftBins([...smoothed])
    setPeakFrequency(peakFreq)
    setSpectrogramData(newSpectrogramData)
    setDbMin(newDbMin)
    setDbMax(newDbMax)
    setWaveformData(Array.from(timeData))

    // Compute similarity if in custom mode with template
    let similarityVal = 0
    let peaksMatch = 0
    const tpl = templateRef.current
    const tplPeaks = templatePeaksRef.current
    const isCustom = detectionModeRef.current === 'custom' && tpl !== null

    if (isCustom) {
      similarityVal = spectralSimilarity(floatData, tpl, HZ_PER_BIN)
      if (tplPeaks.length > 0) {
        const livePeaks = detectPeaks(floatData, HZ_PER_BIN)
        peaksMatch = countMatchingPeaks(livePeaks, tplPeaks, PEAK_TOLERANCE)
      }
    }
    setSimilarity(similarityVal)
    setMatchingPeaks(peaksMatch)

    const wasDetected = droneDetectedRef.current

    let triggerOn = false
    let triggerOff = false
    let debugInfo = ''

    if (isCustom) {
      const simOk = similarityVal > onSimilarityRef.current
      const peaksOk = tplPeaks.length === 0 || peaksMatch >= minMatchingPeaksRef.current
      triggerOn = simOk && peaksOk
      triggerOff = similarityVal < offSimilarityRef.current
      debugInfo = `sim=${(similarityVal * 100).toFixed(0)}% picos=${peaksMatch}/${tplPeaks.length}`
    } else {
      triggerOn = energy700Val > ON_THRESHOLD
      triggerOff = energy700Val < OFF_THRESHOLD
      debugInfo = `en=${energy700Val.toFixed(0)}`
    }

    if (!wasDetected) {
      if (triggerOn) {
        confirmFramesRef.current++
        if (confirmFramesRef.current >= CONFIRM_FRAMES) {
          droneDetectedRef.current = true
          setDroneDetected(true)
          sendBothRef.current('STOP')
          const label = isCustom ? 'TEMPLATE MATCH' : `${detectionMinHzRef.current}-${detectionMaxHzRef.current}Hz`
          addLog(`DRONE DETECTADO — ${label} ${debugInfo} supera umbral por ${CONFIRM_FRAMES} frames. STOP enviado`, 'info')
        }
      } else {
        confirmFramesRef.current = 0
      }
    } else {
      if (triggerOff) {
        confirmFramesRef.current++
        if (confirmFramesRef.current >= CONFIRM_FRAMES) {
          droneDetectedRef.current = false
          setDroneDetected(false)
          confirmFramesRef.current = 0
          if (rotaSweepRef.current) sendRotaRef.current('START')
          if (transSweepRef.current) sendTransRef.current('START')
          const label = isCustom ? 'TEMPLATE' : `${detectionMinHzRef.current}-${detectionMaxHzRef.current}Hz`
          addLog(`DRONE PERDIDO — ${label} ${debugInfo} bajo umbral por ${CONFIRM_FRAMES} frames. START enviado`, 'info')
        }
      } else {
        confirmFramesRef.current = 0
      }
    }
    setConfirmFrames(confirmFramesRef.current)
  }, [addLog])

  const stopMic = useCallback(() => {
    if (micTimerRef.current !== null) {
      clearInterval(micTimerRef.current)
      micTimerRef.current = null
    }
    audioEngineRef.current?.stop()
    audioEngineRef.current = null
    setIsMicActive(false)
    setFftBins(Array(64).fill(-100))
    setSmoothedFftBins(Array(64).fill(-100))
    setPeakFrequency(0)
    setTimelineValues(Array(60).fill(0))
    setSpectrogramData(Array.from({ length: 64 }, () => Array(64).fill(0)))
    setDbMin(-80)
    setDbMax(-20)
    setWaveformData(Array(4096).fill(128))
    setDroneDetected(false)
    setEnergy700(0)
    smoothedBinsRef.current = Array(64).fill(-100)
    spectrogramRawRef.current = Array.from({ length: 64 }, () => Array(64).fill(-100))
    droneDetectedRef.current = false
    confirmFramesRef.current = 0
    setSimilarity(0)
    addLog('MICROFONO detenido', 'info')
  }, [addLog])

  const startMic = useCallback(async () => {
    try {
      const engine = new AudioEngine()
      const devId = selectedDeviceIdRef.current || undefined
      await engine.start(devId)
      audioEngineRef.current = engine
      
      const sr = engine.getSampleRate()
      setSampleRate(sr)
      
      const HZ_PER_BIN = sr / 4096
      const binsPerGroup = Math.floor(2048 / 64)
      const startRawBin = Math.floor(600 / HZ_PER_BIN)
      const endRawBin = Math.ceil(900 / HZ_PER_BIN)
      const startDispBin = Math.min(63, Math.floor(startRawBin / binsPerGroup))
      const endDispBin = Math.min(63, Math.floor(endRawBin / binsPerGroup))
      setTargetDisplayBin({ start: startDispBin, end: endDispBin })
      
      setIsMicActive(true)
      addLog('MICROFONO iniciado — capturando audio', 'info')

      micTimerRef.current = window.setInterval(() => {
        processAudioFrame()
      }, 50)
    } catch (err: any) {
      addLog(`MICROFONO ERROR: ${err.message}`, 'error')
    }
  }, [addLog, processAudioFrame])

  // ---- Serial read/write ----
  const parseLine = (line: string): SerialData => {
    const trimmed = line.trim()
    const data: SerialData = { raw: trimmed, timestamp: Date.now() }
    const angMatch = trimmed.match(/ANG:([\d.]+)/)
    const targetMatch = trimmed.match(/TARGET:([\d.]+)/)
    const stateMatch = trimmed.match(/STATE:(\w+)/)
    if (angMatch) data.angle = parseFloat(angMatch[1])
    if (targetMatch) data.target = parseFloat(targetMatch[1])
    if (stateMatch) data.state = stateMatch[1]
    return data
  }

  const readLoop = async (type: 'rota' | 'trans') => {
    const portRef = type === 'rota' ? rotaPortRef : transPortRef
    const readerRef = type === 'rota' ? rotaReaderRef : transReaderRef
    const activeRef = type === 'rota' ? rotaReadActiveRef : transReadActiveRef
    const setData = type === 'rota' ? setRotaData : setTransData
    if (!portRef.current) return

    const decoder = new TextDecoder()
    let buffer = ''
    try {
      const reader = portRef.current.readable.getReader()
      readerRef.current = reader
      activeRef.current = true
      while (activeRef.current) {
        const { value, done } = await reader.read()
        if (done || !activeRef.current) break
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            setData(parseLine(line))
            addLog(`[${type.toUpperCase()} RX] ${line.trim()}`, 'rx')
          }
        }
      }
    } catch (err: any) {
      addLog(`[${type.toUpperCase()} ERROR] ${err.message}`, 'error')
    } finally {
      try { readerRef.current?.releaseLock() } catch {}
      readerRef.current = null
    }
  }

  const connectPort = async (type: 'rota' | 'trans') => {
    if (!isSupported) {
      addLog('Web Serial API no soportada en este navegador. Use Chrome/Edge.', 'error')
      return
    }
    try {
      addLog(`Solicitando puerto ${type.toUpperCase()}...`, 'info')
      const nav = navigator as any
      const port = await nav.serial.requestPort()
      await port.open({ baudRate: 115200 })
      let info = 'serial'
      if (port.getInfo) {
        const { usbVendorId, usbProductId } = port.getInfo()
        info = `VID:${usbVendorId?.toString(16) || '?'} PID:${usbProductId?.toString(16) || '?'}`
      }
      if (type === 'rota') {
        rotaPortRef.current = port
        setRotaConnected(true)
        setRotaPortInfo(info)
      } else {
        transPortRef.current = port
        setTransConnected(true)
        setTransPortInfo(info)
      }
      addLog(`${type.toUpperCase()} conectado (${info}) @ 115200`, 'info')
      readLoop(type)
      // Activar sistema de posicion al conectar
      setTimeout(() => {
        sendCommand(type, 'M114')
      }, 100)
    } catch (err: any) {
      addLog(`[${type.toUpperCase()} CONN ERROR] ${err.message}`, 'error')
    }
  }

  const disconnectPort = async (type: 'rota' | 'trans') => {
    const activeRef = type === 'rota' ? rotaReadActiveRef : transReadActiveRef
    const readerRef = type === 'rota' ? rotaReaderRef : transReaderRef
    const portRef = type === 'rota' ? rotaPortRef : transPortRef
    activeRef.current = false
    try { await readerRef.current?.cancel() } catch {}
    try { await portRef.current?.close() } catch {}
    portRef.current = null
    if (type === 'rota') {
      setRotaConnected(false)
      setRotaPortInfo('')
    } else {
      setTransConnected(false)
      setTransPortInfo('')
    }
    addLog(`${type.toUpperCase()} desconectado`, 'info')
  }

  const sendCommand = async (type: 'rota' | 'trans', cmd: string) => {
    const portRef = type === 'rota' ? rotaPortRef : transPortRef
    if (!portRef.current) {
      addLog(`[${type.toUpperCase()} TX FAIL] Puerto no conectado`, 'error')
      return
    }
    try {
      const encoder = new TextEncoder()
      const writer = portRef.current.writable.getWriter()
      await writer.write(encoder.encode(cmd + '\n'))
      writer.releaseLock()
      addLog(`[${type.toUpperCase()} TX] ${cmd}`, 'tx')
    } catch (err: any) {
      addLog(`[${type.toUpperCase()} TX ERROR] ${err.message}`, 'error')
    }
  }

  const sendBoth = useCallback(async (cmd: string) => {
    await sendCommand('rota', cmd)
    await sendCommand('trans', cmd)
  }, [])

  // Keep refs up to date for the audio closure
  sendBothRef.current = sendBoth
  sendRotaRef.current = (cmd) => sendCommand('rota', cmd)
  sendTransRef.current = (cmd) => sendCommand('trans', cmd)

  useEffect(() => {
    return () => {
      stopMic()
      disconnectPort('rota')
      disconnectPort('trans')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SerialContext.Provider
      value={{
        isSupported,
        rotaConnected,
        transConnected,
        rotaPortInfo,
        transPortInfo,
        rotaData,
        transData,
        logs,
        connectRota: () => connectPort('rota'),
        connectTrans: () => connectPort('trans'),
        disconnectRota: () => disconnectPort('rota'),
        disconnectTrans: () => disconnectPort('trans'),
        sendRota: (cmd) => sendCommand('rota', cmd),
        sendTrans: (cmd) => sendCommand('trans', cmd),
        sendBoth,
        clearLogs: () => setLogs([]),
        addLog,
        isMicActive,
        startMic,
        stopMic,
        audioDevices,
        selectedDeviceId,
        setSelectedDeviceId: (id: string) => {
          setSelectedDeviceId(id)
          selectedDeviceIdRef.current = id
        },
        refreshAudioDevices,
        fftBins,
        smoothedFftBins,
        peakFrequency,
        timelineValues,
        spectrogramData,
        dbMin,
        dbMax,
        waveformData,
        targetDisplayBin,
        sampleRate,
        droneDetected,
        energy700,
        detectionMinHz,
        detectionMaxHz,
        setDetectionMinHz: (hz: number) => {
          const clamped = Math.max(100, Math.min(10000, hz))
          setDetectionMinHz(clamped)
          detectionMinHzRef.current = clamped
        },
        setDetectionMaxHz: (hz: number) => {
          const clamped = Math.max(100, Math.min(10000, hz))
          setDetectionMaxHz(clamped)
          detectionMaxHzRef.current = clamped
        },
        rotaSweeping,
        transSweeping,
        setRotaSweeping: (v: boolean) => {
          rotaSweepRef.current = v
          setRotaSweeping(v)
        },
        setTransSweeping: (v: boolean) => {
          transSweepRef.current = v
          setTransSweeping(v)
        },
        confirmFrames,
        detectionMode,
        setDetectionMode: (mode: 'generic' | 'custom') => {
          setDetectionMode(mode)
          detectionModeRef.current = mode
          setConfirmFrames(0)
          confirmFramesRef.current = 0
          if (mode === 'generic') {
            setDroneDetected(false)
            droneDetectedRef.current = false
          }
        },
        template,
        templateName,
        similarity,
        setTemplate,
        clearTemplate,
        onSimilarity,
        offSimilarity,
        setOnSimilarity: (v: number) => {
          const clamped = Math.max(0.2, Math.min(0.95, v))
          setOnSimilarity(clamped)
          onSimilarityRef.current = clamped
          const off = Math.max(0.1, clamped - 0.2)
          setOffSimilarity(off)
          offSimilarityRef.current = off
        },
        setOffSimilarity: (v: number) => {
          const clamped = Math.max(0.1, Math.min(0.9, v))
          setOffSimilarity(clamped)
          offSimilarityRef.current = clamped
        },
        templatePeaks,
        matchingPeaks,
        minMatchingPeaks,
        setMinMatchingPeaks: (v: number) => {
          const clamped = Math.max(1, Math.min(10, v))
          setMinMatchingPeaks(clamped)
          minMatchingPeaksRef.current = clamped
        },
      }}
    >
      {children}
    </SerialContext.Provider>
  )
}

export function useSerial() {
  const ctx = useContext(SerialContext)
  if (!ctx) throw new Error('useSerial must be used within SerialProvider')
  return ctx
}
