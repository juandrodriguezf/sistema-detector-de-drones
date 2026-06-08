import { useSerial } from '../hooks/SerialContext'
import './styles/DiagnosticsPanel.css'

export default function DiagnosticsPanel() {
  const {
    sampleRate, detectionMinHz, detectionMaxHz, energy700,
    droneDetected, isMicActive, rotaConnected, transConnected,
    rotaData, transData
  } = useSerial()

  const FFT_SIZE = 4096
  const DISPLAY_BINS = 64
  const hzPerBin = sampleRate / FFT_SIZE
  const nyquist = sampleRate / 2
  const rawBins = FFT_SIZE / 2
  const rawPerDisplay = Math.floor(rawBins / DISPLAY_BINS)
  const startBin = Math.floor(detectionMinHz / hzPerBin)
  const endBin = Math.ceil(detectionMaxHz / hzPerBin)

  return (
    <div className="panel diagnostics-panel">
      <div className="panel-title">Diagnostico — Parametros de Audio</div>
      <div className="diagnostics-content mono">
        <div className="diag-row"><span className="diag-label">Sample Rate</span><span className="diag-value">{sampleRate} Hz</span></div>
        <div className="diag-row"><span className="diag-label">FFT Size</span><span className="diag-value">{FFT_SIZE}</span></div>
        <div className="diag-row"><span className="diag-label">Hz / bin</span><span className="diag-value">{hzPerBin.toFixed(2)}</span></div>
        <div className="diag-row"><span className="diag-label">Nyquist</span><span className="diag-value">{(nyquist / 1000).toFixed(1)} kHz</span></div>
        <div className="diag-row"><span className="diag-label">Detection Range</span><span className="diag-value diag-alert">{detectionMinHz}-{detectionMaxHz} Hz</span></div>
        <div className="diag-row"><span className="diag-label">Detection Bins</span><span className="diag-value diag-alert">{startBin}-{endBin}</span></div>
        <div className="diag-row"><span className="diag-label">Display Bins</span><span className="diag-value">{DISPLAY_BINS} ({rawPerDisplay} raw/bin)</span></div>
        <div className="diag-row"><span className="diag-label">Mic Active</span><span className={`diag-value ${isMicActive ? 'diag-ok' : 'diag-dim'}`}>{isMicActive ? 'YES' : 'NO'}</span></div>
        <div className="diag-row"><span className="diag-label">Drone</span><span className={`diag-value ${droneDetected ? 'diag-alert' : 'diag-ok'}`}>{droneDetected ? 'DETECTED' : 'NOT DETECTED'}</span></div>
        <div className="diag-row"><span className="diag-label">Energy 700Hz</span><span className="diag-value">{energy700.toFixed(1)}</span></div>
        <div className="diag-row"><span className="diag-label">Rota State</span><span className="diag-value">{rotaConnected ? (rotaData?.state ?? '---') : 'OFF'}</span></div>
        <div className="diag-row"><span className="diag-label">Trans State</span><span className="diag-value">{transConnected ? (transData?.state ?? '---') : 'OFF'}</span></div>
      </div>
    </div>
  )
}
