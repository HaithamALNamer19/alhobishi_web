import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { cleanCustomerName } from '@/core/utils/clean-name';
import { PrintableStoreHeader } from '@/features/settings/components/printable-store-header';
import type { StoreSettings } from '@/features/settings/domain/store-settings';

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
    returnId?: string | null;
  }>;
  totalInvoices: number;
  totalPayments: number;
  totalReturns?: number;
  balance: number;
  storeSettings?: Partial<StoreSettings> | null;
}

export function PrintableStatement({
  customer,
  transactions,
  totalInvoices,
  totalPayments,
  totalReturns = 0,
  balance,
  storeSettings,
}: PrintableStatementProps) {
  const printDate = new Date().toLocaleDateString('ar-YE', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  // Oldest first for standard accounting chronological flow in print
  const chronological = [...transactions].reverse();

  // Customer reference / code
  const customerCode = `CUST-${customer.uid.slice(0, 8).toUpperCase()}`;

  const totalCredits = totalPayments + totalReturns;

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-4 sm:p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* 1. Official Header (3 Columns: Store Info | Logo & Title | Date & Customer Code) */}
      <PrintableStoreHeader
        title="كشف حساب مالي"
        storeSettings={storeSettings}
        leftContent={
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
            {customer.phone && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 font-medium">هاتف العميل:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {customer.phone}
                </span>
              </div>
            )}
          </div>
        }
      />

      {/* 2. Customer Information Bar */}
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">اسم العميل:</span>
          <span className="font-black text-slate-950 text-sm">{cleanCustomerName(customer.displayName)}</span>
        </div>
      </div>

      {/* 3. Transactions Table */}
      <table className="w-full text-right text-[11px] border-collapse border border-slate-400 mb-3">
        <thead>
          <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
            <th className="border border-slate-300 py-2 px-2 text-center w-8">م</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">التاريخ</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-32">المستند / المرجع</th>
            <th className="border border-slate-300 py-2 px-2">البيان والتفاصيل</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">مدين (فاتورة)</th>
            <th className="border border-slate-300 py-2 px-2 text-center w-24">دائن (سداد/مردود)</th>
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
              const isReturn = t.type === 'RETURN';
              const docRef = isDebit
                ? t.orderId
                  ? `فاتورة #${t.orderId}`
                  : 'فاتورة مبيعات'
                : isReturn
                  ? t.returnId
                    ? `مردود #${t.returnId}`
                    : 'مردود مبيعات'
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
              {formatMoney(totalCredits)}
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

      {/* 5. 3-Day Notice */}
      <div className="border border-slate-400 bg-slate-50 p-2 text-center rounded text-[11px] text-slate-900 font-bold mb-6">
        * {storeSettings?.statementNotes || 'تنبيه: فترة المراجعة والمطابقة لهذا الكشف هي خلال (3) أيام فقط من تاريخ صدوره، وما لم يرد أي اعتراض خطي خلال هذه المدة يُعتبر الحساب صحيحاً ومصادقاً عليه نهائياً.'}
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
