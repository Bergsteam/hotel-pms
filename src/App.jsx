import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import RoomsPage from './pages/rooms/RoomsPage'
import ReservationsPage from './pages/reservations/ReservationsPage'
import SettingsPage from './pages/settings/SettingsPage'
import HousekeepingPage from './pages/housekeeping/HousekeepingPage'
import QrRoomPage from './pages/housekeeping/QrRoomPage'
import GuestsPage from './pages/guests/GuestsPage'
import FinancePage from './pages/finance/FinancePage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import StaffPage from './pages/staff/StaffPage'
import KitchenPage from './pages/kitchen/KitchenPage'
import Spinner from './components/ui/Spinner'

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Защищённые */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/housekeeping" element={<HousekeepingPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
        </Route>

        {/* QR страница — без логина */}
        <Route path="/qr/:roomId" element={<QrRoomPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-2">{title}</h1>
      <div className="bg-white rounded-xl border border-dashed border-slate-300 py-20 text-center text-slate-400">
        Модуль в разработке — Фаза 2
      </div>
    </div>
  )
}
