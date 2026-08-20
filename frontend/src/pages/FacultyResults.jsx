import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function FacultyResults() {
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadQuizzes() }, [])

  async function loadQuizzes() {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .in('status', ['ACTIVE', 'COMPLETED'])
      .order('created_at', { ascending: false })

    setQuizzes(data || [])
    setLoading(false)
  }

  async function loadResults(quizId) {
    setSelectedQuiz(quizId)
    const { data } = await supabase
      .from('results')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', quizId)
      .order('obtained_marks', { ascending: false })

    setResults(data || [])
  }

  const selected = quizzes.find(q => q.id === selectedQuiz)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Results</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : !selectedQuiz ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">Select a quiz to view results</p>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{quiz.title}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded ${quiz.quiz_type === 'LIVE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {quiz.quiz_type}
                    </span>
                    <span>{quiz.total_marks} marks</span>
                    <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => loadResults(quiz.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >View Results</button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => { setSelectedQuiz(null); setResults([]) }} className="text-sm text-blue-600 hover:underline mb-4">
              ← Back to quiz list
            </button>
            <h3 className="font-semibold text-lg mb-4">{selected?.title}</h3>

            {results.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No results yet for this quiz.
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow p-6 mb-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{results.length}</div>
                      <div className="text-xs text-gray-500">Students</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {results.length > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Avg Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {results.length > 0 ? Math.max(...results.map(r => r.percentage)) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Highest</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {results.length > 0 ? Math.min(...results.map(r => r.percentage)) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Lowest</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Roll No</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">%</th>
                        <th className="px-4 py-3">Correct</th>
                        <th className="px-4 py-3">Incorrect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {results.map((r, i) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{i + 1}</td>
                          <td className="px-4 py-3 font-medium">{r.profiles?.full_name}</td>
                          <td className="px-4 py-3 text-gray-500">{r.profiles?.roll_number || '-'}</td>
                          <td className="px-4 py-3">{r.obtained_marks}/{r.total_marks}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${r.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                              {r.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-green-600">{r.correct_answers}</td>
                          <td className="px-4 py-3 text-red-600">{r.incorrect_answers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
