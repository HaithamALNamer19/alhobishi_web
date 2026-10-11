'use server';

import { getCurrentSession } from '@/core/auth/require-auth';
import { isBackOfficeRole } from '@/core/auth/roles';
import { purchasingRepository } from '../infrastructure/firestore-purchasing.repository';
import type { PurchaseItem, PurchaseReturnItem } from '../domain/purchasing';

export async function createSupplierAction(data: {
  name: string;
  phone: string;
  company_name: string;
  initialBalance?: number;
}) {
  try {
    const session = await getCurrentSession();
    if (!session || !isBackOfficeRole(session.role)) {
      return { ok: false, error: { message: 'غير مصرح لك بتسجيل الموردين.' } };
    }

    if (!data.name?.trim()) {
      return { ok: false, error: { message: 'يرجى إدخال اسم المورد.' } };
    }

    const supplier = await purchasingRepository.createSupplier(data);
    return { ok: true, data: supplier };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل إضافة المورد.' } };
  }
}

export async function listSuppliersAction() {
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
}) {
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

    return { ok: true, data: purchase };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل إنشاء فاتورة الشراء.' } };
  }
}

export async function createPurchaseReturnAction(params: {
  purchase_id?: string;
  supplier_id: string;
  return_date?: string;
  items: PurchaseReturnItem[];
}) {
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

    return { ok: true, data: res };
  } catch (err: any) {
    return { ok: false, error: { message: err.message || 'فشل تسجيل مردود المشتريات.' } };
  }
}

export async function listStockMovementsAction() {
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

