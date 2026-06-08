import { useSerial } from '../hooks/SerialContext'
import { useTrackerContext } from '../hooks/TrackerContext'
import './styles/DroneAlert.css'

const CONFIRM_FRAMES = 10

export default function DroneAlert() {
  const { droneDetected, detectionMinHz, detectionMaxHz, confirmFrames, detectionMode, templateName } = useSerial()
  const { trackerMode } = useTrackerContext()

  if (!droneDetected && confirmFrames === 0) return null

  const pct = Math.min(100, Math.round((confirmFrames / CONFIRM_FRAMES) * 100))
  const isArmed = confirmFrames > 0 && !droneDetected
  const isCustom = detectionMode === 'custom'

  return (
    <div className={`drone-alert-overlay ${trackerMode === 'TRACKING' ? 'tracking' : ''} ${isArmed ? 'arming' : ''}`}>
      <div className="drone-alert-box">
        {isArmed ? (
          <>
            <div className="alert-icon arming-icon">⟁</div>
            <h2 className="arming-title">DETECCION EN CURSO</h2>
            <p className="mono arming-sub">
              {isCustom
                ? `PLANTILLA "${templateName || 'CUSTOM'}" — CONFIRMANDO (${confirmFrames}/${CONFIRM_FRAMES})`
                : `FIRMA ${detectionMinHz}-${detectionMaxHz}Hz — CONFIRMANDO (${confirmFrames}/${CONFIRM_FRAMES})`}
            </p>
            <div className="confidence-bar-track">
              <div className="confidence-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="alert-icon">⚠</div>
            <h2>DRONE DETECTADO</h2>
            <p className="mono">
              {isCustom
                ? (trackerMode === 'TRACKING'
                    ? `PLANTILLA "${templateName || 'CUSTOM'}" — TRACKING ACTIVO`
                    : `PLANTILLA "${templateName || 'CUSTOM'}" — SISTEMAS DETENIDOS`)
                : (trackerMode === 'TRACKING'
                    ? `FIRMA ${detectionMinHz}-${detectionMaxHz}Hz DETECTADA — TRACKING ACTIVO`
                    : `FIRMA ${detectionMinHz}-${detectionMaxHz}Hz DETECTADA — SISTEMAS DETENIDOS`)}
            </p>
            <div className="confidence-bar-track detected">
              <div className="confidence-bar-fill full" style={{ width: '100%' }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
