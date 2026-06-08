import { useSerial } from '../hooks/SerialContext'
import './styles/TimelineDisplay.css'

export default function TimelineDisplay() {
  const {
    timelineValues, detectionMinHz, detectionMaxHz, droneDetected, energy700,
    sampleRate, fftBins, smoothedFftBins, peakFrequency, waveformData,
    spectrogramData, rotaData, transData, logs, dbMin, dbMax,
    targetDisplayBin, isMicActive, rotaConnected, transConnected
  } = useSerial()
  const values = timelineValues.length > 0 ? timelineValues : Array(60).fill(0)
  const threshold = 50
  const maxVal = Math.max(...values, threshold * 1.2, 1)

  const exportAll = () => {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

    let csv = `# Detector Dron - Export Completo\n`
    csv += `# Generated,${now.toISOString()}\n`
    csv += `# Sample Rate,${sampleRate}\n`
    csv += `# Detection Range,${detectionMinHz}-${detectionMaxHz}Hz\n`
    csv += `# Detection Bins,${targetDisplayBin.start}-${targetDisplayBin.end}\n`
    csv += `# Hz per Bin,${(sampleRate / 4096).toFixed(4)}\n`
    csv += `# Drone Detected,${droneDetected}\n`
    csv += `# Energy,${energy700.toFixed(3)}\n`
    csv += `# Peak Frequency,${peakFrequency.toFixed(1)}\n`
    csv += `# FFT dB Min,${dbMin.toFixed(1)}\n`
    csv += `# FFT dB Max,${dbMax.toFixed(1)}\n`
    csv += `# Rota Angle,${rotaData?.angle ?? ''}\n`
    csv += `# Rota State,${rotaData?.state ?? ''}\n`
    csv += `# Trans Angle,${transData?.angle ?? ''}\n`
    csv += `# Trans State,${transData?.state ?? ''}\n`
    csv += `# Mic Active,${isMicActive}\n`
    csv += `# Rota Connected,${rotaConnected}\n`
    csv += `# Trans Connected,${transConnected}\n`
    csv += `#\n`

    csv += `--- TIMELINE VALUES ---\n`
    csv += `index,energy\n`
    values.forEach((v, i) => { csv += `${i},${v.toFixed(3)}\n` })
    csv += `\n`

    csv += `--- FFT BINS ---\n`
    csv += `bin,raw_db,smoothed_db\n`
    fftBins.forEach((v, i) => {
      csv += `${i},${v.toFixed(3)},${(smoothedFftBins[i] ?? -100).toFixed(3)}\n`
    })
    csv += `\n`

    csv += `--- WAVEFORM ---\n`
    csv += `sample,amplitude\n`
    waveformData.forEach((v, i) => { csv += `${i},${v.toFixed(5)}\n` })
    csv += `\n`

    csv += `--- SPECTROGRAM (${spectrogramData.length}x${(spectrogramData[0] ?? []).length}) ---\n`
    csv += `col,row,db\n`
    spectrogramData.forEach((col, ci) => {
      col.forEach((v, ri) => { csv += `${ci},${ri},${v.toFixed(2)}\n` })
    })
    csv += `\n`

    csv += `--- SERIAL LOGS (${logs.length}) ---\n`
    csv += `index,timestamp,type,message\n`
    logs.forEach((l, i) => {
      csv += `${i},${new Date(l.timestamp).toISOString()},${l.type},"${l.message}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `detector_dron_full_${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="panel timeline-display">
      <div className="panel-title-row">
        <div className="panel-title">Timeline {detectionMinHz}-{detectionMaxHz}Hz — Energia vs Tiempo</div>
        <button className="btn-export" onClick={exportAll} title="Exportar todos los datos a CSV">
          EXPORTAR CSV
        </button>
      </div>
      <div className="timeline-content hud-grid">
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="timeline-svg">
          {[0, 25, 50, 75].map(y => (
            <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="var(--grid-line)" strokeWidth="0.5" />
          ))}
          <line
            x1="0" y1={100 - (threshold / maxVal) * 100}
            x2="300" y2={100 - (threshold / maxVal) * 100}
            stroke="var(--alert-red)" strokeWidth="0.8" strokeDasharray="4,2"
          />
          <polygon
            points={`0,100 ${values.map((v, i) => `${(i / (values.length - 1)) * 300},${100 - (v / maxVal) * 100}`).join(' ')} 300,100`}
            fill="rgba(107, 140, 66, 0.15)" stroke="var(--accent-olive-glow)" strokeWidth="1"
          />
          <circle cx="290" cy={100 - (values[values.length - 1] / maxVal) * 100} r="2" fill="var(--accent-olive-glow)" />
        </svg>
        <div className="timeline-info mono">
          <span>RANGO: {detectionMinHz}-{detectionMaxHz}Hz</span>
          <span>THRESH: {threshold}</span>
          <span>CURR: {values[values.length - 1].toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}
