'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Printer,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Dialog } from '@/shared/ui/dialog';
import { formatMoney } from '@/core/domain/money';
import { RecordFinancialVoucherDialog } from './record-financial-voucher-dialog';
import { PrintableFinancialVoucher } from './printable-financial-voucher';

export interface SerializedFinancialVoucher {
  id: string;
  voucherNumber: string;
  voucherType: 'RECEIPT' | 'DISBURSEMENT';
  partyId: string;
  partyName: string;
  partyType: 'CUSTOMER' | 'WHOLESALE' | 'SUPPLIER';
  partyTypeLabel: string;
  partyPhone?: string | null;
  statementUrl: string;
  amount: number;
  paymentMethod: string;
  paymentMethodLabel: string;
  referenceNumber?: string | null;
  bankOrExchange?: string | null;
  notes?: string | null;
  collectorName: string;
  createdAt: string; // ISO string
}

interface FinancialVouchersManagerProps {
  initialVouchers: SerializedFinancialVoucher[];
}

export function FinancialVouchersManager({ initialVouchers }: FinancialVouchersManagerProps) {
  const router = useRouter();

  // State for Print Portal mounting
  const [mounted, setMounted] = useState(false);
  const [printDoc, setPrintDoc] = useState<SerializedFinancialVoucher | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State for Record Dialog
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [dialogVoucherType, setDialogVoucherType] = useState<'RECEIPT' | 'DISBURSEMENT'>('RECEIPT');

  // State for Print Modal
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<SerializedFinancialVoucher | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIPT' | 'DISBURSEMENT'>('ALL');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'WHOLESALE' | 'SUPPLIER'>('ALL');

  const openRecordDialog = (type: 'RECEIPT' | 'DISBURSEMENT') => {
    setDialogVoucherType(type);
    setIsVoucherDialogOpen(true);
  };

  const handleVoucherSuccess = () => {
    router.refresh();
  };

  // Filtered vouchers
  const filteredVouchers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialVouchers.filter((v) => {
      // Type filter
      if (typeFilter !== 'ALL' && v.voucherType !== typeFilter) return false;

      // Party type filter
      if (partyTypeFilter !== 'ALL' && v.partyType !== partyTypeFilter) return false;

      // Search text
      if (!q) return true;
      return (
        v.voucherNumber.toLowerCase().includes(q) ||
        v.partyName.toLowerCase().includes(q) ||
        (v.referenceNumber && v.referenceNumber.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q)) ||
        (v.collectorName && v.collectorName.toLowerCase().includes(q)) ||
        (v.bankOrExchange && v.bankOrExchange.toLowerCase().includes(q))
      );
    });
  }, [initialVouchers, searchQuery, typeFilter, partyTypeFilter]);

  const handlePrint = (voucher: SerializedFinancialVoucher) => {
    setPrintDoc(voucher);
    const originalTitle = document.title;
    document.title = `${voucher.voucherType === 'RECEIPT' ? 'سند_قبض' : 'سند_صرف'}_${voucher.voucherNumber}`;

    const handleAfterPrint = () => {
      document.title = originalTitle;
      setPrintDoc(null);
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" dir="rtl">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                المالية والحسابات | سندات القبض والصرف
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                سجل وإدارة السندات المالية؛ تسجيل مقبوضات العملاء والتجار، وصرف دفعات الموردين وتتبع حركة الصندوق
              </p>
            </div>
          </div>
        </div>

        {/* Primary Voucher Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            onClick={() => openRecordDialog('RECEIPT')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-4 py-2.5 shadow-sm text-xs cursor-pointer transition-all active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>تسجيل سند قبض</span>
          </Button>

          <Button
            type="button"
            onClick={() => openRecordDialog('DISBURSEMENT')}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl px-4 py-2.5 shadow-sm text-xs cursor-pointer transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>تسجيل سند صرف</span>
          </Button>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم السند، اسم العميل، التاجر، المورد، رقم الحوالة، أو الملاحظات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition-all text-slate-800"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة السندات
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('RECEIPT')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
                typeFilter === 'RECEIPT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>سندات قبض</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('DISBURSEMENT')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer ${
                typeFilter === 'DISBURSEMENT'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-blue-700 hover:text-blue-800'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>سندات صرف</span>
            </button>
          </div>
        </div>

        {/* Secondary Party Type Selector */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
          <span className="text-[11px] font-bold text-slate-400">تصفية حسب نوع الطرف:</span>
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'CUSTOMER', label: 'العملاء' },
            { id: 'WHOLESALE', label: 'تجار الجملة' },
            { id: 'SUPPLIER', label: 'الموردين' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPartyTypeFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                partyTypeFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {(searchQuery || typeFilter !== 'ALL' || partyTypeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setPartyTypeFilter('ALL');
              }}
              className="mr-auto text-[11px] text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Unified Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredVouchers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-600">لا توجد سندات مالية مطابقة للبحث أو الفلتر</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك تسجيل سند قبض أو سند صرف جديد بسهولة من الأزرار العلوية، واختيار العميل أو التاجر أو المورد.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">رقم ونوع السند</th>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-4">الطرف المعني</th>
                  <th className="py-3.5 px-4 text-center">المبلغ</th>
                  <th className="py-3.5 px-4">طريقة السداد والبنك</th>
                  <th className="py-3.5 px-4">رقم الحوالة / الإيصال</th>
                  <th className="py-3.5 px-4">المحرر / المستلم</th>
                  <th className="py-3.5 px-4">البيان / الملاحظات</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVouchers.map((v) => {
                  const isReceipt = v.voucherType === 'RECEIPT';
                  const dateObj = new Date(v.createdAt);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Voucher Number & Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-xl text-xs font-bold ${
                              isReceipt
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isReceipt ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-slate-900 block text-[11px]" dir="ltr">
                              {v.voucherNumber}
                            </span>
                            <span
                              className={`text-[10px] font-black ${
                                isReceipt ? 'text-emerald-700' : 'text-blue-700'
                              }`}
                            >
                              {isReceipt ? 'سند قبض' : 'سند صرف'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {dateObj.toLocaleDateString('ar-YE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Party Name & Type */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <Link
                            href={v.statementUrl}
                            className="font-bold text-slate-900 hover:text-blue-700 transition-colors flex items-center gap-1.5 group"
                          >
                            <span>{v.partyName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </Link>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold ${
                                v.partyType === 'SUPPLIER'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : v.partyType === 'WHOLESALE'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {v.partyTypeLabel}
                            </span>
                            {v.partyPhone && <span className="font-mono">{v.partyPhone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-black text-sm block ${
                            isReceipt ? 'text-emerald-700' : 'text-blue-800'
                          }`}
                        >
                          {formatMoney(v.amount)}
                        </span>
                      </td>

                      {/* Method & Bank */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md text-[11px] block w-fit">
                          {v.paymentMethodLabel}
                        </span>
                        {v.bankOrExchange && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {v.bankOrExchange}
                          </span>
                        )}
                      </td>

                      {/* Reference Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]" dir="ltr">
                        {v.referenceNumber || '-'}
                      </td>

                      {/* Collector Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-800">
                          {v.collectorName}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 text-[11px]" title={v.notes || ''}>
                        {v.notes || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVoucherForPrint(v)}
                          className="h-8 px-2.5 text-xs text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl flex items-center gap-1 cursor-pointer"
                          title="طباعة ومعاينة السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>معاينة وطباعة</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Record Financial Voucher Dialog */}
      <RecordFinancialVoucherDialog
        isOpen={isVoucherDialogOpen}
        onClose={() => setIsVoucherDialogOpen(false)}
        initialVoucherType={dialogVoucherType}
        onSuccess={handleVoucherSuccess}
      />

      {/* 6. Printable Financial Voucher Modal */}
      {selectedVoucherForPrint && (
        <Dialog
          isOpen={!!selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
          title={
            selectedVoucherForPrint.voucherType === 'RECEIPT'
              ? 'معاينة سند قبض مالي'
              : 'معاينة سند صرف مالي'
          }
          maxWidth="2xl"
        >
          <div className="space-y-4 text-right font-sans" dir="rtl">
            {/* Top action buttons inside dialog */}
            <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-500 font-mono" dir="ltr">
                {selectedVoucherForPrint.voucherNumber}
              </span>
              <Button
                type="button"
                onClick={() => handlePrint(selectedVoucherForPrint)}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </Button>
            </div>

            {/* Official Printable Voucher Preview */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[75vh] overflow-y-auto">
              <PrintableFinancialVoucher voucher={selectedVoucherForPrint} />
            </div>
          </div>
        </Dialog>
      )}

      {/* 7. Print-Only Portal on document.body */}
      {mounted &&
        printDoc &&
        createPortal(
          <div className="print-only-portal">
            <PrintableFinancialVoucher voucher={printDoc} />
          </div>,
          document.body
        )}
    </div>
  );
}
