'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Printer,
  Search,
  ArrowRight,
  Eye,
  Building2,
  Phone,
  Calendar,
  CreditCard,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  Pencil,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import { cleanCustomerName } from '@/core/utils/clean-name';
import { toast } from '@/shared/ui/toast';
import { RecordSupplierPaymentDialog } from './record-supplier-payment-dialog';
import { SupplierPaymentVoucherDialog } from './supplier-payment-voucher-dialog';
import { PurchaseInvoiceDetailDialog } from './purchase-invoice-detail-dialog';
import { SharePdfButton } from '@/shared/ui/share-pdf-button';
import { PurchaseReturnDetailDialog } from './purchase-return-detail-dialog';
import { PrintableSupplierVoucher } from './printable-supplier-voucher';
import { PrintableSupplierStatement } from './printable-supplier-statement';
import { PrintablePurchaseInvoice } from './printable-purchase-invoice';
import { PrintablePurchaseReturnInvoice } from './printable-purchase-return-invoice';
import { EditPurchaseInvoiceDialog } from './edit-purchase-invoice-dialog';
import { EditSupplierPaymentDialog } from './edit-supplier-payment-dialog';
import { EditPurchaseReturnDialog } from './edit-purchase-return-dialog';
import { DeleteTransactionConfirmDialog } from './delete-transaction-confirm-dialog';

export interface SerializedSupplierStatementProps {
  supplier: {
    id: string;
    name: string;
    phone: string;
    company_name: string;
    balance: number;
    createdAt: string;
  };
  transactions: Array<{
    id: string;
    supplier_id: string;
    type: string;
    amount: number;
    debit: number;
    credit: number;
    balance_after: number;
    description: string;
    reference_id?: string | null;
    reference_number?: string | null;
    recorded_by?: string;
    createdAt: string;
    items?: Array<{
      product_id: string;
      product_name?: string;
      quantity: number;
      cost_price: number;
    }>;
    payment_method?: string;
    bank_or_exchange?: string | null;
    notes?: string | null;
  }>;
  totalPurchases: number;
  totalPayments: number;
  totalReturns: number;
  netBalance: number;
  backHref?: string;
}

type PrintJob =
  | { type: 'statement' }
  | { type: 'voucher'; payment: any }
  | { type: 'invoice'; invoice: any }
  | { type: 'return'; returnDoc: any };

export function SupplierStatementView({
  supplier,
  transactions: initialTransactions,
  totalPurchases: initialPurchases,
  totalPayments: initialPayments,
  totalReturns: initialReturns,
  netBalance: initialBalance,
  backHref = '/admin/suppliers',
}: SerializedSupplierStatementProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PURCHASE' | 'PAYMENT' | 'PURCHASE_RETURN'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Dialog states
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editingReturn, setEditingReturn] = useState<any | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<any | null>(null);

  // Print state
  const [activePrint, setActivePrint] = useState<PrintJob | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = (job: PrintJob) => {
    setActivePrint(job);
    document.body.classList.add('print-active');
    const originalTitle = document.title;
    const supplierCleanName = cleanCustomerName(supplier.name).trim().replace(/\s+/g, '_');

    if (job.type === 'statement') {
      document.title = `كشف_حساب_المورد_${supplierCleanName}`;
    } else if (job.type === 'invoice' && job.invoice) {
      document.title = `فاتورة_شراء_${job.invoice.invoice_number}`;
    } else if (job.type === 'return' && job.returnDoc) {
      document.title = `مردود_شراء_${job.returnDoc.return_number}`;
    } else if (job.type === 'voucher' && job.payment) {
      document.title = `سند_صرف_${job.payment.voucher_number || job.payment.id.slice(-6).toUpperCase()}`;
    } else {
      document.title = `كشف_حساب_المورد_${supplierCleanName}`;
    }

    const handleAfterPrint = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-active');
      setActivePrint(null);
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintStatement = () => {
    handlePrint({ type: 'statement' });
  };

  const handlePrintVoucher = (payment: any) => {
    handlePrint({ type: 'voucher', payment });
  };

  const handlePrintInvoice = (invoice: any) => {
    handlePrint({ type: 'invoice', invoice });
  };

  const handlePrintReturn = (returnDoc: any) => {
    handlePrint({ type: 'return', returnDoc });
  };

  // Counts for tabs and cards
  const purchasesCount = useMemo(
    () => (initialTransactions || []).filter((tx) => tx.type === 'PURCHASE').length,
    [initialTransactions]
  );
  const paymentsCount = useMemo(
    () => (initialTransactions || []).filter((tx) => tx.type === 'PAYMENT').length,
    [initialTransactions]
  );
  const returnsCount = useMemo(
    () => (initialTransactions || []).filter((tx) => tx.type === 'PURCHASE_RETURN').length,
    [initialTransactions]
  );

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return (initialTransactions || []).filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(q);
      const matchRef = (tx.reference_number || '').toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchItems = (tx.items || []).some((it) =>
        (it.product_name || '').toLowerCase().includes(q)
      );
      const matchAmount = (Number(tx.amount || tx.debit || tx.credit) || 0).toString().includes(q);
      let dateMatch = false;
      try {
        const d = new Date(tx.createdAt);
        if (!isNaN(d.getTime())) {
          dateMatch = d.toLocaleDateString('ar-YE').includes(q);
        }
      } catch {
        dateMatch = false;
      }
      return matchDesc || matchRef || matchNotes || matchItems || matchAmount || dateMatch;
    });
  }, [initialTransactions, typeFilter, search]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, activePage]);

  const handleOpenDetail = (tx: any) => {
    if (tx.type === 'PAYMENT') {
      setSelectedVoucher({
        id: tx.reference_id || tx.id,
        voucher_number: tx.reference_number || tx.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        company_name: supplier.company_name,
        amount: tx.debit,
        payment_method: tx.payment_method || 'CASH',
        bank_or_exchange: tx.bank_or_exchange || null,
        notes: tx.notes || tx.description,
        recorded_by: tx.recorded_by,
        createdAt: tx.createdAt,
      });
    } else if (tx.type === 'PURCHASE') {
      setSelectedInvoice({
        id: tx.reference_id || tx.id,
        invoice_number: tx.reference_number || tx.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        purchase_date: tx.createdAt,
        total_amount: tx.credit,
        items: tx.items || [],
        createdAt: tx.createdAt,
      });
    } else if (tx.type === 'PURCHASE_RETURN') {
      setSelectedReturn({
        id: tx.reference_id || tx.id,
        return_number: tx.reference_number || tx.id,
        purchase_id: tx.reference_id || '',
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        return_date: tx.createdAt,
        total_amount: tx.debit,
        items: tx.items || [],
        createdAt: tx.createdAt,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 no-print" dir="rtl">
      {/* 1. Header Card / Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <Link
            href={backHref}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200 shrink-0"
            title="الرجوع لسجل الموردين"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-700" />
                <span>كشف الحساب المالي المفصل</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span className="font-bold text-slate-800">{cleanCustomerName(supplier.name)}</span>
              {supplier.company_name && (
                <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {supplier.company_name}
                </span>
              )}
              {supplier.phone && (
                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md" dir="ltr">
                  {supplier.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
          <Button
            onClick={handlePrintStatement}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold gap-2 px-5 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الحساب</span>
          </Button>
          <SharePdfButton
            title={`كشف حساب مورد - ${cleanCustomerName(supplier.name)}`}
            filename={`كشف_حساب_المورد_${cleanCustomerName(supplier.name).trim().replace(/\s+/g, '_')}`}
            renderDocument={() => (
              <PrintableSupplierStatement
                supplier={supplier}
                transactions={initialTransactions}
                totalPurchases={initialPurchases}
                totalPayments={initialPayments}
                totalReturns={initialReturns}
                netBalance={initialBalance}
              />
            )}
            summaryText={`كشف حساب تفصيلي للمورد: ${cleanCustomerName(supplier.name)}\nإجمالي المشتريات: ${formatMoney(initialPurchases)}\nإجمالي السدادات: ${formatMoney(initialPayments)}\nإجمالي المردودات: ${formatMoney(initialReturns)}\nالرصيد المستحق: ${formatMoney(initialBalance)}`}
            buttonLabel="مشاركة كشف الحساب (PDF)"
            className="py-2.5 px-4 rounded-2xl"
          />
        </div>
      </div>

      {/* 2. KPI Cards (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases (Invoices) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>إجمالي المشتريات (الفواتير)</span>
            </span>
            <div className="text-xl font-black font-mono text-amber-700 tracking-tight">
              {formatMoney(initialPurchases)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {purchasesCount} فاتورة مسجلة
            </span>
          </div>
        </div>

        {/* Total Payments (Disbursements / سندات الصرف) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>إجمالي المسدد (سندات الصرف)</span>
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 tracking-tight">
              {formatMoney(initialPayments)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {paymentsCount} سند صرف مسدد
            </span>
          </div>
        </div>

        {/* Total Returns (مردودات المشتريات) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>إجمالي المردودات</span>
            </span>
            <div className="text-xl font-black font-mono text-rose-700 tracking-tight">
              {formatMoney(initialReturns)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {returnsCount} مردود مشتريات
            </span>
          </div>
        </div>

        {/* Current Balance */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mb-1">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>الرصيد النهائي المستحق</span>
            </span>
            <div className="text-xl font-black font-mono text-white tracking-tight">
              {formatMoney(initialBalance)}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {initialBalance > 0
                ? 'مستحق للمورد (دائن)'
                : initialBalance < 0
                  ? 'مستحق من المورد (مدين)'
                  : 'الحساب خالص / مسدد بالكامل'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في البيان، رقم الفاتورة أو السند، أو الصنف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto bg-slate-100 p-1 rounded-xl text-xs flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTypeFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الحركات ({(initialTransactions || []).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('PURCHASE');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeFilter === 'PURCHASE'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-600 hover:text-amber-800'
            }`}
          >
            فواتير الشراء ({purchasesCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('PAYMENT');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeFilter === 'PAYMENT'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-emerald-800'
            }`}
          >
            سندات الصرف ({paymentsCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('PURCHASE_RETURN');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeFilter === 'PURCHASE_RETURN'
                ? 'bg-white text-rose-800 shadow-2xs'
                : 'text-slate-600 hover:text-rose-800'
            }`}
          >
            مردودات المشتريات ({returnsCount})
          </button>
        </div>
      </div>

      {/* 4. Transactions Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            {(initialTransactions || []).length === 0
              ? 'لا توجد أي حركات مالية مسجلة في كشف حساب المورد حتى الآن'
              : 'لا توجد حركات مالية مطابقة لمعايير البحث الحالية'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 w-32">التاريخ والوقت</th>
                    <th className="py-3.5 px-4 w-28">نوع الحركة</th>
                    <th className="py-3.5 px-4">البيان والتفاصيل</th>
                    <th className="py-3.5 px-4 text-center w-28">المبلغ (ر.ي)</th>
                    <th className="py-3.5 px-4 text-center w-32">الرصيد بعد الحركة</th>
                    <th className="py-3.5 px-4 text-center min-w-[200px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedTransactions.map((tx) => {
                    const isPurchase = tx.type === 'PURCHASE';
                    const isPayment = tx.type === 'PAYMENT';
                    const isReturn = tx.type === 'PURCHASE_RETURN';
                    const isInitial = tx.type === 'INITIAL_BALANCE';
                    const dateObj = new Date(tx.createdAt);
                    const isValidDate = !isNaN(dateObj.getTime());

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (isPurchase || isPayment || isReturn) {
                            handleOpenDetail(tx);
                          }
                        }}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {isValidDate ? (
                            <div>
                              <span suppressHydrationWarning>
                                {dateObj.toLocaleDateString('ar-YE', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="block text-[10px] text-slate-400" suppressHydrationWarning>
                                {dateObj.toLocaleTimeString('ar-YE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                          {isPurchase ? (
                            <Badge variant="amber" className="text-[11px] font-semibold">
                              فاتورة شراء
                            </Badge>
                          ) : isPayment ? (
                            <Badge variant="emerald" className="text-[11px] font-semibold">
                              سند صرف
                            </Badge>
                          ) : isReturn ? (
                            <Badge variant="rose" className="text-[11px] font-semibold">
                              مردود مشتريات
                            </Badge>
                          ) : isInitial ? (
                            <Badge variant="indigo" className="text-[11px] font-semibold">
                              رصيد افتتاحي
                            </Badge>
                          ) : (
                            <Badge variant="slate" className="text-[11px] font-semibold">
                              حركة حساب
                            </Badge>
                          )}
                        </td>

                        {/* Description & Details */}
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{tx.description}</span>
                            {tx.reference_number && (
                              <span
                                className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                dir="ltr"
                              >
                                {isPurchase ? 'فاتورة' : isPayment ? 'سند' : isReturn ? 'مردود' : 'مرجع'}: {tx.reference_number}
                              </span>
                            )}
                            {tx.bank_or_exchange && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                عبر: {tx.bank_or_exchange}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              isPurchase
                                ? 'text-amber-700 font-bold'
                                : isReturn
                                  ? 'text-rose-700 font-bold'
                                  : isPayment
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-slate-700 font-bold'
                            }
                          >
                            {isPurchase
                              ? `+${formatMoney(tx.credit || tx.amount)}`
                              : isPayment
                                ? `-${formatMoney(tx.debit || tx.amount)}`
                                : isReturn
                                  ? `-${formatMoney(tx.debit || tx.amount)}`
                                  : formatMoney(tx.amount)}
                          </span>
                        </td>

                        {/* Balance After */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatMoney(tx.balance_after)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {isPurchase && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="عرض تفاصيل الفاتورة"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>عرض</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTransaction(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="حذف الفاتورة"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>حذف</span>
                                </button>
                              </>
                            )}

                            {isPayment && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="عرض تفاصيل السند"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>عرض</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTransaction(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="حذف سند الصرف"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>حذف</span>
                                </button>
                              </>
                            )}

                            {isReturn && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="عرض تفاصيل المردود"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>عرض</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTransaction(tx)}
                                  className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 transition-colors cursor-pointer select-none shadow-2xs"
                                  title="حذف مردود المشتريات"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>حذف</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <Pagination
                currentPage={activePage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                pageSize={PAGE_SIZE}
                itemName="حركة مالية"
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Record Payment Dialog */}
      {isRecordPaymentOpen && (
        <RecordSupplierPaymentDialog
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          supplier={supplier}
          onSuccess={(newPayment) => {
            router.refresh();
            if (newPayment) {
              handlePrintVoucher(newPayment);
            }
          }}
        />
      )}

      {/* Voucher Detail Dialog */}
      {selectedVoucher && (
        <SupplierPaymentVoucherDialog
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          payment={selectedVoucher}
          onPrint={() => {
            const v = selectedVoucher;
            setSelectedVoucher(null);
            handlePrintVoucher(v);
          }}
          onEdit={(v) => {
            setSelectedVoucher(null);
            setEditingPayment({
              id: v.id,
              voucher_number: v.voucher_number,
              supplier_id: supplier.id,
              supplier_name: supplier.name,
              amount: v.amount,
              payment_method: v.payment_method || 'CASH',
              reference_number: v.reference_number || null,
              bank_or_exchange: v.bank_or_exchange || null,
              notes: v.notes || null,
            });
          }}
        />
      )}

      {/* Purchase Invoice Detail Dialog */}
      <PurchaseInvoiceDetailDialog
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onPrint={handlePrintInvoice}
        onEdit={(inv) => {
          setSelectedInvoice(null);
          setEditingInvoice(inv);
        }}
      />

      {/* Purchase Return Detail Dialog */}
      <PurchaseReturnDetailDialog
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        returnDoc={selectedReturn}
        onPrint={handlePrintReturn}
        onEdit={(ret) => {
          setSelectedReturn(null);
          setEditingReturn(ret);
        }}
      />

      {/* Edit Purchase Return Dialog */}
      {editingReturn && (
        <EditPurchaseReturnDialog
          isOpen={Boolean(editingReturn)}
          onClose={() => setEditingReturn(null)}
          returnDoc={editingReturn}
          supplierId={supplier.id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Edit Purchase Invoice Dialog */}
      {editingInvoice && (
        <EditPurchaseInvoiceDialog
          isOpen={Boolean(editingInvoice)}
          onClose={() => setEditingInvoice(null)}
          invoice={editingInvoice}
          supplierId={supplier.id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Edit Supplier Payment Dialog */}
      {editingPayment && (
        <EditSupplierPaymentDialog
          isOpen={Boolean(editingPayment)}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          supplierId={supplier.id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Delete Transaction Confirm Dialog */}
      {deletingTransaction && (
        <DeleteTransactionConfirmDialog
          isOpen={Boolean(deletingTransaction)}
          onClose={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          supplierId={supplier.id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Print Portal */}
      {mounted &&
        Boolean(activePrint) &&
        createPortal(
          <div className="print-only-portal">
            {activePrint?.type === 'statement' && (
              <PrintableSupplierStatement
                supplier={supplier}
                transactions={initialTransactions}
                totalPurchases={initialPurchases}
                totalPayments={initialPayments}
                totalReturns={initialReturns}
                netBalance={initialBalance}
              />
            )}
            {activePrint?.type === 'voucher' && (
              <PrintableSupplierVoucher payment={activePrint.payment} />
            )}
            {activePrint?.type === 'invoice' && (
              <PrintablePurchaseInvoice invoice={activePrint.invoice} />
            )}
            {activePrint?.type === 'return' && (
              <PrintablePurchaseReturnInvoice returnDoc={activePrint.returnDoc} />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

