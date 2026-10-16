'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  Layers,
  ArrowRight,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
  DollarSign,
  Edit,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import type { ProductDetail } from '../domain/product';
import type { ProductVariant } from '../domain/variant';
import type { ProductPricing } from '../domain/pricing';
import type { InventoryMovement } from '@/features/inventory/domain/inventory';

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
  const [variants] = useState<ProductVariant[]>(product.variants);
  const [movements] = useState<InventoryMovement[]>(initialMovements);

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
              أرصدة مخزون المتغيرات ({variants.length})
            </h2>
          </div>
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
    </div>
  );
}

