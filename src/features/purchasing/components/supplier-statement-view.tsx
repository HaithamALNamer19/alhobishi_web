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
  Trash2,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import { toast } from '@/shared/ui/toast';
import { RecordSupplierPaymentDialog } from './record-supplier-payment-dialog';
import { SupplierPaymentVoucherDialog } from './supplier-payment-voucher-dialog';
import { PrintableSupplierVoucher } from './printable-supplier-voucher';
import { PrintableSupplierStatement } from './printable-supplier-statement';
import { EditPurchaseInvoiceDialog } from './edit-purchase-invoice-dialog';
import { EditSupplierPaymentDialog } from './edit-supplier-payment-dialog';
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

  const handlePrintStatement = () => {
    handlePrint({ type: 'statement' });
  };

  const handlePrintVoucher = (payment: any) => {
    handlePrint({ type: 'voucher', payment });
  };

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
      return matchDesc || matchRef || matchNotes || matchItems;
    });
  }, [initialTransactions, typeFilter, search]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

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
        invoice_number: tx.reference_number,
        supplier_name: supplier.name,
        total_amount: tx.credit,
        items: tx.items || [],
        createdAt: tx.createdAt,
      });
    } else if (tx.type === 'PURCHASE_RETURN') {
      setSelectedReturn({
        id: tx.reference_id || tx.id,
        return_number: tx.reference_number,
        supplier_name: supplier.name,
        total_amount: tx.debit,
        items: tx.items || [],
        createdAt: tx.createdAt,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16" dir="rtl">
      {/* 1. Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Link
              href={backHref}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="رجوع لسجل الموردين"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  كشف حساب: {supplier.name}
                </h1>
                {supplier.company_name && (
                  <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200">
                    {supplier.company_name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                {supplier.phone && (
                  <span className="flex items-center gap-1 font-mono" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{supplier.phone}</span>
                  </span>
                )}
                <span>سجل تفصيلي لكافة فواتير الشراء، سندات الصرف، ومردودات المشتريات.</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintStatement}
              className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl px-3.5 py-2 shadow-xs text-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة كشف الحساب</span>
            </Button>
          </div>
        </div>

        {/* Financial Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
              إجمالي فواتير الشراء (له)
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900">
              {formatMoney(initialPurchases)}
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
            <span className="text-[11px] font-bold text-blue-800 block mb-0.5">
              إجمالي المسدد (سندات صرف)
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-900">
              {formatMoney(initialPayments)}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800 block mb-0.5">
              إجمالي المردودات (عليه)
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-900">
              {formatMoney(initialReturns)}
            </span>
          </div>

          <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
            <span className="text-[11px] font-bold text-rose-800 block mb-0.5">
              الرصيد المتبقي المستحق
            </span>
            <span
              className={`text-base sm:text-lg font-black font-mono ${
                initialBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {formatMoney(initialBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'PURCHASE', label: 'فواتير الشراء' },
            { id: 'PAYMENT', label: 'سندات الصرف' },
            { id: 'PURCHASE_RETURN', label: 'مردودات المشتريات' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTypeFilter(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، السند، أو الصنف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
      </div>

      {/* 3. Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            {initialTransactions.length === 0
              ? 'لا توجد أي حركات مالية مسجلة لهذا المورد حتى الآن.'
              : 'لا توجد نتائج مطابقة لمعايير البحث الحالية.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">نوع المستند</th>
                  <th className="py-3 px-4">رقم المرجع</th>
                  <th className="py-3 px-4">البيان والملاحظات</th>
                  <th className="py-3 px-4 text-center">له (دائن)</th>
                  <th className="py-3 px-4 text-center">عليه (مدين)</th>
                  <th className="py-3 px-4 text-center">الرصيد التراكمي</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((tx) => {
                  const dateObj = new Date(tx.createdAt);
                  const isValidDate = !isNaN(dateObj.getTime());

                  const isPurchase = tx.type === 'PURCHASE';
                  const isPayment = tx.type === 'PAYMENT';
                  const isReturn = tx.type === 'PURCHASE_RETURN';
                  const isInitial = tx.type === 'INITIAL_BALANCE';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {isValidDate
                          ? dateObj.toLocaleDateString('ar-YE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPurchase && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            فاتورة شراء
                          </span>
                        )}
                        {isPayment && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            سند صرف
                          </span>
                        )}
                        {isReturn && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            مردود مشتريات
                          </span>
                        )}
                        {isInitial && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            رصيد افتتاحي
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700" dir="ltr">
                        {tx.reference_number || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate">
                        {tx.description}
                        {tx.bank_or_exchange && (
                          <span className="text-[11px] text-slate-400 block">
                            عبر: {tx.bank_or_exchange}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                        {tx.credit > 0 ? formatMoney(tx.credit) : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-700">
                        {tx.debit > 0 ? formatMoney(tx.debit) : '-'}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-center font-mono font-black ${
                          tx.balance_after > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatMoney(tx.balance_after)}
                      </td>

                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1">
                          {(isPurchase || isReturn || isPayment) && (
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(tx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="معاينة تفاصيل المستند"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {isPayment && (
                            <button
                              type="button"
                              onClick={() =>
                                handlePrintVoucher({
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
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="طباعة سند الصرف"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {(isPurchase || isPayment) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isPurchase) {
                                  setEditingInvoice({
                                    id: tx.reference_id || tx.id,
                                    invoice_number: tx.reference_number || tx.id,
                                    supplier_name: supplier.name,
                                    total_amount: tx.credit,
                                    createdAt: tx.createdAt,
                                    items: tx.items || [],
                                  });
                                } else if (isPayment) {
                                  setEditingPayment({
                                    id: tx.reference_id || tx.id,
                                    voucher_number: tx.reference_number || tx.id,
                                    supplier_id: supplier.id,
                                    supplier_name: supplier.name,
                                    amount: tx.debit,
                                    payment_method: tx.payment_method || 'CASH',
                                    reference_number: tx.reference_number || null,
                                    bank_or_exchange: tx.bank_or_exchange || null,
                                    notes: tx.notes || null,
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="تعديل المستند"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {(isPurchase || isPayment) && (
                            <button
                              type="button"
                              onClick={() => setDeletingTransaction(tx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="حذف المستند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              إجمالي الحركات: {filteredTransactions.length}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
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
        />
      )}

      {/* Purchase Invoice Detail Modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  تفاصيل فاتورة الشراء #{selectedInvoice.invoice_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المورد: {selectedInvoice.supplier_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3 text-center">الكمية</th>
                    <th className="py-2 px-3 text-center">سعر التكلفة</th>
                    <th className="py-2 px-3 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoice.items || []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-slate-900">{it.product_name || 'صنف'}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                        {it.quantity}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{formatMoney(it.cost_price)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                        {formatMoney(it.quantity * it.cost_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">إجمالي الفاتورة:</span>
              <span className="font-black font-mono text-base text-blue-700">
                {formatMoney(selectedInvoice.total_amount)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Return Detail Modal */}
      {selectedReturn && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  تفاصيل مردود المشتريات #{selectedReturn.return_number}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المورد: {selectedReturn.supplier_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">الصنف المرجع</th>
                    <th className="py-2 px-3 text-center">الكمية</th>
                    <th className="py-2 px-3 text-center">سعر التكلفة</th>
                    <th className="py-2 px-3 text-center">الإجمالي المخصوم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedReturn.items || []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-slate-900">{it.product_name || 'صنف'}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                        {it.quantity}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{formatMoney(it.cost_price)}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                        {formatMoney(it.quantity * it.cost_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">إجمالي المردود:</span>
              <span className="font-black font-mono text-base text-amber-700">
                {formatMoney(selectedReturn.total_amount)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedReturn(null)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
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
          </div>,
          document.body
        )}
    </div>
  );
}

