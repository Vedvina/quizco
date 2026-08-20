import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function StudentResults() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadResult() }, [quizId])

  async function loadResult() {
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    const { data: resultData } = await supabase
      .from('results')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .single()

    const { data: answerData } = await supabase
      .from('answers')
      .select('*, questions(*)')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)

    setQuiz(quizData)
    setResult(resultData)
    setAnswers(answerData || [])
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading results...</div>
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No results found for this quiz.</p>
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-2">{quiz?.title} — Results</h2>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{result.obtained_marks}/{result.total_marks}</div>
              <div className="text-sm text-gray-500 mt-1">Score</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{result.percentage}%</div>
              <div className="text-sm text-gray-500 mt-1">Percentage</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500">{result.correct_answers}</div>
              <div className="text-sm text-gray-500 mt-1">Correct</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-500">{result.incorrect_answers}</div>
              <div className="text-sm text-gray-500 mt-1">Incorrect</div>
            </div>
          </div>
        </div>

        <h3 className="font-semibold mb-4">Detailed Answers</h3>
        <div className="space-y-3">
          {answers.map((a, i) => (
            <div key={a.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  a.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {a.is_correct ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.questions?.question_text}</p>
                  <div className="mt-2 text-xs space-y-1">
                    <div>Your answer: <span className={`font-medium ${a.is_correct ? 'text-green-600' : 'text-red-600'}`}>{a.selected_answer || 'Not answered'}</span></div>
                    {!a.is_correct && (
                      <div>Correct answer: <span className="font-medium text-green-600">{a.questions?.correct_answer}</span></div>
                    )}
                    <div className="text-gray-500">Marks: {a.marks_obtained}/{a.questions?.marks}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
