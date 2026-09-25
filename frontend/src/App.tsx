import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Chat } from './components/Chat';
import { Profile } from './components/Profile';
import { ChatRedirect } from './components/ChatRedirect';
import { LandingPage } from './components/LandingPage';
import { Library } from './components/Library';
import { Plans } from './components/Plans';

// Configure dynamic API URL resolution for production builds
// When VITE_API_URL is not set and frontend is served from the same container,
// use relative paths (empty string) so requests go to the same origin.
axios.interceptors.request.use((config) => {
  const rawApiUrl = import.meta.env.VITE_API_URL || '';
  const apiUrl = rawApiUrl.replace(/\/+$/, '');
  if (config.url && config.url.startsWith('http://localhost:5000')) {
    config.url = config.url.replace('http://localhost:5000', apiUrl);
  }
  return config;
});

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('psai_token'));
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Validate stored token and load user details on boot
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('psai_token');
      const storedUser = localStorage.getItem('psai_user');

      if (storedToken && storedUser) {
        try {
          // Set authorization header globally for convenience
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify with backend
          const response = await axios.get('http://localhost:5000/api/auth/me');
          if (response.data && response.data.user) {
            setUser(response.data.user);
            setToken(storedToken);
          } else {
            handleLogout();
          }
        } catch (error: any) {
          console.error('Failed to validate token on load:', error);
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            handleLogout();
          } else {
            // If server is unreachable (network error), keep the cached session for offline work
            try {
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
            } catch {
              handleLogout();
            }
          }
        }
      } else {
        handleLogout();
      }
      setAuthLoading(false);
    };

    validateToken();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('psai_token', newToken);
    localStorage.setItem('psai_user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('psai_token');
    localStorage.removeItem('psai_user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const handleUserUpdate = (newUser: any) => {
    setUser(newUser);
    localStorage.setItem('psai_user', JSON.stringify(newUser));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zen-dark flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
          <span className="text-xs font-sans mt-2">Inicializando ambiente de segurança...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Auth Routes */}
        <Route 
          path="/login" 
          element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!token ? <Register /> : <Navigate to="/dashboard" />} 
        />

        {/* Private Routes */}
        <Route 
          path="/dashboard" 
          element={token ? <ChatRedirect token={token} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chat" 
          element={token ? <ChatRedirect token={token} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/profile" 
          element={token ? <Profile token={token} user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chat/:sessionId" 
          element={token ? <Chat token={token} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/library" 
          element={token ? <Library token={token} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/plans" 
          element={token ? <Plans /> : <Navigate to="/login" />} 
        />

        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
