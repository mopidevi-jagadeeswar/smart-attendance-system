import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'

// ============================================================
// ADMIN PAGES
// ============================================================

import AdminAttendancePage from './pages/admin/AdminAttendancePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminNoticesPage from './pages/admin/AdminNoticesPage'
import AttendanceHistoryPage from './pages/admin/AttendanceHistoryPage'
import FaceDataPage from './pages/admin/FaceDataPage'
import FacultyPage from './pages/admin/FacultyPage'
import NFCPage from './pages/admin/NFCPage'
import RegisterFaculty from './pages/admin/RegisterFaculty'
import RegisterStudent from './pages/admin/RegisterStudent'
import ReportsPage from './pages/admin/ReportsPage'
import StudentsPage from './pages/admin/StudentsPage'
import UsersPage from './pages/admin/UsersPage'

// ============================================================
// FACULTY / STUDENT
// ============================================================

import FacultyDashboard from './pages/faculty/FacultyDashboard'
import StudentDashboard from './pages/student/StudentDashboard'

// ============================================================
// PUBLIC PAGES
// ============================================================

import AIPage from './pages/public/AIPage'
import AttendancePage from './pages/public/AttendancePage'
import CalendarPage from './pages/public/CalendarPage'
import HomePage from './pages/public/HomePage'
import LoginPage from './pages/public/LoginPage'
import NoticesPage from './pages/public/NoticesPage'

// ============================================================
// APPLICATION
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ====================================================
            PUBLIC
        ===================================================== */}

        <Route path="/" element={<HomePage />} />

        <Route path="/attendance" element={<AttendancePage />} />

        <Route path="/calendar" element={<CalendarPage />} />

        <Route path="/notices" element={<NoticesPage />} />

        <Route path="/ai" element={<AIPage />} />

        <Route path="/login" element={<LoginPage />} />

        {/* ====================================================
            STUDENT
        ===================================================== */}

        <Route element={<ProtectedRoute allowedRole="student" />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>

        {/* ====================================================
            FACULTY
        ===================================================== */}

        <Route element={<ProtectedRoute allowedRole="faculty" />}>
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        </Route>

        {/* ====================================================
            ADMIN
        ===================================================== */}

        <Route element={<ProtectedRoute allowedRole="admin" />}>
          <Route element={<AdminLayout />}>
            {/* ==================================================
                ADMIN ROOT
            ================================================== */}

            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* ==================================================
                DASHBOARD
            ================================================== */}

            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* ==================================================
                ATTENDANCE
            ================================================== */}

            <Route path="/admin/attendance" element={<AdminAttendancePage />} />

            {/* ==================================================
                ATTENDANCE HISTORY
            ================================================== */}

            <Route path="/admin/history" element={<AttendanceHistoryPage />} />

            {/* ==================================================
                REPORTS
            ================================================== */}

            <Route path="/admin/reports" element={<ReportsPage />} />

            {/* ==================================================
                STUDENTS
            ================================================== */}

            <Route path="/admin/students" element={<StudentsPage />} />

            <Route path="/admin/students/register" element={<RegisterStudent />} />

            {/* ==================================================
                FACULTY
            ================================================== */}

            <Route path="/admin/faculty" element={<FacultyPage />} />

            <Route path="/admin/faculty/register" element={<RegisterFaculty />} />

            {/* ==================================================
                FACE DATA
            ================================================== */}

            <Route path="/admin/face-data" element={<FaceDataPage />} />

            {/* ==================================================
                NFC
            ================================================== */}

            <Route path="/admin/nfc" element={<NFCPage />} />

            {/* ==================================================
                USERS
            ================================================== */}

            <Route path="/admin/users" element={<UsersPage />} />

            {/* ==================================================
                NOTICE MANAGEMENT
            ================================================== */}

            <Route path="/admin/notices" element={<AdminNoticesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
