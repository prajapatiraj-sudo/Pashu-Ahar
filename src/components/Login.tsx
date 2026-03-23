import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const { login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Google Sign-in failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase Console. Please enable it or use Google Sign-in.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6321]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-black/5"
      >
        <div className="w-20 h-20 bg-[#FF6321] rounded-3xl flex flex-col items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FF6321]/20">
          <span className="text-white font-bold text-2xl leading-none">કૃ</span>
          <LogIn className="text-white/80" size={20} />
        </div>
        
        <h1 className="text-4xl font-serif italic font-bold text-[#141414] mb-1">Krushnam</h1>
        <div className="text-xl font-gujarati font-bold text-[#FF6321] mb-2">કૃષ્ણમ પશુ આહાર</div>
        <p className="text-black/40 mb-8 font-medium">Management System</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                  <input 
                    required
                    type="text"
                    placeholder="Enter your name"
                    className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input 
                required
                type="email"
                placeholder="name@example.com"
                className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-black/5 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6321] transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100">
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-[#141414] text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px bg-black/5 flex-1"></div>
          <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Or</span>
          <div className="h-px bg-black/5 flex-1"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-black/10 text-black/60 py-4 rounded-2xl font-bold hover:bg-black/5 transition-all"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span>Sign in with Google</span>
        </button>

        <div className="mt-8 pt-8 border-t border-black/5">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-bold text-[#FF6321] hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
        
        <p className="mt-8 text-[10px] text-black/30 leading-relaxed uppercase tracking-widest font-bold">
          Authorized Personnel Only
        </p>
      </motion.div>
    </div>
  );
}
