'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  FileText,
  Printer,
  Search,
  Filter,
  ArrowRight,
  Eye,
  TrendingUp,
  TrendingDown,
  CreditCard,
  User,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import {
  getLedgerDocumentDetailAction,
  type SerializedInvoiceDetail,
  type SerializedPaymentDetail,
} from '../actions/ledger.actions';
import { InvoiceDetailDialog } from './invoice-detail-dialog';
import { ReceiptDetailDialog } from './receipt-detail-dialog';
import { PrintableStatement } from './printable-statement';
import { PrintableInvoice } from './printable-invoice';
import { PrintableReceipt } from './printable-receipt';

export interface CustomerStatementUser {
  uid: string;
  displayName: string;
  username: string;
  phone?: string;
  role: string;
  balance: number;
}

export interface SerializedTransaction {
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
}

interface CustomerStatementViewProps {
  customer: CustomerStatementUser;
  transactions: SerializedTransaction[];
  isAdminView?: boolean;
  backHref?: string;
}

type PrintJob =
  | { type: 'statement' }
  | { type: 'invoice'; order: SerializedInvoiceDetail['order'] }
  | { type: 'receipt'; payment: SerializedPaymentDetail['payment'] };

export function CustomerStatementView({
  customer,
  transactions,
  isAdminView = false,
  backHref = isAdminView ? '/admin/customers' : '/account',
}: CustomerStatementViewProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'PAYMENT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Modal states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SerializedInvoiceDetail['order'] | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SerializedPaymentDetail['payment'] | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);

  // Print state
  const [activePrint, setActivePrint] = useState<PrintJob | null>(null);

  useEffect(() => {
    setMounted(true);

    let originalTitle = '';
    const handleBeforePrint = () => {
      originalTitle = document.title;
      document.title = ' ';
      document.body.classList.add('print-active');
    };
    const handleAfterPrint = () => {
      if (originalTitle) document.title = originalTitle;
      document.body.classList.remove('print-active');
      setActivePrint(null);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Compute Totals
  const { totalInvoices, totalPayments } = useMemo(() => {
    let invSum = 0;
    let paySum = 0;
    for (const t of transactions) {
      if (t.type === 'INVOICE') {
        invSum += t.amount;
      } else if (t.type === 'PAYMENT') {
        paySum += Math.abs(t.amount);
      }
    }
    return { totalInvoices: invSum, totalPayments: paySum };
  }, [transactions]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) {
        return false;
      }
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      const descMatch = t.description.toLowerCase().includes(q);
      const amountMatch = t.amount.toString().includes(q);
      const idMatch = (t.orderId || '').toLowerCase().includes(q) || (t.paymentId || '').toLowerCase().includes(q);
      const dateMatch = new Date(t.createdAt).toLocaleDateString('ar-YE').includes(q);

      return descMatch || amountMatch || idMatch || dateMatch;
    });
  }, [transactions, typeFilter, search]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );

  // Trigger browser print with cleanup
  const handlePrint = (job: PrintJob) => {
    setActivePrint(job);
    document.body.classList.add('print-active');
    const originalTitle = document.title;
    document.title = ' ';

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

  // Open invoice detail dialog
  const handleOpenInvoice = async (orderId: string) => {
    setIsDocLoading(true);
    setIsInvoiceModalOpen(true);
    setSelectedInvoice(null);
    try {
      const res = await getLedgerDocumentDetailAction({ type: 'INVOICE', id: orderId });
      if (res.ok && res.data.type === 'INVOICE') {
        setSelectedInvoice(res.data.order);
      } else {
        toast.error(!res.ok ? res.error.message : 'تعذر تحميل بيانات الفاتورة');
        setIsInvoiceModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحميل الفاتورة');
      setIsInvoiceModalOpen(false);
    } finally {
      setIsDocLoading(false);
    }
  };

  // Open receipt detail dialog
  const handleOpenReceipt = async (paymentId: string) => {
    setIsDocLoading(true);
    setIsReceiptModalOpen(true);
    setSelectedPayment(null);
    try {
      const res = await getLedgerDocumentDetailAction({ type: 'PAYMENT', id: paymentId });
      if (res.ok && res.data.type === 'PAYMENT') {
        setSelectedPayment(res.data.payment);
      } else {
        toast.error(!res.ok ? res.error.message : 'تعذر تحميل بيانات سند القبض');
        setIsReceiptModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحميل سند القبض');
      setIsReceiptModalOpen(false);
    } finally {
      setIsDocLoading(false);
    }
  };

  // Quick print handlers directly from table
  const handleQuickPrintInvoice = async (orderId: string) => {
    try {
      toast.info('جاري تجهيز الفاتورة للطباعة...');
      const res = await getLedgerDocumentDetailAction({ type: 'INVOICE', id: orderId });
      if (res.ok && res.data.type === 'INVOICE') {
        handlePrint({ type: 'invoice', order: res.data.order });
      } else {
        toast.error('تعذر جلب تفاصيل الفاتورة للطباعة');
      }
    } catch {
      toast.error('حدث خطأ أثناء تجهيز الفاتورة للطباعة');
    }
  };

  const handleQuickPrintReceipt = async (paymentId: string) => {
    try {
      toast.info('جاري تجهيز سند القبض للطباعة...');
      const res = await getLedgerDocumentDetailAction({ type: 'PAYMENT', id: paymentId });
      if (res.ok && res.data.type === 'PAYMENT') {
        handlePrint({ type: 'receipt', payment: res.data.payment });
      } else {
        toast.error('تعذر جلب تفاصيل السند للطباعة');
      }
    } catch {
      toast.error('حدث خطأ أثناء تجهيز السند للطباعة');
    }
  };

  const balance = customer.balance;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 no-print">
      {/* Top Banner & Customer Summary */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <Link
            href={backHref}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200 shrink-0"
            title="الرجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-700" />
                <span>كشف الحساب المالي المفصل</span>
              </h1>
              <Badge variant={customer.role === 'wholesale' ? 'indigo' : 'slate'} className="text-xs">
                {customer.role === 'wholesale' ? 'تاجر جملة' : 'عميل عادي'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
              <span className="font-bold text-slate-800">{customer.displayName}</span>
              <span className="font-mono text-slate-400">@{customer.username}</span>
              {customer.phone && (
                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md" dir="ltr">
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Print Statement Button */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <Button
            onClick={() => handlePrint({ type: 'statement' })}
            className="bg-blue-700 hover:bg-blue-600 text-white font-bold gap-2 px-5 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة كشف الحساب</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Invoices (Debits) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>إجمالي المبيعات (الفواتير)</span>
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-700 tracking-tight">
              {formatMoney(totalInvoices)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {transactions.filter((t) => t.type === 'INVOICE').length} فاتورة مسجلة
            </span>
          </div>
        </div>

        {/* Total Payments (Credits) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              <span>إجمالي المسدد (سندات القبض)</span>
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-tight">
              {formatMoney(totalPayments)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {transactions.filter((t) => t.type === 'PAYMENT').length} سند قبض مسدد
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
            <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
              {formatMoney(balance)}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {balance > 0
                ? 'مديونية مستحقة لصالح المتجر'
                : balance < 0
                  ? 'رصيد دائن فائض للعميل'
                  : 'الحساب خالص بالكامل'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في البيان، رقم الطلب، المبلغ، أو التاريخ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => {
              setTypeFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              typeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الحركات ({transactions.length})
          </button>
          <button
            onClick={() => {
              setTypeFilter('INVOICE');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              typeFilter === 'INVOICE'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-600 hover:text-amber-800'
            }`}
          >
            فواتير المبيعات ({transactions.filter((t) => t.type === 'INVOICE').length})
          </button>
          <button
            onClick={() => {
              setTypeFilter('PAYMENT');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              typeFilter === 'PAYMENT'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-emerald-800'
            }`}
          >
            سندات القبض ({transactions.filter((t) => t.type === 'PAYMENT').length})
          </button>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            {transactions.length === 0
              ? 'لا توجد أي حركات مالية مسجلة في كشف حساب العميل حتى الآن'
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
                  <th className="py-3.5 px-4 text-left w-36">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTransactions.map((t) => {
                  const isDebit = t.type === 'INVOICE';
                  const dateObj = new Date(t.createdAt);

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (isDebit && t.orderId) {
                          handleOpenInvoice(t.orderId);
                        } else if (!isDebit && t.paymentId) {
                          handleOpenReceipt(t.paymentId);
                        }
                      }}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        <div>
                          <span>
                            {dateObj.toLocaleDateString('ar-YE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {dateObj.toLocaleTimeString('ar-YE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <Badge
                          variant={isDebit ? 'amber' : 'emerald'}
                          className="text-[11px] font-semibold"
                        >
                          {isDebit ? 'فاتورة مبيعات' : 'سند قبض'}
                        </Badge>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{t.description}</span>
                          {t.orderId && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              طلب
                            </span>
                          )}
                          {t.paymentId && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              سند
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                        <span className={isDebit ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                          {isDebit ? `+${formatMoney(t.amount)}` : `-${formatMoney(Math.abs(t.amount))}`}
                        </span>
                      </td>

                      {/* Balance After */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatMoney(t.newBalance)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isDebit && t.orderId ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenInvoice(t.orderId!)}
                                className="h-7 px-2 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>الفاتورة</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickPrintInvoice(t.orderId!)}
                                className="h-7 px-2 text-[11px] text-slate-700 hover:bg-slate-100"
                                title="طباعة الفاتورة مباشرة"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </Button>
                            </>
                          ) : !isDebit && t.paymentId ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReceipt(t.paymentId!)}
                                className="h-7 px-2 text-[11px] text-emerald-800 border-emerald-200 hover:bg-emerald-50 gap-1"
                                title="عرض تفاصيل السند"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                <span>السند</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickPrintReceipt(t.paymentId!)}
                                className="h-7 px-2 text-[11px] text-slate-700 hover:bg-slate-100"
                                title="طباعة سند القبض مباشرة"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
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

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={selectedInvoice}
        isLoading={isDocLoading}
        onPrint={(ord) => handlePrint({ type: 'invoice', order: ord })}
      />

      {/* Receipt Detail Dialog */}
      <ReceiptDetailDialog
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={selectedPayment}
        isLoading={isDocLoading}
        onPrint={(pay) => handlePrint({ type: 'receipt', payment: pay })}
      />

      {/* Printable Documents Root (Rendered via Portal onto document.body for clean isolation) */}
      {mounted &&
        createPortal(
          <div className="print-only-portal">
            {activePrint?.type === 'invoice' ? (
              <PrintableInvoice order={activePrint.order} />
            ) : activePrint?.type === 'receipt' ? (
              <PrintableReceipt payment={activePrint.payment} />
            ) : (
              <PrintableStatement
                customer={customer}
                transactions={transactions}
                totalInvoices={totalInvoices}
                totalPayments={totalPayments}
                balance={balance}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
