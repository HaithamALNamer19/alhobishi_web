import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { getCurrentSession } from '@/core/auth/require-auth';
import { Card } from '@/shared/ui/card';
import { RoleBadge, Badge } from '@/shared/ui/badge';
import { can, Permission } from '@/core/auth/roles';
import { formatMoney } from '@/core/domain/money';
import { ORDER_STATUS_LABELS } from '@/features/orders/domain/order';
import { getAdminDashboardMetrics } from '@/features/admin/services/dashboard.service';
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  Users,
  PackageSearch,
  ArrowLeft,
  ShieldAlert,
  Store,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Package,
  Boxes,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';

export const metadata = {
  title: 'لوحة التحكم والمؤشرات | المتجر',
};

export const instant = false;

export default async function AdminDashboardPage() {
  await connection();
  const [session, metrics] = await Promise.all([
    getCurrentSession(),
    getAdminDashboardMetrics(),
  ]);

  const isAdmin = can(session?.role, Permission.USERS_MANAGE_ROLES);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>لوحة المؤشرات والعمليات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة حية للطلبات اليومية، تنبيهات الأصناف المنتهية، والمخزون، والعمليات المالية
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {session?.role && <RoleBadge role={session.role} />}
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            title="معاينة واجهة المتجر كما يراها العملاء"
          >
            <Store className="w-4 h-4 text-blue-700" />
            <span>معاينة المتجر</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">
            محطة العمل الأساسية
          </span>
          <h2 className="text-xl sm:text-2xl font-black">
            شاشة طلبات اليوم للتجهيز
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/80 max-w-xl leading-relaxed">
            متابعة الطلبات الواردة لليوم وتجهيز الأصناف المتبقية بنداً بنداً وتأكيد الجهوزية فوراً لقفل الفواتير.
          </p>
        </div>

        <Link
          href="/admin/orders/today"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-950 font-black text-sm hover:bg-blue-50 transition-all shrink-0 shadow-lg relative z-10 active:scale-95"
        >
          <CalendarCheck2 className="w-5 h-5 text-blue-700" />
          <span>فتح طلبات اليوم ({metrics.todayOrdersCount})</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* 1. Core Operations Overview (Accurate Dynamic Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders Card */}
        <Link href="/admin/orders?status=PENDING" className="block group">
          <Card className="p-5 rounded-3xl transition-all group-hover:border-amber-400 group-hover:shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">
                طلبات بانتظار التجهيز
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {metrics.pendingOrdersCount}
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              طلبات جديدة بحاجة للتجهيز
            </p>
          </Card>
        </Link>

        {/* Ready Orders Card */}
        <Link href="/admin/orders?status=READY" className="block group">
          <Card className="p-5 rounded-3xl transition-all group-hover:border-blue-400 group-hover:shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">
                طلبات جاهزة للاعتماد
              </span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {metrics.readyOrdersCount}
            </div>
            <p className="text-[11px] text-blue-700 font-medium mt-1">
              تم تجهيزها وبانتظار اعتماد الفاتورة
            </p>
          </Card>
        </Link>

        {/* Out of Stock & Inventory Alerts Card */}
        <Link href="#stock-alerts-section" className="block group">
          <Card
            className={`p-5 rounded-3xl transition-all ${
              metrics.outOfStockProductsCount > 0
                ? 'border-rose-200 bg-rose-50/20 group-hover:border-rose-400'
                : 'group-hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">
                تنبيهات المخزون
              </span>
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
                  metrics.outOfStockProductsCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 font-mono">
              {metrics.totalStockAlertsCount}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              {metrics.outOfStockProductsCount > 0 ? (
                <span className="text-rose-700 font-bold">
                  {metrics.outOfStockProductsCount} منتج نفد مخزونه
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">المخزون مستقر</span>
              )}
              {metrics.lowStockProductsCount > 0 && (
                <span className="text-amber-700">
                  • {metrics.lowStockProductsCount} وشك النفاد
                </span>
              )}
            </div>
          </Card>
        </Link>

        {/* Today's Sales Card */}
        <Card className="p-5 rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">مبيعات اليوم</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatMoney(metrics.todaySalesAmount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            إجمالي {metrics.todayOrdersCount} طلب مسجل اليوم
          </p>
        </Card>
      </div>

      {/* 2. Secondary Overview (Financials & Store Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Products */}
        <Link href="/admin/products" className="block group">
          <Card className="p-5 rounded-3xl transition-all group-hover:border-blue-400 group-hover:shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي المنتجات</span>
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.totalProductsCount} <span className="text-xs font-normal text-slate-500">منتج</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="text-emerald-600 font-bold">
                {metrics.inStockProductsCount} متوفر للبيع
              </span>
              <span>•</span>
              <span className="text-rose-600 font-bold">
                {metrics.outOfStockProductsCount} منتهي
              </span>
            </div>
          </Card>
        </Link>

        {/* Total Customers & Traders */}
        <Link href="/admin/customers" className="block group">
          <Card className="p-5 rounded-3xl transition-all group-hover:border-indigo-400 group-hover:shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">العملاء والتجار</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {metrics.totalCustomersCount} <span className="text-xs font-normal text-slate-500">مستخدم</span>
            </div>
            <p className="text-[11px] text-indigo-700 font-medium mt-1">
              منهم {metrics.wholesaleCount} تاجر جملة معتمد
            </p>
          </Card>
        </Link>

        {/* Total Receivables */}
        <Link href="/admin/payments" className="block group">
          <Card className="p-5 rounded-3xl transition-all group-hover:border-amber-400 group-hover:shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي المديونيات المستحقة</span>
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatMoney(metrics.totalReceivables)}
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              أرصدة مدينة على حسابات العملاء والتجار
            </p>
          </Card>
        </Link>
      </div>

      {/* 3. Detailed Inventory Alerts Section (Out of Stock & Low Stock Items) */}
      <div id="stock-alerts-section" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">
                سجل تنبيهات المخزون والأصناف المنتهية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                قائمة بالأصناف التي نفد مخزونها تماماً أو أوشكت على النفاد لاتخاذ إجراء التوريد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="rose" className="font-mono font-bold">
              المنتهية: {metrics.outOfStockProductsCount}
            </Badge>
            <Badge variant="amber" className="font-mono font-bold">
              وشك النفاد: {metrics.lowStockProductsCount}
            </Badge>
          </div>
        </div>

        {metrics.stockAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">المخزون في حالة ممتازة</h4>
            <p className="text-xs text-slate-400">
              لا توجد حالياً أي منتجات منتهية أو قاربت على النفاد في المستودع.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">اسم المنتج</th>
                  <th className="py-3.5 px-4">الخيار / الصنف</th>
                  <th className="py-3.5 px-4 font-mono">رمز SKU</th>
                  <th className="py-3.5 px-4 text-center">المخزون المتبقي</th>
                  <th className="py-3.5 px-4 text-center">حد التنبيه</th>
                  <th className="py-3.5 px-4 text-center">حالة الصنف</th>
                  <th className="py-3.5 px-4 text-left">إجراء سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.stockAlerts.map((item, idx) => (
                  <tr key={`${item.productId}-${item.variantId}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="hover:text-blue-700 transition-colors"
                      >
                        {item.productName}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {item.variantLabel}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {item.sku || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                      {item.availableQty <= 0 ? (
                        <span className="text-rose-600">0</span>
                      ) : (
                        <span className="text-amber-600">{item.availableQty}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {item.threshold}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {item.state === 'out' ? (
                        <Badge variant="rose" size="sm" className="gap-1 font-bold">
                          <XCircle className="w-3 h-3" />
                          <span>نفد المخزون</span>
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm" className="gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>وشك النفاد</span>
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-left">
                      <Link href={`/admin/products/${item.productId}`}>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-all hover:bg-blue-100">
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>تعديل المخزون</span>
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-slate-900">أحدث الطلبات الواردة</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              آخر الطلبات المسجلة في النظام مع حالتها وإجمالي قيمتها
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>عرض كل الطلبات ({metrics.totalOrdersCount})</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.recentOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد طلبات مسجلة حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">رقم الطلب</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-center">الأصناف</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {o.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {o.businessDate}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold">
                      {o.items.length}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatMoney(o.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          o.status === 'READY'
                            ? 'emerald'
                            : o.status === 'CONFIRMED'
                              ? 'sky'
                              : o.status === 'PREPARING'
                                ? 'amber'
                                : 'slate'
                        }
                        size="sm"
                      >
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-left">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <span>فتح الطلب</span>
                        <ArrowLeft className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Admin Shortcuts */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/admin/customers" className="group block">
            <Card className="p-5 rounded-3xl transition-all group-hover:border-blue-600 group-hover:shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700">
                    إدارة العملاء والتجار
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ترقية العملاء لحساب تاجر جملة، متابعة كشوفات الحساب، وسندات القبض
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/products" className="group block">
            <Card className="p-5 rounded-3xl transition-all group-hover:border-blue-600 group-hover:shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <PackageSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700">
                    المنتجات وإدارة المخزون
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تعديل الأسعار والخيارات، إضافة منتجات جديدة، وتحديث كميات المستودع
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
