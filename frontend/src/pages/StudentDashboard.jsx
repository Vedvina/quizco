import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [availableCount, setAvailableCount] = useState('...')
  const [completedCount, setCompletedCount] = useState('...')
  const [avgScore, setAvgScore] = useState('...')

  useEffect(() => {
    if (!profile) return
    loadStats()
  }, [profile])

  async function loadStats() {
    const [availableRes, resultsRes] = await Promise.all([
      supabase.from('quizzes').select('id', { count: 'exact', head: true })
        .eq('quiz_type', 'SCHEDULED')
        .in('status', ['ACTIVE', 'DRAFT']),
      supabase.from('results').select('percentage').eq('student_id', profile.id),
    ])

    setAvailableCount(availableRes.count || 0)
    const results = resultsRes.data || []
    setCompletedCount(results.length)
    setAvgScore(results.length > 0
      ? `${Math.round(results.reduce((s, r) => s + Number(r.percentage), 0) / results.length)}%`
      : '0%'
    )
  }

  const actions = [
    { label: 'Join Live Quiz', color: 'bg-blue-600', path: '/student/join-live' },
    { label: 'Available Quizzes', color: 'bg-green-600', path: '/student/quizzes' },
    { label: 'My Results', color: 'bg-indigo-600', path: '/student/results' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {profile?.full_name}</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Student</span>
          <button onClick={signOut} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Student Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{availableCount}</div>
            <div className="text-gray-500 text-sm mt-1">Available Quizzes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <div className="text-gray-500 text-sm mt-1">Completed Tests</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{avgScore}</div>
            <div className="text-gray-500 text-sm mt-1">Average Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`${item.color} text-white rounded-lg p-6 text-left hover:opacity-90 shadow`}
            >
              <div className="font-semibold">{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
