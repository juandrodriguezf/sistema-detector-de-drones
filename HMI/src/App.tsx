import './App.css'
import Header from './components/Header'
import DroneAlert from './components/DroneAlert'
import FFTDisplay from './components/FFTDisplay'
import WaveformDisplay from './components/WaveformDisplay'
import TimelineDisplay from './components/TimelineDisplay'
import SpectrogramDisplay from './components/SpectrogramDisplay'
import PositionDrawings from './components/PositionDrawings'
import SystemControls from './components/SystemControls'
import DiagnosticsPanel from './components/DiagnosticsPanel'
import SerialPanel from './components/SerialPanel'
import { useKeyboardJog } from './hooks/useKeyboardJog'
import { TrackerProvider } from './hooks/TrackerContext'

function App() {
  useKeyboardJog()

  return (
    <TrackerProvider>
      <div className="app">
        <DroneAlert />
        <Header />
        <div className="app-grid">
          {/* Left Column: Spectrum + Waveform + Timeline */}
          <div className="col-left">
            <FFTDisplay />
            <WaveformDisplay />
            <TimelineDisplay />
          </div>

          {/* Center Column: Spectrogram + Drawings */}
          <div className="col-center">
            <SpectrogramDisplay />
            <PositionDrawings />
          </div>

          {/* Right Column: Controls + Serial */}
          <div className="col-right">
            <SystemControls />
            <DiagnosticsPanel />
            <SerialPanel />
          </div>
        </div>
      </div>
    </TrackerProvider>
  )
}

export default App
