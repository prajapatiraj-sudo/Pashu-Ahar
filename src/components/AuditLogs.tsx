import React, { useState, useEffect } from 'react';
import { History, Search, User, Calendar, Info } from 'lucide-react';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  timestamp: string;
}

export default function AuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await api.audit.list();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entity_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'UPDATE': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'DELETE': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'PERMANENT_DELETE': return 'bg-black text-white border-black';
      case 'RESTORE': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const renderDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed === 'object' && parsed !== null) {
        // If it's an update with before/after
        if (parsed.before && parsed.after) {
          return (
            <div className="space-y-1">
              <div className="text-[10px] text-black/40 italic">Changes detected</div>
              <div className="flex flex-wrap gap-1">
                {Object.keys(parsed.after).map(key => {
                  if (JSON.stringify(parsed.before[key]) !== JSON.stringify(parsed.after[key])) {
                    return (
                      <span key={key} className="px-1.5 py-0.5 bg-black/5 rounded text-[10px]">
                        <span className="font-bold">{key}:</span> {String(parsed.before[key])} → {String(parsed.after[key])}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        }
        return <pre className="text-[10px] text-black/60 font-mono whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>;
      }
      return details;
    } catch {
      return details;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif italic font-bold flex items-center gap-3">
            <History className="text-[#FF6321]" />
            Change Log
          </h2>
          <p className="text-black/40 text-sm mt-1">Track all administrative actions and data changes</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={18} />
          <input 
            type="text" 
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:ring-2 focus:ring-[#FF6321] transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5">
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Timestamp</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">User</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Action</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Entity</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-black/40">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-black/40 italic">Loading logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-black/40 italic">No logs found</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">
                          {log.timestamp ? format(new Date(log.timestamp), 'dd MMM yyyy') : 'N/A'}
                        </span>
                        <span className="text-[10px] text-black/40">
                          {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                          <User size={12} className="text-black/40" />
                        </div>
                        <span className="text-sm font-medium">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-black/60">{log.entity_type}</span>
                        <span className="text-[10px] text-black/30">ID: {log.entity_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md overflow-hidden">
                        {renderDetails(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
