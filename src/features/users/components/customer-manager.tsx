'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Sparkles,
  CreditCard,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  FileText,
  UserCog,
  UserX,
  PackageCheck,
  User,
  Shield,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge, RoleBadge } from '@/shared/ui/badge';
import { Pagination } from '@/shared/ui/pagination';
import { Dialog } from '@/shared/ui/dialog';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { formatMoney } from '@/core/domain/money';
import { Role } from '@/core/auth/roles';
import type { UserProfile, UserStatus } from '../domain/user';
import { updateUserRoleAction, updateUserStatusAction } from '../actions/user.actions';
import { recordPaymentAction } from '@/features/orders/actions/order.actions';

interface CustomerManagerProps {
  initialUsers: UserProfile[];
  currentUserId?: string;
}

const ROLE_OPTIONS: Array<{
  role: Role;
  title: string;
  badgeText: string;
  badgeVariant: 'slate' | 'amber' | 'sky' | 'indigo';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    role: Role.STAFF,
    title: 'موظف تجهيز ومخزن (Staff)',
    badgeText: 'موظف تجهيز',
    badgeVariant: 'sky',
    description: 'صلاحيات الوصول للوحة الإدارة لعرض وتجهيز الطلبات وتأكيدها وتعديل كميات المخزون.',
    icon: PackageCheck,
  },
  {
    role: Role.WHOLESALE,
    title: 'تاجر جملة معتمد (Wholesale)',
    badgeText: 'تاجر جملة',
    badgeVariant: 'amber',
    description: 'رؤية أسعار الجملة والشراء بها، الشراء الآجل، ومتابعة كشف الحساب والمديونية.',
    icon: Sparkles,
  },
  {
    role: Role.CUSTOMER,
    title: 'عميل عادي (Customer)',
    badgeText: 'عميل عادي',
    badgeVariant: 'slate',
    description: 'تسوق التجزئة العادي بأسعار التجزئة دون أي وصول إداري أو أسعار جملة.',
    icon: User,
  },
  {
    role: Role.ADMIN,
    title: 'مدير النظام (Admin)',
    badgeText: 'مدير',
    badgeVariant: 'indigo',
    description: 'كامل الصلاحيات الإدارية والمالية وإدارة المستخدمين والإعدادات والمنتجات.',
    icon: ShieldAlert,
  },
];

function UserStatusBadge({ status }: { status?: UserStatus }) {
  const isDisabled = status === 'disabled';
  return (
    <Badge variant={isDisabled ? 'rose' : 'emerald'} size="sm">
      <span
        className={`w-1.5 h-1.5 rounded-full ml-1.5 inline-block ${
          isDisabled ? 'bg-rose-500' : 'bg-emerald-500'
        }`}
      />
      {isDisabled ? 'معطّل' : 'نشط'}
    </Badge>
  );
}

export function CustomerManager({ initialUsers, currentUserId }: CustomerManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [isPending, startTransition] = useTransition();

  // Role change modal
  const [roleModalUser, setRoleModalUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CUSTOMER);

  // Status toggle confirmation
  const [statusTarget, setStatusTarget] = useState<{
    user: UserProfile;
    newStatus: 'active' | 'disabled';
  } | null>(null);

  // Payment Recording Dialog
  const [paymentUser, setPaymentUser] = useState<UserProfile | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentCollector, setPaymentCollector] = useState('');

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && (u.status || 'active') !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchPhone = u.phone?.includes(q);
      if (!matchName && !matchUser && !matchPhone) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );

  const staffCount = users.filter((u) => u.role === Role.STAFF).length;
  const wholesaleCount = users.filter((u) => u.role === Role.WHOLESALE).length;
  const disabledCount = users.filter((u) => u.status === 'disabled').length;

  const handleOpenRoleModal = (user: UserProfile) => {
    setRoleModalUser(user);
    setSelectedRole(user.role);
  };

  const handleConfirmRoleUpdate = () => {
    if (!roleModalUser || !selectedRole) return;
    if (roleModalUser.role === selectedRole) {
      setRoleModalUser(null);
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateUserRoleAction(roleModalUser.uid, selectedRole);

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        const roleName =
          ROLE_OPTIONS.find((r) => r.role === selectedRole)?.badgeText || selectedRole;

        toast.success(`تم تحديث دور ${roleModalUser.displayName} إلى (${roleName}) بنجاح`);

        setUsers((prev) =>
          prev.map((u) =>
            u.uid === roleModalUser.uid ? { ...u, role: selectedRole } : u
          )
        );
        setRoleModalUser(null);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء تعديل الدور');
      }
    });
  };

  const handleConfirmStatusChange = () => {
    if (!statusTarget) return;

    startTransition(async () => {
      try {
        const { user, newStatus } = statusTarget;
        const res = await updateUserStatusAction(user.uid, newStatus);

        if (!res.ok) {
          toast.error(res.error.message);
          setStatusTarget(null);
          return;
        }

        toast.success(
          newStatus === 'disabled'
            ? `تم إيقاف حساب ${user.displayName} وتعطيله بنجاح`
            : `تم إعادة تنشيط حساب ${user.displayName} بنجاح`
        );

        setUsers((prev) =>
          prev.map((u) => (u.uid === user.uid ? { ...u, status: newStatus } : u))
        );
        setStatusTarget(null);
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء تعديل حالة الحساب');
      }
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentUser) return;

    const amount = parseInt(paymentAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ دفع صالح');
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordPaymentAction({
          customerId: paymentUser.uid,
          amount,
          method: paymentMethod,
          referenceNumber: paymentRef.trim() || null,
          notes: paymentNotes.trim() || null,
          collectorName: paymentCollector.trim() || null,
        });

        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }

        toast.success(`تم تسجيل سند القبض بمبلغ ${formatMoney(amount)} وقيده في الحساب`);
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === paymentUser.uid
              ? {
                  ...u,
                  account: {
                    ...u.account,
                    balance: res.data.newBalance,
                  },
                }
              : u
          )
        );
        setPaymentUser(null);
        setPaymentAmount('');
        setPaymentRef('');
        setPaymentNotes('');
        setPaymentCollector('');
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || 'حدث خطأ أثناء تسجيل الدفعة');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-700" />
            <span>إدارة المستخدمين والصلاحيات والمالية</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعيين موظفي التجهيز، ترقية التجار، إيقاف وتنشيط الحسابات، ومتابعة السجلات والمديونيات.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="indigo" className="font-mono font-bold">
            الإجمالي: {users.length}
          </Badge>
          <Badge variant="sky" className="font-mono font-bold">
            موظفو التجهيز: {staffCount}
          </Badge>
          <Badge variant="amber" className="font-mono font-bold">
            التجار: {wholesaleCount}
          </Badge>
          {disabledCount > 0 && (
            <Badge variant="rose" className="font-mono font-bold">
              معطّل: {disabledCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم العميل، اسم المستخدم، أو رقم الهاتف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full md:w-44"
        >
          <option value="">جميع الصلاحيات والأدوار</option>
          <option value="customer">عميل عادي</option>
          <option value="wholesale">تاجر جملة</option>
          <option value="staff">موظف تجهيز</option>
          <option value="admin">مدير النظام</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full md:w-36"
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="disabled">معطّل / موقوف</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            لا يوجد مستخدمون مطابقون لمعايير البحث
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4 text-center">الصلاحية / الدور</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الرصيد / المديونية</th>
                  <th className="py-3.5 px-4 text-center">الطلبات</th>
                  <th className="py-3.5 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {paginatedUsers.map((u) => {
                  const balance = u.account?.balance ?? 0;
                  const isSelf = currentUserId === u.uid;
                  const isDisabled = u.status === 'disabled';

                  return (
                    <tr
                      key={u.uid}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDisabled ? 'bg-slate-50/40 opacity-80' : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {isSelf && (
                                <Badge variant="slate" size="sm" className="text-[10px]">
                                  أنت
                                </Badge>
                              )}
                            </div>
                            <span className="block text-[11px] font-mono text-slate-400 font-normal">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-600" dir="ltr">
                        {u.phone || '-'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="py-4 px-4 text-center">
                        <UserStatusBadge status={u.status} />
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold">
                        {balance > 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            مدين: {formatMoney(balance)}
                          </span>
                        ) : balance < 0 ? (
                          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            دائن: {formatMoney(Math.abs(balance))}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 ر.ي</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-600">
                        {u.stats?.ordersCount ?? 0}
                      </td>

                      <td className="py-4 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Update Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRoleModal(u)}
                            disabled={isSelf}
                            className="text-[11px] h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1 disabled:opacity-40"
                            title={isSelf ? 'لا يمكنك تعديل صلاحيات حسابك الخاص' : 'تعديل الدور والصلاحيات'}
                          >
                            <UserCog className="w-3.5 h-3.5 text-indigo-600" />
                            <span>تعديل الصلاحية</span>
                          </Button>

                          {/* Account Status Toggle Button */}
                          {isDisabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStatusTarget({ user: u, newStatus: 'active' })}
                              disabled={isSelf}
                              className="text-[11px] h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 disabled:opacity-40"
                              title={isSelf ? 'لا يمكنك تعديل حسابك الخاص' : 'إعادة تنشيط الحساب'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تنشيط</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStatusTarget({ user: u, newStatus: 'disabled' })}
                              disabled={isSelf}
                              className="text-[11px] h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 disabled:opacity-40"
                              title={isSelf ? 'لا يمكنك إيقاف حسابك الخاص' : 'إيقاف وتعطيل الحساب'}
                            >
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              <span>إيقاف</span>
                            </Button>
                          )}

                          {/* View Statement Button */}
                          <Link href={`/admin/customers/${u.uid}/statement`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] h-7 px-2 text-slate-700 border-slate-200 hover:bg-slate-100 gap-1"
                              title="عرض كشف الحساب المالي وفواتيره وسنداته"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-700" />
                              <span>كشف الحساب</span>
                            </Button>
                          </Link>

                          {/* Record Payment Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentUser(u)}
                            className="text-[11px] h-7 px-2 text-blue-800 border-blue-200 hover:bg-blue-50 gap-1"
                            title="تسجيل سند قبض / دفعة نقدية"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                            <span>سند قبض</span>
                          </Button>
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
              totalItems={filteredUsers.length}
              pageSize={PAGE_SIZE}
              itemName="مستخدم"
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}
      </div>

      {/* Role Selection Dialog */}
      <Dialog
        isOpen={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        maxWidth="lg"
        title="تعديل دور وصلاحيات المستخدم"
        description={`تحديد صلاحيات حساب "${roleModalUser?.displayName}" (@${roleModalUser?.username})`}
      >
        {roleModalUser && (
          <div className="space-y-4 pt-1">
            {/* Current Info */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">الدور الحالي:</span>
                <RoleBadge role={roleModalUser.role} />
              </div>
              <div className="flex items-center gap-2 font-mono text-slate-500">
                <span>الهاتف: {roleModalUser.phone || '-'}</span>
              </div>
            </div>

            {/* Role Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = selectedRole === opt.role;
                const isCurrent = roleModalUser.role === opt.role;
                const Icon = opt.icon;

                return (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => setSelectedRole(opt.role)}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-slate-900">{opt.title}</span>
                        </div>
                        {isSelected && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                        {opt.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Badge variant={opt.badgeVariant} size="sm">
                        {opt.badgeText}
                      </Badge>
                      {isCurrent && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          (الحالي)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRole === Role.ADMIN && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  تنبيه هام: منح صلاحية "مدير النظام" يمنح المستخدم وصولاً كاملاً لإدارة المتجر والحسابات والتقارير المالية.
                </span>
              </div>
            )}

            {selectedRole === Role.STAFF && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-start gap-2">
                <PackageCheck className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
                <span>
                  سيتكمن موظف التجهيز فوراً من دخول لوحة الإدارة، والاطلاع على طلبات العملاء وتجهيزها وتأكيدها وتعديل كميات المخزون.
                </span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleModalUser(null)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRoleUpdate}
                disabled={isPending || selectedRole === roleModalUser.role}
                className="flex items-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>حفظ وتطبيق الدور</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Account Status Confirmation */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleConfirmStatusChange}
        title={
          statusTarget?.newStatus === 'disabled'
            ? `إيقاف حساب: ${statusTarget?.user.displayName}`
            : `تنشيط حساب: ${statusTarget?.user.displayName}`
        }
        description={
          statusTarget?.newStatus === 'disabled'
            ? `هل أنت متأكد من رغبتك في إيقاف وتعطيل حساب "${statusTarget?.user.displayName}"؟ لن يتمكن من تسجيل الدخول إلى المتجر وسيتم إيقاف كافة جلساته الحالية فوراً.`
            : `هل تريد إعادة تنشيط حساب "${statusTarget?.user.displayName}"؟ سيتمكن المستخدم من تسجيل الدخول واستخدام المتجر بشكل طبيعي.`
        }
        confirmLabel={statusTarget?.newStatus === 'disabled' ? 'تأكيد إيقاف الحساب' : 'تأكيد تنشيط الحساب'}
        cancelLabel="إلغاء"
        variant={statusTarget?.newStatus === 'disabled' ? 'danger' : 'primary'}
        isLoading={isPending}
      />

      {/* Record Payment Dialog */}
      <Dialog
        isOpen={!!paymentUser}
        onClose={() => setPaymentUser(null)}
        title={`تسجيل سند قبض لحساب: ${paymentUser?.displayName}`}
      >
        {paymentUser && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">الرصيد / المديونية الحالية:</span>
                <span className="font-bold font-mono text-slate-900">
                  {formatMoney(paymentUser.account?.balance ?? 0)}
                </span>
              </div>
            </div>

            <Input
              label="المبلغ المسدد *"
              type="number"
              placeholder="مثال: 50000"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="1"
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                طريقة السداد *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as 'CASH' | 'TRANSFER' | 'OTHER')
                }
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="CASH">نقدًا (Cash)</option>
                <option value="TRANSFER">حوالة بنكية / صرافة (Transfer)</option>
                <option value="OTHER">أخرى (Other)</option>
              </select>
            </div>

            <Input
              label="رقم الحوالة / الإيصال (اختياري)"
              placeholder="مثال: TRX-998822"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              dir="ltr"
              className="text-left font-mono text-xs"
            />

            <Input
              label="اسم المحصل / أمين الصندوق (المحرر)"
              placeholder="مثال: اسم المحاسب أو المالك المستلم (أو اتركه فارغًا لاستخدام اسم حسابك الحالي)"
              value={paymentCollector}
              onChange={(e) => setPaymentCollector(e.target.value)}
            />

            <Input
              label="ملاحظات وسند الاستلام (اختياري)"
              placeholder="ملاحظات إضافية عن الدفعة..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentUser(null);
                  setPaymentCollector('');
                }}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>تسجيل السند وتحديث الرصيد</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
