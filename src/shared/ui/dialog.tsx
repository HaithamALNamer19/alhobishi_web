'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
  hideCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className = '',
  hideCloseButton = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 p-3 sm:p-4 md:p-6 flex items-center justify-center">
      <div
        className={`w-full ${maxWidths[maxWidth]} ${className} bg-white rounded-2xl shadow-xl border border-slate-200 text-right relative animate-in zoom-in-95 duration-150 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain`}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 sm:p-6 relative">
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 sm:top-5 sm:left-5 text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-100 transition-colors z-10"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {title && (
            <div className="pl-9 sm:pl-10">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
          )}

          <div className={title ? 'mt-4' : ''}>{children}</div>
        </div>
      </div>
    </div>
  );
};

