import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Purge any legacy persistent localStorage session
    try {
      localStorage.removeItem('kwikstore_user');
    } catch (e) {}

    // Read volatile session storage (cleared automatically on window / app close)
    try {
      const saved = sessionStorage.getItem('kwikstore_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [lastCheckInMsg, setLastCheckInMsg] = useState(null);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        try {
          sessionStorage.setItem('kwikstore_user', JSON.stringify(data.user));
          localStorage.removeItem('kwikstore_user');
        } catch (e) {}
        setLastCheckInMsg(`Checked-in automatically to HRMS attendance for today.`);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server connection error. Ensure local server is running.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('kwikstore_user');
      localStorage.removeItem('kwikstore_user');
    } catch (e) {}
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    if (user.roleKey === 'SUPER_ADMIN') return true;
    return user.permissions && user.permissions.includes(permissionKey);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission, lastCheckInMsg, setLastCheckInMsg }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
