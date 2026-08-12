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
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.get<AuthUser>('/auth/me')

      setUser(response.data)
    } catch (error) {
      console.error('Failed to load authenticated user:', error)

      localStorage.removeItem('access_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
