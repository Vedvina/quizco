import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}))

import { useSecurityMonitor } from '../hooks/useSecurityMonitor'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function dispatchVisibilityChange(hidden) {
  Object.defineProperty(document, 'hidden', { value: hidden, writable: true, configurable: true })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

function dispatchClipboardEvent(type) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  act(() => {
    document.dispatchEvent(event)
  })
  return event
}

describe('useSecurityMonitor', () => {
  it('returns violation count of 0 initially', () => {
    const { result } = renderHook(() =>
      useSecurityMonitor('quiz1', 'user1', true)
    )
    expect(result.current.violationCount).toBe(0)
  })

  it('does not log events when isActive is false', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', false))

    dispatchVisibilityChange(true)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not log events when quizId is missing', () => {
    renderHook(() => useSecurityMonitor(null, 'user1', true))

    dispatchVisibilityChange(true)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not log events when userId is missing', () => {
    renderHook(() => useSecurityMonitor('quiz1', null, true))

    dispatchVisibilityChange(true)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('logs TAB_SWITCH on visibility change', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    dispatchVisibilityChange(true)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        quiz_id: 'quiz1',
        student_id: 'user1',
        event_type: 'TAB_SWITCH',
      })
    )
  })

  it('does not log TAB_SWITCH when document is not hidden', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    dispatchVisibilityChange(false)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('logs COPY_ATTEMPT and prevents default', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    const event = dispatchClipboardEvent('copy')
    const preventSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      event.preventDefault()
    })

    expect(preventSpy).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'COPY_ATTEMPT',
      })
    )
  })

  it('logs PASTE_ATTEMPT and prevents default', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    const event = dispatchClipboardEvent('paste')
    const preventSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      event.preventDefault()
    })

    expect(preventSpy).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'PASTE_ATTEMPT' })
    )
  })

  it('logs CUT_ATTEMPT and prevents default', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    const event = dispatchClipboardEvent('cut')
    const preventSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      event.preventDefault()
    })

    expect(preventSpy).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'CUT_ATTEMPT' })
    )
  })

  it('logs RIGHT_CLICK and prevents default', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    const event = new Event('contextmenu', { bubbles: true, cancelable: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      document.dispatchEvent(event)
    })

    expect(preventSpy).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'RIGHT_CLICK' })
    )
  })

  it('logs RESTRICTED_KEY for F12', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F12', bubbles: true })
      )
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'RESTRICTED_KEY',
        event_details: expect.stringContaining('F12'),
      })
    )
  })

  it('logs RESTRICTED_KEY for Ctrl+U', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, bubbles: true })
      )
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'RESTRICTED_KEY' })
    )
  })

  it('increments violation count across multiple events', async () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    dispatchVisibilityChange(true)

    dispatchClipboardEvent('copy')

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F12', bubbles: true })
      )
    })

    expect(mockInsert).toHaveBeenCalledTimes(3)
    expect(mockInsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        violation_count: 3,
        flagged: true,
      })
    )
  })

  it('flags after 3 violations', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    dispatchVisibilityChange(true)
    dispatchVisibilityChange(true)
    dispatchVisibilityChange(true)

    expect(mockInsert).toHaveBeenCalledTimes(3)
    const thirdCall = mockInsert.mock.calls[2][0]
    expect(thirdCall.flagged).toBe(true)
    expect(thirdCall.violation_count).toBe(3)
  })

  it('does not flag before 3 violations', () => {
    renderHook(() => useSecurityMonitor('quiz1', 'user1', true))

    dispatchVisibilityChange(true)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const firstCall = mockInsert.mock.calls[0][0]
    expect(firstCall.flagged).toBe(false)
    expect(firstCall.violation_count).toBe(1)
  })
})
