import React from 'react';

export const BusinessCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 animate-pulse flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-800 rounded w-24" />
          <div className="h-6 bg-slate-700 rounded w-48" />
        </div>
        <div className="h-6 bg-slate-800 rounded-full w-20" />
      </div>

      <div className="space-y-2 py-2">
        <div className="h-3 bg-slate-800 rounded w-full" />
        <div className="h-3 bg-slate-800 rounded w-4/5" />
      </div>

      <div className="h-4 bg-slate-800 rounded w-36" />

      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-slate-800 rounded-lg" />
          <div className="w-8 h-8 bg-slate-800 rounded-lg" />
          <div className="w-8 h-8 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-9 bg-slate-800 rounded-xl w-28" />
      </div>
    </div>
  );
};

export const MetricsSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 animate-pulse space-y-4">
      <div className="h-6 bg-slate-800 rounded w-40" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="h-3 bg-slate-800 rounded w-20" />
            <div className="h-7 bg-slate-700 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReviewListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-800 rounded-full" />
              <div className="space-y-1.5">
                <div className="h-4 bg-slate-700 rounded w-28" />
                <div className="h-3 bg-slate-800 rounded w-20" />
              </div>
            </div>
            <div className="h-5 bg-slate-800 rounded w-16" />
          </div>
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
};
