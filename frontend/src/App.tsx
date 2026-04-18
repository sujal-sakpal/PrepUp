import { Navigate, Route, Routes } from 'react-router-dom'

import { Navbar } from '@/components/layout/Navbar'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LandingPage } from '@/pages/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ConfigurePage from '@/pages/configure/ConfigurePage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import AnalysisPage from '@/pages/analysis/AnalysisPage'
import InterviewRoomPage from '@/pages/interview/InterviewRoomPage'
import ProfilePage from '@/pages/profile/ProfilePage'

import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/configure" element={<ConfigurePage />} />
          <Route path="/interview/:sessionId" element={<InterviewRoomPage />} />
          <Route path="/analysis/:sessionId" element={<AnalysisPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
