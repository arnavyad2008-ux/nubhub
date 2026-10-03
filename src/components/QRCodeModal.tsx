import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Download, Printer, Copy, Check, Sparkles } from 'lucide-react';
import type { Business } from '../lib/types';
import { useToast } from './ToastContainer';

interface QRCodeModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  business,
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // The direct URL encoded into the QR code
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const qrTargetUrl = `${currentOrigin}/?biz=${business.id}&action=review`;

  useEffect(() => {
    if (!isOpen || !business.id) return;

    QRCode.toDataURL(qrTargetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
      });
  }, [isOpen, business.id, qrTargetUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrTargetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      type: 'success',
      title: 'QR Link Copied',
      message: 'Direct rating link copied to clipboard.'
    });
  };

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${business.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_nubhub_qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({
      type: 'success',
      title: 'QR Code Downloaded',
      message: 'High-resolution PNG saved.'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Storefront & Tabletop QR Code</h3>
              <p className="text-xs text-slate-400">{business.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6 text-center">
          {/* Printable Tabletop Card */}
          <div
            ref={printableRef}
            className="p-6 rounded-2xl bg-white text-slate-950 shadow-xl border border-slate-200 max-w-sm mx-auto space-y-4 print:border-none print:shadow-none"
          >
            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 block">
                NubHub Verified Merchant
              </span>
              <h4 className="text-xl font-black tracking-tight text-slate-950 mt-0.5">
                {business.name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{business.address}</p>
            </div>

            {/* QR Code Graphic */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`QR Code for ${business.name}`}
                  className="w-56 h-56 mx-auto rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-400">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Scan to Rate Service on NubHub</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Evaluates Food/Work Quality, Service Speed, Cleanliness & Value
              </p>
            </div>
          </div>

          {/* Target URL indicator */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left flex items-center justify-between gap-3 text-xs">
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Direct Review Destination</span>
              <span className="font-mono text-emerald-400 text-[11px] truncate block">{qrTargetUrl}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadPng}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all hover:scale-102"
            >
              <Download className="w-4 h-4 text-teal-400" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-102"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tabletop Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
