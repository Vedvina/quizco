import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function FacultyDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const stats = [
    { label: 'Active Quizzes', value: '0', color: 'text-blue-600' },
    { label: 'Questions Generated', value: '0', color: 'text-green-600' },
    { label: 'Students Tested', value: '0', color: 'text-purple-600' },
    { label: 'Avg Score', value: '0%', color: 'text-orange-600' },
  ]

  const actions = [
    { label: 'Create Quiz', color: 'bg-blue-600', path: '/faculty/create-quiz' },
    { label: 'Generate Questions', color: 'bg-green-600', path: '/faculty/generate' },
    { label: 'Question Bank', color: 'bg-purple-600', path: '/faculty/questions' },
    { label: 'Live Quizzes', color: 'bg-orange-600', path: '/faculty/live-quizzes' },
    { label: 'Scheduled Quizzes', color: 'bg-teal-600', path: '/faculty/scheduled-quizzes' },
    { label: 'Results', color: 'bg-indigo-600', path: '/faculty/results' },
    { label: 'Analytics', color: 'bg-pink-600', path: '/faculty/analytics' },
    { label: 'Security Logs', color: 'bg-red-600', path: '/faculty/security-logs' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">QuizCo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {profile?.full_name}</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Faculty</span>
          <button onClick={signOut} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold mb-6">Faculty Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-6">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
