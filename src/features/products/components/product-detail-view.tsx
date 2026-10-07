'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Loader2,
  Tag,
  DollarSign,
  Edit,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Dialog } from '@/shared/ui/dialog';
import { formatMoney } from '@/core/domain/money';
import type { ProductDetail } from '../domain/product';
import type { ProductVariant } from '../domain/variant';
import type { ProductPricing } from '../domain/pricing';
import type { InventoryMovement } from '@/features/inventory/domain/inventory';
import { adjustStockAction } from '../actions/product.actions';

interface ProductDetailViewProps {
  product: ProductDetail;
  pricing: ProductPricing | null;
  movements: InventoryMovement[];
}

export function ProductDetailView({
  product,
  pricing,
  movements: initialMovements,
}: ProductDetailViewProps) {
  const router = useRouter();
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);
  const [movements, setMovements] = useState<InventoryMovement[]>(initialMovements);
  const [isPending, startTransition] = useTransition();

  // Stock Adjustment Dialog
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [newStockQty, setNewStockQty] = useState('');
  const [reason, setReason] = useState('جرد مستودع دوري');

  const openAdjustDialog = (v: ProductVariant) => {
    setSelectedVariant(v);
    setNewStockQty(v.stockQty.toString());
    setReason('جرد مستودع دوري');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    const qty = parseInt(newStockQty, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('الكمية يجب أن تكون صفرًا أو أكبر');
      return;
    }

    if (qty < selectedVariant.reservedQty) {
      toast.error(
        `لا يمكن تقليل المخزون إلى أقل من المحجوز حاليًا (${selectedVariant.reservedQty} قطعة)`
      );
      return;
    }

    if (!reason.trim()) {
      toast.error('يرجى كتابة سبب التعديل');
      return;
    }

    startTransition(async () => {
      try {
        const res = await adjustStockAction({
          productId: product.id,
          variantId: selectedVariant.id,
          newStockQty: qty,
          reason: reason.trim(),
        });

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success('تم تعديل المخزون وتسجيل حركة المستودع بنجاح');
        const updatedVariant = selectedVariant;
        setVariants((prev) =>
          prev.map((v) =>
            v.id === updatedVariant.id
              ? {
                  ...v,
                  stockQty: res.data.newStockQty,
                  availableQty: res.data.availableQty,
                  stockState:
                    res.data.availableQty <= 0
                      ? 'out'
                      : res.data.availableQty <= v.lowStockThreshold
                        ? 'low'
                        : 'in_stock',
                }
              : v
          )
        );

        setMovements((prev) => [
          {
            id: `mov-${Date.now()}`,
            productId: product.id,
            variantId: updatedVariant.id,
            type: 'ADJUSTMENT',
            delta: res.data.delta,
            stockAfter: res.data.newStockQty,
            reservedAfter: updatedVariant.reservedQty,
            orderId: null,
            reason: reason.trim(),
            actorId: '',
            createdAt: new Date(),
          },
          ...prev,
        ]);

        setSelectedVariant(null);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ غير متوقع');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{product.name}</h1>
              <Badge variant={product.status === 'active' ? 'success' : 'neutral'}>
                {product.status === 'active' ? 'نشط' : product.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              /p/{product.slug} {product.sku && `• SKU: ${product.sku}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 text-right">
            <span className="text-[11px] text-blue-800 block font-medium">سعر التجزئة</span>
            <span className="text-sm font-black text-emerald-900">
              {formatMoney(product.retailPrice)}
            </span>
          </div>

          {pricing && (
            <div className="bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-100 text-right">
              <span className="text-[11px] text-amber-700 block font-medium">سعر التاجر (جملة)</span>
              <span className="text-sm font-black text-amber-900">
                {formatMoney(pricing.wholesalePrice)}
              </span>
            </div>
          )}

          <Link href={`/admin/products/${product.id}/edit?returnUrl=/admin/products/${product.id}`}>
            <Button
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>تعديل بيانات المنتج</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Variants & Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              إدارة مخزون المتغيرات ({variants.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Available = Stock - Reserved (المتوفر = الكلي - المحجوز)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">الخيار / المتغير</th>
                <th className="py-3 px-3 text-center">المخزون الكلي</th>
                <th className="py-3 px-3 text-center">المحجوز للطلبات</th>
                <th className="py-3 px-3 text-center">المتوفر للبيع</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-3 text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-slate-900 text-sm">{v.label}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {v.id} {v.sku && `• SKU: ${v.sku}`}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900 text-sm">
                    {v.stockQty}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono text-amber-600 font-bold">
                    {v.reservedQty > 0 ? (
                      <span className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {v.reservedQty}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono font-black text-blue-800 text-sm">
                    {v.availableQty}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {v.stockState === 'in_stock' && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" /> متوفر
                      </Badge>
                    )}
                    {v.stockState === 'low' && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="w-3 h-3" /> مخزون منخفض
                      </Badge>
                    )}
                    {v.stockState === 'out' && (
                      <Badge variant="danger" className="gap-1">
                        <XCircle className="w-3 h-3" /> نفد المخزون
                      </Badge>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-left">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdjustDialog(v)}
                      className="text-xs h-8 flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      <span>تعديل المخزون</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movements History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">سجل حركات المخزون</h2>
        </div>

        {movements.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">لا توجد حركات مسجلة بعد</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3 text-center">الفرق (Delta)</th>
                  <th className="py-2.5 px-3 text-center">المخزون بعد الحركة</th>
                  <th className="py-2.5 px-3">السبب / الملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {m.createdAt.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      <span className={m.delta > 0 ? 'text-blue-700' : 'text-rose-600'}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {m.stockAfter}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{m.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog
        isOpen={!!selectedVariant}
        onClose={() => setSelectedVariant(null)}
        title={`تعديل مخزون: ${selectedVariant?.label}`}
      >
        {selectedVariant && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">المخزون الكلي الحالي:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedVariant.stockQty} قطعة
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المحجوز في طلبات قيد التجهيز:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {selectedVariant.reservedQty} قطعة
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المتوفر حاليًا:</span>
                <span className="font-bold text-blue-800 font-mono">
                  {selectedVariant.availableQty} قطعة
                </span>
              </div>
            </div>

            <Input
              label="الكمية الكلية الجديدة في المستودع *"
              type="number"
              value={newStockQty}
              onChange={(e) => setNewStockQty(e.target.value)}
              min={selectedVariant.reservedQty}
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب التعديل (إلزامي للرقابة والمراجعة) *
              </label>
              <Input
                placeholder="مثال: جرد دوري، استلام شحنة جديدة، تالف..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedVariant(null)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>اعتماد تعديل المخزون</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}

