import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { session: null } })
)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}))

import { api } from '../services/api'

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

function mockFetch(json) {
  global.fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(json),
  })
}

describe('api service', () => {
  describe('getHeaders', () => {
    it('includes authorization header when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token-123' } },
      })
      mockFetch({})

      await api.getProfile()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      )
    })

    it('sends empty bearer when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      mockFetch({})

      await api.getProfile()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ',
          }),
        })
      )
    })
  })

  describe('apiGet', () => {
    it('fetches from correct URL', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ status: 'ok' })

      const result = await api.getProfile()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/auth/profile',
        expect.any(Object)
      )
      expect(result).toEqual({ status: 'ok' })
    })
  })

  describe('apiPost', () => {
    it('sends POST with JSON body', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ created: true })

      const body = { subject: 'Math', topic: 'Algebra' }
      await api.generateQuestions(body)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/questions/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    })
  })

  describe('apiPut', () => {
    it('sends PUT with JSON body', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ updated: true })

      await api.updateQuestion('q123', { question_text: 'Updated?' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/questions/q123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ question_text: 'Updated?' }),
        })
      )
    })
  })

  describe('apiDelete', () => {
    it('sends DELETE to correct URL', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ deleted: true })

      await api.deleteQuestion('q456')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/questions/q456',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('quiz endpoints', () => {
    it('createQuiz sends POST to /quizzes', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ id: 'quiz1', quiz_code: 'ABC123' })

      const result = await api.createQuiz({ title: 'Test Quiz', quiz_type: 'LIVE' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/quizzes',
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toEqual({ id: 'quiz1', quiz_code: 'ABC123' })
    })

    it('submitQuiz sends POST to /quizzes/{id}/submit', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ total_marks: 10, obtained_marks: 8 })

      await api.submitQuiz('quiz123')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/quizzes/quiz123/submit',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ quiz_id: 'quiz123' }),
        })
      )
    })
  })

  describe('results endpoints', () => {
    it('getQuizResults fetches from /results/{quizId}', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch([{ student: 'A', score: 90 }])

      const result = await api.getQuizResults('quiz789')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/results/quiz789',
        expect.any(Object)
      )
      expect(result).toEqual([{ student: 'A', score: 90 }])
    })

    it('getStudentResults fetches from /results/student/{studentId}', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch([{ quiz: 'Q1', score: 85 }])

      await api.getStudentResults('stu123')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/results/student/stu123',
        expect.any(Object)
      )
    })
  })

  describe('activity endpoints', () => {
    it('logActivity sends POST to /activity-log', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch({ logged: true })

      await api.logActivity({ event_type: 'TAB_SWITCH', quiz_id: 'q1' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/activity-log',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('getActivityLogs fetches from /activity-log/{quizId}', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      })
      mockFetch([{ event: 'COPY_ATTEMPT' }])

      await api.getActivityLogs('quiz999')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/activity-log/quiz999',
        expect.any(Object)
      )
    })
  })
})
