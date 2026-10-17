import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import type { SerializedPurchaseReturn } from './purchase-returns-manager';

export interface PrintablePurchaseReturnInvoiceProps {
  returnDoc: SerializedPurchaseReturn;
}

export function PrintablePurchaseReturnInvoice({
  returnDoc,
}: PrintablePurchaseReturnInvoiceProps) {
  const returnDate = new Date(returnDoc.return_date || returnDoc.createdAt);
  const formattedDate = !isNaN(returnDate.getTime())
    ? returnDate.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : returnDoc.return_date;

  const totalPieces = (returnDoc.items || []).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* Official Header (3 Columns: Store Info | Logo & Title | Invoice Details) */}
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
            سند مردود مشتريات معتمد
          </span>
        </div>

        {/* Left Side: Return Details */}
        <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">رقم السند:</span>
            <span className="font-mono font-bold text-slate-900 text-[11px]">
              {returnDoc.return_number}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">تاريخ الإرجاع:</span>
            <span className="font-mono font-bold text-slate-800">{formattedDate}</span>
          </div>
          {returnDoc.purchase_id && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 font-medium">المرجع:</span>
              <span className="font-mono font-bold text-slate-800 text-[10px]">
                {returnDoc.purchase_id}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">نوع المستند:</span>
            <span className="font-bold text-slate-900">مردود مشتريات</span>
          </div>
        </div>
      </div>

      {/* Supplier Information Bar */}
      <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-300 rounded mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">المورد:</span>
          <span className="font-black text-slate-950 text-sm">
            {returnDoc.supplier_name}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-right text-[11px]">
          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
            <tr>
              <th className="py-2 px-2.5 text-center w-8">#</th>
              <th className="py-2 px-2.5">اسم الصنف / البيان</th>
              <th className="py-2 px-2.5 text-center w-24">الكمية المرتجعة</th>
              <th className="py-2 px-2.5 text-center w-28">سعر التكلفة</th>
              <th className="py-2 px-2.5 text-left w-32">الإجمالي (ر.ي)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(returnDoc.items || []).map((item, idx) => {
              const subtotal = item.quantity * item.cost_price;
              return (
                <tr
                  key={item.product_id || idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                >
                  <td className="py-2 px-2.5 text-center font-mono text-slate-500 text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 font-bold text-slate-900">
                    {item.product_name || 'صنف'}
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono font-bold text-rose-700">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2.5 text-center font-mono text-slate-700">
                    {formatMoney(item.cost_price)}
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
              <td colSpan={2} className="py-2 px-2.5 text-right">
                إجمالي الأصناف المرتجعة ({(returnDoc.items || []).length} صنف / {totalPieces} قطعة)
              </td>
              <td colSpan={2} className="py-2 px-2.5 text-center font-bold">
                صافي المردود:
              </td>
              <td className="py-2 px-2.5 text-left font-mono font-black text-sm text-slate-950">
                {formatMoney(returnDoc.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tafqeet & Notes */}
      <div className="space-y-2 mb-6">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] font-medium">
          <span className="text-slate-500">المبلغ كتابة: </span>
          <span className="font-bold text-slate-950">
            فقط {tafqeetRials(returnDoc.total_amount)} لا غير
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="border-t border-slate-200 pt-4 mt-6">
        <div className="grid grid-cols-3 gap-4 text-center text-[11px]" dir="rtl">
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">أمين المستودع (المُسلِّم)</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              مسؤول المستودع
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              التوقيع
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">الاعتماد والختم</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              المدير المالي
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              الختم الرسمي
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-600 block mb-1 font-bold">المستلم (المورد)</span>
            <span className="text-xs font-bold text-slate-900 block min-h-[1.5rem] mb-6">
              {returnDoc.supplier_name}
            </span>
            <div className="w-full border-t border-dashed border-slate-400 px-4 pt-1.5 text-slate-800 font-semibold" dir="rtl">
              توقيع المورد
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
