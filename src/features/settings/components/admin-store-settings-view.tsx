'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Store,
  Phone,
  Receipt,
  Coins,
  Upload,
  Loader2,
  CheckCircle2,
  Settings,
  Sparkles,
  ShieldCheck,
  Building2,
  Globe,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  type StoreSettings,
  type UpdateStoreSettingsInput,
  DEFAULT_STORE_SETTINGS,
} from '../domain/store-settings';
import {
  updateStoreSettingsAction,
  uploadStoreLogoAction,
} from '../actions/store-settings.actions';

interface AdminStoreSettingsViewProps {
  initialSettings: StoreSettings;
}

type TabType = 'identity' | 'contact' | 'invoices' | 'operations';

export function AdminStoreSettingsView({
  initialSettings,
}: AdminStoreSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [settings, setSettings] = useState<StoreSettings>(initialSettings);
  const [formData, setFormData] = useState<UpdateStoreSettingsInput>({
    storeName: initialSettings.storeName,
    shortName: initialSettings.shortName,
    tagline: initialSettings.tagline,
    logoUrl: initialSettings.logoUrl,
    commercialRegister: initialSettings.commercialRegister,
    taxNumber: initialSettings.taxNumber ?? '',
    phone: initialSettings.phone,
    phoneSecondary: initialSettings.phoneSecondary ?? '',
    whatsapp: initialSettings.whatsapp,
    email: initialSettings.email ?? '',
    address: initialSettings.address,
    city: initialSettings.city,
    invoiceNotes: initialSettings.invoiceNotes,
    receiptNotes: initialSettings.receiptNotes,
    statementNotes: initialSettings.statementNotes,
    showLogoInPrint: initialSettings.showLogoInPrint,
    showContactInPrint: initialSettings.showContactInPrint,
    currency: initialSettings.currency,
    currencySymbol: initialSettings.currencySymbol,
    isStoreOpen: initialSettings.isStoreOpen,
    maintenanceMessage: initialSettings.maintenanceMessage,
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof UpdateStoreSettingsInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await uploadStoreLogoAction(uploadData);
      if (res.ok) {
        setFormData((prev) => ({ ...prev, logoUrl: res.data.url }));
        toast.success('تم رفع شعار المتجر بنجاح!');
      } else {
        toast.error(res.error.message || 'فشل رفع الشعار');
      }
    } catch {
      toast.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.storeName.trim()) {
      toast.error('يرجى إدخال اسم المتجر');
      setActiveTab('identity');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف الرئيسي');
      setActiveTab('contact');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateStoreSettingsAction(formData);
        if (res.ok) {
          setSettings(res.data);
          toast.success('تم حفظ وتحديث إعدادات المتجر بنجاح');
        } else {
          toast.error(res.error.message || 'حدث خطأ أثناء حفظ الإعدادات');
        }
      } catch (err: any) {
        toast.error(err?.message || 'فشل تحديث إعدادات المتجر');
      }
    });
  };

  const tabs = [
    { id: 'identity', label: 'هوية واسم المتجر', icon: Store, desc: 'الاسم الرسمي، الشعار، السجل' },
    { id: 'contact', label: 'العناوين والتواصل', icon: Phone, desc: 'الهواتف، الواتساب، الموقع' },
    { id: 'invoices', label: 'الفواتير والمطبوعات', icon: Receipt, desc: 'شروط وملاحظات الطباعة' },
    { id: 'operations', label: 'حالة المتجر والعملة', icon: Coins, desc: 'فتح/إغلاق المتجر، العملات' },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-700" />
            <span>إعدادات المتجر والهوية الرسمية</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة اسم المتجر التجاري، الشعار، أرقام التواصل، ترويسات وملاحظات الفواتير، وحالة استقبال الطلبات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${
              formData.isStoreOpen
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                formData.isStoreOpen ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span>{formData.isStoreOpen ? 'المتجر متاح للطلبات' : 'المتجر تحت الصيانة'}</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-start p-3 rounded-xl transition-all text-right select-none ${
                  isActive
                    ? 'bg-white text-blue-950 shadow-sm border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span className="text-xs sm:text-sm font-bold">{tab.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal line-clamp-1">{tab.desc}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: IDENTITY & BRAND */}
        {activeTab === 'identity' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-700" />
              <span>هوية واسم المتجر</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Store Full Name */}
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  اسم المتجر التجاري الرسمي (الذي يظهر في الفواتير والترويسة) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  placeholder="مثال: متجر الحبيشي للتجارة والتوزيع"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm sm:text-base font-bold text-slate-900 bg-white shadow-2xs"
                />
                <p className="text-xs text-slate-500">
                  يظهر هذا الاسم بالخط العريض في ترويسة جميع فواتير المبيعات، الشراء، مردود المبيعات، وسندات القبض والصرف، وكشوفات الحسابات.
                </p>
              </div>

              {/* Short Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  الاسم المختصر / علامة المتجر
                </label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => handleChange('shortName', e.target.value)}
                  placeholder="مثال: متجر الحبيشي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">يستخدم في الإشعارات والرسائل السريعة</p>
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  الشعار اللفظي أو النشاط التجاري
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="مثال: للألعاب والإكسسوارات والخردوات"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">يظهر تحت اسم المتجر في الواجهات والترويسة</p>
              </div>

              {/* Commercial Register */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رقم السجل التجاري (س.ت)
                </label>
                <input
                  type="text"
                  value={formData.commercialRegister}
                  onChange={(e) => handleChange('commercialRegister', e.target.value)}
                  placeholder="مثال: س.ت: 12345 (اختياري)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white font-mono"
                />
              </div>

              {/* Tax Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  الرقم الضريبي
                </label>
                <input
                  type="text"
                  value={formData.taxNumber ?? ''}
                  onChange={(e) => handleChange('taxNumber', e.target.value)}
                  placeholder="الرقم الضريبي إن وجد (اختياري)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white font-mono"
                />
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70 space-y-4">
              <span className="block text-xs font-black text-slate-800">
                شعار المتجر الرسمي (Logo)
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-2 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.logoUrl || '/logo.jpg'}
                    alt="شعار المتجر"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.jpg';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-3 w-full text-center sm:text-right">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800 text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs">
                      {isUploadingLogo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>{isUploadingLogo ? 'جاري الرفع...' : 'رفع صورة شعار جديدة'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>

                    {formData.logoUrl !== '/logo.jpg' && (
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', '/logo.jpg')}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                      >
                        استعادة الشعار الافتراضي
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 max-w-lg">
                    <span className="text-xs text-slate-500 whitespace-nowrap">أو رابط الصورة:</span>
                    <input
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      placeholder="/logo.jpg"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACT & ADDRESS */}
        {activeTab === 'contact' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-700" />
              <span>بيانات التواصل والعنوان</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Primary Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  رقم الهاتف الرئيسي *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="مثال: 781836479"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono font-bold text-slate-900 bg-white text-left"
                  dir="ltr"
                />
                <p className="text-[11px] text-slate-500">يظهر كرقم رئيسي في ترويسة جميع الفواتير</p>
              </div>

              {/* WhatsApp Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رقم الواتساب (للتواصل وإرسال الإشعارات)
                </label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="مثال: 967781836479"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-900 bg-white text-left"
                  dir="ltr"
                />
              </div>

              {/* Secondary Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  رقم هاتف إضافي / أرضي
                </label>
                <input
                  type="text"
                  value={formData.phoneSecondary ?? ''}
                  onChange={(e) => handleChange('phoneSecondary', e.target.value)}
                  placeholder="مثال: 05-334455 (اختياري)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-900 bg-white text-left"
                  dir="ltr"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  البريد الإلكتروني الرسمي
                </label>
                <input
                  type="email"
                  value={formData.email ?? ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="alhubishi@store.com (اختياري)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white text-left"
                  dir="ltr"
                />
              </div>

              {/* Store Address */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  العنوان والموقع الجغرافي (كما يظهر بالفواتير)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="مثال: حضرموت - الشحر - سوق شبام"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  سطر الموقع الرسمي الذي يُطبع على الترويسة الرئيسية لجميع الفواتير والسندات
                </p>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  المدينة / المحافظة
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="حضرموت - الشحر"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVOICES & PRINTING */}
        {activeTab === 'invoices' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-700" />
              <span>إعدادات الفواتير والمطبوعات</span>
            </h2>

            {/* Display Options */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.showLogoInPrint}
                  onChange={(e) => handleChange('showLogoInPrint', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  إظهار شعار المتجر في ترويسة المطبوعات
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.showContactInPrint}
                  onChange={(e) => handleChange('showContactInPrint', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  إظهار أرقام الهواتف والموقع في الفاتورة
                </span>
              </label>
            </div>

            {/* Invoice Footer Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                شروط وتذييل فاتورة المبيعات الافتراضية
              </label>
              <textarea
                rows={2}
                value={formData.invoiceNotes}
                onChange={(e) => handleChange('invoiceNotes', e.target.value)}
                placeholder="مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام إلا بوجود عيب مصنعي وفاتورة الشراء الأصلية."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm text-slate-800 bg-white resize-none"
              />
              <p className="text-[11px] text-slate-500">يظهر هذا النص أسفل جدول الأصناف في فاتورة المبيعات.</p>
            </div>

            {/* Receipt Footer Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                تذييل سندات القبض والصرف الرسمية
              </label>
              <textarea
                rows={2}
                value={formData.receiptNotes}
                onChange={(e) => handleChange('receiptNotes', e.target.value)}
                placeholder="مثال: سند رسمي إلكتروني صادر ومعتمد من إدارة الحسابات المالية."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm text-slate-800 bg-white resize-none"
              />
            </div>

            {/* Statement Footer Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                تذييل كشف حساب العملاء والتجار والموردين
              </label>
              <textarea
                rows={2}
                value={formData.statementNotes}
                onChange={(e) => handleChange('statementNotes', e.target.value)}
                placeholder="مثال: حرر هذا الكشف آلياً لمراجعة ومطابقة الحسابات المالية مع المتجر."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs sm:text-sm text-slate-800 bg-white resize-none"
              />
            </div>
          </div>
        )}

        {/* TAB 4: OPERATIONS & STATUS */}
        {activeTab === 'operations' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in-50 duration-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-700" />
              <span>العمليات وحالة المتجر</span>
            </h2>

            {/* Store Status Toggle */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">
                    حالة استقبال الطلبات في المتجر
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      formData.isStoreOpen
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {formData.isStoreOpen ? 'المتجر مفتوح للعملاء' : 'مغلق للصيانة المؤقتة'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  عند إغلاق المتجر، تظهر رسالة التحديث للعملاء ويتم إيقاف تأكيد الطلبات الجديدة مؤقتاً.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.isStoreOpen}
                  onChange={(e) => handleChange('isStoreOpen', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:right-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {!formData.isStoreOpen && (
              <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-amber-900">
                  رسالة الصيانة التي تظهر للزوار والعملاء
                </label>
                <input
                  type="text"
                  value={formData.maintenanceMessage}
                  onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                  placeholder="المتجر تحت الصيانة والتحديث حالياً، سنعود قريباً لخدمتكم."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs sm:text-sm text-amber-950 bg-white"
                />
              </div>
            )}

            {/* Currency Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  اسم العملة الافتراضية
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  placeholder="ريال يمني"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  رمز العملة المختصر
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => handleChange('currencySymbol', e.target.value)}
                  placeholder="ر.ي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-sm font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {settings.updatedAt ? (
              <span>آخر تحديث للإعدادات: {new Date(settings.updatedAt).toLocaleString('ar-YE')}</span>
            ) : (
              <span>الإعدادات الحالية تعمل بالقيم الافتراضية المعتمدة</span>
            )}
          </p>

          <button
            type="submit"
            disabled={isPending || isUploadingLogo}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white font-black text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري حفظ الإعدادات...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>حفظ التغييرات وتطبيقها</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
