import { createContext, useContext } from 'react'
import { useTracker } from './useTracker'

type TrackerMode = 'IDLE' | 'TRACKING'

interface TrackerContextType {
  trackerMode: TrackerMode
  startTracking: () => void
  stopTracking: () => void
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined)

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const tracker = useTracker()

  return (
    <TrackerContext.Provider value={tracker}>
      {children}
    </TrackerContext.Provider>
  )
}

export function useTrackerContext() {
  const ctx = useContext(TrackerContext)
  if (!ctx) throw new Error('useTrackerContext must be used within TrackerProvider')
  return ctx
}
