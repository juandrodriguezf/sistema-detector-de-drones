import { useSerial } from '../hooks/SerialContext'
import { useTrackerContext } from '../hooks/TrackerContext'
import './styles/PositionDrawings.css'

export default function PositionDrawings() {
  const { rotaData, transData } = useSerial()
  const { trackerMode } = useTrackerContext()

  const isTracking = trackerMode === 'TRACKING'

  // Use real data if available, otherwise fallback to defaults
  const rotAngle = rotaData?.angle ?? 0
  const rotTarget = rotaData?.target ?? rotAngle
  const transPosition = transData?.angle ?? 0 // interpreted as mm for translational
  const transAngle = (transPosition / 200) * 90

  return (
    <div className="panel position-drawings">
      <div className="panel-title">Posicion Sistemas</div>
      <div className="drawings-content">
        {/* Rotational System: Top View Circle */}
        <div className="drawing-section">
          <div className="drawing-label mono">
            <span style={{ color: '#7fff6b' }}>● {rotAngle.toFixed(1)}°</span>
            {'  →  '}
            <span style={{ color: '#e8c547' }}>◆ {rotTarget.toFixed(1)}°</span>
          </div>
          <div className="drawing-canvas hud-grid radar-screen">
            <svg viewBox="0 0 200 200" className="drawing-svg">
              <defs>
                <filter id="radarGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Radar screen background */}
              <circle cx="100" cy="100" r="90" fill="var(--bg-primary)" stroke="var(--accent-olive-dim)" strokeWidth="1.5" opacity="0.95" />
              <circle cx="100" cy="100" r="2" fill="var(--accent-olive-glow)" filter="url(#radarGlow)" />

              {/* Range rings */}
              {[30, 60, 90].map(r => (
                <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="var(--hud-line)" strokeWidth="0.8" opacity="0.5" />
              ))}

              {/* Crosshairs */}
              <line x1="10" y1="100" x2="190" y2="100" stroke="var(--hud-line)" strokeWidth="0.6" opacity="0.35" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="var(--hud-line)" strokeWidth="0.6" opacity="0.35" />

              {/* Cardinal ticks */}
              {[0, 90, 180, 270].map(deg => {
                const rad = (deg - 90) * Math.PI / 180
                const x1 = 100 + 82 * Math.cos(rad)
                const y1 = 100 + 82 * Math.sin(rad)
                const x2 = 100 + 90 * Math.cos(rad)
                const y2 = 100 + 90 * Math.sin(rad)
                return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent-olive)" strokeWidth="1.2" opacity="0.7" />
              })}

              {/* Target (setpoint) indicator */}
              {(() => {
                const r = 82
                const rad = (rotTarget - 90) * Math.PI / 180
                const tx = 100 + r * Math.cos(rad)
                const ty = 100 + r * Math.sin(rad)
                const arrowSize = 8
                return (
                  <>
                    <line
                      x1="100" y1="100"
                      x2={tx} y2={ty}
                      stroke="#e8c547"
                      strokeWidth="2"
                      strokeDasharray="4,3"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    <polygon
                      points={`${tx},${ty - arrowSize} ${tx + arrowSize * 0.75},${ty + arrowSize * 0.4} ${tx - arrowSize * 0.75},${ty + arrowSize * 0.4}`}
                      fill="#e8c547"
                      stroke="#1a1d23"
                      strokeWidth="0.8"
                      opacity="1"
                    />
                  </>
                )
              })()}

              {/* Radar sweep beam */}
              {(() => {
                const sweep = 18
                const r = 88
                const toRad = (d: number) => (d - 90) * Math.PI / 180
                const xTrail = 100 + r * Math.cos(toRad(rotAngle - sweep))
                const yTrail = 100 + r * Math.sin(toRad(rotAngle - sweep))
                const xLead = 100 + r * Math.cos(toRad(rotAngle))
                const yLead = 100 + r * Math.sin(toRad(rotAngle))
                return (
                  <path
                    d={`M 100 100 L ${xTrail} ${yTrail} A ${r} ${r} 0 0 1 ${xLead} ${yLead} Z`}
                    fill="var(--accent-olive)"
                    opacity="0.12"
                  />
                )
              })()}

              {/* Sweep line (leading edge) */}
              <line
                x1="100"
                y1="100"
                x2={100 + 88 * Math.cos((rotAngle - 90) * Math.PI / 180)}
                y2={100 + 88 * Math.sin((rotAngle - 90) * Math.PI / 180)}
                stroke="var(--accent-olive-glow)"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#radarGlow)"
                opacity="1"
              />

              {/* Blip at leading edge (feedback) */}
              <circle
                cx={100 + 88 * Math.cos((rotAngle - 90) * Math.PI / 180)}
                cy={100 + 88 * Math.sin((rotAngle - 90) * Math.PI / 180)}
                r="5"
                fill={isTracking ? 'var(--alert-red-glow)' : '#7fff6b'}
                stroke="#1a1d23"
                strokeWidth="1"
                filter="url(#radarGlow)"
              />

              {/* Tracking pulse ring */}
              {isTracking && (
                <circle
                  cx={100 + 88 * Math.cos((rotAngle - 90) * Math.PI / 180)}
                  cy={100 + 88 * Math.sin((rotAngle - 90) * Math.PI / 180)}
                  r="8"
                  fill="none"
                  stroke="var(--alert-red-glow)"
                  strokeWidth="1.5"
                  className="tracking-pulse"
                />
              )}

              {/* Labels */}
              <text x="100" y="14" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontFamily="Share Tech Mono">0°</text>
              <text x="186" y="103" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontFamily="Share Tech Mono">90°</text>
              <text x="100" y="194" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontFamily="Share Tech Mono">180°</text>
              <text x="14" y="103" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontFamily="Share Tech Mono">270°</text>
            </svg>
          </div>
        </div>

        {/* Translational System: Coupled Elevation */}
        <div className="drawing-section">
          <div className="drawing-label mono">TRASLACIONAL — {transPosition.toFixed(1)}mm / {transAngle.toFixed(1)}°</div>
          <div className="drawing-canvas hud-grid elevation-screen">
            <svg viewBox="0 0 220 130" className="drawing-svg">
              <defs>
                <filter id="armGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {(() => {
                const clampedPos = Math.min(Math.max(transPosition, 0), 200)
                const cx = 30 + (clampedPos / 200) * 160 // carro center x
                const cy = 100 // carro center y (rail level)
                const armLen = 55
                const arcR = 32
                const angleRad = transAngle * Math.PI / 180

                const armX = cx + armLen * Math.cos(angleRad)
                const armY = cy - armLen * Math.sin(angleRad)

                // Arc from 0° (horizontal right) to current angle, counter-clockwise
                const arcStartX = cx + arcR
                const arcStartY = cy
                const arcEndX = cx + arcR * Math.cos(angleRad)
                const arcEndY = cy - arcR * Math.sin(angleRad)
                const largeArc = 0
                const sweepArc = 0 // counter-clockwise

                return (
                  <>
                    {/* Reference ghost lines: 0° horizontal and 90° vertical */}
                    <line x1={cx} y1={cy} x2={cx + armLen + 8} y2={cy} stroke="var(--hud-line)" strokeWidth="0.6" opacity="0.25" strokeDasharray="3,2" />
                    <line x1={cx} y1={cy} x2={cx} y2={cy - armLen - 8} stroke="var(--hud-line)" strokeWidth="0.6" opacity="0.25" strokeDasharray="3,2" />

                    {/* Rail */}
                    <line x1="20" y1={cy + 6} x2="200" y2={cy + 6} stroke="var(--border-color)" strokeWidth="3" strokeLinecap="round" />

                    {/* Rail ticks every 20mm */}
                    {[0, 40, 80, 120, 160, 200].map(mm => {
                      const tx = 30 + (mm / 200) * 160
                      return (
                        <g key={mm}>
                          <line x1={tx} y1={cy + 2} x2={tx} y2={cy + 10} stroke="var(--hud-line)" strokeWidth="1" />
                          <text x={tx} y={cy + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="Share Tech Mono">{mm}</text>
                        </g>
                      )
                    })}

                    {/* Pivot joint at carro */}
                    <circle cx={cx} cy={cy} r="4" fill="var(--accent-olive-dim)" stroke="var(--accent-olive-glow)" strokeWidth="1.5" />

                    {/* Carro block */}
                    <rect x={cx - 6} y={cy + 2} width="12" height="10" rx="1" fill="var(--accent-olive-dim)" stroke="var(--accent-olive-glow)" strokeWidth="1" opacity="0.9" />

                    {/* Arm */}
                    <line
                      x1={cx} y1={cy} x2={armX} y2={armY}
                      stroke="var(--accent-olive-glow)" strokeWidth="2.5" strokeLinecap="round"
                      filter="url(#armGlow)"
                    />

                    {/* Arm tip blip */}
                    <circle
                      cx={armX} cy={armY} r="3.5"
                      fill={isTracking ? 'var(--alert-red-glow)' : 'var(--accent-olive-glow)'}
                      filter="url(#armGlow)"
                    />

                    {/* Tracking pulse ring */}
                    {isTracking && (
                      <circle
                        cx={armX} cy={armY} r="8"
                        fill="none"
                        stroke="var(--alert-red-glow)"
                        strokeWidth="1.5"
                        className="tracking-pulse"
                      />
                    )}

                    {/* Angle arc */}
                    <path
                      d={`M ${cx} ${cy} L ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 ${largeArc} ${sweepArc} ${arcEndX} ${arcEndY} Z`}
                      fill="var(--accent-olive)" opacity="0.1"
                      stroke="var(--accent-olive)" strokeWidth="1"
                    />

                    {/* Angle label near arc */}
                    <text
                      x={cx + (arcR + 14) * Math.cos(angleRad / 2)}
                      y={cy - (arcR + 14) * Math.sin(angleRad / 2)}
                      textAnchor="middle" fill="var(--accent-olive-glow)" fontSize="8" fontFamily="Share Tech Mono"
                    >
                      {transAngle.toFixed(1)}°
                    </text>

                    {/* Dimension line for position */}
                    <line x1="30" y1={cy + 28} x2={cx} y2={cy + 28} stroke="var(--hud-line)" strokeWidth="0.5" opacity="0.4" />
                    <line x1="30" y1={cy + 25} x2="30" y2={cy + 31} stroke="var(--hud-line)" strokeWidth="0.5" opacity="0.4" />
                    <line x1={cx} y1={cy + 25} x2={cx} y2={cy + 31} stroke="var(--hud-line)" strokeWidth="0.5" opacity="0.4" />
                    <text x={(30 + cx) / 2} y={cy + 36} textAnchor="middle" fill="var(--text-secondary)" fontSize="7" fontFamily="Share Tech Mono">
                      {clampedPos.toFixed(0)}mm
                    </text>
                  </>
                )
              })()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
