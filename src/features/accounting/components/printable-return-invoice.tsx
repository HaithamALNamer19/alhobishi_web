import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { RotateCcw } from 'lucide-react';

export interface PrintableReturnInvoiceProps {
  returnDoc: {
    id: string;
    returnNumber: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{
      productId: string;
      productName: string;
      variantId: string;
      variantLabel: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    totalAmount: number;
    reason: string | null;
    orderId: string | null;
    recordedBy: string;
    createdAt: string;
  };
}

export function PrintableReturnInvoice({ returnDoc }: PrintableReturnInvoiceProps) {
  const returnDate = new Date(returnDoc.createdAt);
  const formattedDate = !isNaN(returnDate.getTime())
    ? returnDate.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const totalQty = returnDoc.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-4 sm:p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-100 text-rose-800 rounded-lg">
                <RotateCcw className="w-5 h-5 text-rose-700" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                شركة الهبيشي للتجارة والاستيراد
              </h1>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">
              الجمهورية اليمنية - مبيعات الجملة والتجزئة
            </p>
            <p className="text-[10px] text-slate-500">
              سجل تجاري / تلفون: 777000000 | صنعاء
            </p>
          </div>

          <div className="text-left font-mono">
            <div className="inline-block bg-rose-50 border border-rose-300 text-rose-800 font-bold px-3 py-1 rounded-md text-sm mb-1">
              فاتورة مردود مبيعات
            </div>
            <div className="text-slate-700 text-[11px] font-bold">
              رقم الفاتورة:{' '}
              <span className="font-mono text-slate-900">{returnDoc.returnNumber}</span>
            </div>
            <div className="text-slate-500 text-[10px]">التاريخ: {formattedDate}</div>
          </div>
        </div>
      </div>

      {/* Customer Info Box */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-[11px]">
        <div>
          <span className="text-slate-500 font-bold">العميل: </span>
          <span className="font-black text-slate-900">{returnDoc.customerName}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold">رقم الهاتف: </span>
          <span className="font-mono text-slate-800">
            {returnDoc.customerPhone || 'غير مسجل'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 font-bold">مسجل المردود: </span>
          <span className="font-bold text-slate-800">{returnDoc.recordedBy}</span>
        </div>
        {returnDoc.reason && (
          <div>
            <span className="text-slate-500 font-bold">سبب الإرجاع: </span>
            <span className="font-medium text-slate-700">{returnDoc.reason}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full text-right border-collapse mb-4 text-[11px]">
        <thead>
          <tr className="bg-slate-100 text-slate-800 font-black border-y border-slate-300">
            <th className="py-2 px-2 text-center w-10">#</th>
            <th className="py-2 px-3">الصنف المسترجع</th>
            <th className="py-2 px-3 text-center w-24">المتغير</th>
            <th className="py-2 px-3 text-center w-20">الكمية</th>
            <th className="py-2 px-3 text-center w-24">سعر الوحدة</th>
            <th className="py-2 px-3 text-center w-28">الإجمالي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-800">
          {returnDoc.items.map((item, idx) => (
            <tr key={`${item.productId}-${item.variantId}-${idx}`}>
              <td className="py-2 px-2 text-center text-slate-500 font-mono">{idx + 1}</td>
              <td className="py-2 px-3 font-bold text-slate-900">{item.productName}</td>
              <td className="py-2 px-3 text-center font-medium text-slate-600">
                {item.variantLabel || 'الافتراضي'}
              </td>
              <td className="py-2 px-3 text-center font-mono font-bold">{item.quantity}</td>
              <td className="py-2 px-3 text-center font-mono">
                {formatMoney(item.unitPrice)}
              </td>
              <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                {formatMoney(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Box */}
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex justify-between items-center mb-6 text-[11px]">
        <div className="space-y-1">
          <div className="text-slate-600">
            إجمالي عدد الأصناف المسترجعة:{' '}
            <span className="font-mono font-bold text-slate-900">
              {returnDoc.items.length}
            </span>{' '}
            صنف (إجمالي {totalQty} وحدة)
          </div>
          <div className="text-slate-700 font-bold text-[10px]">
            المبلغ كتابةً:{' '}
            <span className="text-rose-800">{tafqeetRials(returnDoc.totalAmount)}</span>
          </div>
        </div>

        <div className="text-left">
          <span className="text-slate-500 font-bold block text-[10px]">
            إجمالي قيمة المردود
          </span>
          <span className="text-base font-black font-mono text-rose-700">
            {formatMoney(returnDoc.totalAmount)}
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-600">
        <div>
          <p className="font-bold mb-8">توقيع وأمين المستودع / الإدارة</p>
          <div className="border-b border-slate-400 w-36 mx-auto"></div>
        </div>
        <div>
          <p className="font-bold mb-8">توقيع العميل المستلم للرصيد</p>
          <div className="border-b border-slate-400 w-36 mx-auto"></div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="mt-8 text-center text-[9px] text-slate-400">
        تم قيد هذه الفاتورة كدائن في كشف حساب العميل وإعادة البضاعة إلى مخزون المتجر آلياً.
      </div>
    </div>
  );
}
