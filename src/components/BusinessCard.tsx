import { Star, MapPin, Phone, MessageCircle, Globe, CheckCircle2, Clock, QrCode } from 'lucide-react';
import { InstagramIcon, FacebookIcon } from './SocialIcons';
import type { Business } from '../lib/types';

interface BusinessCardProps {
  business: Business;
  onSelect: (business: Business) => void;
  onRate: (business: Business) => void;
  onShowQR: (business: Business) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  onSelect,
  onRate,
  onShowQR
}) => {
  const whatsappNumber = business.socials?.whatsapp || business.phone.replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('+') ? whatsappNumber.substring(1) : whatsappNumber;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${business.name}, I discovered your listing on NubHub!`
  )}`;

  return (
    <div className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between backdrop-blur-sm">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-teal-400 border border-slate-700/60">
                {business.category}
              </span>
              {business.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Verified
                </span>
              )}
            </div>

            <h3
              onClick={() => onSelect(business)}
              className="text-lg font-bold text-white mt-2 group-hover:text-emerald-400 transition-colors cursor-pointer line-clamp-1"
            >
              {business.name}
            </h3>
          </div>

          {/* Operational Status (Real-time synced) */}
          <div className="shrink-0">
            {business.is_open ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-900/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Open Now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
                <Clock className="w-3 h-3" />
                Closed
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {business.description || 'Verified local business registered on the NubHub directory.'}
        </p>

        {/* Details: Address & Phone */}
        <div className="mt-3.5 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{business.address}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>{business.phone}</span>
          </div>
        </div>
      </div>

      {/* Footer Area: Ratings, Socials, Actions */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
        {/* Rating Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-white">
                {business.avg_rating && business.avg_rating > 0
                  ? business.avg_rating.toFixed(1)
                  : 'New'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              ({business.review_count || 0} {business.review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {/* Social Quick Links */}
          <div className="flex items-center gap-1.5">
            {business.socials?.whatsapp && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp Direct Chat"
                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all hover:scale-110"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            {business.socials?.instagram && (
              <a
                href={
                  business.socials.instagram.startsWith('http')
                    ? business.socials.instagram
                    : `https://instagram.com/${business.socials.instagram.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/20 transition-all hover:scale-110"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
            )}
            {business.socials?.facebook && (
              <a
                href={business.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all hover:scale-110"
              >
                <FacebookIcon className="w-3.5 h-3.5" />
              </a>
            )}
            {business.socials?.website && (
              <a
                href={
                  business.socials.website.startsWith('http')
                    ? business.socials.website
                    : `https://${business.socials.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                title="Official Website"
                className="p-1.5 rounded-lg bg-slate-800 text-teal-300 hover:bg-slate-700 border border-slate-700 transition-all hover:scale-110"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Business QR Code Trigger */}
            <button
              onClick={() => onShowQR(business)}
              title="Storefront QR Code & Tabletop Kit"
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all hover:scale-110"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onSelect(business)}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all text-center"
          >
            View Details
          </button>
          <button
            onClick={() => onRate(business)}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all text-center shadow-md shadow-emerald-500/20 hover:scale-102 active:scale-98"
          >
            Rate Service
          </button>
        </div>
      </div>
    </div>
  );
};
