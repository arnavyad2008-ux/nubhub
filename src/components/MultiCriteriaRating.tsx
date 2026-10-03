import React from 'react';
import { Star } from 'lucide-react';

export interface DimensionConfig {
  key: string;
  label: string;
  description: string;
}

export const FOOD_DIMENSIONS: DimensionConfig[] = [
  { key: 'food_quality', label: 'Food Quality / Taste', description: 'Freshness, flavor profile, and ingredient standard' },
  { key: 'speed', label: 'Service Speed', description: 'Promptness of seating, ordering, and food delivery' },
  { key: 'cleanliness', label: 'Cleanliness / Ambiance', description: 'Table hygiene, air quality, decor, and restrooms' },
  { key: 'value', label: 'Value for Money', description: 'Portion sizing, pricing fairness, and overall satisfaction' }
];

export const GENERAL_DIMENSIONS: DimensionConfig[] = [
  { key: 'work_quality', label: 'Work Quality', description: 'Precision, execution standard, and durability' },
  { key: 'staff_behavior', label: 'Staff Behavior', description: 'Politeness, transparency, and clear communication' },
  { key: 'turnaround', label: 'Turnaround Time', description: 'Punctuality, estimated vs actual completion time' },
  { key: 'value', label: 'Value for Money', description: 'Competitive quotation and billing clarity' }
];

interface MultiCriteriaRatingProps {
  category: string;
  serviceRatings: Record<string, number>;
  onChange: (ratings: Record<string, number>) => void;
  readOnly?: boolean;
}

export const MultiCriteriaRating: React.FC<MultiCriteriaRatingProps> = ({
  category,
  serviceRatings,
  onChange,
  readOnly = false
}) => {
  const isFood = category.toLowerCase().includes('cafe') ||
                 category.toLowerCase().includes('restaurant') ||
                 category.toLowerCase().includes('dining') ||
                 category.toLowerCase().includes('food');

  const dimensions = isFood ? FOOD_DIMENSIONS : GENERAL_DIMENSIONS;

  const handleStarClick = (dimKey: string, starValue: number) => {
    if (readOnly) return;
    onChange({
      ...serviceRatings,
      [dimKey]: starValue
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          {isFood ? 'Food & Hospitality Service Criteria' : 'Professional Service Criteria'}
        </span>
        <span className="text-xs text-slate-400">1 – 5 Star Dimensions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {dimensions.map((dim) => {
          const rating = serviceRatings[dim.key] || 0;

          return (
            <div
              key={dim.key}
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-white">{dim.label}</h5>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                    {rating > 0 ? `${rating}.0` : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{dim.description}</p>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleStarClick(dim.key, star)}
                    className={`p-1 rounded transition-transform ${
                      readOnly ? 'cursor-default' : 'hover:scale-115 active:scale-95 focus:outline-none'
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-800 text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
