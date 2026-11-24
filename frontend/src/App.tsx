import { useState } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [showHome, setShowHome] = useState(true)

  return showHome ? (
    <HomePage onLogout={() => setShowHome(false)} />
  ) : (
    <LoginPage />
  )
}