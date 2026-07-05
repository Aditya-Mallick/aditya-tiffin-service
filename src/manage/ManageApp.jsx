import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Login from './Login'
import ProtectedRoute from './ProtectedRoute'
import ManageLayout from './ManageLayout'
import DailyList from './DailyList'
import Customers from './Customers'
import Payments from './Payments'
import Bills from './Billing'
import Menu from './Menu'
import Settings from './Settings'
import Users from './Users'

// Mounted at "/manage/*" — all routes here are relative to /manage.
export default function ManageApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />

        {/* Everything below requires a valid login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ManageLayout />}>
            <Route index element={<DailyList />} />
            <Route path="customers" element={<Customers />} />
            <Route path="payments" element={<Payments />} />
            <Route path="bills" element={<Bills />} />
            <Route path="menu" element={<Menu />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Route>

        {/* Unknown /manage/* path → daily list (or login if not signed in) */}
        <Route path="*" element={<Navigate to="/manage" replace />} />
      </Routes>
    </AuthProvider>
  )
}
