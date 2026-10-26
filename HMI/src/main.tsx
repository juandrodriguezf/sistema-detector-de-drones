import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import MLCalibration from './components/MLCalibration'
import { SerialProvider } from './hooks/SerialContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SerialProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/ml-calibration" element={<MLCalibration />} />
        </Routes>
      </SerialProvider>
    </BrowserRouter>
  </StrictMode>,
)

