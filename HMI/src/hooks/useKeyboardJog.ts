import { useEffect, useCallback } from 'react'
import { useSerial } from './SerialContext'

export function useKeyboardJog(stepDeg: number = 5, stepMm: number = 5) {
  const { sendRota, sendTrans } = useSerial()

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const isShift = e.shiftKey
    const isCtrl = e.ctrlKey || e.metaKey

    const degStep = isCtrl ? 1 : isShift ? 45 : stepDeg
    const mmStep  = isCtrl ? 1 : isShift ? 25 : stepMm

    let cmd: string | null = null
    let targetSys: 'rota' | 'trans' | null = null

    switch (e.key) {
      case 'ArrowLeft':
        cmd = `G0 X-${degStep}`
        targetSys = 'rota'
        break
      case 'ArrowRight':
        cmd = `G0 X+${degStep}`
        targetSys = 'rota'
        break
      case 'ArrowUp':
        cmd = `G0 X+${mmStep}`
        targetSys = 'trans'
        break
      case 'ArrowDown':
        cmd = `G0 X-${mmStep}`
        targetSys = 'trans'
        break
    }

    if (cmd && targetSys) {
      e.preventDefault()
      const send = targetSys === 'rota' ? sendRota : sendTrans
      send(cmd)
    }
  }, [sendRota, sendTrans, stepDeg, stepMm])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}
