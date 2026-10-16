'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  User,
  Building2,
  CreditCard,
  DollarSign,
  Loader2,
  CheckCircle2,
  X,
  FileText,
  BadgeAlert,
  Wallet,
} from 'lucide-react';
import { Dialog } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { formatMoney } from '@/core/domain/money';
import { tafqeetRials } from '@/core/utils/tafqeet';
import { toast } from '@/shared/ui/toast';
import {
  searchFinancialPartiesAction,
  recordFinancialVoucherAction,
  type FinancialPartyOption,
} from '../actions/voucher.actions';

interface RecordFinancialVoucherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialVoucherType?: 'RECEIPT' | 'DISBURSEMENT';
  preselectedParty?: FinancialPartyOption | null;
  onSuccess?: (result: any) => void;
}

export function RecordFinancialVoucherDialog({
  isOpen,
  onClose,
  initialVoucherType = 'RECEIPT',
  preselectedParty,
  onSuccess,
}: RecordFinancialVoucherDialogProps) {
  const [voucherType, setVoucherType] = useState<'RECEIPT' | 'DISBURSEMENT'>(initialVoucherType);
  const [isPending, startTransition] = useTransition();

  // Search & Selected Party State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FinancialPartyOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedParty, setSelectedParty] = useState<FinancialPartyOption | null>(preselectedParty || null);

  // Form Fields
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankOrExchange, setBankOrExchange] = useState('');
  const [collectorName, setCollectorName] = useState('');
  const [notes, setNotes] = useState('');

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setVoucherType(initialVoucherType);
      setSelectedParty(preselectedParty || null);
      setSearchQuery('');
      setSearchResults([]);
      setAmount('');
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setBankOrExchange('');
      setCollectorName('');
      setNotes('');
    }
  }, [isOpen, initialVoucherType, preselectedParty]);

  // Load initial candidates or search candidates
  useEffect(() => {
    if (!isOpen || selectedParty) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchFinancialPartiesAction({
          query: searchQuery.trim(),
          voucherType,
        });
        if (res.ok && res.data) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, voucherType, selectedParty]);

  const handleSelectParty = (party: FinancialPartyOption) => {
    setSelectedParty(party);
    setSearchQuery('');
    setShowSearchResults(false);
    // Autofill amount if balance > 0
    if (party.balance > 0) {
      setAmount(String(party.balance));
    }
  };

  const handleClearSelectedParty = () => {
    setSelectedParty(null);
    setSearchQuery('');
    setAmount('');
  };

  const parsedAmount = Number(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParty) {
      toast.error('يرجى اختيار العميل أو التاجر أو المورد أولاً.');
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للسند.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordFinancialVoucherAction({
          voucherType,
          partyType: selectedParty.type,
          partyId: selectedParty.id,
          amount: parsedAmount,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          bankOrExchange: bankOrExchange.trim() || undefined,
          collectorName: collectorName.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (res.ok) {
          const typeText = voucherType === 'RECEIPT' ? 'سند القبض' : 'سند الصرف';
          toast.success(
            `تم تسجيل ${typeText} رقم ${res.data.voucherNumber} بمبلغ ${formatMoney(parsedAmount)} وقيده بنجاح!`
          );
          onSuccess?.(res.data);
          onClose();
        } else {
          toast.error(res.error?.message || 'فشل تسجيل السند المالي.');
        }
      } catch (err: any) {
        toast.error(err.message || 'حدث خطأ أثناء حفظ السند.');
      }
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={voucherType === 'RECEIPT' ? 'تسجيل سند قبض مالي' : 'تسجيل سند صرف مالي'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right font-sans" dir="rtl">
        {/* Type Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setVoucherType('RECEIPT');
              if (selectedParty && selectedParty.type === 'SUPPLIER') {
                setSelectedParty(null);
              }
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              voucherType === 'RECEIPT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>سند قبض (توريد مالي)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setVoucherType('DISBURSEMENT');
              if (selectedParty && selectedParty.type !== 'SUPPLIER') {
                setSelectedParty(null);
              }
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              voucherType === 'DISBURSEMENT'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>سند صرف (سداد دفعة)</span>
          </button>
        </div>

        {/* Info Strip */}
        <div
          className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-center justify-between ${
            voucherType === 'RECEIPT'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-blue-50/80 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              {voucherType === 'RECEIPT'
                ? 'تسجيل دفعة نقدية مقبوضة من العميل أو التاجر أو المورد، وقيدها لتخفيض مديونيته.'
                : 'تسجيل دفعة نقدية مسددة للمورد مقابل فواتير الشراء، أو صرف دفعة للعميل.'}
            </span>
          </div>
        </div>

        {/* Party Selection Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            الطرف المعني بالسند (عميل / تاجر / مورد) <span className="text-rose-500">*</span>
          </label>

          {!selectedParty ? (
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="ابحث بالاسم أو اسم الشركة أو رقم الهاتف..."
                className="text-xs h-10 pr-9"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute left-3 top-3" />
              )}

              {/* Autocomplete Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((p) => {
                    const isSup = p.type === 'SUPPLIER';
                    const isWhole = p.type === 'WHOLESALE';
                    return (
                      <button
                        key={`${p.type}-${p.id}`}
                        type="button"
                        onClick={() => handleSelectParty(p)}
                        className="w-full p-2.5 text-right hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`p-2 rounded-xl text-xs ${
                              isSup
                                ? 'bg-amber-100 text-amber-800'
                                : isWhole
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSup ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-700 block text-xs">
                              {p.name}
                              {p.companyName ? ` (${p.companyName})` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.phone || 'بدون هاتف'} •{' '}
                              <span
                                className={`font-bold ${
                                  isSup
                                    ? 'text-amber-700'
                                    : isWhole
                                      ? 'text-sky-700'
                                      : 'text-emerald-700'
                                }`}
                              >
                                {p.typeLabel}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <span
                            className={`font-black text-xs block ${
                              p.balance > 0
                                ? 'text-rose-700'
                                : p.balance < 0
                                  ? 'text-emerald-700'
                                  : 'text-slate-500'
                            }`}
                          >
                            {formatMoney(p.balance)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans block">
                            {p.balanceLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Selected Party Card */
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`p-2 rounded-xl ${
                    selectedParty.type === 'SUPPLIER'
                      ? 'bg-amber-100 text-amber-800'
                      : selectedParty.type === 'WHOLESALE'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedParty.type === 'SUPPLIER' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{selectedParty.name}</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {selectedParty.typeLabel}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                    {selectedParty.phone || 'بدون هاتف'} •{' '}
                    <span className="font-bold text-slate-700">
                      الرصيد: {formatMoney(selectedParty.balance)} ({selectedParty.balanceLabel})
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedParty.balance > 0 && parsedAmount !== selectedParty.balance && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(selectedParty.balance))}
                    className="h-7 px-2 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    سداد كامل المستحق
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelectedParty}
                  className="h-7 px-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  title="تغيير الطرف"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>تغيير</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Voucher Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Amount */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              المبلغ المسدد (ريال يمني) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              required
              placeholder="مثال: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xs h-10 font-mono font-bold"
            />
            {parsedAmount > 0 && (
              <span className="text-[10px] text-blue-700 font-bold block pt-0.5">
                فقط: {tafqeetRials(parsedAmount)}
              </span>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              طريقة السداد <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 h-10"
            >
              <option value="CASH">نقدًا (Cash)</option>
              <option value="TRANSFER">حوالة مصرفية / صرافة (Transfer)</option>
              <option value="CHECK">شيك بنكي (Check)</option>
              <option value="OTHER">أخرى (Other)</option>
            </select>
          </div>

          {/* Bank / Exchange Name */}
          {(paymentMethod === 'TRANSFER' || paymentMethod === 'CHECK') && (
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">اسم البنك أو شبكة الصرافة</label>
              <Input
                type="text"
                placeholder="مثال: الكريمي، بنك القطيبي، بنك البسيري، العمقي..."
                value={bankOrExchange}
                onChange={(e) => setBankOrExchange(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Reference / Voucher Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              رقم الحوالة / السند / الإيصال (اختياري)
            </label>
            <Input
              type="text"
              placeholder="مثال: TRX-110022"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="text-xs h-9 font-mono"
              dir="ltr"
            />
          </div>

          {/* Collector / Signatory */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              المحرر / أمين الصندوق / المستلم
            </label>
            <Input
              type="text"
              placeholder="اتركه فارغاً لاستخدام اسم حسابك الحالي"
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700">البيان / ملاحظات السند</label>
            <Input
              type="text"
              placeholder="مثال: دفعة تحت الحساب، تسوية فاتورة، إلخ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs h-9 px-4"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isPending || !selectedParty || parsedAmount <= 0}
            className={`text-xs h-9 px-6 font-bold text-white flex items-center gap-2 ${
              voucherType === 'RECEIPT'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ والقيد...</span>
              </>
            ) : (
              <span>حفظ وقيد السند في الحساب</span>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
