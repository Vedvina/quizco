import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function QuestionBank() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [filters, setFilters] = useState({ subject: '', difficulty: '' })
  const [form, setForm] = useState({
    subject: '', topic: '', question_text: '', question_type: 'MCQ',
    options: ['', '', '', ''], correct_answer: '', difficulty: 'Medium', marks: 1,
  })

  useEffect(() => { loadQuestions() }, [filters])

  async function loadQuestions() {
    setLoading(true)
    let query = supabase.from('questions').select('*').order('created_at', { ascending: false })
    if (filters.subject) query = query.eq('subject', filters.subject)
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty)
    const { data } = await query
    setQuestions(data || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({
      subject: '', topic: '', question_text: '', question_type: 'MCQ',
      options: ['', '', '', ''], correct_answer: '', difficulty: 'Medium', marks: 1,
    })
    setEditId(null)
    setShowForm(false)
  }

  function startEdit(q) {
    setForm({
      subject: q.subject, topic: q.topic, question_text: q.question_text,
      question_type: q.question_type, options: q.options || ['', '', '', ''],
      correct_answer: q.correct_answer, difficulty: q.difficulty, marks: q.marks,
    })
    setEditId(q.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = { ...form, options: form.question_type === 'MCQ' ? form.options : null }
    if (form.question_type === 'TRUE_FALSE') {
      data.correct_answer = form.correct_answer || 'True'
    }
    if (editId) {
      await supabase.from('questions').update(data).eq('id', editId)
    } else {
      await supabase.from('questions').insert(data)
    }
    resetForm()
    loadQuestions()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    loadQuestions()
  }

  const subjects = [...new Set(questions.map(q => q.subject))]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Question Bank</h2>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Add Question
          </button>
        </div>

        <div className="flex gap-4 mb-6">
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
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">{editId ? 'Edit Question' : 'Add New Question'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="Topic"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  required
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={form.question_type}
                    onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">True/False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={form.marks}
                    onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                    placeholder="Marks"
                  />
                </div>
              </div>
              <textarea
                placeholder="Question text"
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                required
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {form.question_type === 'MCQ' && (
                <div className="grid grid-cols-2 gap-3">
                  {form.options.map((opt, i) => (
                    <input
                      key={i}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...form.options]
                        opts[i] = e.target.value
                        setForm({ ...form, options: opts })
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  ))}
                </div>
              )}
              <input
                placeholder={
                  form.question_type === 'MCQ' ? 'Correct option letter (e.g., B)' :
                  form.question_type === 'TRUE_FALSE' ? 'True or False' :
                  'Correct answer text'
                }
                value={form.correct_answer}
                onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                  {editId ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={resetForm} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No questions yet. Add your first question!</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Marks</th>
                  <th className="px-4 py-3">Answer</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {questions.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-xs truncate">{q.question_text}</td>
                    <td className="px-4 py-3">{q.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{q.difficulty}</span>
                    </td>
                    <td className="px-4 py-3">{q.marks}</td>
                    <td className="px-4 py-3 font-mono text-xs">{q.correct_answer}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(q)} className="text-blue-600 hover:underline mr-3 text-xs">Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
