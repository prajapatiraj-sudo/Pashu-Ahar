import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSales: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as UserProfile);
        } else {
          // Create default profile for new users (as sales by default, unless it's the admin email)
          const isAdminEmail = firebaseUser.email === "rajkumar.prajapati@enjayworld.com";
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            role: isAdminEmail ? 'admin' : 'sales'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, name: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create profile
    const isAdminEmail = email === "rajkumar.prajapati@enjayworld.com";
    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: email,
      name: name,
      role: isAdminEmail ? 'admin' : 'sales'
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = profile?.role === 'admin';
  const isSales = profile?.role === 'sales' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, isAdmin, isSales }}>
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
