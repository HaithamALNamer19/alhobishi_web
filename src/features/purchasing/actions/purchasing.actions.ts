'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { purchasingRepository } from '../infrastructure/firestore-purchasing.repository';
import type {
  Supplier,
  PurchaseInvoice,
  PurchaseReturn,
  StockMovement,
  PurchaseItem,
  PurchaseReturnItem,
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

