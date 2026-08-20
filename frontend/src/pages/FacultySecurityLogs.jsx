import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function FacultySecurityLogs() {
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadQuizzes() }, [])

  async function loadQuizzes() {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
    setQuizzes(data || [])
    setLoading(false)
  }

  async function loadLogs(quizId) {
    setSelectedQuiz(quizId)
    const { data } = await supabase
      .from('activity_logs')
      .select('*, profiles(full_name, roll_number)')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false })

    setLogs(data || [])
  }

  function groupByStudent(logs) {
    const grouped = {}
    logs.forEach(log => {
      const id = log.student_id
      if (!grouped[id]) {
        grouped[id] = {
          name: log.profiles?.full_name || 'Unknown',
          roll: log.profiles?.roll_number || '-',
          events: [],
          flagged: false,
        }
      }
      grouped[id].events.push(log)
      if (log.flagged) grouped[id].flagged = true
    })
    return Object.values(grouped).sort((a, b) => {
      if (a.flagged && !b.flagged) return -1
      if (!a.flagged && b.flagged) return 1
      return b.events.length - a.events.length
    })
  }

  const grouped = selectedQuiz ? groupByStudent(logs) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Security Logs</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : !selectedQuiz ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">Select a quiz to view security logs</p>
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{quiz.title}</h3>
                  <span className="text-xs text-gray-500">{new Date(quiz.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => loadLogs(quiz.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
                >View Logs</button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => { setSelectedQuiz(null); setLogs([]) }} className="text-sm text-blue-600 hover:underline mb-4">
              ← Back to quiz list
            </button>
            <h3 className="font-semibold text-lg mb-4">
              Security Logs — {quizzes.find(q => q.id === selectedQuiz)?.title}
            </h3>

            {logs.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No security events recorded for this quiz.
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map((student, i) => (
                  <div key={i} className={`bg-white rounded-lg shadow p-6 ${student.flagged ? 'border-l-4 border-red-500' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{student.name}</span>
                        <span className="text-xs text-gray-500">Roll: {student.roll}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{student.events.length} events</span>
                        {student.flagged && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-medium">Flagged for Review</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {student.events.map((log, j) => (
                        <div key={j} className="flex items-center gap-3 text-xs">
                          <span className="text-gray-400 w-20">{new Date(log.created_at).toLocaleTimeString()}</span>
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            log.event_type === 'TAB_SWITCH' ? 'bg-yellow-100 text-yellow-700' :
                            log.event_type.includes('COPY') || log.event_type.includes('PASTE') || log.event_type.includes('CUT') ? 'bg-orange-100 text-orange-700' :
                            log.event_type === 'FULLSCREEN_EXIT' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{log.event_type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500">{log.event_details}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
