import React, { useState } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { ConfirmModal } from './ui/Modal';

export default function BackupRestore() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showConfirmImport, setShowConfirmImport] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setStatus({ type: 'info', message: t('preparingBackup') });
    
    try {
      const backupData = await api.backup.export();
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `krushnam_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: t('backupSuccess') });
    } catch (error) {
      console.error('Export error:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : t('backupError') 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const processImport = async (file: File) => {
    setIsImporting(true);
    setStatus({ type: 'info', message: t('importingData') });

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await api.backup.import(data);

      setStatus({ type: 'success', message: t('restoreSuccess') });
    } catch (error) {
      console.error('Import error:', error);
      setStatus({ type: 'error', message: t('restoreError') });
    } finally {
      setIsImporting(false);
      setPendingFile(null);
    }
  };

  const handleImportClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirmImport(true);
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ConfirmModal
        isOpen={showConfirmImport}
        onClose={() => {
          setShowConfirmImport(false);
          setPendingFile(null);
        }}
        onConfirm={() => pendingFile && processImport(pendingFile)}
        title={t('restoreData')}
        message="WARNING: Importing data will overwrite existing records with the same IDs. This action cannot be undone. Do you want to proceed?"
        confirmText="Proceed with Import"
        type="danger"
      />
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-black/5">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6321]/10 flex items-center justify-center text-[#FF6321]">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif italic font-bold">{t('backupRestore')}</h2>
            <p className="text-sm text-black/40 font-medium">{t('backupRestoreSubtitle')}</p>
          </div>
        </div>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 mb-8",
              status.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
              status.type === 'error' ? "bg-rose-50 text-rose-600 border border-rose-100" :
              "bg-indigo-50 text-indigo-600 border border-indigo-100"
            )}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : 
             status.type === 'error' ? <AlertTriangle size={20} /> : 
             <Loader2 size={20} className="animate-spin" />}
            <span className="font-medium text-sm">{status.message}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export Section */}
          <div className="p-8 rounded-3xl bg-black/[0.02] border border-black/5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-6">
              <Download size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('createBackup')}</h3>
            <p className="text-sm text-black/40 mb-8 leading-relaxed">
              {t('backupDescription')}
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              {isExporting ? t('recording') + '...' : t('downloadBackup')}
            </button>
          </div>

          {/* Import Section */}
          <div className="p-8 rounded-3xl bg-black/[0.02] border border-black/5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-600 mb-6">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('restoreData')}</h3>
            <p className="text-sm text-black/40 mb-8 leading-relaxed">
              {t('restoreDescription')}
            </p>
            <label className={cn(
              "w-full bg-white border-2 border-dashed border-black/10 text-black/60 py-4 rounded-2xl font-bold cursor-pointer hover:border-[#FF6321] hover:text-[#FF6321] transition-all flex items-center justify-center gap-2",
              (isExporting || isImporting) && "opacity-50 cursor-not-allowed"
            )}>
              <Upload size={20} />
              <span>{isImporting ? t('recording') + '...' : t('selectBackupFile')}</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportClick}
                disabled={isExporting || isImporting}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="font-bold text-rose-900 mb-1">{t('securityWarning')}</h4>
          <p className="text-sm text-rose-800/70 leading-relaxed">
            {t('securityNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
