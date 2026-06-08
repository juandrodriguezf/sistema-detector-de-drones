import { useEffect } from 'react'
import { useSerial } from '../hooks/SerialContext'
import './styles/Header.css'

export default function Header() {
  const { rotaConnected, transConnected, rotaData, transData, isMicActive, droneDetected, detectionMinHz, detectionMaxHz, audioDevices, selectedDeviceId, setSelectedDeviceId, refreshAudioDevices, detectionMode, template, similarity } = useSerial()

  useEffect(() => { refreshAudioDevices() }, [refreshAudioDevices])

  const rotaState = rotaData?.state ?? '---'
  const transState = transData?.state ?? '---'

  const getDotClass = (connected: boolean, state?: string) => {
    if (!connected) return 'dot-idle'
    if (state === 'SCAN' || state === 'SWEEP') return 'dot-ok'
    if (state === 'STOP') return 'dot-alert'
    return 'dot-warn'
  }

  const currentMicLabel = audioDevices.find(d => d.deviceId === selectedDeviceId)?.label || ''

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-icon">◈</div>
        <div>
          <h1 className="header-title">Detector Dron</h1>
          <div className="header-subtitle mono">SISTEMA DE DETECCION ACUSTICA TACTICO</div>
        </div>
      </div>
      <div className="header-status">
        <div className="status-badge audio-device-badge">
          <span className={`status-dot ${isMicActive ? 'dot-ok' : 'dot-idle'}`}></span>
          <div className="audio-device-info">
            {isMicActive ? (
              <span className="mono">{currentMicLabel ? `MIC: ${currentMicLabel}` : 'MIC: ACTIVE'}</span>
            ) : audioDevices.length > 0 ? (
              <select className="audio-device-select mono" value={selectedDeviceId} onChange={e => setSelectedDeviceId(e.target.value)}>
                {audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic (${d.deviceId.slice(0, 8)}...)`}</option>
                ))}
              </select>
            ) : (
              <span className="mono">MIC: NO DEVICES</span>
            )}
          </div>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${getDotClass(rotaConnected, rotaState)}`}></span>
          <span className="mono">ROTA: {rotaState}</span>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${getDotClass(transConnected, transState)}`}></span>
          <span className="mono">TRASL: {transState}</span>
        </div>
        <div className={`status-badge ${droneDetected ? 'alert' : ''}`}>
          <span className={`status-dot ${droneDetected ? 'dot-alert' : 'dot-idle'}`}></span>
          <span className="mono">DRONE: {droneDetected ? 'DETECTED' : 'NOT DETECTED'}</span>
        </div>
        <div className="status-badge detection-range">
          <span className="mono">RANGO: {detectionMinHz}-{detectionMaxHz}Hz</span>
        </div>
        {detectionMode === 'custom' && template && (
          <div className="status-badge sim-badge">
            <span className="mono">SIM: {(similarity * 100).toFixed(0)}%</span>
          </div>
        )}
        <div className="status-badge mode-badge">
          <span className="mono">{detectionMode === 'custom' ? 'CUSTOM' : 'GENERIC'}</span>
        </div>
      </div>
      <div className="header-time mono">
        {new Date().toLocaleTimeString()}
      </div>
    </header>
  )
}
