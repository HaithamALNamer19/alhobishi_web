import React from 'react';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';

interface PrintableSupplierVoucherProps {
  payment: {
    id: string;
    voucher_number: string;
    supplier_id: string;
    supplier_name: string;
    company_name?: string;
    amount: number;
    payment_method: string;
    reference_number?: string | null;
    bank_or_exchange?: string | null;
    notes?: string | null;
    recorded_by?: string;
    createdAt: string | Date;
  };
}

export function PrintableSupplierVoucher({ payment }: PrintableSupplierVoucherProps) {
  const dateObj =
    payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt);

  const voucherDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('ar-YE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const methodLabel =
    payment.payment_method === 'CASH'
      ? 'نقدًا (كاش)'
      : payment.payment_method === 'TRANSFER'
        ? 'حوالة مصرفية / صرافة'
        : payment.payment_method === 'CHECK'
          ? 'شيك بنكي'
          : 'أخرى';

  return (
    <div
      className="w-full max-w-[210mm] mx-auto p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed"
      dir="rtl"
    >
      {/* 1. Official Header */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
        {/* Right: Store info */}
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

        {/* Center: Logo & Title */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt="شعار المتجر"
            className="w-16 h-16 object-contain rounded-md border border-slate-200"
          />
          <span className="text-xs font-black text-slate-950 mt-1 border-b border-slate-900 pb-0.5 whitespace-nowrap">
            سند صرف مالي للمورد
          </span>
        </div>

        {/* Left: Voucher details */}
        <div className="text-left border border-slate-300 rounded p-2.5 bg-slate-50 min-w-44 text-[11px] space-y-1.5 self-center">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">رقم السند:</span>
            <span className="font-mono font-bold text-slate-900 text-[11px]">
              {payment.voucher_number || payment.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-medium">التاريخ:</span>
            <span className="font-mono font-bold text-slate-800">{voucherDate}</span>
          </div>
        </div>
      </div>

      {/* 2. Amount Callout Box */}
      <div className="flex items-center justify-between p-4 bg-blue-50/70 border-2 border-blue-500/40 rounded-2xl mb-5">
        <div>
          <span className="text-[11px] font-bold text-blue-900 block">المبلغ المصروف:</span>
          <span className="text-2xl font-black font-mono text-blue-950">
            {formatMoney(payment.amount)}
          </span>
        </div>
        <div className="text-left">
          <span className="text-[11px] font-bold text-slate-500 block">طريقة الصرف:</span>
          <span className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200 inline-block mt-0.5">
            {methodLabel}
          </span>
        </div>
      </div>

      {/* 3. Voucher Body Details */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
        <table className="w-full text-right border-collapse">
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="p-3 font-bold text-slate-500 w-36">يصرف للمكرم / السادة:</td>
              <td className="p-3 font-black text-slate-900 text-sm">
                {payment.supplier_name}
                {payment.company_name ? ` (${payment.company_name})` : ''}
              </td>
            </tr>

            <tr className="border-b border-slate-100">
              <td className="p-3 font-bold text-slate-500">المبلغ كتابةً:</td>
              <td className="p-3 font-bold text-slate-800">
                {tafqeetRials(payment.amount)}
              </td>
            </tr>

            {(payment.reference_number || payment.bank_or_exchange) && (
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <td className="p-3 font-bold text-slate-500">بيانات الحوالة / البنك:</td>
                <td className="p-3 font-medium text-slate-800 space-x-4">
                  {payment.bank_or_exchange && (
                    <span className="inline-block ml-3">
                      الجهة: <strong>{payment.bank_or_exchange}</strong>
                    </span>
                  )}
                  {payment.reference_number && (
                    <span className="inline-block font-mono">
                      رقم المرجع / الحوالة: <strong>{payment.reference_number}</strong>
                    </span>
                  )}
                </td>
              </tr>
            )}

            {payment.notes && (
              <tr className="border-b border-slate-100">
                <td className="p-3 font-bold text-slate-500">البيان والملاحظات:</td>
                <td className="p-3 text-slate-800 font-medium whitespace-pre-wrap">
                  {payment.notes}
                </td>
              </tr>
            )}

            <tr>
              <td className="p-3 font-bold text-slate-500">المسؤول / المحاسب:</td>
              <td className="p-3 font-bold text-slate-800">
                {payment.recorded_by || 'إدارة المشتريات'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Signatures Block */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-200 text-center">
        <div>
          <span className="block text-[11px] font-bold text-slate-500 mb-8">
            توقيع المستلم (المورد / المندوب)
          </span>
          <div className="border-b border-slate-300 w-32 mx-auto"></div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-500 mb-8">
            أمين الصندوق
          </span>
          <div className="border-b border-slate-300 w-32 mx-auto"></div>
        </div>

        <div>
          <span className="block text-[11px] font-bold text-slate-500 mb-8">
            المدير العام / المسؤول
          </span>
          <div className="border-b border-slate-300 w-32 mx-auto"></div>
        </div>
      </div>

      {/* 5. Footer Note */}
      <div className="mt-8 pt-2 text-center text-[10px] text-slate-400">
        هذا السند صادر آلياً من نظام متجر الحبيشي للتجارة والتوزيع، ويعد إشعاراً رسمياً بسداد المبلغ للمورد.
      </div>
    </div>
  );
}

