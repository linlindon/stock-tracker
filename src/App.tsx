import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Holdings from './pages/Holdings'
import Transactions from './pages/Transactions'
import RealizedPL from './pages/RealizedPL'
import TradePairs from './pages/TradePairs'
import StockDetail from './pages/StockDetail'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">載入中...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">載入中...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="holdings/:symbol" element={<StockDetail />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="realized-pl" element={<RealizedPL />} />
          <Route path="trade-pairs" element={<TradePairs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
