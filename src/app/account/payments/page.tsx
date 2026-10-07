import React from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { requireAuth } from '@/core/auth/require-auth';
import { adminDb } from '@/infrastructure/firebase/admin';
import { Collections } from '@/infrastructure/firebase/collections';
import { formatMoney } from '@/core/domain/money';
import { CreditCard, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'سندات القبض والمدفوعات | حسابي',
};

export const instant = false;

export default async function CustomerPaymentsPage() {
  await connection();
  const session = await requireAuth();
  const db = adminDb();

  let snap;
  try {
    snap = await db
      .collection(Collections.PAYMENTS)
      .where('customerId', '==', session.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
  } catch (error: any) {
    // If composite index is pending or missing in Firestore, fallback to querying by customerId and sort in-memory
    snap = await db
      .collection(Collections.PAYMENTS)
      .where('customerId', '==', session.uid)
      .limit(100)
      .get();
  }

  const payments = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      createdAt: data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : new Date()),
    };
  });

  // Ensure newest payments first
  payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-700" />
              <span>سندات القبض والمدفوعات</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              سجل المبالغ المسددة لحسابك المالي
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            لا توجد سندات دفع مسجلة على حسابك بعد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">طريقة السداد</th>
                  <th className="py-3.5 px-4">رقم الإيصال / الحوالة</th>
                  <th className="py-3.5 px-4 text-center">المبلغ المسدد</th>
                  <th className="py-3.5 px-4">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {p.createdAt.toLocaleDateString('ar-YE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-bold">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {p.method === 'CASH'
                          ? 'نقدًا'
                          : p.method === 'TRANSFER'
                            ? 'حوالة بنكية'
                            : 'أخرى'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {p.referenceNumber || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-800 text-sm">
                      {formatMoney(p.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
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

