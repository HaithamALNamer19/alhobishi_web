import React from 'react';
import type { StoreSettings } from '../domain/store-settings';
import { DEFAULT_STORE_SETTINGS } from '../domain/store-settings';

interface PrintableStoreHeaderProps {
  title: string;
  storeSettings?: Partial<StoreSettings> | null;
  leftContent?: React.ReactNode;
}

export function PrintableStoreHeader({
  title,
  storeSettings,
  leftContent,
}: PrintableStoreHeaderProps) {
  const settings = { ...DEFAULT_STORE_SETTINGS, ...storeSettings };

  return (
    <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-center justify-between gap-4">
      {/* Right Side: Store Name, Location, Phones */}
      <div className="text-right space-y-1">
        <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
          {settings.storeName}
        </h1>
        {settings.showContactInPrint && (
          <>
            <p className="text-[11px] text-slate-700 font-medium">
              الموقع: {settings.address}
            </p>
            <p className="text-[11px] text-slate-700 font-mono font-semibold" dir="ltr">
              هاتف: {settings.phone}
              {settings.phoneSecondary ? ` | ${settings.phoneSecondary}` : ''}
            </p>
          </>
        )}
      </div>

      {/* Center: Store Logo & Document Title */}
      <div className="flex flex-col items-center justify-center text-center px-2">
        {settings.showLogoInPrint && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={settings.logoUrl || '/logo.jpg'}
            alt="شعار المتجر"
            className="w-16 h-16 object-contain rounded-md border border-slate-200"
          />
        )}
        <span className="text-xs font-black text-slate-950 mt-1 border-b border-slate-900 pb-0.5 whitespace-nowrap">
          {title}
        </span>
      </div>

      {/* Left Side: Custom details (Invoice / Voucher / Statement metadata) */}
      {leftContent}
    </div>
  );
}
