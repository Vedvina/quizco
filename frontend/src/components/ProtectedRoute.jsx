import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to="/" />
  }

  return children
}
