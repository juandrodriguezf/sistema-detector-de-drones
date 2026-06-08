import { useState, useRef, useEffect, useCallback } from 'react'
import { useSerial } from './SerialContext'

type TrackerMode = 'IDLE' | 'TRACKING'
type Axis = 'rota' | 'trans'

const STEP_DEG = 3
const STEP_MM = 3
const TICK_INTERVAL = 500
const ENERGY_HISTORY_SIZE = 5
const EXIT_FRAMES = 10

export function useTracker() {
  const { sendRota, sendTrans, energy700, droneDetected, rotaData, transData } = useSerial()

  const [trackerMode, setTrackerMode] = useState<TrackerMode>('IDLE')

  const stateRef = useRef({
    mode: 'IDLE' as TrackerMode,
    rotaDir: 1 as 1 | -1,
    transDir: 1 as 1 | -1,
    lastEnergy: 0,
    energyHistory: [] as number[],
    activeAxis: 'rota' as Axis,
    exitCounter: 0,
  })

  const timerRef = useRef<number | null>(null)

  const stopTracking = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    stateRef.current.mode = 'IDLE'
    stateRef.current.exitCounter = 0
    setTrackerMode('IDLE')
  }, [])

  const tick = useCallback(() => {
    const s = stateRef.current
    if (s.mode !== 'TRACKING') return

    if (!droneDetected) {
      s.exitCounter++
      if (s.exitCounter >= EXIT_FRAMES) {
        stopTracking()
      }
      return
    }
    s.exitCounter = 0

    s.energyHistory.push(energy700)
    if (s.energyHistory.length > ENERGY_HISTORY_SIZE) {
      s.energyHistory.shift()
    }

    const avgEnergy = s.energyHistory.reduce((a, b) => a + b, 0) / s.energyHistory.length

    if (s.activeAxis === 'rota') {
      const currentAngle = rotaData?.angle ?? 0

      if (avgEnergy > s.lastEnergy) {
      } else if (avgEnergy < s.lastEnergy) {
        s.rotaDir = (s.rotaDir === 1 ? -1 : 1) as 1 | -1
      }

      let nextAngle = currentAngle + (STEP_DEG * s.rotaDir)
      if (nextAngle < 0) {
        nextAngle = 0
        s.rotaDir = 1
      } else if (nextAngle > 360) {
        nextAngle = 360
        s.rotaDir = -1
      }

      const cmd = s.rotaDir === 1 ? `G0 X+${STEP_DEG}` : `G0 X-${STEP_DEG}`
      sendRota(cmd)

      s.lastEnergy = avgEnergy
      s.activeAxis = 'trans'
    } else {
      const currentMm = transData?.angle ?? 0

      if (avgEnergy > s.lastEnergy) {
      } else if (avgEnergy < s.lastEnergy) {
        s.transDir = (s.transDir === 1 ? -1 : 1) as 1 | -1
      }

      let nextMm = currentMm + (STEP_MM * s.transDir)
      if (nextMm < 0) {
        nextMm = 0
        s.transDir = 1
      } else if (nextMm > 200) {
        nextMm = 200
        s.transDir = -1
      }

      const cmd = s.transDir === 1 ? `G0 X+${STEP_MM}` : `G0 X-${STEP_MM}`
      sendTrans(cmd)

      s.lastEnergy = avgEnergy
      s.activeAxis = 'rota'
    }
  }, [droneDetected, energy700, rotaData, transData, sendRota, sendTrans, stopTracking])

  const startTracking = useCallback(() => {
    if (!droneDetected) return

    stateRef.current = {
      mode: 'TRACKING',
      rotaDir: 1,
      transDir: 1,
      lastEnergy: energy700,
      energyHistory: [],
      activeAxis: 'rota',
      exitCounter: 0,
    }

    setTrackerMode('TRACKING')

    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
    }
    timerRef.current = window.setInterval(tick, TICK_INTERVAL)
  }, [droneDetected, energy700, tick])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (stateRef.current.mode === 'TRACKING' && !droneDetected) {
      stateRef.current.exitCounter++
      if (stateRef.current.exitCounter >= EXIT_FRAMES) {
        stopTracking()
      }
    } else if (stateRef.current.mode === 'TRACKING') {
      stateRef.current.exitCounter = 0
    }
  }, [droneDetected, stopTracking])

  return {
    trackerMode,
    startTracking,
    stopTracking,
  }
}
