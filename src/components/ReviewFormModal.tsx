import { useState } from 'react';
import { X, Send, ShieldCheck, AlertCircle } from 'lucide-react';
import { MultiCriteriaRating } from './MultiCriteriaRating';
import type { Business } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from './ToastContainer';

interface ReviewFormModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VISIT_TYPES_FOOD = ['Dine-in', 'Takeaway', 'Delivery'];
const VISIT_TYPES_GENERAL = ['On-site Service', 'In-store', 'Emergency Call-out', 'Consultation'];

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  business,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const [authorName, setAuthorName] = useState('');
  const [serviceType, setServiceType] = useState(
    business.category.toLowerCase().includes('cafe') || business.category.toLowerCase().includes('restaurant')
      ? 'Dine-in'
      : 'In-store'
  );
  const [serviceRatings, setServiceRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isFood = business.category.toLowerCase().includes('cafe') ||
                 business.category.toLowerCase().includes('restaurant') ||
                 business.category.toLowerCase().includes('dining') ||
                 business.category.toLowerCase().includes('food');

  const visitOptions = isFood ? VISIT_TYPES_FOOD : VISIT_TYPES_GENERAL;

  // Calculate overall score automatically from selected dimensions
  const ratingValues = Object.values(serviceRatings).filter((v) => typeof v === 'number' && v > 0);
  const computedOverall = ratingValues.length > 0
    ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authorName.trim()) {
      setErrorMessage('Please enter your name or alias.');
      return;
    }

    if (ratingValues.length === 0) {
      setErrorMessage('Please rate at least one service dimension.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMessage('Please provide a brief written comment describing your experience (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.submitReview(business.id, {
        author_name: authorName.trim(),
        overall_rating: computedOverall || 5.0,
        service_ratings: serviceRatings,
        service_type: serviceType,
        comment: comment.trim()
      });

      toast({
        type: 'success',
        title: 'Review Published Live',
        message: response.message || 'Your verified multi-criteria review is now live on NubHub!'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review';
      setErrorMessage(msg);
      toast({
        type: 'error',
        title: 'Submission Blocked',
        message: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Customer Feedback
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Review {business.name}</h3>
            <p className="text-xs text-slate-400">{business.address}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Name / Display Alias *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Visit Context *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {visitOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Criteria Ratings */}
          <MultiCriteriaRating
            category={business.category}
            serviceRatings={serviceRatings}
            onChange={setServiceRatings}
          />

          {/* Computed Score Banner */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Calculated Overall Score:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-emerald-400">
                {computedOverall > 0 ? `${computedOverall} / 5.0` : 'Select stars above'}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Detailed Experience Comment *
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Highlight specific moments regarding speed, cleanliness, customer service, and value..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                Anti-Spam Shield: 1 review per IP / 30-day limit enforced
              </span>
              <span>{comment.length} chars</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying & Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Live Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
