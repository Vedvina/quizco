import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function FacultyAnalytics() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({ totalQuizzes: 0, totalStudents: 0, avgScore: 0, totalQuestions: 0 })
  const [scoreDistribution, setScoreDistribution] = useState([])
  const [quizPerformance, setQuizPerformance] = useState([])
  const [difficultyData, setDifficultyData] = useState([])
  const [securityData, setSecurityData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    const [quizzesRes, resultsRes, questionsRes, securityRes, participantsRes] = await Promise.all([
      supabase.from('quizzes').select('id, title, created_at'),
      supabase.from('results').select('percentage, quiz_id, student_id, obtained_marks, total_marks'),
      supabase.from('questions').select('difficulty'),
      supabase.from('activity_logs').select('event_type, flagged'),
      supabase.from('quiz_participants').select('student_id'),
    ])

    const quizzes = quizzesRes.data || []
    const results = resultsRes.data || []
    const questions = questionsRes.data || []
    const security = securityRes.data || []
    const participants = participantsRes.data || []

    const totalStudents = new Set(participants.map(p => p.student_id)).size
    const avgScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length)
      : 0

    setOverview({
      totalQuizzes: quizzes.length,
      totalStudents,
      avgScore,
      totalQuestions: questions.length,
    })

    // Score distribution buckets
    const buckets = [
      { range: '0-20', count: 0, fill: '#EF4444' },
      { range: '21-40', count: 0, fill: '#F59E0B' },
      { range: '41-60', count: 0, fill: '#3B82F6' },
      { range: '61-80', count: 0, fill: '#10B981' },
      { range: '81-100', count: 0, fill: '#8B5CF6' },
    ]
    results.forEach(r => {
      const p = Number(r.percentage)
      if (p <= 20) buckets[0].count++
      else if (p <= 40) buckets[1].count++
      else if (p <= 60) buckets[2].count++
      else if (p <= 80) buckets[3].count++
      else buckets[4].count++
    })
    setScoreDistribution(buckets)

    // Quiz performance
    const quizMap = {}
    quizzes.forEach(q => { quizMap[q.id] = { title: q.title, scores: [] } })
    results.forEach(r => {
      if (quizMap[r.quiz_id]) quizMap[r.quiz_id].scores.push(Number(r.percentage))
    })
    const perfData = Object.values(quizMap)
      .filter(q => q.scores.length > 0)
      .slice(0, 8)
      .map(q => ({
        name: q.title.length > 15 ? q.title.slice(0, 15) + '...' : q.title,
        avgScore: Math.round(q.scores.reduce((a, b) => a + b, 0) / q.scores.length),
        attempts: q.scores.length,
      }))
    setQuizPerformance(perfData)

    // Difficulty breakdown
    const diffCount = { Easy: 0, Medium: 0, Hard: 0 }
    questions.forEach(q => { diffCount[q.difficulty] = (diffCount[q.difficulty] || 0) + 1 })
    setDifficultyData(
      Object.entries(diffCount)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    )

    // Security events
    const eventCount = {}
    security.forEach(s => { eventCount[s.event_type] = (eventCount[s.event_type] || 0) + 1 })
    const flaggedCount = security.filter(s => s.flagged).length
    setSecurityData([
      ...Object.entries(eventCount).map(([type, count]) => ({
        type: type.replace('_', ' '),
        count,
      })),
      { type: 'Flagged', count: flaggedCount },
    ])

    // Monthly trends (last 6 months)
    const monthMap = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = { month: d.toLocaleString('default', { month: 'short' }), quizzes: 0, results: 0 }
    }
    quizzes.forEach(q => {
      const key = q.created_at.slice(0, 7)
      if (monthMap[key]) monthMap[key].quizzes++
    })
    results.forEach(r => {
      const key = r.evaluated_at?.slice(0, 7) || ''
      if (monthMap[key]) monthMap[key].results++
    })
    setMonthlyData(Object.values(monthMap))

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
          <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
        </nav>
        <div className="max-w-6xl mx-auto p-6 text-center text-gray-500 py-16">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <a href="/dashboard" className="text-sm text-gray-600 hover:underline">← Back to Dashboard</a>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Analytics</h2>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-2xl font-bold text-blue-600">{overview.totalQuizzes}</div>
            <div className="text-gray-500 text-sm mt-1">Total Quizzes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-2xl font-bold text-green-600">{overview.totalQuestions}</div>
            <div className="text-gray-500 text-sm mt-1">Questions Created</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-2xl font-bold text-purple-600">{overview.totalStudents}</div>
            <div className="text-gray-500 text-sm mt-1">Students Tested</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-2xl font-bold text-orange-600">{overview.avgScore}%</div>
            <div className="text-gray-500 text-sm mt-1">Average Score</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Score Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Score Distribution</h3>
            {scoreDistribution.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-12">No results data yet</div>
            )}
          </div>

          {/* Question Difficulty */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Question Difficulty Breakdown</h3>
            {difficultyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={difficultyData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {difficultyData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-12">No questions created yet</div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Quiz Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Avg Score per Quiz</h3>
            {quizPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={quizPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgScore" name="Avg Score %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-12">No quiz results yet</div>
            )}
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">Monthly Activity</h3>
            {monthlyData.some(d => d.quizzes > 0 || d.results > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="quizzes" name="Quizzes Created" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="results" name="Results" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-12">No activity data yet</div>
            )}
          </div>
        </div>

        {/* Security Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">Security Events</h3>
          {securityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={securityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="type" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Events" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 text-center py-12">No security events recorded</div>
          )}
        </div>
      </div>
    </div>
  )
}
