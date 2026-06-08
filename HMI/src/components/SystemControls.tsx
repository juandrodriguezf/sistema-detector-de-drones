import { useState } from 'react'
import { useSerial } from '../hooks/SerialContext'
import { useTrackerContext } from '../hooks/TrackerContext'
import AudioTemplate from './AudioTemplate'
import './styles/SystemControls.css'

export default function SystemControls() {
  const { 
    rotaConnected, transConnected, sendRota, sendTrans, sendBoth, droneDetected,
    detectionMinHz, detectionMaxHz, setDetectionMinHz, setDetectionMaxHz,
    rotaSweeping, transSweeping, setRotaSweeping, setTransSweeping
  } = useSerial()
  const { trackerMode, startTracking, stopTracking } = useTrackerContext()

  const [rotaTarget, setRotaTarget] = useState(0)
  const [transTarget, setTransTarget] = useState(0)
  const [rotaHoming, setRotaHoming] = useState(false)
  const [transHoming, setTransHoming] = useState(false)

  const handleRotaHome = async () => {
    if (!rotaConnected) return
    if (rotaHoming) {
      setRotaHoming(false)
      setRotaTarget(0)
      await sendRota('HOME')
    } else {
      setRotaHoming(true)
      await sendRota('HOME')
    }
  }

  const handleTransHome = async () => {
    if (!transConnected) return
    if (transHoming) {
      setTransHoming(false)
      setTransTarget(0)
      await sendTrans('HOME')
    } else {
      setTransHoming(true)
      await sendTrans('HOME')
    }
  }

  const handleRotaSweep = async () => {
    if (!rotaConnected) return
    const next = !rotaSweeping
    setRotaSweeping(next)
    await sendRota(next ? 'START' : 'STOP')
  }

  const handleTransSweep = async () => {
    if (!transConnected) return
    const next = !transSweeping
    setTransSweeping(next)
    await sendTrans(next ? 'START' : 'STOP')
  }

  const sendRotaTarget = async () => {
    if (rotaConnected) {
      await sendRota(`G0 X${rotaTarget}`)
    }
  }

  const sendTransTarget = async () => {
    if (transConnected) {
      await sendTrans(`G0 X${transTarget}`)
    }
  }

  return (
    <div className="panel system-controls">
      <div className="panel-title">Controles Sistemas</div>
      <div className="controls-content">
        {/* Rotational System Controls */}
        <div className="control-group">
          <div className="control-header">
            <span className="control-name">ROTACIONAL</span>
            <span className={`control-state mono ${rotaConnected ? '' : 'offline'}`}>
              {rotaConnected ? (rotaHoming ? 'HOMING...' : rotaSweeping ? 'SWEEP' : 'IDLE') : 'OFFLINE'}
            </span>
          </div>

          <div className="control-row">
            <button
              className={`btn ${rotaHoming ? 'btn-danger' : ''}`}
              onClick={handleRotaHome}
              disabled={!rotaConnected || trackerMode === 'TRACKING'}
            >
              {rotaHoming ? 'SET HOME' : 'HOME'}
            </button>
            <button
              className={`btn ${rotaSweeping ? 'btn-primary' : ''}`}
              onClick={handleRotaSweep}
              disabled={!rotaConnected || trackerMode === 'TRACKING'}
            >
              {rotaSweeping ? 'STOP SWEEP' : 'BARRIDO'}
            </button>
          </div>

          <div className="control-slider">
            <label className="mono">TARGET: {rotaTarget}°</label>
            <input
              type="range"
              min="0"
              max="360"
              value={rotaTarget}
              onChange={(e) => setRotaTarget(Number(e.target.value))}
              disabled={!rotaConnected || trackerMode === 'TRACKING'}
            />
            <button
              className="btn btn-send"
              onClick={sendRotaTarget}
              disabled={!rotaConnected || trackerMode === 'TRACKING'}
            >
              ENVIAR POSICIÓN
            </button>
          </div>
        </div>

        <div className="control-divider" />

        {/* Translational System Controls */}
        <div className="control-group">
          <div className="control-header">
            <span className="control-name">TRASLACIONAL</span>
            <span className={`control-state mono ${transConnected ? '' : 'offline'}`}>
              {transConnected ? (transHoming ? 'HOMING...' : transSweeping ? 'SWEEP' : 'IDLE') : 'OFFLINE'}
            </span>
          </div>

          <div className="control-row">
            <button
              className={`btn ${transHoming ? 'btn-danger' : ''}`}
              onClick={handleTransHome}
              disabled={!transConnected || trackerMode === 'TRACKING'}
            >
              {transHoming ? 'SET HOME' : 'HOME'}
            </button>
            <button
              className={`btn ${transSweeping ? 'btn-primary' : ''}`}
              onClick={handleTransSweep}
              disabled={!transConnected || trackerMode === 'TRACKING'}
            >
              {transSweeping ? 'STOP SWEEP' : 'BARRIDO'}
            </button>
          </div>

          <div className="control-slider">
            <label className="mono">TARGET: {transTarget}mm ({((transTarget / 200) * 90).toFixed(1)}°)</label>
            <input
              type="range"
              min="0"
              max="200"
              value={transTarget}
              onChange={(e) => setTransTarget(Number(e.target.value))}
              disabled={!transConnected || trackerMode === 'TRACKING'}
            />
            <button
              className="btn btn-send"
              onClick={sendTransTarget}
              disabled={!transConnected || trackerMode === 'TRACKING'}
            >
              ENVIAR POSICIÓN
            </button>
          </div>
        </div>

        {/* Audio Template (custom detection) */}
        <div className="control-divider" />
        <AudioTemplate />

        {/* Detection Range */}
        <div className="control-divider" />
        <div className="control-group">
          <div className="control-header">
            <span className="control-name">RANGO DETECCIÓN</span>
          </div>
          <div className="control-slider">
            <label className="mono">{detectionMinHz} - {detectionMaxHz} Hz</label>
            <div className="dual-input">
              <input
                type="number"
                min="100"
                max="10000"
                step="50"
                value={detectionMinHz}
                onChange={(e) => setDetectionMinHz(Number(e.target.value))}
              />
              <span className="mono">-</span>
              <input
                type="number"
                min="100"
                max="10000"
                step="50"
                value={detectionMaxHz}
                onChange={(e) => setDetectionMaxHz(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="control-divider" />
        <div className="control-row global-actions">
          <button className="btn btn-primary" onClick={() => sendBoth('START')} disabled={!rotaConnected && !transConnected}>START</button>
          <button className="btn btn-danger" onClick={() => sendBoth('STOP')} disabled={!rotaConnected && !transConnected}>STOP</button>
        </div>

        {/* Tracking */}
        <div className="control-divider" />
        <div className="tracking-section">
          <div className="control-header">
            <span className="control-name">TRACKING</span>
            <span className={`control-state mono ${trackerMode === 'TRACKING' ? 'tracking-active' : ''}`}>
              {trackerMode}
            </span>
          </div>
          <div className="control-row">
            <button
              className={`btn ${trackerMode === 'TRACKING' ? 'btn-danger' : 'btn-primary'}`}
              onClick={trackerMode === 'TRACKING' ? stopTracking : startTracking}
              disabled={!droneDetected && trackerMode !== 'TRACKING'}
            >
              {trackerMode === 'TRACKING' ? 'STOP TRACK' : 'TRACK'}
            </button>
          </div>
          <div className="tracking-info mono">
            <span>Requiere deteccion activa</span>
          </div>
        </div>

        {/* Keyboard Jog Hint */}
        <div className="control-divider" />
        <div className="jog-hint">
          <div className="jog-title mono">JOG TECLADO</div>
          <div className="jog-keys">
            <div className="jog-row">
              <span className="jog-key mono">↑</span>
              <span className="jog-key mono">↓</span>
              <span className="jog-label">Traslaci&oacute;n</span>
            </div>
            <div className="jog-row">
              <span className="jog-key mono">←</span>
              <span className="jog-key mono">→</span>
              <span className="jog-label">Rotaci&oacute;n</span>
            </div>
          </div>
          <div className="jog-steps">
            <span className="mono">Shift: grande · Ctrl: fino</span>
          </div>
        </div>
      </div>
    </div>
  )
}
