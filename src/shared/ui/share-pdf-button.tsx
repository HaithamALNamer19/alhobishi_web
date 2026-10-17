'use client';

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './button';
import { Dialog } from './dialog';
import {
  Share2,
  Loader2,
  Download,
  MessageCircle,
  Copy,
  Check,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export interface SharePdfButtonProps {
  /** Document title for share dialog */
  title: string;
  /** File name without .pdf extension */
  filename: string;
  /** Function returning the printable React component */
  renderDocument: () => React.ReactElement;
  /** Summary text to accompany share on WhatsApp/Social */
  summaryText?: string;
  /** Optional custom button label */
  buttonLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SharePdfButton({
  title,
  filename,
  renderDocument,
  summaryText,
  buttonLabel = 'مشاركة PDF',
  className,
}: SharePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Generate PDF from React element
  const generatePdf = async (): Promise<{ blob: Blob; file: File }> => {
    // 1. Create off-screen rendering container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // Standard A4 width
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.setAttribute('dir', 'rtl');
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(renderDocument());

    // 2. Wait for rendering and ensure all images are fully loaded
    await new Promise((resolve) => setTimeout(resolve, 350));
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve(true);
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            })
        )
      );
    }

    try {
      // 3. Import html2pdf dynamically (client-only)
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: cleanFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 850,
          scrollY: 0,
          scrollX: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      const worker = (html2pdf as any)().set(opt).from(container);
      const blob: Blob = await worker.outputPdf('blob');
      const file = new File([blob], cleanFilename, { type: 'application/pdf' });

      return { blob, file };
    } finally {
      // 4. Cleanup offscreen container
      setTimeout(() => {
        try {
          root.unmount();
          container.remove();
        } catch {
          // Ignore unmount error if already cleaned
        }
      }, 500);
    }
  };

  const handleDownload = (blobToSave: Blob, targetFilename: string) => {
    const url = URL.createObjectURL(blobToSave);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetFilename.endsWith('.pdf') ? targetFilename : `${targetFilename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const { blob, file } = await generatePdf();
      setPdfBlob(blob);
      setPdfFile(file);

      // Check if native Web Share with files is supported (Smartphones/Tablets)
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: summaryText ? `${title}\n${summaryText}` : title,
          });
          toast.success('تمت المشاركة بنجاح');
          setIsGenerating(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // User closed share picker
            setIsGenerating(false);
            return;
          }
          console.warn('Native file share failed, falling back to modal:', err);
        }
      }

      // If on desktop or native share is unavailable:
      // Download the file immediately and open modal with WhatsApp & copy options
      handleDownload(blob, filename);
      toast.success('تم إنشاء ملف الـ PDF وتنزيله بنجاح');
      setShowModal(true);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء ملف الـ PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const shareMessage = summaryText ? `*${title}*\n\n${summaryText}` : `*${title}*`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyText = async () => {
    const textToCopy = summaryText ? `${title}\n\n${summaryText}` : title;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success('تم نسخ النص بنجاح');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('تعذر نسخ النص');
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleShare}
        disabled={isGenerating}
        className={`bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${className || ''}`}
        title="مشاركة المستند كـ PDF عبر واتساب ومواقع التواصل"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>جارٍ التجهيز...</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span>{buttonLabel}</span>
          </>
        )}
      </Button>

      {/* Share Modal for Desktop & Additional Options */}
      {showModal && (
        <Dialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="مشاركة المستند (PDF)"
          maxWidth="md"
        >
          <div className="space-y-4 text-right font-sans" dir="rtl">
            {/* Header info */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-900 block">{title}</span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">
                  تم تنزيل المستند بتنسيق PDF على جهازك، ويمكنك الآن إرساله أو مشاركة تفاصيله.
                </span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال عبر واتساب</span>
                <ExternalLink className="w-3 h-3 opacity-75" />
              </button>

              {/* Re-download PDF */}
              <button
                type="button"
                onClick={() => pdfBlob && handleDownload(pdfBlob, filename)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تحميل PDF مجدداً</span>
              </button>
            </div>

            {/* Copy summary text */}
            {summaryText && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600">ملخص المستند:</span>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ النص</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                  {summaryText}
                </div>
              </div>
            )}

            {/* Close footer */}
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="text-xs px-5"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
