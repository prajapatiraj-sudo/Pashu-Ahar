import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSales: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.auth.me();
          setUser(userData);
          setProfile({
            uid: userData.id.toString(),
            email: userData.email,
            name: userData.name || '',
            role: userData.role as 'admin' | 'sales'
          });
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: userData } = await api.auth.login({ email, password });
    localStorage.setItem('token', token);
    setUser(userData);
    setProfile({
      uid: userData.id.toString(),
      email: userData.email,
      name: userData.name || '',
      role: userData.role as 'admin' | 'sales'
    });
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const isSales = profile?.role === 'sales' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin, isSales }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
