import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ScheduledQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedQuiz, setExpandedQuiz] = useState(null)
  const [participants, setParticipants] = useState([])
  const [results, setResults] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [editingQuiz, setEditingQuiz] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => { loadQuizzes() }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadQuizzes() {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_type', 'SCHEDULED')
      .order('created_at', { ascending: false })

    const current = new Date()
    const updates = []

    for (const quiz of (data || [])) {
      if (quiz.status === 'DRAFT' && quiz.start_time && new Date(quiz.start_time) <= current) {
        updates.push(supabase.from('quizzes').update({ status: 'ACTIVE' }).eq('id', quiz.id))
        quiz.status = 'ACTIVE'
      }
      if (quiz.status === 'ACTIVE' && quiz.end_time && new Date(quiz.end_time) <= current) {
        updates.push(supabase.from('quizzes').update({ status: 'COMPLETED' }).eq('id', quiz.id))
        quiz.status = 'COMPLETED'
      }
    }

    if (updates.length > 0) await Promise.all(updates)

    setQuizzes(data || [])
    setLoading(false)
  }

  async function activateQuiz(quizId) {
    const now = new Date().toISOString()
    await supabase.from('quizzes').update({ status: 'ACTIVE', start_time: now }).eq('id', quizId)
    loadQuizzes()
  }

  async function completeQuiz(quizId) {
    await supabase.from('quizzes').update({ status: 'COMPLETED' }).eq('id', quizId)
    setExpandedQuiz(null)
    loadQuizzes()
  }

  async function cancelQuiz(quizId) {
    await supabase.from('quizzes').update({ status: 'CANCELLED' }).eq('id', quizId)
    setExpandedQuiz(null)
    loadQuizzes()
  }

  async function deleteQuiz(quizId) {
    if (!confirm('Delete this quiz permanently?')) return
    await supabase.from('quizzes').delete().eq('id', quizId)
    setExpandedQuiz(null)
    loadQuizzes()
  }

  async function saveEdit(quizId) {
    await supabase.from('quizzes').update({
      title: editForm.title,
      description: editForm.description,
      start_time: editForm.start_time || null,
      end_time: editForm.end_time || null,
      duration_minutes: parseInt(editForm.duration_minutes) || 60,
      max_attempts: parseInt(editForm.max_attempts) || 1,
    }).eq('id', quizId)
    setEditingQuiz(null)
    loadQuizzes()
  }

  function startEdit(quiz) {
    setEditingQuiz(quiz.id)
    setEditForm({
      title: quiz.title,
      description: quiz.description || '',
      start_time: quiz.start_time ? new Date(quiz.start_time).toISOString().slice(0, 16) : '',
      end_time: quiz.end_time ? new Date(quiz.end_time).toISOString().slice(0, 16) : '',
      duration_minutes: quiz.duration_minutes,
      max_attempts: quiz.max_attempts,
    })
  }

  async function expandQuiz(quiz) {
    if (expandedQuiz === quiz.id) {
      setExpandedQuiz(null)
      return
    }
    setExpandedQuiz(quiz.id)

    const { data: participantData } = await supabase
      .from('quiz_participants')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', quiz.id)

    setParticipants(participantData || [])

    const { data: resultData } = await supabase
      .from('results')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', quiz.id)
      .order('obtained_marks', { ascending: false })

    setResults(resultData || [])
  }

  function getStatus(quiz) {
    const current = new Date()
    const start = quiz.start_time ? new Date(quiz.start_time) : null
    const end = quiz.end_time ? new Date(quiz.end_time) : null

    if (quiz.status === 'CANCELLED') return { text: 'Cancelled', color: 'bg-red-100 text-red-700' }
    if (quiz.status === 'COMPLETED') return { text: 'Completed', color: 'bg-gray-100 text-gray-500' }
    if (quiz.status === 'ACTIVE') {
      if (end && current > end) return { text: 'Ended', color: 'bg-orange-100 text-orange-700' }
      return { text: 'Active', color: 'bg-green-100 text-green-700' }
    }
    if (start && current < start) return { text: 'Upcoming', color: 'bg-blue-100 text-blue-700' }
    return { text: 'Draft', color: 'bg-yellow-100 text-yellow-700' }
  }

  function getTimeUntil(dateStr) {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - now
    if (diff <= 0) return null
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`
    return `${mins}m ${secs}s`
  }

  function getAvgScore() {
    if (results.length === 0) return 0
    return Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
  }

  const filteredQuizzes = quizzes.filter(q => {
    if (filter === 'ALL') return true
    const s = q.status
    if (filter === 'UPCOMING') return s === 'DRAFT' && q.start_time && new Date(q.start_time) > new Date()
    if (filter === 'ACTIVE') return s === 'ACTIVE'
    if (filter === 'COMPLETED') return s === 'COMPLETED'
    if (filter === 'CANCELLED') return s === 'CANCELLED'
    return true
  })

  const statusCounts = {
    ALL: quizzes.length,
    UPCOMING: quizzes.filter(q => q.status === 'DRAFT' && q.start_time && new Date(q.start_time) > new Date()).length,
    ACTIVE: quizzes.filter(q => q.status === 'ACTIVE').length,
    COMPLETED: quizzes.filter(q => q.status === 'COMPLETED').length,
    CANCELLED: quizzes.filter(q => q.status === 'CANCELLED').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Scheduled Quizzes</h2>
          <a href="/faculty/create-quiz" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + Create Quiz
          </a>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 shadow hover:bg-gray-50'
              }`}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()} ({count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No scheduled quizzes found. Create one from the dashboard.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuizzes.map(quiz => {
              const status = getStatus(quiz)
              const isExpanded = expandedQuiz === quiz.id
              const isEditing = editingQuiz === quiz.id
              const countdown = quiz.status === 'DRAFT' && quiz.start_time ? getTimeUntil(quiz.start_time) : null

              return (
                <div key={quiz.id} className="bg-white rounded-lg shadow">
                  <div className="p-6 cursor-pointer hover:bg-gray-50 transition" onClick={() => !isEditing && expandQuiz(quiz)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-3" onClick={e => e.stopPropagation()}>
                            <input
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
                              placeholder="Quiz Title"
                            />
                            <textarea
                              value={editForm.description}
                              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                              placeholder="Description"
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-500">Start Time</label>
                                <input
                                  type="datetime-local"
                                  value={editForm.start_time}
                                  onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                                  className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">End Time</label>
                                <input
                                  type="datetime-local"
                                  value={editForm.end_time}
                                  onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                                  className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">Duration (min)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editForm.duration_minutes}
                                  onChange={e => setEditForm({ ...editForm, duration_minutes: e.target.value })}
                                  className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">Max Attempts</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editForm.max_attempts}
                                  onChange={e => setEditForm({ ...editForm, max_attempts: e.target.value })}
                                  className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(quiz.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">Save</button>
                              <button onClick={() => setEditingQuiz(null)} className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-300">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{quiz.title}</h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                                {status.text}
                              </span>
                              {countdown && (
                                <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-600 border border-blue-200">
                                  Starts in {countdown}
                                </span>
                              )}
                            </div>
                            {quiz.description && (
                              <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
                            )}
                            <div className="flex gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                              <span>Duration: {quiz.duration_minutes} min</span>
                              <span>Total Marks: {quiz.total_marks}</span>
                              <span>Max Attempts: {quiz.max_attempts}</span>
                              {quiz.start_time && (
                                <span>Starts: {new Date(quiz.start_time).toLocaleString()}</span>
                              )}
                              {quiz.end_time && (
                                <span>Ends: {new Date(quiz.end_time).toLocaleString()}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex gap-2 ml-4" onClick={e => e.stopPropagation()}>
                          {quiz.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => startEdit(quiz)}
                                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-300"
                              >Edit</button>
                              <button
                                onClick={() => activateQuiz(quiz.id)}
                                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700"
                              >Activate</button>
                            </>
                          )}
                          {quiz.status === 'ACTIVE' && (
                            <button
                              onClick={() => completeQuiz(quiz.id)}
                              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-orange-700"
                            >End Quiz</button>
                          )}
                          {quiz.status !== 'CANCELLED' && quiz.status !== 'COMPLETED' && (
                            <button
                              onClick={() => cancelQuiz(quiz.id)}
                              className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs hover:bg-red-200"
                            >Cancel</button>
                          )}
                          {quiz.status === 'DRAFT' && (
                            <button
                              onClick={() => deleteQuiz(quiz.id)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700"
                            >Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="border-t px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-3">
                            Participants ({participants.length})
                          </h4>
                          {participants.length === 0 ? (
                            <p className="text-xs text-gray-500">No participants yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {participants.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                                  <span>{p.profiles?.full_name || 'Unknown'}</span>
                                  <span className="text-xs text-gray-500">{p.profiles?.roll_number || '-'}</span>
                                  <span className={`font-medium ${p.completed ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {p.completed ? `${p.score} pts` : 'In Progress'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-3">
                            Results ({results.length})
                          </h4>
                          {results.length === 0 ? (
                            <p className="text-xs text-gray-500">No results yet.</p>
                          ) : (
                            <>
                              <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="bg-white rounded p-2 text-center">
                                  <div className="text-lg font-bold text-blue-600">{getAvgScore()}%</div>
                                  <div className="text-xs text-gray-500">Avg Score</div>
                                </div>
                                <div className="bg-white rounded p-2 text-center">
                                  <div className="text-lg font-bold text-green-600">
                                    {Math.max(...results.map(r => r.percentage))}%
                                  </div>
                                  <div className="text-xs text-gray-500">Highest</div>
                                </div>
                                <div className="bg-white rounded p-2 text-center">
                                  <div className="text-lg font-bold text-red-600">
                                    {Math.min(...results.map(r => r.percentage))}%
                                  </div>
                                  <div className="text-xs text-gray-500">Lowest</div>
                                </div>
                              </div>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {results.map(r => (
                                  <div key={r.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                                    <span>{r.profiles?.full_name}</span>
                                    <div className="flex items-center gap-3">
                                      {r.time_taken_seconds != null && (
                                        <span className="text-xs text-gray-400">
                                          {Math.floor(r.time_taken_seconds / 60)}m {r.time_taken_seconds % 60}s
                                        </span>
                                      )}
                                      <span className={`font-bold ${r.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                        {r.percentage}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {(results.length > 0 || participants.length > 0) && (
                        <div className="mt-4 pt-3 border-t flex gap-3">
                          <a
                            href={`/faculty/results`}
                            className="text-xs text-blue-600 hover:underline"
                          >View Full Results →</a>
                          <a
                            href={`/faculty/security-logs`}
                            className="text-xs text-blue-600 hover:underline"
                          >Security Logs →</a>
                        </div>
                      )}
                    </div>
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
