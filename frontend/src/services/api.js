import { supabase } from '../lib/supabase'

const API_URL = 'http://localhost:8000'

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  }
}

async function apiGet(path) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, { headers })
  return res.json()
}

async function apiPost(path, body) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiPut(path, body) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

async function apiDelete(path) {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers })
  return res.json()
}

export const api = {
  getProfile: () => apiGet('/auth/profile'),

  getQuestions: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiGet(`/questions${qs ? '?' + qs : ''}`)
  },
  createQuestion: (q) => apiPost('/questions', q),
  updateQuestion: (id, q) => apiPut(`/questions/${id}`, q),
  deleteQuestion: (id) => apiDelete(`/questions/${id}`),
  generateQuestions: (data) => apiPost('/questions/generate', data),

  createQuiz: (q) => apiPost('/quizzes', q),
  getQuiz: (id) => apiGet(`/quizzes/${id}`),
  updateQuiz: (id, q) => apiPut(`/quizzes/${id}`, q),
  deleteQuiz: (id) => apiDelete(`/quizzes/${id}`),

  submitAnswer: (data) => apiPost('/answers', data),
  submitQuiz: (quizId) => apiPost(`/quizzes/${quizId}/submit`, { quiz_id: quizId }),

  getQuizResults: (quizId) => apiGet(`/results/${quizId}`),
  getStudentResults: (studentId) => apiGet(`/results/student/${studentId}`),

  logActivity: (data) => apiPost('/activity-log', data),
  getActivityLogs: (quizId) => apiGet(`/activity-log/${quizId}`),
}
