import Navbar from './components/Navbar' 
import HomePage from './pages/HomePage'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'

import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import { useThemeStore } from './store/useThemeStore'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'


import { Toaster } from 'react-hot-toast'
import { useCallStore } from './store/useCallStore'
import { CallUI } from './components/CallUI'




const App = () => {

  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore()
  const { theme, setTheme } = useThemeStore();
  const { setupSignaling } = useCallStore();

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('chat-theme');
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (authUser && socket) {
      setupSignaling();
    }
  }, [authUser, socket, setupSignaling]);

  console.log({authUser});

  if(isCheckingAuth && !authUser)
    return (  
    <div className='flex items-center justify-center h-screen'>
      <span className="loading loading-ring loading-xl"></span>
    </div>
    )

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path='/' element={authUser ? <HomePage /> : <Navigate to='/login' />} />
        <Route path='/signup' element={!authUser ? <SignUpPage /> : <Navigate to='/' />} />
        <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to='/' />} />
        <Route path='/settings' element={ <SettingsPage />} />
        <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to='/login' />} />
      </Routes>

      <Toaster />
      <CallUI />
    </div>
  )
}

export default App