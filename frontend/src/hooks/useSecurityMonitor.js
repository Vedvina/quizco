import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSecurityMonitor(quizId, userId, isActive = true) {
  const violationCount = useRef(0)

  const logEvent = useCallback(async (eventType, details) => {
    if (!quizId || !userId || !isActive) return

    violationCount.current += 1
    const flagged = violationCount.current >= 3

    await supabase.from('activity_logs').insert({
      quiz_id: quizId,
      student_id: userId,
      event_type: eventType,
      event_details: details,
      violation_count: violationCount.current,
      flagged,
    })
  }, [quizId, userId, isActive])

  useEffect(() => {
    if (!isActive) return

    const handleVisibility = () => {
      if (document.hidden) {
        logEvent('TAB_SWITCH', 'Student switched tabs or minimized window')
      }
    }

    const handleCopy = (e) => {
      e.preventDefault()
      logEvent('COPY_ATTEMPT', 'Student attempted to copy content')
    }

    const handlePaste = (e) => {
      e.preventDefault()
      logEvent('PASTE_ATTEMPT', 'Student attempted to paste content')
    }

    const handleCut = (e) => {
      e.preventDefault()
      logEvent('CUT_ATTEMPT', 'Student attempted to cut content')
    }

    const handleKeyDown = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && e.key === 's')) {
        e.preventDefault()
        logEvent('RESTRICTED_KEY', `Restricted key combination: ${e.key}`)
      }
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
      logEvent('RIGHT_CLICK', 'Student attempted right-click')
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement === null) {
        logEvent('FULLSCREEN_EXIT', 'Student exited fullscreen mode')
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isActive, logEvent])

  return { violationCount: violationCount.current }
}
