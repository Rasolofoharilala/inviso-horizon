import { useState } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [showHome, setShowHome] = useState(false)

  return showHome ? (
    <HomePage onLogout={() => setShowHome(false)} />
  ) : (
    <LoginPage onLogin={() => setShowHome(true)} />
  )
}