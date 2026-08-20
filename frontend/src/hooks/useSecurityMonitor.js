import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

const MAX_VIOLATIONS = 2

export function useSecurityMonitor(quizId, userId, isActive = true, onAutoSubmit) {
  const violationCount = useRef(0)
  const [violations, setViolations] = useState(0)
  const submittedRef = useRef(false)

  const logEvent = useCallback(async (eventType, details) => {
    if (!quizId || !userId || !isActive || submittedRef.current) return

    violationCount.current += 1
    setViolations(violationCount.current)
    const flagged = violationCount.current >= MAX_VIOLATIONS

    await supabase.from('activity_logs').insert({
      quiz_id: quizId,
      student_id: userId,
      event_type: eventType,
      event_details: details,
      violation_count: violationCount.current,
      flagged,
    })

    if (violationCount.current >= MAX_VIOLATIONS && !submittedRef.current) {
      submittedRef.current = true
      onAutoSubmit?.()
    }
  }, [quizId, userId, isActive, onAutoSubmit])

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
          (e.ctrlKey && e.key === 's') ||
          (e.altKey && e.key === 'Tab') ||
          (e.metaKey && e.key === 'Tab')) {
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

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
      logEvent('NAVIGATION_ATTEMPT', 'Student attempted to navigate away')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('cut', handleCut)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isActive, logEvent])

  return { violations, maxViolations: MAX_VIOLATIONS }
}
