import { ErrorCode } from './error-codes';

/** Default Arabic, user-facing message for every error code. */
export const errorMessagesAr: Record<ErrorCode, string> = {
  INTERNAL: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
  VALIDATION_FAILED: 'يرجى مراجعة البيانات المدخلة.',
  NOT_FOUND: 'العنصر المطلوب غير موجود.',
  CONCURRENT_MODIFICATION: 'تم تعديل البيانات من مكان آخر. حدّث الصفحة وحاول مجددًا.',
  RATE_LIMITED: 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',

  UNAUTHORIZED: 'يجب تسجيل الدخول أولًا.',
  FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  INVALID_CREDENTIALS: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
  SESSION_EXPIRED: 'انتهت الجلسة. يرجى تسجيل الدخول مجددًا.',
  USERNAME_TAKEN: 'اسم المستخدم مستخدم مسبقًا. اختر اسمًا آخر.',
  ACCOUNT_DISABLED: 'هذا الحساب معطّل. تواصل مع إدارة المتجر.',
  CANNOT_MODIFY_SELF: 'لا يمكنك تعديل صلاحيات أو حالة حسابك بنفسك.',

  PRODUCT_NOT_FOUND: 'المنتج غير موجود أو لم يعد متاحًا.',
  VARIANT_NOT_AVAILABLE: 'الخيار المحدد غير متاح.',
  OUT_OF_STOCK: 'الكمية المطلوبة غير متوفرة حاليًا.',
  INVALID_QUANTITY: 'الكمية غير صحيحة.',
  STOCK_BELOW_RESERVED: 'لا يمكن جعل المخزون أقل من الكمية المحجوزة لطلبات مفتوحة.',

  ORDER_NOT_FOUND: 'الطلب غير موجود.',
  ORDER_LOCKED: 'لا يمكن تعديل هذه الفاتورة لأنها أصبحت جاهزة أو معتمدة.',
  INVALID_STATUS_TRANSITION: 'لا يمكن نقل الطلب إلى هذه الحالة.',
  ORDER_TOO_LARGE: 'عدد الأصناف في الطلب أكبر من الحد المسموح.',
  EMPTY_ORDER: 'لا يمكن إرسال طلب فارغ.',

  PAYMENT_INVALID: 'بيانات الدفعة غير صحيحة.',
};

