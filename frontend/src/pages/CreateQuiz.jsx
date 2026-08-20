import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function CreateQuiz() {
  const [questions, setQuestions] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', quiz_type: 'SCHEDULED',
    start_time: '', end_time: '', duration_minutes: 60, max_attempts: 1,
  })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ subject: '', difficulty: '', question_type: '' })
  const navigate = useNavigate()

  useEffect(() => { loadQuestions() }, [filters])

  async function loadQuestions() {
    let query = supabase.from('questions').select('*').order('created_at', { ascending: false })
    if (filters.subject) query = query.eq('subject', filters.subject)
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty)
    if (filters.question_type) query = query.eq('question_type', filters.question_type)
    const { data } = await query
    setQuestions(data || [])
  }

  function toggleQuestion(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(questions.map(q => q.id))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (selectedIds.length === 0) {
      alert('Select at least one question')
      return
    }
    setLoading(true)

    const totalMarks = questions
      .filter(q => selectedIds.includes(q.id))
      .reduce((sum, q) => sum + q.marks, 0)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      alert('You must be logged in')
      return
    }

    const quizCode = form.quiz_type === 'LIVE'
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: form.title,
        description: form.description,
        quiz_type: form.quiz_type,
        duration_minutes: form.duration_minutes,
        max_attempts: form.max_attempts,
        total_marks: totalMarks,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        quiz_code: quizCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (quizError) {
      setLoading(false)
      alert('Error creating quiz: ' + quizError.message)
      return
    }

    if (selectedIds.length > 0) {
      const quizQuestions = selectedIds.map((qid, i) => ({
        quiz_id: quiz.id,
        question_id: qid,
        order_index: i,
      }))
      const { error: qqError } = await supabase.from('quiz_questions').insert(quizQuestions)
      if (qqError) {
        setLoading(false)
        alert('Error linking questions: ' + qqError.message)
        return
      }
    }

    setLoading(false)
    alert(`Quiz created! ${quizCode ? 'Code: ' + quizCode : ''}`)
    navigate('/dashboard')
  }

  const subjects = [...new Set(questions.map(q => q.subject))]
  const totalMarks = questions
    .filter(q => selectedIds.includes(q.id))
    .reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Create Quiz</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  placeholder="Quiz Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={form.quiz_type}
                  onChange={(e) => setForm({ ...form, quiz_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="SCHEDULED">Scheduled Quiz</option>
                  <option value="LIVE">Live Quiz</option>
                </select>
                {form.quiz_type === 'SCHEDULED' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Start Time</label>
                      <input
                        type="datetime-local"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End Time</label>
                      <input
                        type="datetime-local"
                        value={form.end_time}
                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Max Attempts</label>
                    <input
                      type="number"
                      min="1"
                      value={form.max_attempts}
                      onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600">
                    Selected: <span className="font-bold text-blue-600">{selectedIds.length}</span> questions
                    {' · '}Total: <span className="font-bold text-blue-600">{totalMarks}</span> marks
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {loading ? 'Creating...' : 'Create Quiz'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex gap-4 mb-4">
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select
                value={filters.question_type}
                onChange={(e) => setFilters({ ...filters, question_type: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
            </div>

            <div className="space-y-3">
              {questions.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  No questions in bank. Create some first.
                </div>
              ) : (
                questions.map(q => (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`bg-white rounded-lg shadow p-4 cursor-pointer border-2 transition ${
                      selectedIds.includes(q.id) ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question_text}</p>
                        {q.options && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {String.fromCharCode(65 + i)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex gap-3 text-xs text-gray-500">
                          <span>{q.subject}</span>
                          <span className="px-1 rounded bg-gray-100">{q.question_type === 'SHORT_ANSWER' ? 'Short Answer' : q.question_type === 'TRUE_FALSE' ? 'T/F' : 'MCQ'}</span>
                          <span className={`px-1 rounded ${
                            q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{q.difficulty}</span>
                          <span>{q.marks} marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
