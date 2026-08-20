import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function JoinLiveQuiz() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_code', code.toUpperCase())
      .eq('quiz_type', 'LIVE')
      .single()

    if (!quiz) {
      setError('Invalid quiz code')
      setLoading(false)
      return
    }

    if (quiz.status !== 'ACTIVE' && quiz.status !== 'WAITING') {
      setError('This quiz is not active yet')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('student_id', user.id)
      .single()

    if (!existing) {
      await supabase.from('quiz_participants').insert({
        quiz_id: quiz.id,
        student_id: user.id,
      })
    }

    navigate(`/quiz/${quiz.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-md mx-auto p-6 mt-12">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold text-center mb-2">Join Live Quiz</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Enter the quiz code shared by your faculty</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">{error}</div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              className="w-full text-center text-3xl font-mono tracking-[0.5em] border border-gray-300 rounded-lg px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Joining...' : 'Join Quiz'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
