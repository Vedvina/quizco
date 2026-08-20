import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'

export default function GenerateQuestions() {
  const [form, setForm] = useState({
    subject: '', topic: '', difficulty: 'Medium',
    question_type: 'MCQ', num_questions: 5, marks_per_question: 1,
  })
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState([])
  const [saved, setSaved] = useState(false)

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setGenerated([])
    setSaved(false)

    try {
      const data = await api.generateQuestions(form)
      if (data.questions) {
        setGenerated(data.questions)
      } else {
        alert(data.detail || 'Generation failed. Make sure GEMINI_API_KEY is set in backend .env')
      }
    } catch {
      alert('Could not reach backend. Make sure FastAPI is running on port 8000.')
    }
    setLoading(false)
  }

  async function handleSaveAll() {
    const toSave = generated.map(q => ({
      subject: form.subject,
      topic: form.topic,
      question_type: form.question_type,
      difficulty: q.difficulty || form.difficulty,
      question_text: q.question,
      options: q.options || null,
      correct_answer: q.correct_answer,
      marks: q.marks || form.marks_per_question,
    }))

    const { error } = await supabase.from('questions').insert(toSave)
    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      setSaved(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">AI Question Generator</h2>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                placeholder="Subject (e.g., Artificial Intelligence)"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Topic (e.g., Machine Learning)"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <select
                  value={form.question_type}
                  onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                >
                  <option value="MCQ">MCQ</option>
                  <option value="TRUE_FALSE">True/False</option>
                  <option value="SHORT_ANSWER">Short Answer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Questions:</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.num_questions}
                  onChange={(e) => setForm({ ...form, num_questions: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Marks each:</label>
                <input
                  type="number"
                  min="1"
                  value={form.marks_per_question}
                  onChange={(e) => setForm({ ...form, marks_per_question: parseInt(e.target.value) })}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'Generating...' : 'Generate Questions'}
            </button>
          </form>
        </div>

        {generated.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Generated {generated.length} Questions</h3>
              <button
                onClick={handleSaveAll}
                disabled={saved}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  saved ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saved ? 'Saved to Question Bank' : 'Save All to Question Bank'}
              </button>
            </div>
            <div className="space-y-4">
              {generated.map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-100 text-blue-700 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.question}</p>
                      {q.options && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {q.options.map((opt, j) => (
                            <div key={j} className={`text-xs px-2 py-1 rounded ${
                              opt === q.correct_answer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'
                            }`}>
                              {String.fromCharCode(65 + j)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Answer: <span className="font-medium text-green-600">{q.correct_answer}</span>
                        {' · '}Difficulty: {q.difficulty} · Marks: {q.marks || form.marks_per_question}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
