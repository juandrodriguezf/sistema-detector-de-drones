import { useSerial } from '../hooks/SerialContext'
import './styles/SerialPanel.css'

export default function SerialPanel() {
  const {
    isSupported,
    rotaConnected,
    transConnected,
    rotaPortInfo,
    transPortInfo,
    logs,
    isMicActive,
    startMic,
    stopMic,
    connectRota,
    connectTrans,
    disconnectRota,
    disconnectTrans,
    clearLogs,
  } = useSerial()

  return (
    <div className="panel serial-panel">
      <div className="panel-title">Comunicacion Serial</div>
      <div className="serial-content">
        {!isSupported && (
          <div className="serial-warning">
            Web Serial API no soportada. Use Chrome/Edge.
          </div>
        )}
        <div className="serial-ports">
          <div className="serial-port-row">
            <span className="port-label mono">ROTA:</span>
            <span className={`port-status ${rotaConnected ? 'connected' : ''}`}>
              {rotaConnected ? rotaPortInfo : 'OFFLINE'}
            </span>
            <button
              className="btn serial-btn"
              onClick={rotaConnected ? disconnectRota : connectRota}
              disabled={!isSupported}
            >
              {rotaConnected ? 'DESC' : 'CONECTAR'}
            </button>
          </div>
          <div className="serial-port-row">
            <span className="port-label mono">TRASL:</span>
            <span className={`port-status ${transConnected ? 'connected' : ''}`}>
              {transConnected ? transPortInfo : 'OFFLINE'}
            </span>
            <button
              className="btn serial-btn"
              onClick={transConnected ? disconnectTrans : connectTrans}
              disabled={!isSupported}
            >
              {transConnected ? 'DESC' : 'CONECTAR'}
            </button>
          </div>
        </div>

        <div className="serial-actions">
          <button
            className={`btn mic-btn ${isMicActive ? 'btn-danger' : 'btn-primary'}`}
            onClick={isMicActive ? stopMic : startMic}
          >
            {isMicActive ? 'DETENER MIC' : 'INICIAR MIC'}
          </button>
          <button className="btn" onClick={clearLogs}>LIMPIAR LOG</button>
        </div>

        <div className="serial-log mono">
          {logs.length === 0 && (
            <div className="log-line empty">Esperando datos...</div>
          )}
          {logs.map((entry, i) => (
            <div key={i} className={`log-line ${entry.type}`}>
              <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              {entry.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
