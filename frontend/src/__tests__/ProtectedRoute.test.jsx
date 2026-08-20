import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

function renderWithRouter(ui, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('shows loading state when auth is loading', () => {
    useAuth.mockReturnValue({ user: null, profile: null, loading: true })

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when no user', () => {
    useAuth.mockReturnValue({ user: null, profile: null, loading: false })

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({
      user: { id: 'user1' },
      profile: { role: 'STUDENT' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects when role does not match allowedRole', () => {
    useAuth.mockReturnValue({
      user: { id: 'user1' },
      profile: { role: 'STUDENT' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute allowedRole="FACULTY">
        <div>Faculty Only</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Faculty Only')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('renders children when role matches allowedRole', () => {
    useAuth.mockReturnValue({
      user: { id: 'user1' },
      profile: { role: 'FACULTY' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute allowedRole="FACULTY">
        <div>Faculty Dashboard</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Faculty Dashboard')).toBeInTheDocument()
  })

  it('renders children when no allowedRole restriction', () => {
    useAuth.mockReturnValue({
      user: { id: 'user1' },
      profile: { role: 'STUDENT' },
      loading: false,
    })

    renderWithRouter(
      <ProtectedRoute>
        <div>Any Role Allowed</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Any Role Allowed')).toBeInTheDocument()
  })
})
