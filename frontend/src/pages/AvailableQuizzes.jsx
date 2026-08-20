import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AvailableQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { loadQuizzes() }, [])

  async function loadQuizzes() {
    const now = new Date().toISOString()

    const { data: allQuizzes } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_type', 'SCHEDULED')
      .in('status', ['DRAFT', 'ACTIVE'])
      .order('start_time', { ascending: true })

    const { data: myCompleted } = await supabase
      .from('quiz_participants')
      .select('quiz_id')
      .eq('student_id', user.id)

    const completedIds = myCompleted?.map(p => p.quiz_id) || []
    setCompleted(completedIds)
    setQuizzes(allQuizzes || [])
    setLoading(false)
  }

  function isAvailable(quiz) {
    const now = new Date()
    const start = quiz.start_time ? new Date(quiz.start_time) : null
    const end = quiz.end_time ? new Date(quiz.end_time) : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  }

  function getStatus(quiz) {
    if (completed.includes(quiz.id)) return { text: 'Completed', color: 'bg-green-100 text-green-700' }
    if (!isAvailable(quiz)) return { text: 'Not Available', color: 'bg-gray-100 text-gray-500' }
    return { text: 'Available', color: 'bg-blue-100 text-blue-700' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Available Quizzes</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No quizzes available right now.
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map(quiz => {
              const status = getStatus(quiz)
              const available = isAvailable(quiz)
              const done = completed.includes(quiz.id)
              return (
                <div key={quiz.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{quiz.title}</h3>
                      {quiz.description && <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>}
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Duration: {quiz.duration_minutes} min</span>
                        <span>Total Marks: {quiz.total_marks}</span>
                        {quiz.start_time && <span>Starts: {new Date(quiz.start_time).toLocaleString()}</span>}
                        {quiz.end_time && <span>Ends: {new Date(quiz.end_time).toLocaleString()}</span>}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  {available && !done && (
                    <button
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Start Quiz
                    </button>
                  )}
                  {done && (
                    <button
                      onClick={() => navigate(`/results/${quiz.id}`)}
                      className="mt-4 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 text-sm font-medium"
                    >
                      View Result
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
