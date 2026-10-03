export interface SocialLinks {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  website?: string;
}

export interface Business {
  id: string;
  owner_phone: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  socials: SocialLinks;
  is_open: boolean;
  is_verified: boolean;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
}

export interface ServiceRatings {
  // Food & Dining
  food_quality?: number;
  speed?: number;
  cleanliness?: number;
  value?: number;
  // General & Home Services
  work_quality?: number;
  staff_behavior?: number;
  turnaround?: number;
  [key: string]: number | undefined;
}

export interface Review {
  id: string;
  business_id: string;
  author_name: string;
  overall_rating: number;
  service_ratings: ServiceRatings;
  service_type: string;
  comment: string;
  submitter_ip?: string;
  is_flagged: boolean;
  flag_reason?: string;
  owner_reply?: string;
  owner_replied_at?: string;
  created_at: string;
}

export interface BusinessMetrics {
  overall_avg: number;
  total_reviews: number;
  dimension_averages: Record<string, number>;
  service_type_breakdown: Record<string, number>;
}

export interface AuditLog {
  id: string;
  actor_phone: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export interface SecurityRule {
  id: string;
  rule_type: 'BLOCKED_IP' | 'BLOCKED_PHONE' | 'SHADOWBANNED';
  target_value: string;
  reason: string;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  token: string;
  phone: string;
  role: string;
  ip_address: string;
  user_agent: string;
  is_revoked: number;
  created_at: string;
}

export interface GoogleInsight {
  query: string;
  location: string;
  popularSearchQueries: string[];
  customerIntentTrends: string[];
  localSeoKeywords: string[];
  competitiveInsights: string;
}
