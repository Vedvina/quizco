import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function StudentResultsList() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { loadResults() }, [])

  async function loadResults() {
    const { data } = await supabase
      .from('results')
      .select('*, quizzes(title, quiz_type)')
      .eq('student_id', user.id)
      .order('evaluated_at', { ascending: false })

    setResults(data || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">My Results</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No results yet. Complete a quiz to see your results here.
          </div>
        ) : (
          <div className="space-y-4">
            {results.map(r => (
              <div key={r.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{r.quizzes?.title}</h3>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded ${r.quizzes?.quiz_type === 'LIVE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.quizzes?.quiz_type}
                      </span>
                      <span>Score: {r.obtained_marks}/{r.total_marks}</span>
                      <span>Correct: {r.correct_answers}</span>
                      <span>Incorrect: {r.incorrect_answers}</span>
                      {r.time_taken_seconds != null && (
                        <span>Time: {Math.floor(r.time_taken_seconds / 60)}m {r.time_taken_seconds % 60}s</span>
                      )}
                      <span>{new Date(r.evaluated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${r.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.percentage}%
                    </div>
                    <button
                      onClick={() => navigate(`/results/${r.quiz_id}`)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
