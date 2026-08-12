import { Navigate, Outlet } from 'react-router-dom'

type UserRole = 'student' | 'faculty' | 'admin'

interface ProtectedRouteProps {
  allowedRole: UserRole
}

interface StoredUser {
  role: UserRole
}

function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token')
  const storedUser = localStorage.getItem('user')

  // --------------------------------------------------------------
  // User is not authenticated
  // --------------------------------------------------------------

  if (!token || !storedUser) {
    return <Navigate to="/login" replace />
  }

  // --------------------------------------------------------------
  // Read authenticated user
  // --------------------------------------------------------------

  let user: StoredUser

  try {
    user = JSON.parse(storedUser) as StoredUser
  } catch {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    return <Navigate to="/login" replace />
  }

  // --------------------------------------------------------------
  // Check role
  // --------------------------------------------------------------

  if (user.role !== allowedRole) {
    if (user.role === 'student') {
      return <Navigate to="/student/dashboard" replace />
    }

    if (user.role === 'faculty') {
      return <Navigate to="/faculty/dashboard" replace />
    }

    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />
    }

    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    return <Navigate to="/login" replace />
  }

  // --------------------------------------------------------------
  // Authorized
  // --------------------------------------------------------------

  return <Outlet />
}

export default ProtectedRoute
