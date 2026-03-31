import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import { Shield, User, Trash2, CheckCircle, XCircle, UserPlus, Mail, Key, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertModal } from './ui/Modal';

export default function UserManagement() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'sales' as const });
  const [isCreating, setIsCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.users.list();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.users.create(newUser);
      setShowAddModal(false);
      setNewUser({ email: '', password: '', name: '', role: 'sales' });
      setAlert({ type: 'success', title: 'Success', message: 'User created successfully' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setAlert({ type: 'error', title: 'Error', message: error.message || 'Failed to create user' });
    } finally {
      setIsCreating(false);
    }
  };

  const updateRole = async (id: string | number, newRole: 'admin' | 'sales') => {
    try {
      await api.users.update(id, { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (id: string | number) => {
    try {
      await api.users.delete(id);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6321]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type}
      />

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif italic font-bold">{t('userManagement')}</h2>
            <p className="text-sm text-black/40 font-medium">{t('manageTeam')}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all"
          >
            <UserPlus size={20} />
            Add User
          </button>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-black/5">
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">{t('user')}</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">{t('email')}</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">{t('role')}</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-black/[0.02] transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-black/40">
                        <User size={20} />
                      </div>
                      <span className="font-bold">{user.name || 'No Name'}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-black/60 font-medium">{user.email}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      user.role === 'admin' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => updateRole(user.id, user.role === 'admin' ? 'sales' : 'admin')}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/40 hover:text-[#FF6321]"
                        title="Toggle Role"
                      >
                        <Shield size={18} />
                      </button>
                      
                      {deleteConfirm === user.id ? (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => deleteUser(user.id)}
                            className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                            title="Confirm Delete"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(null)}
                            className="p-2 bg-black/5 text-black/40 rounded-lg hover:bg-black/10 transition-colors"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirm(user.id)}
                          className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-black/40 hover:text-rose-500"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 bg-black text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-serif italic font-bold">Add New User</h3>
                  <p className="text-white/40 text-sm">Create a new team member account</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        required
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        required
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-1">Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
                      <input
                        required
                        type="password"
                        minLength={6}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321]"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-1">Initial Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewUser({ ...newUser, role: 'sales' })}
                        className={cn(
                          "py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                          newUser.role === 'sales' ? "border-[#FF6321] bg-[#FF6321]/5 text-[#FF6321]" : "border-black/5 text-black/40 hover:border-black/10"
                        )}
                      >
                        Sales
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                        className={cn(
                          "py-3 rounded-2xl text-sm font-bold border-2 transition-all",
                          newUser.role === 'admin' ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-black/5 text-black/40 hover:border-black/10"
                        )}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-[#FF6321] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#e5591e] transition-all disabled:opacity-50"
                >
                  {isCreating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <UserCheck size={20} />
                      Create Account
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 mb-1">Security Note</h4>
          <p className="text-sm text-amber-800/70 leading-relaxed">
            Admins can manually create user accounts here. All users must be registered by an administrator to access the system.
          </p>
        </div>
      </div>
    </div>
  );
}
