import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import type { SerializedPaymentDetail } from '../actions/ledger.actions';

interface PrintableReceiptProps {
  payment: SerializedPaymentDetail['payment'];
}

function formatSignatoryName(name: string | null | undefined, fallback: string): string {
  if (!name || !name.trim()) return fallback;
  const trimmed = name.trim();
  if (trimmed.includes('@')) {
    const userPart = trimmed.split('@')[0].toLowerCase();
    if (userPart === 'admin') return 'مدير المتجر';
    if (userPart.includes('prep') || userPart.includes('warehouse')) return 'أمين المستودع';
    return fallback;
  }
  if (!trimmed.includes(' ') && trimmed.length >= 20) {
    return fallback;
  }
  if (trimmed.toLowerCase() === 'admin') {
    return 'مدير المتجر';
  }
  return trimmed;
}

export function PrintableReceipt({ payment }: PrintableReceiptProps) {
  const receiptDate = new Date(payment.createdAt).toLocaleDateString('ar-YE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const methodLabel =
    payment.method === 'CASH'
      ? 'نقدًا'
      : payment.method === 'TRANSFER'
        ? 'حوالة بنكية / صرافة'
        : 'أخرى';

  return (
    <div className="w-full max-w-[210mm] mx-auto p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed" dir="rtl">
      {/* Official Header (3 Columns: Store Info | Logo & Title | Receipt Details) */}
      <div className="border-b-2 border-slate-900 pb-3 mb-3 flex items-center justify-between gap-4">
        {/* Right Side: Store Name, Location, Phones */}
        <div className="text-right space-y-1">
          <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
            متجر الحبيشي للتجارة والتوزيع
          </h1>
          <p className="text-[11px] text-slate-700 font-medium">
            الموقع: حضرموت - الشحر - سوق شبام
          </p>
          <p className="text-[11px] text-slate-700 font-mono font-semibold" dir="ltr">
            هاتف: 781836479
          </p>
        </div>

        {/* Center: Store Logo & Document Title */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt="شعار المتجر"
            className="w-16 h-16 object-contain rounded-md border border-slate-200"
          />
          <span className="text-xs font-black text-slate-950 mt-1 border-b border-slate-900 pb-0.5 whitespace-nowrap">
            سند قبض مالي
          </span>
        </div>

        {/* Left Side: Receipt Details */}
        <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">رقم السند:</span>
            <span className="font-mono font-bold text-slate-900 text-[11px]">
              {payment.referenceNumber || payment.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">التاريخ:</span>
            <span className="font-mono font-bold text-slate-800">{receiptDate}</span>
          </div>
        </div>
      </div>

      {/* Amount Callout Box */}
      <div className="flex items-center justify-between p-4 bg-emerald-50/70 border-2 border-emerald-500/40 rounded-2xl mb-5">
        <div>
          <span className="text-[11px] font-bold text-emerald-900 block">المبلغ المقبوض:</span>
          <span className="text-2xl font-black font-mono text-emerald-950">
            {formatMoney(payment.amount)}
          </span>
        </div>
        <div className="text-left">
          <span className="text-[11px] font-bold text-slate-500 block">طريقة القبض:</span>
          <span className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200 inline-block mt-0.5">
            {methodLabel}
          </span>
        </div>
      </div>

      {/* Detailed Receipt Body */}
      <div className="border border-slate-300 rounded-xl p-4 space-y-3 bg-slate-50/50 mb-6 text-xs">
        <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
          <span className="text-slate-500 min-w-28 font-medium">وصلنا من السيد / الأخ:</span>
          <span className="font-black text-slate-900 text-sm">{payment.customerName}</span>
          {payment.customerPhone && (
            <span className="text-slate-500 font-mono text-[11px] mr-auto" dir="ltr">
              ({payment.customerPhone})
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
          <span className="text-slate-500 min-w-28 font-medium">مبلغ وقدره:</span>
          <span className="font-bold text-slate-900">{tafqeetRials(payment.amount)}</span>
        </div>

        {payment.referenceNumber && (
          <div className="flex items-baseline gap-2 border-b border-slate-200 pb-2">
            <span className="text-slate-500 min-w-28 font-medium">رقم الإشعار / الحوالة:</span>
            <span className="font-mono font-bold text-blue-900">{payment.referenceNumber}</span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-slate-500 min-w-28 font-medium">وذلك مقابل:</span>
          <span className="text-slate-800 font-medium">
            {payment.notes || 'تسديد دفعة مالية وقيدها لصالح حساب العميل لدى متجر الحبيشي'}
          </span>
        </div>
      </div>

      {/* Signatures Block */}
      <div className="border-t border-slate-200 pt-5 mt-8">
        <div className="grid grid-cols-3 gap-4 text-center text-[11px]" dir="rtl">
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">المحصل / أمين الصندوق</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              {formatSignatoryName(payment.recordedBy, 'المحاسب')}
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              التوقيع
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">ختم المتجر الرسمي</span>
            <span className="text-[10px] text-transparent block min-h-[1.5rem] mb-6">-</span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              الختم
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">المسلم</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              {formatSignatoryName(payment.customerName, 'العميل')}
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              توقيع المسلّم
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

