import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useLiveQuiz } from '../hooks/useLiveQuiz'

export default function FacultyLiveQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [participants, setParticipants] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answerStats, setAnswerStats] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [activeQuizData, setActiveQuizData] = useState(null)

  useEffect(() => { loadQuizzes() }, [])

  async function loadQuizzes() {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_type', 'LIVE')
      .order('created_at', { ascending: false })

    setQuizzes(data || [])
    setLoading(false)
  }

  async function startQuiz(quizId) {
    await supabase.from('quizzes').update({ status: 'ACTIVE' }).eq('id', quizId)
    setActiveQuiz(quizId)
    loadQuizData(quizId)
    loadQuizzes()
  }

  async function endQuiz(quizId) {
    await supabase.from('quizzes').update({ status: 'COMPLETED' }).eq('id', quizId)
    setActiveQuiz(null)
    setParticipants([])
    setLeaderboard([])
    setActiveQuizData(null)
    loadQuizzes()
  }

  const refreshParticipants = useCallback(async () => {
    if (!activeQuiz) return
    const { data } = await supabase
      .from('quiz_participants')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', activeQuiz)

    setParticipants(data || [])
    setLeaderboard([...(data || [])].sort((a, b) => b.score - a.score))
  }, [activeQuiz])

  const refreshAnswerStats = useCallback(async () => {
    if (!activeQuiz || !activeQuizData) return
    const questions = activeQuizData.quiz_questions?.map(qq => qq.questions) || []
    const question = questions[currentQuestion]
    if (!question) return

    const { data } = await supabase
      .from('answers')
      .select('selected_answer, is_correct')
      .eq('quiz_id', activeQuiz)
      .eq('question_id', question.id)

    const stats = { A: 0, B: 0, C: 0, D: 0, total: data?.length || 0, correct: 0 }
    data?.forEach(a => {
      if (a.selected_answer) {
        const letter = a.selected_answer.charAt(0).toUpperCase()
        if (stats[letter] !== undefined) stats[letter]++
      }
      if (a.is_correct) stats.correct++
    })
    setAnswerStats(stats)
  }, [activeQuiz, activeQuizData, currentQuestion])

  const handleQuizChange = useCallback((updatedQuiz) => {
    if (updatedQuiz.status === 'COMPLETED') {
      setActiveQuiz(null)
      setParticipants([])
      setLeaderboard([])
      setActiveQuizData(null)
      loadQuizzes()
    } else {
      setActiveQuizData(prev => prev ? { ...prev, ...updatedQuiz } : prev)
    }
  }, [])

  useLiveQuiz(activeQuiz, {
    onParticipantsChange: refreshParticipants,
    onAnswersChange: refreshAnswerStats,
    onQuizChange: handleQuizChange,
    enabled: !!activeQuiz,
  })

  async function loadQuizData(quizId) {
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', quizId)

    setParticipants(participantsData || [])

    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*, questions(*))')
      .eq('id', quizId)
      .single()

    setActiveQuizData(quiz)

    const questions = quiz?.quiz_questions?.map(qq => qq.questions) || []
    if (questions.length > 0) {
      setCurrentQuestion(Math.min(currentQuestion, questions.length - 1))
      loadAnswerStats(quizId, questions[currentQuestion]?.id)
    }

    setLeaderboard([...(participantsData || [])].sort((a, b) => b.score - a.score))
  }

  async function loadAnswerStats(quizId, questionId) {
    if (!questionId) return
    const { data } = await supabase
      .from('answers')
      .select('selected_answer, is_correct')
      .eq('quiz_id', quizId)
      .eq('question_id', questionId)

    const stats = { A: 0, B: 0, C: 0, D: 0, total: data?.length || 0, correct: 0 }
    data?.forEach(a => {
      if (a.selected_answer) {
        const letter = a.selected_answer.charAt(0).toUpperCase()
        if (stats[letter] !== undefined) stats[letter]++
      }
      if (a.is_correct) stats.correct++
    })
    setAnswerStats(stats)
  }

  function nextQuestion(quiz) {
    const questions = quiz.quiz_questions?.map(qq => qq.questions) || []
    if (currentQuestion < questions.length - 1) {
      const next = currentQuestion + 1
      setCurrentQuestion(next)
      loadAnswerStats(activeQuiz, questions[next]?.id)
    }
  }

  function prevQuestion(quiz) {
    if (currentQuestion > 0) {
      const prev = currentQuestion - 1
      setCurrentQuestion(prev)
      const questions = quiz.quiz_questions?.map(qq => qq.questions) || []
      loadAnswerStats(activeQuiz, questions[prev]?.id)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
  }

  if (activeQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
            <span className="text-sm text-gray-600">Live Quiz Dashboard</span>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold">{activeQuizData?.title}</h2>
              <p className="text-gray-500 text-sm">Quiz Code: <span className="font-mono font-bold text-blue-600">{activeQuizData?.quiz_code}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => prevQuestion(activeQuizData)}
                disabled={currentQuestion === 0}
                className="bg-gray-200 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >← Prev</button>
              <button
                onClick={() => nextQuestion(activeQuizData)}
                className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
              >Next →</button>
              <button
                onClick={() => endQuiz(activeQuiz)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >End Quiz</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-2">Question {currentQuestion + 1}</h3>
              <p className="text-gray-700 mb-4">{activeQuizData?.quiz_questions?.[currentQuestion]?.questions?.question_text}</p>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map(letter => {
                  const count = answerStats[letter] || 0
                  const total = answerStats.total || 1
                  const pct = (count / total) * 100
                  return (
                    <div key={letter} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-medium">{letter}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div className="bg-blue-500 h-6 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-sm text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">{answerStats.total || 0} responses · {answerStats.correct || 0} correct</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Leaderboard</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboard.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded transition-all duration-300 ${i === 0 ? 'bg-yellow-50' : ''}`}>
                    <span className="w-6 text-center font-bold text-sm">{i + 1}</span>
                    <span className="flex-1 text-sm">{p.profiles?.full_name || 'Unknown'}</span>
                    <span className="font-bold text-sm text-blue-600">{p.score}</span>
                  </div>
                ))}
                {leaderboard.length === 0 && <p className="text-gray-500 text-sm">No participants yet</p>}
              </div>
              <p className="text-xs text-gray-500 mt-3">Participants: {participants.length}</p>
            </div>
          </div>
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
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Live Quizzes</h2>
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No live quizzes yet. Create one first.
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded ${
                        quiz.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        quiz.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{quiz.status}</span>
                      <span>Code: <span className="font-mono font-bold">{quiz.quiz_code}</span></span>
                      <span>{quiz.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {quiz.status === 'DRAFT' && (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                      >Start Quiz</button>
                    )}
                    {quiz.status === 'ACTIVE' && (
                      <button
                        onClick={() => { setActiveQuiz(quiz.id); loadQuizData(quiz.id) }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                      >View Dashboard</button>
                    )}
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
