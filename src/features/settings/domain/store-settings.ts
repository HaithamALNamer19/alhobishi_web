import { z } from 'zod';

export interface StoreSettings {
  // 1. هوية المتجر (Store Identity)
  storeName: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  commercialRegister: string;
  taxNumber: string;

  // 2. التواصل والعنوان (Contact & Location)
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;

  // 3. طباعة الفواتير والسندات (Invoice & Print Settings)
  invoiceNotes: string;
  receiptNotes: string;
  statementNotes: string;
  showLogoInPrint: boolean;
  showContactInPrint: boolean;

  // 4. العمليات وحالة المتجر (Operations & Status)
  currency: string;
  currencySymbol: string;
  isStoreOpen: boolean;
  maintenanceMessage: string;

  updatedAt?: string | null;
  updatedBy?: string | null;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'متجر الحبيشي للتجارة والتوزيع',
  shortName: 'متجر الحبيشي',
  tagline: 'وجهتك الأولى لتسوق الألعاب، الأدوات، الأواني المنزلية، والإكسسوارات',
  logoUrl: '/logo.jpg',
  commercialRegister: '',
  taxNumber: '',
  phone: '781836479',
  phoneSecondary: '',
  whatsapp: '967781836479',
  email: '',
  address: 'حضرموت - الشحر - سوق شبام',
  city: 'حضرموت - الشحر',
  invoiceNotes: 'البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام إلا بوجود عيب مصنعي وفاتورة الشراء الأصلية.',
  receiptNotes: 'سند رسمي إلكتروني صادر ومعتمد من إدارة الحسابات المالية.',
  statementNotes: 'حرر هذا الكشف آلياً لمراجعة ومطابقة الحسابات المالية مع المتجر.',
  showLogoInPrint: true,
  showContactInPrint: true,
  currency: 'ريال يمني',
  currencySymbol: 'ر.ي',
  isStoreOpen: true,
  maintenanceMessage: 'المتجر تحت الصيانة والتحديث حالياً، سنعود قريباً لخدمتكم.',
  updatedAt: null,
  updatedBy: null,
};

export const updateStoreSettingsSchema = z.object({
  storeName: z.string().min(2, 'اسم المتجر يجب أن لا يقل عن حرفين').max(150, 'اسم المتجر طويل جداً'),
  shortName: z.string().max(100, 'الاسم المختصر طويل جداً').default('متجر الحبيشي'),
  tagline: z.string().max(250, 'الشعار اللفظي طويل جداً').default(''),
  logoUrl: z.string().default('/logo.jpg'),
  commercialRegister: z.string().max(100).default(''),
  taxNumber: z.string().max(100).default(''),
  phone: z.string().min(6, 'يرجى إدخال رقم هاتف صالح').max(30),
  phoneSecondary: z.string().max(30).default(''),
  whatsapp: z.string().max(30).default(''),
  email: z.string().max(100).default(''),
  address: z.string().max(200).default(''),
  city: z.string().max(100).default(''),
  invoiceNotes: z.string().max(1000).default(''),
  receiptNotes: z.string().max(1000).default(''),
  statementNotes: z.string().max(1000).default(''),
  showLogoInPrint: z.boolean().default(true),
  showContactInPrint: z.boolean().default(true),
  currency: z.string().max(50).default('ريال يمني'),
  currencySymbol: z.string().max(20).default('ر.ي'),
  isStoreOpen: z.boolean().default(true),
  maintenanceMessage: z.string().max(500).default(''),
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
