'use client';

import { Toaster as SonnerToaster } from 'sonner';

export const ToastProvider = () => {
  return (
    <SonnerToaster
      position="top-center"
      dir="rtl"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'inherit',
          direction: 'rtl',
          textAlign: 'right',
        },
      }}
    />
  );
};

export { toast } from 'sonner';

