import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { formatMoney } from '@/core/domain/money';
import { CreditCard, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export const metadata = {
  title: 'سجل المدفوعات وسندات القبض | إدارة المتجر',
};

export const instant = false;

export default async function AdminPaymentsPage() {
  await connection();
  const db = adminDb();

  const snap = await db
    .collection(Collections.PAYMENTS)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const userIds = new Set<string>();
  snap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.customerId) userIds.add(d.customerId);
    if (d.recordedBy && !d.recordedBy.includes(' ') && d.recordedBy.length >= 20) userIds.add(d.recordedBy);
  });

  const userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const userDocs = await Promise.allSettled(
      Array.from(userIds).map((id) => db.collection(Collections.USERS).doc(id).get())
    );
    userDocs.forEach((res) => {
      if (res.status === 'fulfilled' && res.value.exists) {
        const u = res.value.data()!;
        userMap.set(res.value.id, u.displayName || u.username || res.value.id);
      }
    });
  }

  const payments = snap.docs.map((doc) => {
    const data = doc.data();
    const customerName = userMap.get(data.customerId) || (data.customerId ? `${data.customerId.slice(0, 8)}...` : 'عميل');
    let collectorName = data.recordedByName || data.recordedBy || 'المحاسب';
    if (collectorName && userMap.has(collectorName)) {
      collectorName = userMap.get(collectorName)!;
    }
    return {
      id: doc.id,
      customerId: data.customerId,
      customerName,
      collectorName,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-blue-700" />
            <span>سجل المدفوعات وسندات القبض</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            استعراض كافة الدفعات المسددة من قبل العملاء والتجار
          </p>
        </div>
        <Link href="/admin/customers">
          <Button className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>إدارة حسابات العملاء وسندات القبض</span>
          </Button>
        </Link>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            لا توجد سندات قبض مسجلة بعد في النظام
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">العميل</th>
                  <th className="py-3.5 px-4">المحصل / أمين الصندوق</th>
                  <th className="py-3.5 px-4">طريقة السداد</th>
                  <th className="py-3.5 px-4">رقم الإيصال / الحوالة</th>
                  <th className="py-3.5 px-4 text-center">المبلغ</th>
                  <th className="py-3.5 px-4">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-mono text-slate-500">
                      {p.createdAt.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      <Link
                        href={`/admin/customers/${p.customerId}/statement`}
                        className="hover:text-blue-700 transition-colors"
                      >
                        {p.customerName}
                      </Link>
                    </td>

                    <td className="py-4 px-4 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-800">
                        {p.collectorName}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {p.method === 'CASH'
                          ? 'نقدًا'
                          : p.method === 'TRANSFER'
                            ? 'حوالة بنكية'
                            : 'أخرى'}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-500">
                      {p.referenceNumber || '-'}
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-bold text-blue-800 text-sm">
                      {formatMoney(p.amount)}
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {p.notes || '-'}
                    </td>
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

