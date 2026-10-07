import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';

interface PrintableStatementProps {
  customer: {
    uid: string;
    displayName: string;
    username?: string;
    phone?: string;
    role: string;
    balance: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    description: string;
    recordedBy: string;
    createdAt: string;
    orderId: string | null;
    paymentId: string | null;
  }>;
  totalInvoices: number;
  totalPayments: number;
  balance: number;
}

export function PrintableStatement({
  customer,
  transactions,
  totalInvoices,
  totalPayments,
  balance,
}: PrintableStatementProps) {
  const printDate = new Date().toLocaleDateString('ar-YE', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  // Oldest first for standard accounting chronological flow in print
  const chronological = [...transactions].reverse();

  // Customer reference / code
  const customerCode = customer.phone
    ? customer.phone
    : `CUST-${customer.uid.slice(0, 8).toUpperCase()}`;

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-4 sm:p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* 1. Official Header (3 Columns: Store Info | Logo & Title | Date & Customer Code) */}
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
            كشف حساب مالي
          </span>
        </div>

        {/* Left Side: Statement Date & Customer ID */}
        <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 font-medium">التاريخ:</span>
            <span className="font-mono font-bold text-slate-900">{printDate}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500 font-medium">رقم العميل:</span>
            <span className="font-mono font-bold text-slate-900" dir="ltr">
              {customerCode}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Customer Information Bar (NO username, NO account type) */}
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">اسم العميل:</span>
          <span className="font-black text-slate-950 text-sm">{customer.displayName}</span>
        </div>
        {customer.phone && (
          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
            <span className="text-slate-500 font-sans text-[11px]" dir="rtl">
              الهاتف:
            </span>
            <span className="font-bold text-slate-800">{customer.phone}</span>
          </div>
        )}
      </div>

      {/* 3. Transactions Table (Directly below customer info) */}
      <table className="w-full text-right text-[11px] border-collapse border border-slate-400 mb-3">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
            <th className="border border-slate-300 py-2 px-2 text-center w-8">م</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">التاريخ</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-28">رقم الفاتورة / السند</th>
            <th className="border border-slate-300 py-2 px-2">البيان والتفاصيل</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">مدين (فاتورة)</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">دائن (سند قبض)</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-28">الرصيد (ر.ي)</th>
          </tr>
        </thead>
        <tbody>
          {chronological.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-slate-300 py-8 text-center text-slate-500 font-medium">
                لا توجد حركات مسجلة في هذا الكشف
              </td>
            </tr>
          ) : (
            chronological.map((t, idx) => {
              const isDebit = t.type === 'INVOICE';
              const docRef = isDebit
                ? t.orderId
                  ? `فاتورة #${t.orderId}`
                  : 'فاتورة مبيعات'
                : t.paymentId
                  ? `سند #${t.paymentId}`
                  : 'سند قبض';

              const dateStr = new Date(t.createdAt).toLocaleDateString('ar-YE', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              });

              return (
                <tr key={t.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono text-slate-800">
                    {dateStr}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-900">
                    {docRef}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-slate-800 font-medium">
                    {t.description}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-950">
                    {isDebit ? formatMoney(t.amount) : '-'}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold text-slate-950">
                    {!isDebit ? formatMoney(Math.abs(t.amount)) : '-'}
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-center font-mono font-black text-slate-950">
                    {formatMoney(t.newBalance)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-950">
          <tr>
            <td colSpan={4} className="border border-slate-300 py-2 px-3 text-right">
              الإجمالي العام
            </td>
            <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
              {formatMoney(totalInvoices)}
            </td>
            <td className="border border-slate-300 py-2 px-2 text-center font-mono font-bold">
              {formatMoney(totalPayments)}
            </td>
            <td className="border border-slate-300 py-2 px-2 text-center font-mono font-black">
              {formatMoney(balance)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 4. Balance in Words */}
      <div className="p-2 border border-slate-300 bg-slate-50/70 rounded text-xs mb-3 text-slate-900 font-medium">
        <span className="font-bold">الرصيد المستحق كتابةً: </span>
        <span className="font-bold">{tafqeetRials(balance)}</span>
      </div>

      {/* 5. 3-Day Notice (Strictly as requested) */}
      <div className="border border-slate-400 bg-slate-50 p-2 text-center rounded text-[11px] text-slate-900 font-bold mb-6">
        * تنبيه: فترة المراجعة والمطابقة لهذا الكشف هي خلال (3) أيام فقط من تاريخ صدوره، وما لم يرد أي اعتراض خطي خلال هذه المدة يُعتبر الحساب صحيحاً ومصادقاً عليه نهائياً.
      </div>

      {/* 6. Signatures Block */}
      <div className="grid grid-cols-3 gap-6 text-center text-xs mt-6 pt-2">
        <div>
          <span className="font-bold text-slate-800 block mb-10">المحاسب المسؤول</span>
          <div className="border-t border-dashed border-slate-400 mx-4 pt-1 text-slate-600 text-[11px]">
            التوقيع
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-800 block mb-10">إدارة المتجر / الختم</span>
          <div className="border-t border-dashed border-slate-400 mx-4 pt-1 text-slate-600 text-[11px]">
            الختم الرسمي
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-800 block mb-10">المستلم / العميل</span>
          <div className="border-t border-dashed border-slate-400 mx-4 pt-1 text-slate-600 text-[11px]">
            الاسم والتوقيع
          </div>
        </div>
      </div>
    </div>
  );
}
