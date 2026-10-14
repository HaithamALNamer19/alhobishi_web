'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { userRepository } from '@/features/users/infrastructure/firestore-user.repository';
import { purchasingRepository } from '../infrastructure/firestore-purchasing.repository';
import type {
  Supplier,
  PurchaseInvoice,
  PurchaseReturn,
  StockMovement,
  PurchaseItem,
  PurchaseReturnItem,
  SupplierPaymentMethod,
} from '../domain/purchasing';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string } };

export async function createSupplierAction(data: {
  name: string;
  phone: string;
  company_name: string;
  initialBalance?: number;
}): Promise<ActionResult<Supplier>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتسجيل الموردين.' } };
    }

    if (!data.name?.trim()) {
      return { ok: false, error: { message: 'يرجى إدخال اسم المورد.' } };
    }

    const supplier = await purchasingRepository.createSupplier(data);
    revalidatePath('/admin/suppliers');
    return { ok: true, data: supplier };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل إضافة المورد.' } };
  }
}

export async function listSuppliersAction(): Promise<ActionResult<Supplier[]>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const suppliers = await purchasingRepository.listSuppliers();
    return { ok: true, data: suppliers };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب قائمة الموردين.' } };
  }
}

export async function updateSupplierAction(data: {
  id: string;
  name: string;
  phone: string;
  company_name: string;
}): Promise<ActionResult<Supplier>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتعديل بيانات الموردين.' } };
    }

    if (!data.id) {
      return { ok: false, error: { message: 'معرف المورد غير محدد.' } };
    }
    if (!data.name?.trim()) {
      return { ok: false, error: { message: 'يرجى إدخال اسم المورد.' } };
    }
    if (!data.phone?.trim()) {
      return { ok: false, error: { message: 'يرجى إدخال رقم هاتف المورد.' } };
    }

    const updated = await purchasingRepository.updateSupplier(data.id, data);
    revalidatePath('/admin/suppliers');
    revalidatePath(`/admin/suppliers/${data.id}/statement`);
    return { ok: true, data: updated };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تعديل بيانات المورد.' } };
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult<void>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بحذف الموردين.' } };
    }

    if (!id) {
      return { ok: false, error: { message: 'معرف المورد غير محدد.' } };
    }

    await purchasingRepository.deleteSupplier(id);
    revalidatePath('/admin/suppliers');
    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل حذف المورد.' } };
  }
}

export async function createPurchaseInvoiceAction(params: {
  supplier_id: string;
  invoice_number?: string;
  purchase_date?: string;
  items: PurchaseItem[];
}): Promise<ActionResult<{ purchaseId: string; invoiceNumber: string; totalAmount: number }>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بإنشاء فواتير شراء.' } };
    }

    if (!params.supplier_id) {
      return { ok: false, error: { message: 'يرجى تحديد المورد.' } };
    }

    if (!params.items || params.items.length === 0) {
      return { ok: false, error: { message: 'يجب اختيار صنف واحد على الأقل.' } };
    }

    const purchase = await purchasingRepository.createPurchaseInvoice({
      ...params,
      purchase_date: params.purchase_date ? new Date(params.purchase_date) : undefined,
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/purchases');
    revalidatePath('/admin/inventory/movements');
    revalidatePath('/products');
    revalidatePath('/');

    return { ok: true, data: purchase };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل إنشاء فاتورة الشراء.' } };
  }
}

export async function listPurchasesAction(): Promise<ActionResult<PurchaseInvoice[]>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const purchases = await purchasingRepository.listPurchases();
    return { ok: true, data: purchases };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب فواتير الشراء.' } };
  }
}

export async function createPurchaseReturnAction(params: {
  purchase_id?: string;
  supplier_id: string;
  return_date?: string;
  items: PurchaseReturnItem[];
}): Promise<ActionResult<{ returnId: string; returnNumber: string; totalAmount: number }>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بإنشاء مردودات مشتريات.' } };
    }

    if (!params.supplier_id) {
      return { ok: false, error: { message: 'يرجى تحديد المورد.' } };
    }

    if (!params.items || params.items.length === 0) {
      return { ok: false, error: { message: 'يجب اختيار صنف واحد على الأقل للمردود.' } };
    }

    const res = await purchasingRepository.createPurchaseReturn({
      ...params,
      return_date: params.return_date ? new Date(params.return_date) : undefined,
    });

    revalidatePath('/admin/products');
    revalidatePath('/admin/purchases/returns');
    revalidatePath('/admin/inventory/movements');
    revalidatePath('/products');
    revalidatePath('/');

    return { ok: true, data: res };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تسجيل مردود المشتريات.' } };
  }
}

export async function listPurchaseReturnsAction(): Promise<ActionResult<PurchaseReturn[]>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const returns = await purchasingRepository.listPurchaseReturns();
    return { ok: true, data: returns };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب فواتير مردود المشتريات.' } };
  }
}

export async function listStockMovementsAction(): Promise<ActionResult<StockMovement[]>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const movements = await purchasingRepository.listStockMovements();
    return { ok: true, data: movements };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب سجل حركات المخزون.' } };
  }
}

export async function recordSupplierPaymentAction(params: {
  supplier_id: string;
  amount: number;
  payment_method: 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';
  reference_number?: string | null;
  bank_or_exchange?: string | null;
  notes?: string | null;
}): Promise<ActionResult<any>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتسجيل سندات الصرف للموردين.' } };
    }

    if (!params.supplier_id) {
      return { ok: false, error: { message: 'يرجى تحديد المورد.' } };
    }

    if (!params.amount || params.amount <= 0) {
      return { ok: false, error: { message: 'يرجى إدخال مبلغ صحيح للسند.' } };
    }

    const actorUser = await userRepository.findById(session.uid).catch(() => null);
    const actorName = actorUser?.displayName || actorUser?.username || 'إدارة المشتريات';

    const payment = await purchasingRepository.recordSupplierPayment({
      ...params,
      actor_name: actorName,
    });

    revalidatePath('/admin/suppliers');
    revalidatePath(`/admin/suppliers/${params.supplier_id}/statement`);
    return {
      ok: true,
      data: {
        ...payment,
        createdAt: payment.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تسجيل سند الصرف.' } };
  }
}

export async function getSupplierStatementAction(
  supplierId: string
): Promise<ActionResult<any>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const statement = await purchasingRepository.getSupplierStatement(supplierId);
    return {
      ok: true,
      data: {
        supplier: {
          ...statement.supplier,
          createdAt: statement.supplier.createdAt.toISOString(),
        },
        transactions: statement.transactions.map((tx) => ({
          ...tx,
          createdAt: tx.createdAt.toISOString(),
        })),
        total_purchases: statement.total_purchases,
        total_payments: statement.total_payments,
        total_returns: statement.total_returns,
        net_balance: statement.net_balance,
      },
    };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب كشف حساب المورد.' } };
  }
}

export async function getSupplierPaymentAction(
  paymentId: string
): Promise<ActionResult<any>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح.' } };
    }

    const payment = await purchasingRepository.getSupplierPaymentById(paymentId);
    if (!payment) {
      return { ok: false, error: { message: 'سند الصرف غير موجود.' } };
    }
    return {
      ok: true,
      data: {
        ...payment,
        createdAt: payment.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل جلب بيانات سند الصرف.' } };
  }
}

export async function updatePurchaseInvoiceAction(params: {
  purchaseId: string;
  invoice_number?: string;
  purchase_date?: string;
  supplierId?: string;
}): Promise<ActionResult<{ purchaseId: string; invoiceNumber: string }>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتعديل فواتير الشراء.' } };
    }

    if (!params.purchaseId) {
      return { ok: false, error: { message: 'معرف فاتورة الشراء غير محدد.' } };
    }

    const res = await purchasingRepository.updatePurchaseInvoice({
      purchaseId: params.purchaseId,
      invoice_number: params.invoice_number,
      purchase_date: params.purchase_date ? new Date(params.purchase_date) : undefined,
    });

    revalidatePath('/admin/purchases');
    if (params.supplierId) {
      revalidatePath(`/admin/suppliers/${params.supplierId}/statement`);
    }
    revalidatePath('/admin/suppliers');
    return { ok: true, data: res };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تعديل فاتورة الشراء.' } };
  }
}

export async function deletePurchaseInvoiceAction(params: {
  purchaseId: string;
  supplierId?: string;
}): Promise<ActionResult<void>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بحذف فواتير الشراء.' } };
    }

    if (!params.purchaseId) {
      return { ok: false, error: { message: 'معرف فاتورة الشراء غير محدد.' } };
    }

    await purchasingRepository.deletePurchaseInvoice(params.purchaseId);

    revalidatePath('/admin/purchases');
    revalidatePath('/admin/products');
    revalidatePath('/admin/inventory/movements');
    revalidatePath('/products');
    revalidatePath('/');
    if (params.supplierId) {
      revalidatePath(`/admin/suppliers/${params.supplierId}/statement`);
    }
    revalidatePath('/admin/suppliers');

    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل حذف فاتورة الشراء وتحديث المخزون.' } };
  }
}

export async function updateSupplierPaymentAction(params: {
  paymentId: string;
  amount: number;
  payment_method: SupplierPaymentMethod;
  reference_number?: string | null;
  bank_or_exchange?: string | null;
  notes?: string | null;
  supplierId?: string;
}): Promise<ActionResult<{ paymentId: string; voucherNumber: string }>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتعديل سندات الصرف.' } };
    }

    if (!params.paymentId) {
      return { ok: false, error: { message: 'معرف سند الصرف غير محدد.' } };
    }

    const res = await purchasingRepository.updateSupplierPayment(params);

    if (params.supplierId) {
      revalidatePath(`/admin/suppliers/${params.supplierId}/statement`);
    }
    revalidatePath('/admin/suppliers');
    return { ok: true, data: res };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تعديل سند الصرف.' } };
  }
}

export async function deleteSupplierPaymentAction(params: {
  paymentId: string;
  supplierId?: string;
}): Promise<ActionResult<void>> {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بحذف سندات الصرف.' } };
    }

    if (!params.paymentId) {
      return { ok: false, error: { message: 'معرف سند الصرف غير محدد.' } };
    }

    await purchasingRepository.deleteSupplierPayment(params.paymentId);

    if (params.supplierId) {
      revalidatePath(`/admin/suppliers/${params.supplierId}/statement`);
    }
    revalidatePath('/admin/suppliers');
    return { ok: true, data: undefined };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل حذف سند الصرف.' } };
  }
}


