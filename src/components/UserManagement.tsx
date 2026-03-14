import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { Shield, User, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateRole = async (uid: string, newRole: 'admin' | 'sales') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      setDeleteConfirm(null);
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
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif italic font-bold">User Management</h2>
            <p className="text-sm text-black/40 font-medium">Manage permissions and roles for your team</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321]">
            <Shield size={24} />
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-black/5">
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">User</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">Email</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30">Role</th>
                <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-black/30 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {users.map((user) => (
                <tr key={user.uid} className="group hover:bg-black/[0.02] transition-colors">
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
                        onClick={() => updateRole(user.uid, user.role === 'admin' ? 'sales' : 'admin')}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors text-black/40 hover:text-[#FF6321]"
                        title="Toggle Role"
                      >
                        <Shield size={18} />
                      </button>
                      
                      {deleteConfirm === user.uid ? (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => deleteUser(user.uid)}
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
                          onClick={() => setDeleteConfirm(user.uid)}
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

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 mb-1">Security Note</h4>
          <p className="text-sm text-amber-800/70 leading-relaxed">
            New users who sign in with Google are automatically assigned the <strong>Sales</strong> role. 
            Admins can elevate them to <strong>Admin</strong> status or revoke access here.
          </p>
        </div>
      </div>
    </div>
  );
}
