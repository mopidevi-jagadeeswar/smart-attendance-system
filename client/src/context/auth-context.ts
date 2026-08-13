import { createContext } from 'react'

export interface AuthUser {
  id: string
  login_id: string
  full_name: string | null
  email: string
  role: 'admin' | 'faculty' | 'student'
  is_active: boolean
  is_verified: boolean
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
