import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import type { SerializedReturnDetail } from '../actions/ledger.actions';

interface PrintableReturnInvoiceProps {
  returnDoc: SerializedReturnDetail['returnDoc'];
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

export function PrintableReturnInvoice({ returnDoc }: PrintableReturnInvoiceProps) {
  const returnDate = new Date(returnDoc.createdAt).toLocaleDateString('ar-YE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalPieces = returnDoc.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="w-full max-w-[210mm] mx-auto p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed" dir="rtl">
      {/* Official Header (3 Columns: Store Info | Logo & Title | Return Details) */}
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
          <span className="text-xs font-black text-rose-950 mt-1 border-b-2 border-rose-600 pb-0.5 whitespace-nowrap">
            فاتورة مردود مبيعات معتمدة
          </span>
        </div>

        {/* Left Side: Return Document Details */}
        <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">رقم المردود:</span>
            <span className="font-mono font-bold text-rose-900 text-[11px]">{returnDoc.returnNumber}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">تاريخ الإصدار:</span>
            <span className="font-mono font-bold text-slate-800">{returnDate}</span>
          </div>
          {returnDoc.orderId && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-medium">الطلب المرجعي:</span>
              <span className="font-mono font-bold text-slate-700">{returnDoc.orderId}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">طبيعة الحركة:</span>
            <span className="font-bold text-rose-900">إرجاع مخزني ودائن</span>
          </div>
        </div>
      </div>

      {/* Customer Information Bar */}
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">المقيد لحساب العميل:</span>
          <span className="font-black text-slate-950 text-sm">{returnDoc.customerName}</span>
        </div>
        {returnDoc.customerPhone && (
          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
            <span className="text-slate-500 font-sans text-[11px]" dir="rtl">
              الهاتف:
            </span>
            <span className="font-bold text-slate-800">{returnDoc.customerPhone}</span>
          </div>
        )}
      </div>

      {/* Reason Box */}
      {returnDoc.reason && (
        <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900 text-[11px] mb-3 flex items-center gap-2">
          <span className="font-bold shrink-0">سبب المردود:</span>
          <span>{returnDoc.reason}</span>
        </div>
      )}

      {/* Returned Items Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-right text-[11px]">
          <thead className="bg-rose-50/80 text-rose-950 font-bold border-b border-rose-200">
            <tr>
              <th className="py-2 px-2.5 text-center w-8">#</th>
              <th className="py-2 px-2.5">اسم الصنف المردود / البيان</th>
              <th className="py-2 px-2.5 w-32">المواصفات / المتغير</th>
              <th className="py-2 px-2.5 text-center w-20">الكمية المردودة</th>
              <th className="py-2 px-2.5 text-center w-28">سعر الوحدة (ر.ي)</th>
              <th className="py-2 px-2.5 text-left w-32">الإجمالي (ر.ي)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {returnDoc.items.map((item, idx) => {
              const subtotal = item.subtotal ?? (item.unitPrice * item.quantity);
              return (
                <tr key={item.variantId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="py-2 px-2.5 text-center font-mono text-slate-500 text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 font-bold text-slate-900">
                    {item.productName}
                  </td>
                  <td className="py-2 px-2.5 text-slate-600 text-[10px]">
                    {item.variantLabel || '-'}
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono font-bold text-rose-900">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono text-slate-700">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="py-2 px-2.5 text-left font-mono font-bold text-slate-950">
                    {formatMoney(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
            <tr>
              <td colSpan={3} className="py-2 px-2.5 text-right">
                إجمالي الأصناف المردودة ({returnDoc.items.length} صنف / {totalPieces} قطعة)
              </td>
              <td colSpan={2} className="py-2 px-2.5 text-center font-bold">
                صافي مردود المبيعات المعتمد:
              </td>
              <td className="py-2 px-2.5 text-left font-mono font-black text-sm text-rose-950">
                {formatMoney(returnDoc.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tafqeet */}
      <div className="space-y-2 mb-6">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-medium">
          <span className="text-slate-500">المبلغ المقيد كتابةً: </span>
          <span className="font-bold text-slate-950">{tafqeetRials(returnDoc.totalAmount)}</span>
        </div>
      </div>

      {/* Terms & Signatures */}
      <div className="border-t border-slate-200 pt-4 mt-6">
        <p className="text-[10px] text-slate-600 mb-6 text-center font-medium">
          * تم استلام وفحص البضاعة المردودة وإعادتها فعلياً إلى المخزون، وخُصمت قيمتها دائنًا من مديونية العميل في كشف الحساب.
        </p>

        <div className="grid grid-cols-3 gap-4 text-center text-[11px]" dir="rtl">
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">أمين المستودع (المستلم)</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              {formatSignatoryName(returnDoc.recordedBy, 'أمين المستودع')}
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              التوقيع والاستلام
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">الاعتماد والختم</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              مدير المتجر
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              الختم الرسمي
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">العميل (المسلّم)</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              {formatSignatoryName(returnDoc.customerName, 'العميل')}
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              توقيع العميل
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

