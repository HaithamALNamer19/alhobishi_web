'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Printer,
  FileText,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { CreatePurchaseDialog } from './create-purchase-dialog';
import { PrintablePurchaseInvoice } from './printable-purchase-invoice';
import type { SerializedSupplier } from './suppliers-manager';
import type { PurchaseInvoice } from '../domain/purchasing';

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

  const filteredPurchases = purchases.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchNumber = (p.invoice_number || '').toLowerCase().includes(q);
    const matchSupplier = (p.supplier_name || '').toLowerCase().includes(q);
    return matchNumber || matchSupplier;
  });

  const [mounted, setMounted] = useState(false);
  const [printDoc, setPrintDoc] = useState<SerializedPurchaseInvoice | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-blue-700" />
            <span>فواتير الشراء والتوريد</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل فواتير الشراء من الموردين، زيادة كميات المخزون وحساب تكلفة البضاعة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl px-4 py-2.5 shadow-xs text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء فاتورة شراء جديدة</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو اسم المورد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            {purchases.length === 0
              ? 'لا توجد فواتير شراء مسجلة حتى الآن. اضغط "إنشاء فاتورة شراء جديدة" للبدء.'
              : 'لا توجد فواتير مطابقة لبحثك الحالي.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">م</th>
                  <th className="py-3.5 px-4">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4 text-center">تاريخ الشراء</th>
                  <th className="py-3.5 px-4 text-center">الأصناف والقطع</th>
                  <th className="py-3.5 px-4 text-center">إجمالي الفاتورة</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPurchases.map((p, idx) => {
                  const dateObj = new Date(p.purchase_date);
                  const isValidDate = !isNaN(dateObj.getTime());
                  const unitsCount = (p.items || []).reduce((s, it) => s + (it.quantity || 0), 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                          {p.invoice_number}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.supplier_name || 'مورد'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {isValidDate ? (
                          <span suppressHydrationWarning>
                            {dateObj.toLocaleDateString('ar-YE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono">
                        <span className="font-bold text-slate-800">{(p.items || []).length} صنف</span>
                        <span className="text-[10px] text-slate-400 block">({unitsCount} قطعة)</span>
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-black text-slate-900 text-sm">
                        {formatMoney(p.total_amount)}
                      </td>

                      <td className="py-4 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(p)}
                            className="h-7 px-2.5 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(p)}
                            className="h-7 px-2.5 text-[11px] text-slate-700 border-slate-200 hover:bg-slate-50 gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  {selectedInvoice.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-slate-900">{it.product_name}</td>
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

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                onClick={() => handlePrint(selectedInvoice)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold gap-1.5 px-4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الفاتورة</span>
              </Button>
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

      {/* Printable Document Root (Rendered via Portal onto document.body for clean isolation and official styling) */}
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

