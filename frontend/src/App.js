import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUserId = localStorage.getItem('userId');
    const savedUser = localStorage.getItem('user');
    
    if (savedUserId && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-white">
        <div className="w-10 h-10 border-4 border-white border-opacity-30 border-t-white rounded-full animate-spin"></div>
        <p className="text-lg font-medium m-0">Loading SecureChat...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      {user ? (
        <Chat user={user} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;