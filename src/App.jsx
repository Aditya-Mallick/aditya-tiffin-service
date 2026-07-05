import { Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import LandingPage from './pages/LandingPage'
import ManageApp from './manage/ManageApp'

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* Public marketing site */}
        <Route path="/" element={<LandingPage />} />
        {/* Private management app (login-protected) */}
        <Route path="/manage/*" element={<ManageApp />} />
      </Routes>
    </LanguageProvider>
  )
}
