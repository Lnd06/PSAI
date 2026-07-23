import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Chat } from './components/Chat';
import { Onboarding } from './components/Onboarding';


export interface UserProfile {
  name: string;
  age: string;
  occupation: string;
  lifeContext: string;
  challenges: string;
  openRouterApiKey: string;
  aiModel: string;
  memories: string[];
}

const defaultProfile: UserProfile = {
  name: '',
  age: '',
  occupation: '',
  lifeContext: '',
  challenges: '',
  openRouterApiKey: '',
  aiModel: 'tencent/hy3:free',
  memories: []
};

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedRaw = localStorage.getItem('psai_profile');
        if (storedRaw) {
          const stored = JSON.parse(storedRaw);
          if (stored.name && stored.name.trim().length > 0) {
            setProfile(stored);
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(true);
          }
        } else {
          setNeedsOnboarding(true);
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
        setNeedsOnboarding(true);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    setNeedsOnboarding(false);
    try {
      localStorage.setItem('psai_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zen-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-zen-accent border-t-transparent animate-spin" />
          <span className="text-xs text-zen-textMuted font-sans">Carregando...</span>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding onComplete={handleUpdateProfile} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<Chat profile={profile} onUpdateProfile={handleUpdateProfile} />} 
        />
        <Route 
          path="/chat/:sessionId" 
          element={<Chat profile={profile} onUpdateProfile={handleUpdateProfile} />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
