'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Printer,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { formatMoney } from '@/core/domain/money';
import { CreatePurchaseDialog } from './create-purchase-dialog';
import { EditPurchaseInvoiceDialog } from './edit-purchase-invoice-dialog';
import { PurchaseInvoiceDetailDialog } from './purchase-invoice-detail-dialog';
import { DeleteTransactionConfirmDialog } from './delete-transaction-confirm-dialog';
import { PrintablePurchaseInvoice } from './printable-purchase-invoice';
import type { SerializedSupplier } from './suppliers-manager';

export interface SerializedPurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    quantity: number;
    cost_price: number;
  }>;
  total_amount: number;
  createdAt: string;
}

interface PurchasesManagerProps {
  initialPurchases: SerializedPurchaseInvoice[];
  suppliers: SerializedSupplier[];
  defaultSupplierId?: string | null;
}

export function PurchasesManager({
  initialPurchases,
  suppliers,
  defaultSupplierId,
}: PurchasesManagerProps) {
  const router = useRouter();
  const [purchases, setPurchases] = useState<SerializedPurchaseInvoice[]>(initialPurchases);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(defaultSupplierId));
  const [selectedInvoice, setSelectedInvoice] = useState<SerializedPurchaseInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<SerializedPurchaseInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<SerializedPurchaseInvoice | null>(null);
  const [printDoc, setPrintDoc] = useState<SerializedPurchaseInvoice | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setPurchases(initialPurchases);
  }, [initialPurchases]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchases;
    const q = search.toLowerCase();
    return purchases.filter((p) => {
      const matchNumber = (p.invoice_number || '').toLowerCase().includes(q);
      const matchSupplier = (p.supplier_name || '').toLowerCase().includes(q);
      return matchNumber || matchSupplier;
    });
  }, [purchases, search]);

  // Paginated purchases
  const totalPages = Math.ceil(filteredPurchases.length / pageSize) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  const handlePrint = (invoice: SerializedPurchaseInvoice) => {
    setPrintDoc(invoice);
    document.body.classList.add('print-active');
    const originalTitle = document.title;
    document.title = ' ';

    const handleAfterPrint = () => {
      document.title = originalTitle;
      document.body.classList.remove('print-active');
      setPrintDoc(null);
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 font-sans" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
              <Receipt className="w-6 h-6" />
            </span>
            <span>فواتير الشراء والتوريد</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل وإدارة فواتير الشراء من الموردين، زيادة كميات المخزون وحساب تكلفة البضاعة
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء فاتورة شراء جديدة</span>
        </Button>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث برقم الفاتورة أو اسم المورد..."
              className="pr-9 text-xs"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredPurchases.length} فاتورة
          </span>
        </div>

        {/* Purchases Table */}
        {paginatedPurchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">
              {purchases.length === 0
                ? 'لا توجد فواتير شراء مسجلة حتى الآن'
                : 'لا توجد فواتير مطابقة لبحثك الحالي'}
            </p>
            <p className="text-[11px] text-slate-400">
              يمكنك الضغط على زر "إنشاء فاتورة شراء جديدة" للبدء بتسجيل المشتريات.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4 text-center">الأصناف والقطع</th>
                  <th className="py-3.5 px-4 text-center">إجمالي الفاتورة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedPurchases.map((p) => {
                  const dateObj = new Date(p.purchase_date || p.createdAt);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';
                  const unitsCount = (p.items || []).reduce((s, it) => s + (it.quantity || 0), 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                          {p.invoice_number}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.supplier_id ? (
                          <Link
                            href={`/admin/purchasing/suppliers/${p.supplier_id}/statement`}
                            className="hover:text-blue-700 transition-colors flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.supplier_name || 'مورد'}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.supplier_name || 'مورد'}</span>
                          </div>
                        )}
                      </td>

                      {/* Items & Units */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{(p.items || []).length} صنف</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ({unitsCount} قطعة)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-blue-700 text-sm">
                        {formatMoney(p.total_amount)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(p)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="عرض تفاصيل الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInvoice(p)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل الفاتورة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="طباعة الفاتورة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInvoice(p)}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Create Purchase Dialog */}
      {isCreateModalOpen && (
        <CreatePurchaseDialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          suppliers={suppliers}
          preselectedSupplierId={defaultSupplierId}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* View Invoice Detail Dialog */}
      <PurchaseInvoiceDetailDialog
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onPrint={handlePrint}
        onEdit={(inv) => {
          setSelectedInvoice(null);
          setEditingInvoice(inv);
        }}
      />

      {/* Edit Purchase Invoice Dialog */}
      {editingInvoice && (
        <EditPurchaseInvoiceDialog
          isOpen={Boolean(editingInvoice)}
          onClose={() => setEditingInvoice(null)}
          invoice={editingInvoice}
          supplierId={editingInvoice.supplier_id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Delete Purchase Invoice Dialog */}
      {deletingInvoice && (
        <DeleteTransactionConfirmDialog
          isOpen={Boolean(deletingInvoice)}
          onClose={() => setDeletingInvoice(null)}
          transaction={{
            id: deletingInvoice.id,
            type: 'PURCHASE',
            reference_id: deletingInvoice.id,
            reference_number: deletingInvoice.invoice_number,
            credit: deletingInvoice.total_amount,
            debit: 0,
            description: `فاتورة شراء #${deletingInvoice.invoice_number}`,
            items: deletingInvoice.items,
          }}
          supplierId={deletingInvoice.supplier_id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Printable Document Root (Rendered via Portal onto document.body for clean isolation) */}
      {mounted &&
        printDoc &&
        createPortal(
          <div className="print-only-portal">
            <PrintablePurchaseInvoice invoice={printDoc} />
          </div>,
          document.body
        )}
    </div>
  );
}
