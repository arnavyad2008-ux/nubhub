import React from 'react';
import { Store, MessageSquareQuote, ShieldAlert, Sparkles, Plus, SearchX } from 'lucide-react';

interface ZeroStateProps {
  type: 'no_businesses' | 'no_search_results' | 'no_reviews' | 'no_admin_records';
  category?: string;
  searchQuery?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const ZeroState: React.FC<ZeroStateProps> = ({
  type,
  category,
  searchQuery,
  onAction,
  actionLabel
}) => {
  if (type === 'no_businesses') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 backdrop-blur-sm max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/20">
          <Store className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">
          {category && category !== 'All'
            ? `No businesses registered in "${category}" yet`
            : 'No businesses registered yet'}
        </h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
          Be the cornerstone of your local directory. Register your authentic business listing now and start collecting verified multi-criteria reviews.
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {actionLabel || 'Add Your Business Today'}
          </button>
        )}
      </div>
    );
  }

  if (type === 'no_search_results') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-white tracking-tight">
          No matches found for "{searchQuery}"
        </h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
          We couldn't find any verified local businesses matching your search criteria. Try adjusting keywords or selecting a broader category.
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            {actionLabel || 'Reset Filters'}
          </button>
        )}
      </div>
    );
  }

  if (type === 'no_reviews') {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 my-4">
        <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3">
          <MessageSquareQuote className="w-6 h-6" />
        </div>
        <h4 className="text-base font-medium text-white">
          No reviews yet — be the first to rate their service
        </h4>
        <p className="mt-1 text-xs text-slate-400 max-w-sm">
          Evaluate work quality, speed, cleanliness, and value for money. Your authentic feedback guides the neighborhood.
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {actionLabel || 'Write First Review'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-slate-400 text-sm">
      <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-slate-500" />
      No records currently available in this section.
    </div>
  );
};
