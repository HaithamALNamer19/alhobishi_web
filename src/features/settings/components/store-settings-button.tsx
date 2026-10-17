'use client';

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { StoreSettingsModal } from './store-settings-modal';
import type { StoreSettings } from '../domain/store-settings';

interface StoreSettingsButtonProps {
  initialSettings?: StoreSettings | null;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'header';
  size?: 'sm' | 'md';
  showText?: boolean;
}

export function StoreSettingsButton({
  initialSettings,
  className = '',
  variant = 'header',
  size = 'sm',
  showText = true,
}: StoreSettingsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-900 hover:bg-blue-800 text-white shadow-xs';
      case 'secondary':
        return 'bg-slate-800 hover:bg-slate-700 text-white shadow-xs';
      case 'outline':
        return 'border border-slate-300 hover:bg-slate-100 text-slate-700';
      case 'header':
      default:
        return 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200/80 hover:border-blue-200 shadow-2xs';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'md':
        return 'px-4 py-2.5 text-xs sm:text-sm';
      case 'sm':
      default:
        return 'px-3 py-2 text-xs';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer select-none ${getVariantStyles()} ${getSizeStyles()} ${className}`}
        title="إدارة اسم المتجر وكافة إعداداته وهويته"
      >
        <Settings className="w-4 h-4 text-blue-700 shrink-0 transition-transform hover:rotate-45" />
        {showText && <span>إعدادات المتجر</span>}
      </button>

      <StoreSettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialSettings={initialSettings}
      />
    </>
  );
}
