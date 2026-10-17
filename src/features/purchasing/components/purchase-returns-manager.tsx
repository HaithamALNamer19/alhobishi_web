'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Undo2,
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
import { CreatePurchaseReturnDialog } from './create-purchase-return-dialog';
import { EditPurchaseReturnDialog } from './edit-purchase-return-dialog';
import { PurchaseReturnDetailDialog } from './purchase-return-detail-dialog';
import { DeleteTransactionConfirmDialog } from './delete-transaction-confirm-dialog';
import { PrintablePurchaseReturnInvoice } from './printable-purchase-return-invoice';
import type { SerializedSupplier } from './suppliers-manager';

export interface SerializedPurchaseReturn {
  id: string;
  return_number: string;
  purchase_id: string;
  supplier_id: string;
  supplier_name: string;
  return_date: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    quantity: number;
    cost_price: number;
  }>;
  total_amount: number;
  createdAt: string;
}

interface PurchaseReturnsManagerProps {
  initialReturns: SerializedPurchaseReturn[];
  suppliers: SerializedSupplier[];
  defaultSupplierId?: string | null;
}

export function PurchaseReturnsManager({
  initialReturns,
  suppliers,
  defaultSupplierId,
}: PurchaseReturnsManagerProps) {
  const router = useRouter();
  const [returns, setReturns] = useState<SerializedPurchaseReturn[]>(initialReturns);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(Boolean(defaultSupplierId));
  const [selectedReturn, setSelectedReturn] = useState<SerializedPurchaseReturn | null>(null);
  const [editingReturn, setEditingReturn] = useState<SerializedPurchaseReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<SerializedPurchaseReturn | null>(null);
  const [printDoc, setPrintDoc] = useState<SerializedPurchaseReturn | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setReturns(initialReturns);
  }, [initialReturns]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter returns
  const filteredReturns = useMemo(() => {
    if (!search.trim()) return returns;
    const q = search.toLowerCase();
    return returns.filter((r) => {
      const matchNumber = (r.return_number || '').toLowerCase().includes(q);
      const matchSupplier = (r.supplier_name || '').toLowerCase().includes(q);
      const matchPurchaseId = (r.purchase_id || '').toLowerCase().includes(q);
      return matchNumber || matchSupplier || matchPurchaseId;
    });
  }, [returns, search]);

  // Paginated returns
  const totalPages = Math.ceil(filteredReturns.length / pageSize) || 1;
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  const handlePrint = (ret: SerializedPurchaseReturn) => {
    setPrintDoc(ret);
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
            <span className="p-2 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
              <Undo2 className="w-6 h-6" />
            </span>
            <span>فواتير مردود المشتريات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إرجاع بضاعة تالفة أو غير مطابقة للموردين، خصم المخزون وتخفيض مديونية المورد تلقائياً
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء مردود مشتريات جديد</span>
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
              placeholder="البحث برقم المردود، اسم المورد، أو رقم الفاتورة..."
              className="pr-9 text-xs"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredReturns.length} فاتورة
          </span>
        </div>

        {/* Returns Table */}
        {paginatedReturns.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <Undo2 className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600">
              {returns.length === 0
                ? 'لا توجد فواتير مردود مشتريات حتى الآن'
                : 'لا توجد فواتير مطابقة لبحثك الحالي'}
            </p>
            <p className="text-[11px] text-slate-400">
              يمكنك الضغط على زر "إنشاء مردود مشتريات جديد" لإرجاع بضاعة إلى مورد.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">رقم المردود</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4">مرجع الشراء</th>
                  <th className="py-3.5 px-4 text-center">الأصناف والقطع</th>
                  <th className="py-3.5 px-4 text-center">إجمالي المبلغ</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedReturns.map((ret) => {
                  const dateObj = new Date(ret.return_date || ret.createdAt);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';
                  const unitsCount = (ret.items || []).reduce((s, it) => s + (it.quantity || 0), 0);

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Return Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                          {ret.return_number}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {ret.supplier_id ? (
                          <Link
                            href={`/admin/purchasing/suppliers/${ret.supplier_id}/statement`}
                            className="hover:text-blue-700 transition-colors flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ret.supplier_name || 'مورد'}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ret.supplier_name || 'مورد'}</span>
                          </div>
                        )}
                      </td>

                      {/* Purchase Reference */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {ret.purchase_id ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {ret.purchase_id}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Items & Units */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{(ret.items || []).length} صنف</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ({unitsCount} قطعة)
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-center font-mono font-black text-rose-700 text-sm">
                        {formatMoney(ret.total_amount)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedReturn(ret)}
                            className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors cursor-pointer select-none shadow-2xs"
                            title="عرض تفاصيل المردود"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>عرض</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingReturn(ret)}
                            className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 transition-colors cursor-pointer select-none shadow-2xs"
                            title="حذف المردود"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف</span>
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

      {/* Create Purchase Return Dialog */}
      {isCreateModalOpen && (
        <CreatePurchaseReturnDialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          suppliers={suppliers}
          preselectedSupplierId={defaultSupplierId}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* View Return Detail Dialog */}
      <PurchaseReturnDetailDialog
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        returnDoc={selectedReturn}
        onPrint={handlePrint}
        onEdit={(doc) => {
          setSelectedReturn(null);
          setEditingReturn(doc);
        }}
      />

      {/* Edit Purchase Return Dialog */}
      {editingReturn && (
        <EditPurchaseReturnDialog
          isOpen={Boolean(editingReturn)}
          onClose={() => setEditingReturn(null)}
          returnDoc={editingReturn}
          supplierId={editingReturn.supplier_id}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Delete Purchase Return Dialog */}
      {deletingReturn && (
        <DeleteTransactionConfirmDialog
          isOpen={Boolean(deletingReturn)}
          onClose={() => setDeletingReturn(null)}
          transaction={{
            id: deletingReturn.id,
            type: 'PURCHASE_RETURN',
            reference_id: deletingReturn.id,
            reference_number: deletingReturn.return_number,
            credit: 0,
            debit: deletingReturn.total_amount,
            description: `فاتورة مردود مشتريات #${deletingReturn.return_number}`,
            items: deletingReturn.items,
          }}
          supplierId={deletingReturn.supplier_id}
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
            <PrintablePurchaseReturnInvoice returnDoc={printDoc} />
          </div>,
          document.body
        )}
    </div>
  );
}
