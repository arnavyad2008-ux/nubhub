import { useState, useEffect } from 'react';
import {
  X,
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  CheckCircle2,
  Clock,
  Sparkles,
  Flag,
  CornerDownRight,
  Send,
  AlertTriangle,
  Layers,
  QrCode
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from './SocialIcons';
import type { Business, Review, BusinessMetrics } from '../lib/types';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { ZeroState } from './ZeroState';
import { ReviewListSkeleton } from './LoadingSkeleton';
import { useToast } from './ToastContainer';

interface BusinessDetailModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onOpenReviewForm: () => void;
  onShowQR?: (business: Business) => void;
  currentMerchantPhone?: string | null;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  business: initialBusiness,
  isOpen,
  onClose,
  onOpenReviewForm,
  onShowQR,
  currentMerchantPhone
}) => {
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business>(initialBusiness);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Merchant reply inline state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Flag review modal state
  const [flaggingReviewId, setFlaggingReviewId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  const isOwner = currentMerchantPhone && currentMerchantPhone === business.owner_phone;

  useEffect(() => {
    setBusiness(initialBusiness);
  }, [initialBusiness]);

  useEffect(() => {
    if (!isOpen || !business.id) return;

    let isMounted = true;
    setLoading(true);

    // Fetch initial business details & reviews
    Promise.all([
      api.getBusiness(business.id),
      api.getReviews(business.id)
    ])
      .then(([bizData, revData]) => {
        if (isMounted) {
          setBusiness(bizData.business);
          setMetrics(bizData.metrics);
          setReviews(revData.reviews);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching details:', err);
        if (isMounted) setLoading(false);
      });

    // Real-Time Socket.IO Synchronization
    socket.emit('join:business', business.id);

    const handleReviewAdded = (data: { review: Review; metrics: BusinessMetrics; business: Business }) => {
      setReviews((prev: Review[]) => [data.review, ...prev]);
      setMetrics(data.metrics);
      setBusiness(data.business);
      toast({
        type: 'info',
        title: 'New Review Added Live',
        message: `${data.review.author_name} just evaluated ${data.review.service_type} experience (${data.review.overall_rating}★)`
      });
    };

    const handleReviewReplied = (updatedReview: Review) => {
      setReviews((prev: Review[]) => prev.map((r: Review) => (r.id === updatedReview.id ? updatedReview : r)));
      toast({
        type: 'success',
        title: 'Official Reply Published',
        message: 'Business owner response is now visible on the public thread.'
      });
    };

    const handleReviewModerated = (data: { review: Review; metrics: BusinessMetrics; business: Business }) => {
      setReviews((prev: Review[]) => prev.filter((r: Review) => r.id !== data.review.id || data.review.is_flagged !== true));
      setMetrics(data.metrics);
      setBusiness(data.business);
    };

    const handleProfileUpdated = (updatedBiz: Business) => {
      setBusiness(updatedBiz);
    };

    socket.on('review:added', handleReviewAdded);
    socket.on('review:replied', handleReviewReplied);
    socket.on('review:moderated', handleReviewModerated);
    socket.on('business:profile_updated', handleProfileUpdated);

    return () => {
      isMounted = false;
      socket.emit('leave:business', business.id);
      socket.off('review:added', handleReviewAdded);
      socket.off('review:replied', handleReviewReplied);
      socket.off('review:moderated', handleReviewModerated);
      socket.off('business:profile_updated', handleProfileUpdated);
    };
  }, [isOpen, business.id]);

  if (!isOpen) return null;

  const whatsappNumber = business.socials?.whatsapp || business.phone.replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('+') ? whatsappNumber.substring(1) : whatsappNumber;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${business.name}, I discovered your listing on NubHub!`
  )}`;

  const handlePublishReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.replyToReview(reviewId, replyText.trim());
      setReviews((prev: Review[]) => prev.map((r: Review) => (r.id === reviewId ? res.review : r)));
      setReplyingReviewId(null);
      setReplyText('');
      toast({
        type: 'success',
        title: 'Reply Published',
        message: 'Your official merchant response is now live for all visitors.'
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Failed to Publish Reply',
        message: err.message
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleFlagReview = async (reviewId: string) => {
    if (!flagReason.trim()) return;
    setIsSubmittingFlag(true);
    try {
      const res = await api.flagReview(reviewId, flagReason.trim());
      setReviews((prev: Review[]) => prev.map((r: Review) => (r.id === reviewId ? res.review : r)));
      setFlaggingReviewId(null);
      setFlagReason('');
      toast({
        type: 'info',
        title: 'Dispute Queued',
        message: res.message || 'Review routed to Superadmin moderation queue.'
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Dispute Failed',
        message: err.message
      });
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Top Header / Hero */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {business.category}
                </span>

                {business.is_verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                    Verified Merchant
                  </span>
                )}

                {/* Real-time Operational Status */}
                {business.is_open ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Open Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    <Clock className="w-3.5 h-3.5" />
                    Closed Currently
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {business.name}
              </h2>

              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                {business.description || 'Authentic local merchant listed on the NubHub discovery portal.'}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{business.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{business.phone}</span>
                </div>
              </div>
            </div>

            {/* Overall Rating & Direct Social Buttons */}
            <div className="flex flex-col items-start md:items-end justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                <div>
                  <div className="text-xl font-bold text-white leading-none">
                    {metrics?.overall_avg && metrics.overall_avg > 0 ? metrics.overall_avg.toFixed(1) : 'Unrated'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {metrics?.total_reviews || 0} verified {metrics?.total_reviews === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              </div>

              {/* Direct Social Media Action Bar */}
              <div className="flex items-center gap-2">
                {business.socials?.whatsapp && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
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
                    className="p-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 transition-all hover:scale-105"
                    title="Instagram"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                )}
                {business.socials?.facebook && (
                  <a
                    href={business.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all hover:scale-105"
                    title="Facebook"
                  >
                    <FacebookIcon className="w-4 h-4" />
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
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition-all hover:scale-105"
                    title="Official Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}

                {onShowQR && (
                  <button
                    onClick={() => onShowQR(business)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:scale-105"
                    title="View Storefront QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Code</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-8 flex-1">
          {/* Multi-Criteria Service Metrics Section */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">
                  Multi-Criteria Service Dimension Breakdown
                </h4>
              </div>
              <span className="text-xs text-slate-400">Real-Time Computed Averages</span>
            </div>

            {metrics && Object.keys(metrics.dimension_averages).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {(Object.entries(metrics.dimension_averages) as [string, number][]).map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    food_quality: 'Food Quality',
                    speed: 'Service Speed',
                    cleanliness: 'Cleanliness',
                    value: 'Value for Money',
                    work_quality: 'Work Quality',
                    staff_behavior: 'Staff Behavior',
                    turnaround: 'Turnaround Time'
                  };

                  const percentage = Math.round((Number(val) / 5) * 100);

                  return (
                    <div
                      key={key}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{labelMap[key] || key}</span>
                        <span className="font-bold text-emerald-400">{Number(val).toFixed(1)} / 5</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-2">
                Dimension scores will compute automatically when customers submit verified ratings.
              </div>
            )}

            {/* Visit context distribution */}
            {metrics && metrics.service_type_breakdown && Object.keys(metrics.service_type_breakdown).length > 0 && (
              <div className="pt-2 flex items-center gap-2 flex-wrap text-xs text-slate-400">
                <span className="text-slate-300 font-semibold">Visit Types:</span>
                {(Object.entries(metrics.service_type_breakdown) as [string, number][]).map(([st, cnt]) => (
                  <span
                    key={st}
                    className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                  >
                    {st}: {cnt}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reviews Thread Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Customer Reviews & Experience</h4>
                <p className="text-xs text-slate-400">
                  Authentic ratings submitted directly by customers
                </p>
              </div>

              <button
                onClick={onOpenReviewForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Write Review</span>
              </button>
            </div>

            {loading ? (
              <ReviewListSkeleton />
            ) : reviews.length === 0 ? (
              <ZeroState
                type="no_reviews"
                onAction={onOpenReviewForm}
                actionLabel="Be the First to Rate Their Service"
              />
            ) : (
              <div className="space-y-4">
                {reviews.map((rev: Review) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3 transition-colors hover:border-slate-700"
                  >
                    {/* Reviewer Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-sm">
                          {rev.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{rev.author_name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-teal-400 border border-slate-700">
                              {rev.service_type}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rev.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-white">{rev.overall_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Multi-Criteria Ratings Chips */}
                    {rev.service_ratings && Object.keys(rev.service_ratings).length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {(Object.entries(rev.service_ratings) as [string, number][]).map(([dim, val]) => (
                          <span
                            key={dim}
                            className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300"
                          >
                            <span className="text-slate-400 capitalize">{dim.replace('_', ' ')}:</span>{' '}
                            <span className="font-bold text-emerald-400">{val}★</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comment */}
                    <p className="text-sm text-slate-200 leading-relaxed pt-1">
                      "{rev.comment}"
                    </p>

                    {/* Official Merchant Reply (Public Thread) */}
                    {rev.owner_reply && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/25 space-y-1.5 ml-4">
                        <div className="flex items-center gap-2">
                          <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold text-emerald-400">
                            Official Merchant Response
                          </span>
                          {rev.owner_replied_at && (
                            <span className="text-[10px] text-slate-500">
                              • {new Date(rev.owner_replied_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 pl-5 leading-relaxed">
                          {rev.owner_reply}
                        </p>
                      </div>
                    )}

                    {/* Inline Reply Input for Merchant Owner */}
                    {isOwner && !rev.owner_reply && (
                      <div className="pt-2 border-t border-slate-800/80">
                        {replyingReviewId === rev.id ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply publicly to ${rev.author_name} as ${business.name}...`}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setReplyingReviewId(null);
                                  setReplyText('');
                                }}
                                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handlePublishReply(rev.id)}
                                disabled={isSubmittingReply || !replyText.trim()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" />
                                <span>Publish Official Reply</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <button
                              onClick={() => setReplyingReviewId(rev.id)}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                            >
                              + Post Official Response
                            </button>

                            <button
                              onClick={() => setFlaggingReviewId(rev.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                              title="Flag review as suspicious"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Flag as Suspicious</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 px-6 md:px-8 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            NubHub verified directory • Real-time synchronized
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>

      {/* Flag Dispute Modal */}
      {flaggingReviewId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-white text-base">Flag Review as Suspicious</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Per NubHub anti-abuse protocol, reviews cannot be deleted unilaterally by merchants.
              Your dispute will be immediately forwarded to the Superadmin moderation queue with full audit telemetry.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dispute Reason / Evidence *
              </label>
              <textarea
                required
                rows={3}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Suspected competitor review bombing; customer never visited during recorded operational hours..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setFlaggingReviewId(null);
                  setFlagReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFlagReview(flaggingReviewId)}
                disabled={isSubmittingFlag || !flagReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                Submit Dispute to Superadmin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
