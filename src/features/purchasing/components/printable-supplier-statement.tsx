import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { cleanCustomerName } from '@/core/utils/clean-name';
import { PrintableStoreHeader } from '@/features/settings/components/printable-store-header';
import type { StoreSettings } from '@/features/settings/domain/store-settings';

interface PrintableSupplierStatementProps {
  supplier: {
    id: string;
    name: string;
    company_name?: string;
    phone?: string;
    balance?: number;
  };
  transactions?: Array<{
    id: string;
    type: string;
    amount: number;
    debit: number;
    credit: number;
    balance_after: number;
    description: string;
    reference_number?: string | null;
    createdAt: string | Date;
  }>;
  totalPurchases?: number;
  totalPayments?: number;
  totalReturns?: number;
  netBalance?: number;
  storeSettings?: Partial<StoreSettings> | null;
}

export function PrintableSupplierStatement({
  supplier,
  transactions = [],
  totalPurchases = 0,
  totalPayments = 0,
  totalReturns = 0,
  netBalance = 0,
  storeSettings,
}: PrintableSupplierStatementProps) {
  const printDate = new Date().toLocaleDateString('ar-YE', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  const safePurchases = Number(totalPurchases) || 0;
  const safePayments = Number(totalPayments) || 0;
  const safeReturns = Number(totalReturns) || 0;
  const safeNetBalance = Number(netBalance) || 0;

  // Oldest first for standard accounting chronological flow in print
  const chronological = [...(transactions || [])].sort((a, b) => {
    const da = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const db = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return da.getTime() - db.getTime();
  });

  const totalDebits = safePayments + safeReturns;

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-4 sm:p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* 1. Official Header */}
      <PrintableStoreHeader
        title="كشف حساب مورد مالي تفصيلي"
        storeSettings={storeSettings}
        leftContent={
          <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-medium">تاريخ الكشف:</span>
              <span className="font-mono font-bold text-slate-900">{printDate}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 font-medium">معرف المورد:</span>
              <span className="font-mono font-bold text-slate-900" dir="ltr">
                SUP-{(supplier?.id || '').slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
        }
      />

      {/* 2. Supplier Details Block */}
      <div className="bg-slate-50 border border-slate-300 rounded p-3 mb-3 text-[11px]">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 block font-medium mb-1">اسم المورد:</span>
            <strong className="text-slate-950 text-xs block font-bold">
              {cleanCustomerName(supplier?.name || '')}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block font-medium mb-1">الشركة / المؤسسة:</span>
            <span className="text-slate-900 font-semibold block text-xs">
              {supplier.company_name || 'بدون شركة'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium mb-1">رقم الهاتف / الواتساب:</span>
            <div className="flex items-center text-right">
              <span className="text-slate-900 font-mono font-bold text-xs" dir="ltr">
                {supplier.phone || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* 4. Transactions Table */}
      <div className="border border-slate-300 rounded overflow-hidden mb-6">
        <table className="w-full text-right text-[11px] border-collapse">
          <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-center">
            <tr>
              <th className="p-2 border-l border-slate-200 w-8">#</th>
              <th className="p-2 border-l border-slate-200 w-24">التاريخ</th>
              <th className="p-2 border-l border-slate-200 w-28">نوع المستند</th>
              <th className="p-2 border-l border-slate-200 w-28">رقم المرجع</th>
              <th className="p-2 border-l border-slate-200 text-right">البيان والملاحظات</th>
              <th className="p-2 border-l border-slate-200 w-24">دائن (شراء)</th>
              <th className="p-2 border-l border-slate-200 w-24">مدين (سداد/مردود)</th>
              <th className="p-2 w-28">الرصيد (ر.ي)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {chronological.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا توجد أي حركات مالية أو فواتير مسجلة في كشف حساب المورد حتى الآن.
                </td>
              </tr>
            ) : (
              chronological.map((t, idx) => {
                const dateObj = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('ar-YE', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                    })
                  : '-';

                const typeLabel =
                  t.type === 'PURCHASE'
                    ? 'فاتورة شراء'
                    : t.type === 'PAYMENT'
                      ? 'سند صرف'
                      : t.type === 'PURCHASE_RETURN'
                        ? 'مردود مشتريات'
                        : 'رصيد افتتاحي';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="p-2 border-l border-slate-200 text-center font-mono font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-center font-mono whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-center font-bold text-slate-900">
                      {typeLabel}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-center font-mono font-bold text-slate-700" dir="ltr">
                      {t.reference_number || '-'}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-slate-800 text-right font-medium">
                      {t.description}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-center font-mono font-bold text-slate-900">
                      {t.credit > 0 ? formatMoney(t.credit) : '-'}
                    </td>
                    <td className="p-2 border-l border-slate-200 text-center font-mono font-bold text-blue-700">
                      {t.debit > 0 ? formatMoney(t.debit) : '-'}
                    </td>
                    <td
                      className={`p-2 text-center font-mono font-black ${
                        t.balance_after > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatMoney(t.balance_after)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-center">
            <tr>
              <td colSpan={5} className="p-2 border-l border-slate-200 text-right font-black">
                الإجماليات الكلية:
              </td>
              <td className="p-2 border-l border-slate-200 font-mono font-black text-slate-950">
                {formatMoney(safePurchases)}
              </td>
              <td className="p-2 border-l border-slate-200 font-mono font-black text-blue-900">
                {formatMoney(totalDebits)}
              </td>
              <td
                className={`p-2 font-mono font-black ${
                  safeNetBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {formatMoney(safeNetBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 5. Signatures Block */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-300 text-center">
        <div>
          <span className="block text-[11px] font-bold text-slate-600 mb-8">
            توقيع المورد بالمطابقة والموافقة
          </span>
          <div className="border-b border-slate-300 w-36 mx-auto"></div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-600 mb-8">
            محاسب المشتريات والمخازن
          </span>
          <div className="border-b border-slate-300 w-36 mx-auto"></div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-600 mb-8">
            إدارة {storeSettings?.shortName || storeSettings?.storeName || 'متجر الحبيشي للتجارة'}
          </span>
          <div className="border-b border-slate-300 w-36 mx-auto"></div>
        </div>
      </div>

      {/* 6. Footer Note */}
      <div className="mt-8 pt-2 text-center text-[10px] text-slate-400">
        {storeSettings?.statementNotes || 'حرر هذا الكشف آلياً لمراجعة ومطابقة الحسابات المالية بين متجر الحبيشي للتجارة والمورد المذكور أعلاه.'}
      </div>
    </div>
  );
}

