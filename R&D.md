# One Stop Cleaner — R&D

> Research & product discovery. No code yet. Last updated 2026-09-03.
> **Launch market: Australia** 🇦🇺

## 1. Product in one line
A **location-based two-sided marketplace** that connects people who need cleaning
services (clients) with **individual cleaners and cleaning companies** (service
providers). Clients post a job, nearby providers **bid a price**, and the client
books by preference.

## 2. The core loop
```
Client posts a job (what / where / when / budget)
        │
        ▼
Providers in that location get notified
        │
        ▼
Providers place a bid (price + timeline + notes)
        │
        ▼
Client compares bids → books one
        │
        ▼
Work done → payment released → ratings/reviews → trust compounds
```

## 3. Two sides, two products
You are really building **two apps that share one marketplace**:

### A. Client side (demand)
- Sign up / login (phone OTP is best for this market)
- **Post a job**: service type (home/office/deep move-out/car), address+map pin,
  date/time, size (sqft / rooms), photos, notes, budget range
- **Discover**: browse providers near them, filter by rating, price, distance,
  availability, verified badge
- **Receive bids** in a comparison view
- **Book** a provider, chat, pay (escrow)
- **Shop products**: browse cleaning products, add to cart, reorder after a job
- **Bundle products** with a booking (starter kit, refills, consumables)
- Track job status, receive completion proof (photos)
- Rate/review, request refund/dispute, re-book, re-order products

### B. Provider side (supply) — individuals AND companies
- Profile: name/company, services offered, service area (radius around home base),
  working hours, languages
- **Identity + location verification** (national ID, address proof, selfie) — critical
- Portfolio: before/after photos, certifications
- **Availability calendar** + "online/available now" toggle
- **Bid engine**: see posted jobs near them, submit a bid (price, ETA, notes)
- Booking dashboard, earnings/wallet, payout
- Ratings, response rate, response time stats

## 4. Bidding vs. fixed pricing (design decision)
The user asked for a **bidding system**. Two hybrid options:

| Model | How it works | Pros | Cons |
|---|---|---|---|
| **Pure bidding** | Client posts, N providers bid, client picks | Best price discovery, providers feel in control | Slower, clients can get bid-shocking, more noise |
| **Posted price + negotiate** | Providers show starting rates; client can negotiate | Faster, transparent | Less "auction" feel |
| **Hybrid (recommended)** | Client sets a target budget OR picks "get best price" → providers bid; client can also instantly book a listed fixed price | Best of both | Slightly more logic |

**Recommendation:** start with **hybrid** — a job post lets the client either
"get quotes (bidding)" or "book at listed price". This keeps fast bookings while
using bidding for price-sensitive, larger, or unclear jobs.

## 5. MVP feature set (what to build first)
**Must-have for v1:**
- Phone-OTP auth for both sides
- Client job posting (service, location pin, date/time, budget, photos)
- Provider profile + location + verified badge + listed starting rate
- Location-based job feed for providers (who's near whom)
- Bidding (submit price + ETA) + client bid comparison
- In-app chat
- Escrow payment (pay → release on completion)
- Ratings & reviews
- **Products catalog + cart** (starter kits, refills, consumables) with add-on at
  booking and post-job reorder
- **Basic admin panel** (verify providers, moderate, view disputes, manage products)

**Add after v1:**
- Instant "book now" for listed prices
- Automated matching / smart recommendations
- Subscription plans for providers (more bids, featured placement)
- Insurance / guarantee program
- Loyalty & referral
- **Product fulfillment**: inventory, shipping, returns, and supplier/dropship
  management
- Multi-service expansion (AC cleaning, pest control, plumbing)

## 6. Business model (how it makes money)
1. **Commission** per booking (e.g., 10–20%) — most common
2. **Lead/bid fees** — providers pay small amount to bid (anti-spam + revenue)
3. **Subscription** for providers — unlimited bids, analytics, featured listing
4. **Featured/ads** — boost profile in search
5. **Escrow float / fast-payout fee** — charge for instant payout
6. **Product margin** — markup on cleaning products sold direct or bundled with
   service (starter kits, refills, consumables)

**Recommendation:** commission + small bid fee (also filters low-quality bids).

6b. **Cleaning products (second revenue stream)**
Selling products is a separate business with its own inventory, shipping, and
fulfillment. Two ways to offer it:

- **Direct-to-client:** clients add products to their cart (starter kits,
  refills, consumables). You hold or dropship inventory and ship to the client.
- **Bundled with service:** the cleaner brings your branded products to the job,
  or the client reorders the same products after a booking. This ties product
  sales to service completion and improves retention.

Consider a **subscription/reorder** model for consumables (detergent, sponges,
microfiber cloths) and a **starter kit** for new clients. Watch product safety
labels, hazardous-material shipping rules, and GST on goods. Products add
complexity, so treat them as a v1-plus line rather than the core marketplace.

## 7. Trust & safety (the make-or-break)
This market lives or dies on **trust**, because a stranger enters someone's home.
- **Identity verification** (govt ID + selfie + address) for all providers
- **Background checks** where available/affordable
- **Ratings, reviews, verified badges, response metrics**
- **Escrow payments** — money only released when client is satisfied
- **In-app chat + call logging** — no personal numbers shared early
- **Dispute/refund flow** + admin mediation
- **Insurance / damage guarantee** (later, big trust booster)
- **Report/block** users

## 8. Location architecture (key technical point)
  "which providers are within X km of this job?" efficiently.

## 13. Execution plan

### Phase 0 — Validate the launch wedge
**Goal:** confirm the first market and service workflow before building.

- Launch in one Australian metro area before expanding nationally.
- Interview 10–15 clients and 10–15 cleaners or cleaning companies.
- Test the hybrid model with a lightweight landing page and manually matched jobs.
- Confirm the first service categories, cancellation rules, verification requirements,
        and acceptable commission/bid-fee structure.
- Define the legal, insurance, privacy, GST, and payment requirements for Australia.
- Decide the products scope: direct-to-client cart, bundled-with-service, or both;
  starter kit, refills, and consumables; and whether you hold inventory or dropship.
- Confirm product safety labels, hazardous-material shipping rules, and GST on goods.

**Exit criteria:** one launch city, one primary customer segment, a validated service
workflow, a validated products concept, and a shortlist of payment, verification, and
supplier/dropship vendors.

### Phase 1 — Product and technical foundation
**Goal:** create the smallest reliable marketplace foundation.

- Set up the responsive web app as a PWA-ready client and provider experience.
- Set up PostgreSQL with PostGIS, object storage, environments, logging, and backups.
- Implement phone OTP authentication and role-based access for clients, providers,
        and admins.
- Define the core entities: users, provider profiles, service areas, jobs, bids,
        bookings, messages, payments, reviews, verification cases, and disputes.
- Define the products entities: catalog, variants, inventory, cart, orders,
        fulfillment, shipping, and returns — kept separate from service bookings.
- Integrate Australian address search, geocoding, map pins, and radius queries.

**Exit criteria:** authenticated users can create and view records safely in staging,
and location queries return only eligible providers or jobs.

### Phase 2 — Marketplace MVP
**Goal:** ship the core client-provider loop.

- Client: create a cleaning job with service type, location, schedule, size, budget,
        photos, and notes.
- Provider: create a profile with services, service radius, availability, starting
        rate, portfolio, and verification status.
- Provider: browse nearby eligible jobs and submit one bid with price, ETA, and notes.
- Client: receive, compare, accept, or reject bids.
- Add booking state transitions, in-app chat, push/email notifications, and basic
        cancellation/no-show handling.
- Add admin tools for provider verification, moderation, user reports, and disputes.

**Exit criteria:** a real job can move from posting through bid acceptance and chat,
with admins able to intervene at every safety-critical step.

### Phase 3 — Payments, completion, and trust
**Goal:** make transactions safe enough for a controlled pilot.

- Integrate Stripe Connect for client payment collection and provider payouts.
- Hold payment until the booking reaches completion and the release conditions pass.
- Add completion proof photos, client approval, refund requests, and dispute states.
- Add ratings and reviews only after completed bookings.
- Add verification workflow for identity, address, selfie, and review status.
- Add audit logs for payment, verification, booking, moderation, and dispute actions.

**Exit criteria:** pilot bookings can be paid, completed, released, refunded, or
escalated without manual database changes.

### Phase 4 — Controlled pilot and hardening
**Goal:** operate safely with a small group in one city.

- Recruit and manually verify the initial provider cohort.
- Run 20–50 pilot bookings with support coverage and a documented incident process.
- Track activation, time to first bid, bid-to-book conversion, completion rate,
        cancellation rate, disputes, repeat bookings, and marketplace take rate.
- Fix onboarding, matching, notification, payment, and trust failures found in the
        pilot before increasing supply or demand.
- Add rate limits, spam controls, fraud monitoring, privacy review, accessibility
        checks, and mobile performance testing.

**Go/no-go criteria:** reliable completed bookings, acceptable dispute and
no-show rates, repeat demand, and positive unit economics in the launch area.

### Phase 5 — Post-v1 expansion
Only start this phase after the pilot meets its go/no-go criteria.

- Add instant booking for listed prices.
- Add automated matching and provider recommendations.
- Add provider subscriptions, featured placement, and referral/loyalty programs.
- Add insurance or a damage guarantee.
- Expand to additional Australian cities and services based on measured demand.
- Consider native mobile apps after the responsive web workflow is proven.

### Initial release order
1. Research validation and launch-city decision.
2. Auth, roles, database, maps, and media uploads.
3. Provider profiles and verification queue.
4. Client job posting and provider job feed.
5. Bids, comparison, booking, and notifications.
6. Chat and admin moderation.
7. Payments, completion proof, refunds, and disputes.
8. Ratings, reviews, analytics, and pilot hardening.
9. Products catalog, cart, and order/fulfillment (v1-plus line).

### Decisions to lock before Phase 1
- First Australian city and initial service category.
- Hybrid bidding plus fixed-price scope for v1.
- Commission payer, bid-fee policy, and cancellation fees.
- Individual and company provider onboarding requirements.
- Verification provider and minimum approval standard.
- Stripe Connect account and payout configuration.
- Escrow wording and the legal distinction between payment holding and escrow.
- Products scope, inventory model (hold vs dropship), shipping, and returns.
- Whether products ship to clients or are delivered by the cleaner on the job.

## 9. Enterprise architecture (how to make it massive)

### 9.1 Guiding principles
- **Services and products are two business lines.** Keep their data, money flow,
  and infrastructure separate even though they share one app. Do not build one
  giant monolith that mixes bookings and orders.
- **Services are the core; products are a second line.** The services marketplace
  is the hard, trust-critical part. Products are a catalog + cart + fulfillment
  problem. Design them as two services that share auth, payments, and notifications.
- **Location is the spine.** Every core action (job, bid, provider match, chat
  routing, product delivery) depends on knowing where people and providers are.
- **Event-driven everywhere.** Almost every feature is a state change that others
  need to react to (a bid arrives, a booking completes, a payment releases). Use
  events, not direct calls, so parts can scale and fail independently.
- **Scale the read side, not just the write side.** Location feeds, provider
  discovery, and bid comparison are read-heavy. Design for reads first.
- **Fail safe on money and trust.** Payments, verification, and disputes must be
  idempotent, auditable, and reversible. Never optimize these for speed over
  correctness.

### 9.2 High-level architecture
```
                 ┌─────────────────────────────────────────────┐
                 │           Edge / Delivery Layer              │
                 │  CDN · WAF · DDoS · TLS · Global DNS · API GW │
                 └───────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
 ┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐
 │  Client App  │                 │  Provider App │                 │   Admin App  │
 │  (Next.js    │                 │  (Next.js     │                 │  (Next.js    │
 │   PWA)       │                 │   PWA)        │                 │   PWA)       │
 └──────┬───────┘                 └──────┬───────┘                 └──────┬───────┘
        │ WebSocket (chat, bids)         │ WebSocket                     │
        └────────────────────────────────┼────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                          API Gateway / Load Balancer                       │
 └────────────────────────────────┬─────────────────────────────────────────┘
                                  │
   ┌───────────────┬──────────────┼───────────────┬───────────────┐
   ▼               ▼              ▼               ▼               ▼
┌───────┐    ┌───────┐     ┌───────────┐    ┌───────────┐   ┌───────────┐
│ Auth  │    │Market │     │ Payments  │   │ Products   │   │ Admin     │
│Svc   │    │place  │     │ & Escrow  │   │ & Fulfill  │   │ & Verify  │
└──┬───┘    └───┬───┘     └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
   │            │               │               │               │
   └────────────┴───────┬───────┴───────┬───────┴───────┬───────┘
                        ▼                ▼               ▼
                 ┌──────────────────────────────────────────────┐
                 │            Event Bus / Message Queue          │
                 │  (bids, bookings, payments, notifications)    │
                 └───────────────────────┬───────────────────────┘
                                         │
   ┌───────────────┬───────────────┬─────┴───────┬───────────────┐
   ▼               ▼               ▼               ▼               ▼
┌───────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐   ┌───────────┐
│PostG │    │  Search   │    │  Cache    │    │  Object   │   │  Stream   │
│IS     │    │  Engine   │    │  (Redis)  │    │  Store    │   │  Storage  │
│(main)│    │(OpenES/   │    │           │    │  (S3)     │   │(audit log) │
└───────┘    │ Meilisearch)└─────────────┘    └───────────┘   └───────────┘
```

### 9.3 Service breakdown (microservices)
Each service owns its data and talks through APIs and events.

- **Auth & Identity Service** — phone OTP, sessions, RBAC (client/provider/admin),
  MFA, device trust. Owns the user table. This is the most security-critical
  service; keep it small and isolated.
- **Marketplace Service** — jobs, bids, bookings, provider discovery, matching.
  This is the heart of the platform. Owns job/bid/booking state machines.
- **Location Service** — geocoding, address search, lat/lng storage, radius
  queries, provider service areas, distance sorting. Sits on PostGIS.
- **Payments & Escrow Service** — payment intents, holds, releases, refunds,
  Stripe Connect payouts, BNPL, PayID. Idempotent and fully audited. Owns the
  money state machine; never let other services mutate it directly.
- **Products & Fulfillment Service** — catalog, variants, inventory, cart, orders,
  shipping, returns, supplier/dropship. Separate from services; shares payments
  and notifications.
- **Chat & Notifications Service** — realtime messaging, push, SMS, email, in-app
  inbox. Scales independently; chat is high-frequency.
- **Verification & Trust Service** — ID/selfie/address verification, background
  checks, verified badges, ratings/reviews, reports/block, disputes.
- **Admin & Moderation Service** — provider verification queue, content moderation,
  dispute resolution, product management, analytics dashboards.
- **Matching & Recommendation Service** — smart provider matching, featured
  placement, subscription-based ranking. Added after v1.

### 9.4 Data layer
- **Primary database: PostgreSQL + PostGIS.** One logical database, but split the
  services' tables by service (schema-per-service or separate databases). PostGIS
  powers all location queries.
- **Read replicas + connection pooling (PgBouncer).** Route read-heavy queries
  (discovery, bid comparison) to replicas. Pool connections so the app does not
  exhaust the database.
- **Search engine (Elasticsearch or Meilisearch).** Provider search, job search,
  product search, and full-text filters. Keep it in sync from the primary via
  change-data-capture (e.g., Debezium) or async replication.
- **Cache (Redis).** Session store, provider profile cache, bid counts, "available
  now" toggles, rate-limit counters, and hot read data. Redis GEO can also speed
  up some location queries.
- **Object storage (S3 / Cloudinary).** Before/after photos, completion proof,
  product images, ID documents (encrypted, access-controlled). Use signed URLs and
  virus scanning on upload.
- **Stream storage (Kafka / Kafka-like).** Event log for bookings, payments, bids,
  notifications, and audit trails. Enables replay, backfill, and decoupling.

### 9.5 Realtime layer
- **WebSockets** for bids arriving, chat, and booking status. Use a WebSocket
  gateway with sticky sessions and a shared pub/sub (Redis or Kafka) so clients
  connected to any node get realtime updates.
- **Server-sent events** for one-way updates (booking status) where WebSockets are
  overkill.

### 9.6 Compute & deployment
- **Containers (Docker) + Kubernetes.** Each service is a container. K8s handles
  scaling, health checks, rolling deploys, and self-healing.
- **Microservices** so each service scales on its own load (chat scales differently
  than payments).
- **Multi-AZ within a region first**, then multi-region once you expand across
  Australia. Use managed Kubernetes (EKS/GKE) or a platform like AWS/GCP.
- **Infrastructure as Code (Terraform)** for reproducible, version-controlled
  infrastructure.
- **Blue/green or rolling deploys** with zero-downtime releases.

### 9.7 Performance & optimization
- **CDN** for static assets, images, and API edge caching.
- **Async processing** for heavy work (image resize, geocoding, notifications,
  matching) via queues — never block the request path.
- **Pagination, indexing, and query tuning** on every hot path, especially location
  and search queries.
- **Caching strategy:** cache provider profiles, catalog, and search results;
  invalidate on change; use short TTLs for availability and bid counts.
- **Database design:** composite indexes on (location, status, created_at),
  denormalize hot fields (rating, response rate) to avoid joins on read.
- **Edge compute** for geo-routing and low-latency responses as you scale.

### 9.8 Scalability patterns
- **Horizontal scaling** of stateless services behind load balancers.
- **Sharding** the database by region or by provider/client id once a single
  cluster can't hold the load.
- **CQRS** (separate read/write models) for the marketplace feed and bid
  comparison, which have very different read/write patterns.
- **Rate limiting, circuit breakers, and bulkheads** to isolate failures and
  protect the money and auth services.
- **Auto-scaling** based on real metrics (request rate, queue depth, latency).

### 9.9 Security, trust & compliance
- **AuthN/AuthZ** with phone OTP, MFA for providers and admins, short-lived tokens,
  and device trust scoring.
- **Encryption** in transit (TLS) and at rest (database, object storage, ID docs).
- **Secrets management** (Vault / AWS Secrets Manager); never hardcode keys.
- **PII minimization** and data retention policies; encrypt identity documents and
  restrict access.
- **Audit logs** for every payment, verification, booking, moderation, and dispute
  action. Immutable and tamper-evident.
- **Fraud & abuse:** rate limits, device fingerprinting, anomaly detection, and
  velocity checks on payments and bids.
- **Compliance:** GDPR/Australian Privacy Principles, PCI-DSS for payments, GST
  reporting, and payment-provider compliance (Stripe Connect).

### 9.10 Reliability & observability
- **Distributed tracing** (OpenTelemetry) across services.
- **Centralized logging** and metrics (Prometheus/Grafana, ELK).
- **Health checks, alerts, and SLOs** per service.
- **Idempotency keys** on all money and state-changing operations.
- **Backups, point-in-time recovery, and disaster recovery** with tested failover.
- **Chaos / load testing** before launch and after major changes.

### 9.11 Recommended stack (enterprise)
- **Frontend:** Next.js (SSR + PWA) for client, provider, and admin apps.
- **Mobile:** React Native / Expo after the responsive web workflow is proven.
- **Backend:** Node.js (NestJS) or Go for high-throughput services; Python for
  matching/recommendation ML later.
- **Data:** PostgreSQL + PostGIS (primary), Elasticsearch/Meilisearch (search),
  Redis (cache/pub/sub), S3 (media), Kafka (events).
- **Realtime:** WebSockets via a managed gateway (e.g., Pusher, Ably, or a custom
  Socket.IO/K8s deployment).
- **Maps:** Google Maps Platform or Mapbox (geocoding, distance, pins).
- **Auth:** Firebase Auth / Auth0 / custom phone OTP.
- **Payments:** Stripe Connect (payouts + escrow-like release), PayPal, BNPL,
  PayID.
- **Infra:** Docker + Kubernetes on AWS/GCP, Terraform, CDN, multi-AZ.
- **Observability:** OpenTelemetry, Prometheus/Grafana, ELK, PagerDuty.

### 9.12 Build order for the architecture
1. Foundation: auth, API gateway, database, event bus, CI/CD, observability.
2. Core services: marketplace, location, payments/escrow, chat/notifications.
3. Verification & trust, then admin & moderation.
4. Products & fulfillment service (v1-plus line).
5. Search, caching, and performance hardening.
6. Matching/recommendation, subscriptions, and multi-region expansion.

### 9.13 Key architectural decisions to lock
- Microservices vs. modular monolith: start modular, split on proven hot paths.
- Single region (Australia) first, multi-region later.
- PostgreSQL + PostGIS as the single source of truth for location.
- Event-driven for all cross-service state changes.
- Stripe Connect for marketplace payouts and escrow-like release.
- Separate services and products data/money from day one.
- Read replicas + cache for location-heavy read paths.

## 10. Tech stack options (for later, when coding)
- **Frontend:** React / Next.js (SSR helps SEO + mobile speed) + PWA (installable,
  works offline-ish) — matches the existing roomshare stack.
- **Mobile:** React Native / Expo later, or responsive web first.
- **Backend:** Node.js (NestJS/Express) or a BaaS (Supabase/Firebase) for fast MVP.
- **Database:** PostgreSQL + **PostGIS** for location queries.
- **Realtime:** WebSockets (bids arriving, chat, status).
- **Maps:** Google Maps Platform or Mapbox (geocoding, distance, pins).
- **Auth:** phone OTP (Twilio/Firebase Auth / local).
8. **Payments (AU):** **Stripe Connect** for marketplace payouts + escrow-like
   release; **PayPal** secondary; **Afterpay/Zip/Klarna** BNPL for clients on big
   jobs; **PayID/bank transfer** for provider payouts. Watch **GST** (10% once
   over $75k turnover).
- **Media:** S3 / Cloudinary for before/after photos and product images.
- **Notifications:** push + SMS + email.
- **Products:** product catalog, inventory, cart, order and fulfillment tracking,
  shipping/fulfillment integration, and supplier/dropship management.

## 10. Key risks & mitigations
| Risk | Mitigation |
|---|---|
| **Cold start** (no providers → no clients and vice versa) | Seed one side first (recruit cleaners in one city/area), geo-fence launch |
| **Trust / safety of in-home service** | Verification, escrow, reviews, insurance |
| **Bid shopping** (clients & providers going off-platform to avoid commission) | Value-add: guarantee, easy payment, dispute protection, history |
| **Quality inconsistency** | Vetting, ratings, re-book penalties, service standards |
| **Payment fraud / no-shows** | Escrow, cancellation policy, deposits for big jobs |
| **Location accuracy** | Map pin + geocoding validation, radius filters |
| **Product fulfillment** | Clear inventory, shipping, returns, and supplier/dropship process; separate from service bookings |
| **Two business lines** | Keep service bookings and product sales tracked, billed, and reconciled separately |

## 11. Competitors / benchmarks to study
- **Urban Company (India/Middle East)** — booking + fixed pricing + verification
- **TaskRabbit** — gig/bidding style, hourly tasks
- **Helpr** — cleaning bookings with verified pros
- **Local (Bangladesh)** — Facebook service groups, Pathao/Rahe services; no
  dominant dedicated cleaning marketplace → opportunity.

## 12. Open questions (need answers before building)
1. **Geography:** launch in one city (e.g., Dhaka) or multi-city?
2. **Market:** Bangladesh only, or also diaspora/global? (affects payments/maps)
3. **Bidding:** pure auction, or hybrid with instant fixed-price booking?
4. **Money:** who pays commission — client or provider, or both?
5. **Verification:** how strict can we realistically verify identity/background?
6. **Payments:** which gateway supports escrow in the target market?
7. **Services:** cleaning only at launch, or multi-service later?
8. **Providers:** individuals only, companies only, or both (as described)?
