import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { login, loading } = useAuth();

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
        className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-black/5"
      >
        <div className="w-20 h-20 bg-[#FF6321] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#FF6321]/20">
          <LogIn className="text-white" size={40} />
        </div>
        
        <h1 className="text-4xl font-serif italic font-bold text-[#141414] mb-4">Krushnam</h1>
        <p className="text-black/40 mb-12 font-medium">Pashu Aahar Management System</p>
        
        <button 
          onClick={login}
          className="w-full flex items-center justify-center gap-4 bg-[#141414] text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-black/10 group"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          <span>Sign in with Google</span>
        </button>
        
        <p className="mt-8 text-xs text-black/30 leading-relaxed">
          Access restricted to authorized personnel only.<br />
          Please contact the administrator for access.
        </p>
      </motion.div>
    </div>
  );
}
