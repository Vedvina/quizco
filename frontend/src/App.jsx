import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import FacultyDashboard from './pages/FacultyDashboard'
import StudentDashboard from './pages/StudentDashboard'
import QuestionBank from './pages/QuestionBank'
import GenerateQuestions from './pages/GenerateQuestions'
import CreateQuiz from './pages/CreateQuiz'
import FacultyLiveQuizzes from './pages/FacultyLiveQuizzes'
import FacultyResults from './pages/FacultyResults'
import FacultySecurityLogs from './pages/FacultySecurityLogs'
import ScheduledQuizzes from './pages/ScheduledQuizzes'
import AvailableQuizzes from './pages/AvailableQuizzes'
import JoinLiveQuiz from './pages/JoinLiveQuiz'
import QuizAttempt from './pages/QuizAttempt'
import StudentResults from './pages/StudentResults'
import StudentResultsList from './pages/StudentResultsList'

function DashboardRouter() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (profile?.role === 'FACULTY') return <FacultyDashboard />
  if (profile?.role === 'STUDENT') return <StudentDashboard />
  return <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

          {/* Faculty routes */}
          <Route path="/faculty/questions" element={<ProtectedRoute allowedRole="FACULTY"><QuestionBank /></ProtectedRoute>} />
          <Route path="/faculty/generate" element={<ProtectedRoute allowedRole="FACULTY"><GenerateQuestions /></ProtectedRoute>} />
          <Route path="/faculty/create-quiz" element={<ProtectedRoute allowedRole="FACULTY"><CreateQuiz /></ProtectedRoute>} />
          <Route path="/faculty/live-quizzes" element={<ProtectedRoute allowedRole="FACULTY"><FacultyLiveQuizzes /></ProtectedRoute>} />
          <Route path="/faculty/results" element={<ProtectedRoute allowedRole="FACULTY"><FacultyResults /></ProtectedRoute>} />
          <Route path="/faculty/security-logs" element={<ProtectedRoute allowedRole="FACULTY"><FacultySecurityLogs /></ProtectedRoute>} />
          <Route path="/faculty/scheduled-quizzes" element={<ProtectedRoute allowedRole="FACULTY"><ScheduledQuizzes /></ProtectedRoute>} />

          {/* Student routes */}
          <Route path="/student/quizzes" element={<ProtectedRoute allowedRole="STUDENT"><AvailableQuizzes /></ProtectedRoute>} />
          <Route path="/student/join-live" element={<ProtectedRoute allowedRole="STUDENT"><JoinLiveQuiz /></ProtectedRoute>} />
          <Route path="/student/results" element={<ProtectedRoute allowedRole="STUDENT"><StudentResultsList /></ProtectedRoute>} />

          {/* Shared routes */}
          <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizAttempt /></ProtectedRoute>} />
          <Route path="/results/:quizId" element={<ProtectedRoute><StudentResults /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
