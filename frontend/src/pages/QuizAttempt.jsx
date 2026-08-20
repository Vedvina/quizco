import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSecurityMonitor } from '../hooks/useSecurityMonitor'
import { useLiveQuiz } from '../hooks/useLiveQuiz'

export default function QuizAttempt() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [participant, setParticipant] = useState(null)
  const [liveLeaderboard, setLiveLeaderboard] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const startTimeRef = useRef(null)
  const quizStartedRef = useRef(false)

  const handleAutoSubmit = useCallback(() => {
    if (autoSubmitted || submitting) return
    setAutoSubmitted(true)
    setSubmitting(true)
    setTimeout(() => handleSubmit(), 500)
  }, [autoSubmitted, submitting])

  const { violations, maxViolations } = useSecurityMonitor(quizId, user?.id, !!quiz && !loading, handleAutoSubmit)

  useEffect(() => { loadQuiz() }, [quizId])

  useEffect(() => {
    if (timeLeft <= 0 && quiz && !submitting && quizStartedRef.current) {
      handleSubmit()
      return
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  useEffect(() => {
    const onFsChange = () => {
      const inFs = !!document.fullscreenElement
      setIsFullscreen(inFs)
      if (!inFs && quizStartedRef.current) {
        setShowFullscreenPrompt(true)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const refreshLeaderboard = useCallback(async () => {
    if (!quizId) return
    const { data } = await supabase
      .from('quiz_participants')
      .select('score, student_id, profiles(full_name)')
      .eq('quiz_id', quizId)
      .eq('completed', true)

    setLiveLeaderboard(
      (data || []).sort((a, b) => b.score - a.score).slice(0, 10)
    )
  }, [quizId])

  const handleQuizEnd = useCallback((updatedQuiz) => {
    if (updatedQuiz.status === 'COMPLETED') {
      handleSubmit()
    }
  }, [])

  useLiveQuiz(quizId, {
    onParticipantsChange: refreshLeaderboard,
    onAnswersChange: refreshLeaderboard,
    onQuizChange: handleQuizEnd,
    enabled: !!quizId && quiz?.quiz_type === 'LIVE' && !loading,
  })

  async function loadQuiz() {
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (!quizData) {
      alert('Quiz not found')
      navigate('/dashboard')
      return
    }

    const { data: qqData } = await supabase
      .from('quiz_questions')
      .select('*, questions(*)')
      .eq('quiz_id', quizId)
      .order('order_index')

    const qs = qqData?.map(q => q.questions).filter(Boolean) || []

    let { data: participantData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .single()

    if (!participantData) {
      const { data: newParticipant } = await supabase
        .from('quiz_participants')
        .insert({ quiz_id: quizId, student_id: user.id })
        .select()
        .single()
      participantData = newParticipant
    }

    if (participantData?.completed) {
      navigate(`/results/${quizId}`)
      return
    }

    const { data: savedAnswers } = await supabase
      .from('answers')
      .select('question_id, selected_answer')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)

    const savedMap = {}
    savedAnswers?.forEach(a => { savedMap[a.question_id] = a.selected_answer })

    setQuiz(quizData)
    setQuestions(qs)
    setParticipant(participantData)
    setAnswers(savedMap)

    if (quizData.quiz_type === 'LIVE') {
      setTimeLeft(quizData.duration_minutes * 60)
    } else {
      const end = quizData.end_time ? new Date(quizData.end_time) : new Date(Date.now() + quizData.duration_minutes * 60000)
      const remaining = Math.max(0, Math.floor((end - new Date()) / 1000))
      setTimeLeft(remaining)
    }

    setLoading(false)
    startTimeRef.current = Date.now()
  }

  async function requestFullscreen() {
    try {
      const el = document.documentElement
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      else if (el.msRequestFullscreen) await el.msRequestFullscreen()
      setIsFullscreen(true)
      setShowFullscreenPrompt(false)
      quizStartedRef.current = true
    } catch {
      alert('Fullscreen is required to start this quiz. Please allow fullscreen and try again.')
    }
  }

  function selectAnswer(questionId, answer) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    supabase.from('answers').upsert({
      quiz_id: quizId,
      question_id: questionId,
      student_id: user.id,
      selected_answer: answer,
    })
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    for (const q of questions) {
      if (answers[q.id]) {
        const isCorrect = answers[q.id].trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
        await supabase.from('answers').upsert({
          quiz_id: quizId,
          question_id: q.id,
          student_id: user.id,
          selected_answer: answers[q.id],
          is_correct: isCorrect,
          marks_obtained: isCorrect ? q.marks : 0,
        }, { onConflict: 'quiz_id,question_id,student_id' })
      }
    }

    const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : null

    await fetch(`http://localhost:8000/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId, student_id: user.id, time_taken_seconds: elapsed }),
    })

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {}

    navigate(`/results/${quizId}`)
  }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading quiz...</div>
      </div>
    )
  }

  const current = questions[currentIndex]
  const answered = Object.keys(answers).length
  const isLive = quiz?.quiz_type === 'LIVE'

  if (!quizStartedRef.current && !isFullscreen) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Fullscreen Required</h2>
          <p className="text-gray-500 mb-2">
            This quiz must be taken in fullscreen mode to ensure exam integrity.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-red-700 mb-2">Rules:</p>
            <ul className="text-sm text-red-600 space-y-1">
              <li>No tab switching allowed</li>
              <li>No exiting fullscreen mode</li>
              <li>Auto-submit after 2 violations</li>
            </ul>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-6">{quiz.title}</p>
          <button
            onClick={requestFullscreen}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 text-lg"
          >
            Enter Fullscreen &amp; Start Quiz
          </button>
        </div>
      </div>
    )
  }

  if (showFullscreenPrompt) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Fullscreen Exited!</h2>
          <p className="text-gray-500 mb-4">
            You exited fullscreen mode. This is a violation.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm font-semibold text-red-700">
              Violations: {violations} / {maxViolations}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Quiz will auto-submit after {maxViolations} violations
            </p>
          </div>
          <button
            onClick={requestFullscreen}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Re-enter Fullscreen
          </button>
        </div>
      </div>
    )
  }

  if (autoSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Auto-Submitted</h2>
          <p className="text-gray-500 mb-4">
            Your quiz was automatically submitted due to {maxViolations} security violations.
          </p>
          <p className="text-sm text-gray-400">Redirecting to results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-blue-600">QuizCo</h1>
          <span className="text-sm text-gray-600">{quiz?.title}</span>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {violations > 0 && (
            <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded font-medium ${
              violations >= maxViolations ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Violations: {violations}/{maxViolations}
            </span>
          )}
          <span className="text-sm text-gray-500">{answered}/{questions.length} answered</span>
          <span className={`font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-gray-700'}`}>
            {formatTime(timeLeft)}
          </span>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="text-sm text-gray-500 mb-2">
              Question {currentIndex + 1} / {questions.length}
              <span className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {current?.marks} mark{current?.marks > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-lg font-medium mb-6">{current?.question_text}</p>

            {current?.question_type === 'MCQ' && current?.options && (
              <div className="space-y-3">
                {current.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i)
                  const selected = answers[current.id] === opt
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(current.id, opt)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium mr-3">{letter}.</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {current?.question_type === 'TRUE_FALSE' && (
              <div className="space-y-3">
                {['True', 'False'].map(opt => {
                  const selected = answers[current.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(current.id, opt)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            )}

            {current?.question_type === 'SHORT_ANSWER' && (
              <div>
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={answers[current.id] || ''}
                  onChange={(e) => selectAnswer(current.id, e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:outline-none transition"
                />
                <p className="text-xs text-gray-400 mt-2">Type your answer exactly. Grading is case-insensitive.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-lg shadow p-4 sticky top-20">
            <h3 className="font-semibold text-sm mb-3">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-10 h-10 rounded text-sm font-medium transition ${
                    i === currentIndex ? 'bg-blue-600 text-white' :
                    answers[q.id] ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 bg-green-500 rounded"></span> Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="w-3 h-3 bg-gray-200 rounded"></span> Unanswered
            </div>
          </div>

          {isLive && liveLeaderboard.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live Leaderboard
              </h3>
              <div className="space-y-2">
                {liveLeaderboard.map((entry, i) => (
                  <div
                    key={entry.student_id}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      i === 0 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <span className="w-5 text-center font-bold text-xs">{i + 1}</span>
                    <span className="flex-1 truncate">{entry.profiles?.full_name || 'Student'}</span>
                    <span className="font-bold text-xs text-blue-600">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
