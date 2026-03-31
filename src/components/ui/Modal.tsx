import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn("bg-white w-full rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden", maxWidth)}
          >
            <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-xl font-serif italic font-bold">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-2xl transition-colors text-black/40 hover:text-black">
                <X size={24} />
              </button>
            </div>
            <div className="p-8">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'warning'
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-6",
          type === 'danger' ? "bg-rose-50 text-rose-600" : 
          type === 'warning' ? "bg-amber-50 text-amber-600" : 
          "bg-indigo-50 text-indigo-600"
        )}>
          {type === 'danger' ? <AlertTriangle size={32} /> : 
           type === 'warning' ? <AlertTriangle size={32} /> : 
           <Info size={32} />}
        </div>
        <p className="text-black/60 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="grid grid-cols-2 gap-4 w-full">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-bold bg-black/5 hover:bg-black/10 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all",
              type === 'danger' ? "bg-rose-600 hover:bg-rose-700" : 
              type === 'warning' ? "bg-amber-600 hover:bg-amber-700" : 
              "bg-[#141414] hover:bg-black"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function AlertModal({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-6",
          type === 'success' ? "bg-emerald-50 text-emerald-600" : 
          type === 'error' ? "bg-rose-50 text-rose-600" : 
          "bg-indigo-50 text-indigo-600"
        )}>
          {type === 'success' ? <CheckCircle2 size={32} /> : 
           type === 'error' ? <AlertTriangle size={32} /> : 
           <Info size={32} />}
        </div>
        <p className="text-black/60 mb-8 leading-relaxed">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-bold bg-[#141414] text-white shadow-lg hover:bg-black transition-all"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
