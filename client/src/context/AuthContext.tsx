import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import apiClient from '../api/client'

export interface AuthUser {
  id: string
  login_id: string
  full_name: string | null
  email: string
  role: 'admin' | 'faculty' | 'student'
  is_active: boolean
  is_verified: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const [loading, setLoading] = useState(() => {
    return Boolean(localStorage.getItem('access_token'))
  })

  // ============================================================
  // REFRESH AUTHENTICATED USER
  // ============================================================

  const refreshUser = async (): Promise<void> => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await apiClient.get<AuthUser>('/auth/me')

      setUser(response.data)

      // Keep localStorage user information synchronized.
      localStorage.setItem('user', JSON.stringify(response.data))
    } catch (error) {
      console.error('Failed to load authenticated user:', error)

      localStorage.removeItem('access_token')
      localStorage.removeItem('user')

      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // INITIAL AUTHENTICATION CHECK
  // ============================================================

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      return
    }

    const loadUser = async () => {
      try {
        const response = await apiClient.get<AuthUser>('/auth/me')

        setUser(response.data)

        localStorage.setItem('user', JSON.stringify(response.data))
      } catch (error) {
        console.error('Failed to load authenticated user:', error)

        localStorage.removeItem('access_token')
        localStorage.removeItem('user')

        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    void loadUser()
  }, [])

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')

    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Fast Refresh requires component-only exports.
// The hook is intentionally kept in this module so the existing
// application imports do not need to change.
/* eslint-disable react-refresh/only-export-components */
export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
/* eslint-enable react-refresh/only-export-components */
