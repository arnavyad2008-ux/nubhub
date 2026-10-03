# NubHub • Hyper-Local Business Discovery & Multi-Criteria Service Reviews

NubHub is a production-grade full-stack web application designed as a hyper-local business discovery portal, multi-criteria service review engine, and secure merchant management ecosystem.

## 🌟 Core Pillars & Architectural Standards

### 1. Zero Fake or Placeholder Data
- **Zero Mock Profiles & Reviews**: NubHub does not contain hardcoded filler listings, mock avatars, or fake star ratings.
- **Polished Zero-States**: When a category has no listings or a newly registered business has no feedback, clean, enterprise zero-states guide the user (`"No businesses registered in this category yet — add yours today"` and `"No reviews yet — be the first to rate their service"`).
- **Persistent Authentic Records**: All business profiles and reviews are stored in a persistent SQLite database with high-concurrency WAL mode.

### 2. Real-Time Data Synchronization
- **WebSocket Event Gateway (Socket.IO)**: Every database action triggers live broadcasting without page reloads:
  - New business registrations (`business:created`)
  - Operational hours and status toggles (`business:updated`)
  - Customer review submissions & dimension recalculation (`review:added`)
  - Verified merchant replies (`review:replied`)
  - Dispute moderation & resolution (`review:moderated`)
  - Security audit telemetry (`admin:audit_event`)

### 3. Production-Grade Aesthetics
- Enterprise Tailwind CSS theme built on slate-950 and vibrant emerald/teal accents.
- Responsive mobile and desktop layouts, custom scrollbars, subtle glowing indicators for live operational status (`Open Now` vs `Closed`), and verified merchant shields.

### 4. Multi-Criteria Service Reviews
Customers evaluate specific service dimensions on every visit:
- **Food & Dining**: Food Quality/Taste, Service Speed, Cleanliness/Ambiance, Value for Money.
- **General & Home Services**: Work Quality, Staff Behavior, Turnaround Time, Value for Money.
- **Visit Context**: Dine-in, Takeaway, Delivery, On-site Service, In-store.
- Real-time dimensional score averaging and public verified merchant reply threads.

### 5. Gemini AI Intelligence & Google Search Data Grounding
- **Gemini Content Moderation**: Analyzes incoming reviews in real time to filter out profanity, competitor review bombing, and harassment.
- **Gemini Merchant Reply Copilot**: Automatically generates 3 personalized, tone-optimized responses (Warm & Gracious, Solution-Oriented, Concise) based on the customer's sentiment.
- **Gemini Service Dimension Synthesis**: Synthesizes ratings into an executive summary, top strengths, areas for operational improvement, and action items.
- **Google Search Data Grounding**: Queries live local consumer search intents, trending Google search queries, and local SEO keywords for every neighborhood and category.

### 6. Anti-Abuse & Superadmin Governance
- **Passwordless Phone OTP**: International country codes, Turnstile / reCAPTCHA security gate.
- **Rate-Limit Shielding**:
  - Max 3 OTP requests per phone number per hour.
  - Max 5 OTP requests per IP address per hour.
  - Mandatory 60-second cooldown timer between resends.
- **Review Spam Throttling**: Restricts review submissions to maximum 1 review per IP address per business every 30 days.
- **Merchant Dispute Workflow**: Merchants flag reviews as suspicious with a rationale, routing them to the Superadmin moderation queue instead of deleting them unilaterally.
- **Superadmin Controls**: Live audit logging (`/admin/activity`), multi-IP session tracking, 1-click session revocation, IP/phone blacklisting, and shadowbanning.

---

## 🗄️ Database Schema Structure

Matches the exact required specification:
```sql
-- 1. Businesses Table
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  socials TEXT DEFAULT '{"instagram": "", "whatsapp": "", "facebook": "", "website": ""}',
  is_open INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Multi-Criteria Service Reviews Table
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  overall_rating REAL NOT NULL,
  service_ratings TEXT NOT NULL,
  service_type TEXT NOT NULL,
  comment TEXT NOT NULL,
  submitter_ip TEXT,
  is_flagged INTEGER DEFAULT 0,
  flag_reason TEXT,
  owner_reply TEXT,
  owner_replied_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- 3. Security, Audit Logs & Access Control
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_phone TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE security_rules (
  id TEXT PRIMARY KEY,
  rule_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 🚀 Running the Application

### Start Unified Production Server (API + WebSockets + Web UI on port 3001)
```bash
npm run start
```
Visit: [http://localhost:3001](http://localhost:3001)

### Development Mode with Vite HMR
```bash
npm run dev
```
Visit: [http://localhost:5173](http://localhost:5173) (automatically proxies to backend on port 3001)

### Running Automated End-to-End Tests
```bash
npx tsx test_e2e.ts
```

---

## 📱 Real-Time QR Code Storefront Kit
Every business registered in NubHub receives its own custom QR Code:
- **Instant Deep-Link**: Scannable QR code encodes `https://<domain>/?biz=<business_id>&action=review`.
- **Instant Review Trigger**: Customers scanning the QR code on tables or counters immediately open the Multi-Criteria Review modal for that exact business.
- **Tabletop Flyer & High-Res PNG Download**: Merchants can download a 1024x1024 PNG or print a branded counter display flyer directly from their dashboard.

---

## ⚡ Cloud Deployment: Vercel & Supabase

### 1. Supabase PostgreSQL & Realtime Setup
1. Log in to [Supabase](https://supabase.com/dashboard) and create or select your project.
2. Navigate to the **SQL Editor** tab: `https://supabase.com/dashboard/project/<project-id>/sql`.
3. Open [`supabase/schema.sql`](file:///C:/Users/Arnav%20Yadav/.gemini/antigravity/scratch/nubhub/supabase/schema.sql), copy its contents, and click **Run**.
4. This creates:
   - `businesses` table with JSONB socials and category indices
   - `reviews` table with 1–5 star checks and cascading foreign keys
   - `audit_logs`, `security_rules`, `sessions`, and `otp_requests` tables
   - Row Level Security (RLS) policies
   - Active `supabase_realtime` publication for instant cross-client updates.

### 2. Vercel Deployment
NubHub is configured for zero-config Vercel deployment via [`vercel.json`](file:///C:/Users/Arnav%20Yadav/.gemini/antigravity/scratch/nubhub/vercel.json) and [`api/index.ts`](file:///C:/Users/Arnav%20Yadav/.gemini/antigravity/scratch/nubhub/api/index.ts).

#### Option A: 1-Click Git Import (Recommended)
1. Go to [Vercel New Project](https://vercel.com/new).
2. Import the GitHub repository: `https://github.com/arnavyad2008-ux/nubhub`.
3. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `VITE_SUPABASE_URL`: `https://<project-id>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public key
4. Click **Deploy**!

#### Option B: Deploy via Vercel CLI
```bash
npx vercel
# Follow prompts to link project, or run for production:
npx vercel --prod
```

