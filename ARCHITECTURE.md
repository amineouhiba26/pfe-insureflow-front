# InsureFlow Frontend — Architecture & Technical Reference

> **Application:** InsureFlow — Insurance claims management platform  
> **Framework:** Angular 20.2 (standalone components, no NgModules)  
> **Authentication:** Keycloak 26.x (OpenID Connect / OAuth 2.0)  
> **Styling:** Tailwind CSS v4  
> **Charts:** Chart.js 4.5 + ng2-charts 10  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Application Bootstrap & Initialization](#3-application-bootstrap--initialization)
4. [Authentication & Keycloak Integration](#4-authentication--keycloak-integration)
5. [Routing & Navigation](#5-routing--navigation)
6. [Component Architecture](#6-component-architecture)
7. [Services & API Communication](#7-services--api-communication)
8. [Security Architecture](#8-security-architecture)
9. [State Management](#9-state-management)
10. [Styling & Theming](#10-styling--theming)
11. [Charts & Analytics](#11-charts--analytics)
12. [Build & Development Workflow](#12-build--development-workflow)
13. [Testing](#13-testing)
14. [Known Observations & Potential Improvements](#14-known-observations--potential-improvements)

---

## 1. Project Overview

InsureFlow is an insurance claims management platform built as a single-page application (SPA) with Angular. It serves two distinct user personas:

| Role     | Description                                      | Routes                          |
|----------|--------------------------------------------------|---------------------------------|
| **CLIENT** | Policyholder who submits and tracks claims      | `/login` → `/dashboard`, `/submit` |
| **ADMIN**  | Back-office agent who reviews, approves/rejects claims, manages clients/policies, and views analytics | `/admin/login` → `/admin`, `/admin/analytics` |

The frontend communicates with a backend REST API (Java/Spring Boot at `http://localhost:8080`) and delegates all authentication to a Keycloak identity provider (`http://localhost:8180`).

---

## 2. Directory Structure

```
pfe-insureflow-front/
├── angular.json                  # Angular CLI configuration (builder, budgets, assets)
├── package.json                  # Dependencies, scripts
├── postcss.config.js             # PostCSS with @tailwindcss/postcss plugin
├── tsconfig.json                 # Base TypeScript config
├── tsconfig.app.json             # App-specific TS config
├── tsconfig.spec.json            # Test-specific TS config
├── .editorconfig                 # Editor formatting rules
├── .gitignore
├── README.md
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── index.html                # HTML shell, loads Tailwind CDN (redundant)
│   ├── main.ts                   # App entry point — bootstraps standalone App component
│   ├── styles.scss               # Tailwind v4 directives + custom theme tokens
│   │
│   └── app/
│       ├── app.ts                # Root component (<router-outlet />)
│       ├── app.html
│       ├── app.config.ts         # Providers: router, HTTP client, Keycloak APP_INITIALIZER
│       ├── app.routes.ts         # Route definitions + authGuard
│       │
│       ├── guards/
│       │   └── auth-guard.ts     # CanActivateFn — checks auth before entering protected routes
│       │
│       ├── services/
│       │   ├── auth.ts           # AuthService (Keycloak wrapper) + authInterceptor
│       │   ├── claim.ts          # ClaimService (claims CRUD + admin operations)
│       │   ├── policy.ts         # PolicyService (user policies)
│       │   └── analytics.service.ts  # AnalyticsService (admin BI data)
│       │
│       ├── pages/
│       │   ├── login/            # Client login page (redirects to Keycloak)
│       │   ├── admin-login/      # Admin login page
│       │   ├── dashboard/        # Client dashboard — claims list + stats
│       │   ├── submit-claim/     # Claim submission form (multipart with photos)
│       │   └── admin/            # Admin panel — claims mgmt, client/policy CRUD
│       │
│       ├── shared/
│       │   ├── claim-progress/   # Reusable 6-step stepper component
│       │   └── claim-status.pipe.ts  # Two pipes: status label + status color
│       │
│       └── admin/
│           └── analytics-dashboard/  # Full analytics/BI dashboard
│               ├── analytics-dashboard.component.ts
│               ├── analytics-dashboard.component.html
│               ├── analytics-dashboard.component.scss
│               └── charts/           # 6 chart sub-components
│                   ├── claims-by-type-chart.component.ts     # Doughnut
│                   ├── claims-by-status-chart.component.ts   # Doughnut
│                   ├── monthly-evolution-chart.component.ts  # Line
│                   ├── avg-amount-chart.component.ts         # Bar
│                   ├── fraud-distribution-chart.component.ts # Bar
│                   └── agent-performance-chart.component.ts  # Horizontal bar
```

---

## 3. Application Bootstrap & Initialization

### Entry Point (`src/main.ts`)

```typescript
bootstrapApplication(App, appConfig);
```

Uses `bootstrapApplication` (Angular standalone API) — no `NgModule` is used anywhere in the project. The `App` component is bootstrapped with the configuration defined in `app.config.ts`.

### App Configuration (`src/app/app.config.ts`)

The `appConfig` object provides four key providers:

1. **`provideZoneChangeDetection({ eventCoalescing: true })`** — Optimizes change detection by coalescing events inside the same zone turn. Reduces unnecessary change detection cycles.

2. **`provideRouter(routes)`** — Registers the Angular Router with the application's route definitions.

3. **`provideHttpClient(withInterceptors([authInterceptor]))`** — Configures Angular's `HttpClient` with the `authInterceptor` (functional interceptor) that automatically attaches the Keycloak Bearer token to every outgoing HTTP request.

4. **`APP_INITIALIZER`** — Keycloak Bootstrap:

```typescript
function initKeycloak(auth: AuthService) {
  return () => auth.init();
}
```

This is critical: the `APP_INITIALIZER` runs **before Angular finishes bootstrapping**. The application will not render until `AuthService.init()` resolves. This guarantees that by the time any component renders:
- Keycloak has checked the user's SSO session (`check-sso`)
- `keycloak.authenticated` reflects the real auth state
- The guard and components can reliably check `isLoggedIn()`

If initialization fails, the promise rejects and `main.ts`'s `.catch()` logs the error — the app will not load.

### Bootstrap Sequence

```
1. User navigates to http://localhost:4200
2. Angular loads main.ts
3. bootstrapApplication() starts
4. APP_INITIALIZER fires → AuthService.init()
5. Keycloak JS SDK initializes with:
   - check-sso mode (silent session check, no redirect)
   - checkLoginIframe: false (avoids iframe-based silent check)
6. If user has an active Keycloak session cookie → authenticated = true
7. App finishes bootstrap, App component renders
8. Router evaluates redirect: / → /login (or stays on current route)
```

---

## 4. Authentication & Keycloak Integration

### 4.1 Keycloak Configuration

The Keycloak client is configured in `AuthService`'s constructor:

```typescript
this.keycloak = new Keycloak({
  url:      'http://localhost:8180',
  realm:    'insureflow',
  clientId: 'insureflow-frontend'
});
```

| Parameter   | Value                      | Purpose                              |
|-------------|----------------------------|--------------------------------------|
| `url`       | `http://localhost:8180`    | Keycloak server base URL             |
| `realm`     | `insureflow`               | Keycloak realm name                  |
| `clientId`  | `insureflow-frontend`      | OAuth2 client ID (public client)     |

On the Keycloak side, `insureflow-frontend` must be configured as a **public client** (no client secret) since it's a browser SPA. The allowed redirect URIs must include `http://localhost:4200/*`.

### 4.2 Initialization (`init()` method)

```typescript
async init(): Promise<boolean> {
  if (this.initialized) return this.keycloak.authenticated ?? false;
  const authenticated = await this.keycloak.init({
    onLoad: 'check-sso',
    checkLoginIframe: false
  });
  this.initialized = true;
  return authenticated;
}
```

- **`onLoad: 'check-sso'`** — On page load, Keycloak silently checks if the user has an existing SSO session (by checking for the Keycloak session cookie or a remember-me token). Unlike `login-required`, it does **not** redirect to the login page if the user is unauthenticated — the app decides what to show (hence the separate `/login` page with a "Sign in" button).
- **`checkLoginIframe: false`** — Disables the iframe-based silent SSO check. This is good practice because:
  - It avoids third-party cookie restrictions in modern browsers (Chrome, Safari)
  - It avoids issues with `X-Frame-Options` headers from the Keycloak server
  - It simplifies the flow — relying on cookie-based session detection instead

### 4.3 Login Flows

**Client login:**
```typescript
login() {
  this.keycloak.login({ redirectUri: 'http://localhost:4200/dashboard' });
}
```

Triggers a full browser redirect to Keycloak's login page. After successful authentication, Keycloak redirects back to `http://localhost:4200/dashboard` with authorization artifacts in the URL (authorization code exchanged for tokens).

**Admin login:**
```typescript
adminLogin() {
  this.keycloak.login({ redirectUri: 'http://localhost:4200/admin' });
}
```

Identical flow, but the post-login redirect target is `/admin`. Since there is no role-based differentiation in the redirect itself, the key distinction is:
- The **Keycloak login page** is the same for both
- After login, the app reads the user's roles from the JWT and determines what they can see
- The `ADMIN` realm role gates the admin UI features, while `CLIENT` role gates client features

**Why two separate login pages in the UI?** In the current code, both `Login` and `AdminLogin` components simply call `auth.login()` and `auth.adminLogin()` respectively — they're mostly cosmetic/UX distinction. Both redirect to the same Keycloak login form.

### 4.4 Logout

```typescript
logout() {
  this.keycloak.clearToken();
  localStorage.clear();
  sessionStorage.clear();
  this.keycloak.logout({ redirectUri: 'http://localhost:4200' });
}
```

The logout sequence is:
1. **`clearToken()`** — Immediately invalidates the Keycloak token in memory
2. **`localStorage.clear()` / `sessionStorage.clear()`** — Wipes any cached data (claims, user info, form drafts)
3. **`keycloak.logout()`** — Redirects to Keycloak's logout endpoint, which terminates the SSO session on the identity server, then redirects back to the app root

### 4.5 Token Management & Refresh

```typescript
async getToken(): Promise<string | undefined> {
  if (!this.keycloak.authenticated) return undefined;
  try {
    await this.keycloak.updateToken(30);
  } catch {
    this.logout();
  }
  return this.keycloak.token;
}
```

- **`updateToken(30)`** — Checks if the token will expire in the next 30 seconds. If so, it performs a silent token refresh using the refresh token (which has a longer lifetime).
- **Refresh failure handling** — If the refresh fails (e.g., refresh token expired, network error), the user is force-logged out.

This method is called **on every outgoing HTTP request** by the `authInterceptor`:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  return from(authService.getToken()).pipe(
    switchMap(token => {
      if (token) {
        req = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
      }
      return next(req);
    })
  );
};
```

Because `getToken()` is async (returns a Promise), the interceptor uses `from()` to convert it to an Observable, then `switchMap` to proceed with the cloned request. If no token exists, the request passes through without an `Authorization` header (for unauthenticated endpoints).

### 4.6 Role & User Information Extraction

```typescript
getFullName(): string {
  const given   = this.keycloak.tokenParsed?.['given_name'] ?? '';
  const family  = this.keycloak.tokenParsed?.['family_name'] ?? '';
  return `${given} ${family}`.trim() || this.keycloak.tokenParsed?.['preferred_username'] ?? '';
}

getInitials(): string {
  return this.getFullName().split(' ').map(n => n[0]).join('').toUpperCase();
}

getClientId(): string { return this.keycloak.tokenParsed?.['sub'] ?? ''; }
getCin(): string       { return this.keycloak.tokenParsed?.['cin'] ?? ''; }

isLoggedIn(): boolean  { return this.keycloak.authenticated ?? false; }
isAdmin(): boolean     { return this.keycloak.hasRealmRole('ADMIN'); }
isClient(): boolean    { return this.keycloak.hasRealmRole('CLIENT'); }
```

Custom claims extracted from the JWT (`tokenParsed`):

| Property        | JWT Claim Source      | Purpose                                 |
|-----------------|-----------------------|-----------------------------------------|
| `sub`           | `sub` (standard)      | Unique user identifier (UUID)           |
| `given_name`    | `given_name`          | User's first name                       |
| `family_name`   | `family_name`         | User's last name                        |
| `preferred_username` | `preferred_username` | Username (fallback for name display) |
| `cin`           | `cin` (custom)        | Moroccan national ID number (CIN)       |

The `cin` claim is a **custom attribute** that must be mapped in the Keycloak realm's client scopes or user attributes for it to appear in the JWT.

### 4.7 Keycloak Token Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    KEYCLOAK TOKEN LIFECYCLE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Access Token (JWT)                  Default: 5 minutes        │
│  Refresh Token                        Default: 30 minutes      │
│  SSO Session                          Default: 60 minutes      │
│                                                                │
│  Flow:                                                         │
│  1. User authenticates → receives auth code                    │
│  2. Code exchanged for access_token + refresh_token            │
│  3. Access token used in Authorization header                  │
│  4. Before expiry (30s window), updateToken() refreshes        │
│  5. If refresh succeeds → new access_token issued              │
│  6. If refresh fails → user is logged out                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Routing & Navigation

### Route Definitions (`src/app/app.routes.ts`)

| Path              | Component         | Guard     | Description                  |
|-------------------|-------------------|-----------|------------------------------|
| `/`               | (redirect)        | —         | Redirects to `/login`        |
| `/login`          | `Login`           | —         | Client login page            |
| `/admin/login`    | `AdminLogin`      | —         | Admin login page             |
| `/dashboard`      | `Dashboard`       | authGuard | Client claims dashboard      |
| `/submit`         | `SubmitClaim`     | authGuard | Claim submission form        |
| `/admin`          | `Admin`           | authGuard | Admin claims & mgmt panel    |
| `/admin/analytics`| `AnalyticsDashboardComponent` | authGuard | BI dashboard    |
| `**`              | (redirect)        | —         | Catch-all → `/login`         |

### Auth Guard (`src/app/guards/auth-guard.ts`)

```typescript
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
```

**Behavior:**
- Returns `true` if authenticated → route activates
- Redirects to `/login` and returns `false` if not authenticated

**Important:** The guard does NOT perform role-based checks. A logged-in `CLIENT` can access `/admin` and `/admin/analytics`, and a logged-in `ADMIN` can access `/dashboard` and `/submit`. Role enforcement is handled only at the **UI level** within the components (e.g., admin components check `isAdmin()` and show/hide features).

### Lazy Loading

All page components are **lazy-loaded** using Angular's dynamic `import()` syntax:

```typescript
loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
```

This means each page's JavaScript bundle is only downloaded when the user navigates to that route, reducing the initial bundle size.

---

## 6. Component Architecture

### 6.1 Root Component (`App`)

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class App {}
```

Minimal root component — just renders the router outlet where routed pages appear.

### 6.2 Page Components Overview

#### Login Page (`pages/login/login.ts`)

Displays a branded login form with fields for email/username and password. On submit, calls `auth.login()` which redirects the browser to Keycloak. Also includes:
- "Forgot password" link (cosmetic)
- "Create account" link (cosmetic)
- SSL/TLS security badge text ("Accès sécurisé SSL/TLS")
- Brand logos and insurance company names (MAHA, Wafa, etc.)

Note: The local form fields are rendered but will **not** actually authenticate the user against Keycloak — the `login()` method triggers a full browser redirect to the Keycloak login page, bypassing any form data entered on the Angular page. The form fields appear to be UI-only placeholders.

#### Admin Login Page (`pages/admin-login/admin-login.ts`)

Visually distinct from the client login (dark theme, admin branding). Same behavior — calls `auth.adminLogin()` which redirects to Keycloak.

#### Dashboard (`pages/dashboard/dashboard.ts`) — Client View

After Keycloak redirects back post-login, the dashboard shows:
- **Welcome header** — User's name (from `getFullName()`) and a role badge
- **Claims table** — List of the user's claims fetched from `ClaimService.getClaimsByClient()`. Columns: ID, type, date, status (with colored badges), amount. Rows are clickable → opens a detail popup.
- **Claim detail popup** — Shows full claim info including:
  - `ClaimProgress` stepper component
  - Photos (image gallery with navigation arrows)
  - Status timeline
  - Admin remarks (if claim has been reviewed)
- **Admin-only elements** — Some UI sections check `isAdmin()` and show additional data

#### Submit Claim (`pages/submit-claim/submit-claim.ts`)

A multi-field form allowing the client to submit a new insurance claim:
- **Claim type** — Dropdown (ACCIDENT, FIRE, THEFT, NATURAL_DISASTER, HEALTH, LIFE, OTHER)
- **Description** — Textarea
- **Amount** — Numeric input (Moroccan Dirham MAD)
- **Date of incident** — Date picker
- **Location** — Text input
- **Photos (up to 5)** — File input with preview and remove functionality
- **Policy ID** — Dropdown populated from `PolicyService.getMyPolicies()`

On submit, creates a `FormData` object and calls `ClaimService.createClaimWithPhotos()`.

#### Admin Panel (`pages/admin/admin.ts`)

A comprehensive management interface with tabbed navigation:

**Tab 1 — Claims Management:**
- Two sub-views: "Toutes les réclamations" (all) and "En attente" (pending)
- Table of claims with status badges, action buttons
- Approve/Reject actions via `ClaimService.approveClaim()` / `rejectClaim()` with a remarks textarea
- Photo gallery with lightbox-style viewer

**Tab 2 — Client Management:**
- Form to create a new client (name, email, CIN, phone)
- Table listing existing clients
- Calls `ClaimService.createClient()` and `ClaimService.getClients()`

**Tab 3 — Policy Management:**
- Form to create a new policy (name, type, coverage details)
- Table listing existing policies
- PDF contract upload per policy via `ClaimService.ingestContract()`
- Calls `ClaimService.createPolicy()` and `ClaimService.getPolicies()`

#### Analytics Dashboard (`admin/analytics-dashboard/analytics-dashboard.component.ts`)

A BI dashboard with:
- **KPI cards** — Total claims, pending, approved, rejected, avg processing time, total clients, fraud alerts
- **6 charts** (see Charts section)
- Summary tables (latest claims, agent stats)
- Data fetched from `AnalyticsService`

### 6.3 Shared Components

#### ClaimProgress (`shared/claim-progress/claim-progress.ts`)

A 6-step horizontal stepper visualizing the claim lifecycle:

```
[SENT] → [UNDER_REVIEW] → [INVESTIGATION] → [APPROVED/REJECTED] → [COMPENSATION] → [CLOSED]
```

- Each step has an icon (file/text/search/check/x/money/check-circle)
- Steps are color-coded: green (completed/done), yellow (current), gray (pending)
- The `activeStep` input determines which step is highlighted
- If the claim is rejected, the 4th step shows a red X icon instead of the approve checkmark
- Uses `@for` loops to render steps and tracks step completion with `$index < activeStep`

#### Claim Status Pipe (`shared/claim-status.pipe.ts`)

Two Angular pipes for translating claim status codes:

**`StatusLabelPipe`:**
```
SENT           → "Soumise"
UNDER_REVIEW   → "En cours d'examen"
INVESTIGATION  → "Investigation"
APPROVED       → "Approuvée"
REJECTED       → "Rejetée"
COMPENSATION   → "Indemnisation"
CLOSED         → "Clôturée"
```

**`StatusColorPipe`:** Returns Tailwind CSS classes for each status:
```
SENT           → bg-blue-100 text-blue-800
UNDER_REVIEW   → bg-yellow-100 text-yellow-800
INVESTIGATION  → status-revision-bg status-revision-text
APPROVED       → status-approved-bg status-approved-text
REJECTED       → status-rejected-bg status-rejected-text
COMPENSATION   → bg-indigo-100 text-indigo-800
CLOSED         → bg-gray-100 text-gray-800
```

### 6.4 Component Interaction Diagram

```
App (root)
├── <router-outlet>
│   ├── Login ────────────── calls auth.login()
│   ├── AdminLogin ───────── calls auth.adminLogin()
│   ├── Dashboard ────────── uses ClaimService, ClaimProgress, StatusLabelPipe
│   ├── SubmitClaim ──────── uses ClaimService, PolicyService
│   ├── Admin ────────────── uses ClaimService, ClaimProgress, StatusLabelPipe
│   └── AnalyticsDashboard ── uses AnalyticsService + 6 chart components
```

---

## 7. Services & API Communication

### 7.1 HTTP Client Setup

The application uses Angular's `HttpClient` (provided at the app config level) with a single functional interceptor that injects the Bearer token.

**Base API:** `http://localhost:8080/api/v1`

### 7.2 ClaimService (`services/claim.ts`)

**Endpoints:**

| Method | HTTP | Endpoint | Purpose |
|--------|------|----------|---------|
| `createClaimWithPhotos()` | POST | `/claims/with-photos` | Submit claim (multipart/form-data) |
| `getClaimById(id)` | GET | `/claims/{id}` | Get single claim |
| `getClaimsByClient(clientId)` | GET | `/claims?clientId={id}` | User's claims |
| `getAllClaims()` | GET | `/admin/claims` | All claims (admin) |
| `getPendingClaims()` | GET | `/admin/claims/pending` | Pending claims (admin) |
| `getDashboardStats()` | GET | `/admin/stats` | Dashboard KPIs (admin) |
| `approveClaim(id, remarks)` | POST | `/admin/claims/{id}/approve` | Approve claim (admin) |
| `rejectClaim(id, remarks)` | POST | `/admin/claims/{id}/reject` | Reject claim (admin) |
| `createClient(client)` | POST | `/admin/clients` | Create client (admin) |
| `getClients()` | GET | `/admin/clients` | List clients (admin) |
| `createPolicy(policy)` | POST | `/admin/policies` | Create policy (admin) |
| `getPolicies()` | GET | `/admin/policies` | List policies (admin) |
| `ingestContract(policyId, file)` | POST | `/admin/contracts/{policyId}/ingest` | Upload PDF (admin) |

**Claim creation multipart request:**
```typescript
const formData = new FormData();
formData.append('claim', new Blob([JSON.stringify(claimData)], { type: 'application/json' }));
for (const photo of photos) {
  formData.append('photos', photo);
}
```

This sends the claim metadata as a JSON blob and each photo as a separate `photos` part — standard multipart/form-data for mixed content.

### 7.3 PolicyService (`services/policy.ts`)

| Method | HTTP | Endpoint | Purpose |
|--------|------|----------|---------|
| `getMyPolicies()` | GET | `/policies/my` | Current user's policies |

Used by `SubmitClaim` to populate the policy dropdown.

### 7.4 AnalyticsService (`services/analytics.service.ts`)

| Method | HTTP | Endpoint | Purpose |
|--------|------|----------|---------|
| `getSummary()` | GET | `/admin/analytics/summary` | KPI summary |
| `getClaimsByType()` | GET | `/admin/analytics/claims-by-type` | Doughnut chart data |
| `getClaimsByStatus()` | GET | `/admin/analytics/claims-by-status` | Doughnut chart data |
| `getClaimsMonthly()` | GET | `/admin/analytics/claims-monthly` | Line chart data |
| `getAvgAmountByType()` | GET | `/admin/analytics/avg-amount-by-type` | Bar chart data |
| `getFraudScoreDistribution()` | GET | `/admin/analytics/fraud-score-distribution` | Bar chart data |
| `getAgentPerformance()` | GET | `/admin/analytics/agent-performance` | Horizontal bar |

### 7.5 Data Flow Pattern

All services follow the same pattern — methods return `Observable<T>` directly from `HttpClient`:

```typescript
getClaimsByClient(clientId: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/claims`, { params: { clientId } });
}
```

Components subscribe in their initialization:

```typescript
ngOnInit(): void {
  this.claimService.getClaimsByClient(this.authService.getClientId())
    .subscribe(data => this.claims = data);
}
```

No caching layer, no retry logic, no error handling interceptors — errors propagate to the component, which currently has no `catchError` handling (unhandled errors will appear in the console and potentially crash the component view).

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  Browser SPA  │────▶│  Keycloak    │────▶│  Backend API │    │
│  │  (Angular)    │     │  (IAM)       │     │  (Spring)    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                      │                    │           │
│         │  1. Login redirect   │                    │           │
│         ├─────────────────────▶│                    │           │
│         │  2. Auth code        │                    │           │
│         │◀─────────────────────┤                    │           │
│         │  3. Auth code → JWT  │                    │           │
│         ├─────────────────────▶│                    │           │
│         │  4. JWT + Refresh    │                    │           │
│         │◀─────────────────────┤                    │           │
│         │                      │                    │           │
│         │  5. API call + Bearer│                    │           │
│         ├──────────────────────────────────────────▶│           │
│         │                      │                    │           │
│         │  6. Token refresh    │                    │           │
│         ├─────────────────────▶│                    │           │
│         │◀─────────────────────┤                    │           │
│         │                      │                    │           │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Authentication (What it does)

- **OpenID Connect flow** — Uses the Authorization Code flow (with PKCE, handled automatically by Keycloak JS adapter)
- **Silent SSO check** — On page load, checks for existing session without redirecting
- **Token-based sessions** — No cookies used for auth on the SPA side (Keycloak uses its own session cookie on its domain)
- **Auto token refresh** — Tokens are refreshed silently before expiry (30-second threshold)

### 8.3 Authorization (What it does)

- **Route-level guard** — The `authGuard` blocks unauthenticated users from protected routes
- **Role checks** — Components check `isAdmin()` / `isClient()` to conditionally render UI sections
- **Bearer token propagation** — All API calls carry the JWT in the `Authorization` header for the backend to validate and enforce permissions

### 8.4 Session Termination

- **Logout** clears tokens locally (memory), clears all browser storage, then redirects to Keycloak's logout endpoint to terminate the SSO session
- **Token refresh failure** triggers automatic logout

### 8.5 What is NOT implemented (Risk Areas)

| Risk | Current State |
|------|---------------|
| **HTTPS** | All URLs use HTTP (`localhost:8180`, `localhost:8080`, `localhost:4200`). No TLS in dev — appropriate for development but **must** be HTTPS in production to prevent token interception |
| **CSRF protection** | Not implemented. Since the app uses Bearer tokens (not cookies for API auth), CSRF is less of a concern — but if the Keycloak adapter uses cookies for session management, CSRF could be relevant for the Keycloak redirect flow |
| **Role-based route enforcement** | The `authGuard` does not differentiate between `CLIENT` and `ADMIN`. A client who navigates to `/admin` manually will see the admin UI (though API calls will fail on the backend if the JWT lacks admin roles) |
| **Input validation** | No client-side sanitization or validation beyond basic HTML input attributes |
| **Environment-based config** | All URLs and client IDs are hardcoded. No `.env` files, no Angular environments. Changing the Keycloak URL requires a code change and rebuild |
| **XSS** | Angular's built-in sanitization handles template injection, but `innerHTML` usage (if any) or direct DOM manipulation could bypass it |
| **Token storage** | Keycloak JS stores tokens in memory (not localStorage by default). This is good practice (not persistent across tabs, not accessible to extensions easily), but means a page refresh triggers a new SSO check |

---

## 9. State Management

The application uses **no dedicated state management library** (no NgRx, no Signals store, no Akita). State is managed through:

### 9.1 Service Singletons

All services use `providedIn: 'root'` — they are Angular singletons instantiated once and shared across the application. Key state holders:

- **AuthService** — Holds the Keycloak instance, which itself holds the auth state (token, parsed claims, authentication status)
- **ClaimService, PolicyService, AnalyticsService** — Stateless; they make HTTP calls and return Observables. No client-side cache.

### 9.2 Component-Local State

Each component manages its own UI state as class properties:

```typescript
export class Dashboard {
  claims: any[] = [];
  selectedClaim: any = null;
  showPopup = false;
  currentPhotoIndex = 0;
}
```

### 9.3 Data Flow

```
Component
  │
  ├── OnInit → calls service.getAllClaims()
  │               └── http.get() → Observable<Claim[]>
  │                                    │
  │                   ┌────────────────┘
  │                   ▼
  │              .subscribe(claims => this.claims = claims)
  │
  ├── Template renders this.claims via @for
  │
  └── User action (click approve) → calls service.approveClaim(id)
                                      └── http.post() → refreshes list
```

### 9.4 Cross-Component Communication

- **Parent → Child** — `@Input()` bindings (e.g., `ClaimProgress` receives `activeStep`)
- **Child → Parent** — `@Output()` EventEmitter
- **Unrelated components** — No shared state mechanism. If two components need to share data, they would need to introduct a shared service or refactor. Currently no such case exists.

---

## 10. Styling & Theming

### 10.1 Tailwind CSS v4

The project uses **Tailwind CSS v4** via the PostCSS plugin `@tailwindcss/postcss`:

```js
// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
  },
};
```

Additionally, a Tailwind CDN script is loaded in `index.html`:
```html
<script src="https://cdn.tailwindcss.com"></script>
```
This creates redundancy — the CDN script can conflict with the PostCSS build pipeline. In production builds, the PostCSS pipeline would handle compilation, and the CDN script would be an unnecessary (and potentially conflicting) addition.

### 10.2 Custom Theme (`src/styles.scss`)

```scss
@import "tailwindcss";

@theme {
  --color-primary: #475569;
  --color-accent: #10b981;
  --color-navy: #1e293b;
  --color-navy-dark: #0f172a;
  --color-status-revision-bg: #fefce8;
  --color-status-revision-text: #92400e;
  --color-status-approved-bg: #dcfce7;
  --color-status-approved-text: #14532d;
  --color-status-rejected-bg: #fee2e2;
  --color-status-rejected-text: #7f1d1d;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.5rem;
  --shadow-premium: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  --shadow-glass: 0 4px 12px 0 rgba(0,0,0,0.03);
}
```

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#475569` (slate-600) | Main text, borders, secondary buttons |
| `--color-accent` | `#10b981` (emerald-500) | Primary actions, success indicators, active states |
| `--color-navy` | `#1e293b` (slate-800) | Dark backgrounds (admin theme) |
| `--color-navy-dark` | `#0f172a` (slate-900) | Darker backgrounds |
| Status colors | Various | Claim status badges |
| Custom radii | `0.75rem` – `1.5rem` | Card and container roundness |
| Custom shadows | Subtle + glass | Card elevation |

### 10.3 Design Language

- **Client-facing pages** — Light theme, white backgrounds, emerald accent, card-based layout
- **Admin pages** — Dark navy/black theme with emerald accent, side panels, data-dense tables
- **Consistent patterns** — Rounded cards (`rounded-2xl`, `rounded-3xl`), subtle shadows, flex/grid layouts
- **Typography** — System font stack, bold headings, muted secondary text
- **Status badges** — Each claim status has a distinct color pair (background + text) for quick visual scanning

---

## 11. Charts & Analytics

### 11.1 Technology Stack

- **Chart.js 4.5.1** — Canvas-based charting library
- **ng2-charts 10.0.0** — Angular wrapper for Chart.js

### 11.2 Chart Components

All chart components follow the same pattern:

1. Extend `BaseChartDirective` from `ng2-charts`
2. Define `ChartData`, `ChartOptions`, and `ChartType` via `@ViewChild`
3. Expose a method `loadChartData()` that calls the `AnalyticsService`
4. Map API response to Chart.js datasets and labels
5. View child reference to `BaseChartDirective` for reactive updates (`chart?.update()`)

| Component | Chart Type | Data Source | Visual |
|-----------|-----------|-------------|--------|
| `ClaimsByTypeChartComponent` | Doughnut | `analyticsService.getClaimsByType()` | Color-coded segments by claim category |
| `ClaimsByStatusChartComponent` | Doughnut | `analyticsService.getClaimsByStatus()` | Distribution of claims across statuses |
| `MonthlyEvolutionChartComponent` | Line | `analyticsService.getClaimsMonthly()` | Time series (claims per month) |
| `AvgAmountChartComponent` | Bar | `analyticsService.getAvgAmountByType()` | Average amount per claim type |
| `FraudDistributionChartComponent` | Bar | `analyticsService.getFraudScoreDistribution()` | Fraud score ranges vs claim count |
| `AgentPerformanceChartComponent` | Horizontal Bar | `analyticsService.getAgentPerformance()` | Agent name → claims processed |

### 11.3 Chart Configuration Pattern

```typescript
// Common structure across all chart components
export class ClaimsByTypeChartComponent implements OnInit {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  data: ChartData<'doughnut'> = { labels: [], datasets: [{ data: [] }] };
  options: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { ... } } };

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getClaimsByType().subscribe(res => {
      this.data.labels = res.map((item: any) => item.type);
      this.data.datasets[0].data = res.map((item: any) => item.count);
      this.chart?.update();
    });
  }
}
```

### 11.4 The Analytics Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│  KPI Cards Row                                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │Total │ │Pending│ │Approved│Rejected│AvgTime│Clients│      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │  Claims by Type    │  │ Claims by Status   │              │
│  │  (Doughnut)        │  │ (Doughnut)         │              │
│  └────────────────────┘  └────────────────────┘              │
│                                                              │
│  ┌─────────────────────────────────────────┐                 │
│  │  Monthly Evolution (Line)               │                 │
│  └─────────────────────────────────────────┘                 │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │  Avg Amount by Type│  │ Fraud Distribution │              │
│  │  (Bar)             │  │ (Bar)              │              │
│  └────────────────────┘  └────────────────────┘              │
│                                                              │
│  ┌─────────────────────────────────────────┐                 │
│  │  Agent Performance (Horizontal Bar)     │                 │
│  └─────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. Build & Development Workflow

### 12.1 Scripts (from `package.json`)

| Command          | Description |
|------------------|-------------|
| `npm start`      | `ng serve` — Starts dev server at `http://localhost:4200` (HMR enabled) |
| `npm run build`  | `ng build` — Production build to `dist/` |
| `npm run watch`  | `ng build --watch --configuration development` — Dev build with file watching (no dev server) |
| `npm test`       | `ng test` — Runs Karma + Jasmine unit tests |

### 12.2 Build Configuration (`angular.json`)

- **Builder:** `@angular/build:application` (Angular 17+ application builder, esbuild-based)
- **Entry point:** `src/main.ts`
- **Polyfills:** `zone.js`
- **Styles:** `src/styles.scss`
- **Assets:** `public/` mapped to `/`
- **Output:** `dist/pfe-insureflow-front`

**Production budgets:**
| Asset | Warning | Error |
|-------|---------|-------|
| Initial bundle | 500 kB | 1 MB |
| Component styles | 6 kB | 8 kB |

**Development config:** No optimization, no CIs, source maps enabled.

### 12.3 Dev Server

- Runs on `http://localhost:4200`
- No proxy configuration — API calls go directly to `http://localhost:8080` (cross-origin)
- CORS must be configured on the backend to accept requests from `http://localhost:4200`

### 12.4 Required Services to Run

```
1. Keycloak server         → http://localhost:8180  (realm: insureflow)
2. Backend API (Spring)    → http://localhost:8080  (base: /api/v1)
3. Frontend dev server     → http://localhost:4200
```

---

## 13. Testing

### 13.1 Framework

- **Jasmine 5.9** — Test framework (BDD-style)
- **Karma 6.4** — Test runner (Chrome launcher)
- **karma-coverage** — Code coverage reporter

### 13.2 Test Files

| Test File | What it Tests | Current State |
|-----------|--------------|---------------|
| `app.spec.ts` | App component creation | Basic smoke test |
| `services/auth.spec.ts` | AuthService | Imports wrong module (`Auth` vs `AuthService`) — will fail |
| `services/claim.spec.ts` | ClaimService | Basic creation test only |
| `guards/auth-guard.spec.ts` | Auth guard | Basic creation test only |
| `shared/claim-progress/claim-progress.spec.ts` | ClaimProgress | Basic creation test only |
| `pages/login/login.spec.ts` | Login page | Basic creation test only |
| `pages/admin-login/admin-login.spec.ts` | AdminLogin | Basic creation test only |
| `pages/dashboard/dashboard.spec.ts` | Dashboard | Basic creation test only |
| `pages/submit-claim/submit-claim.spec.ts` | SubmitClaim | Basic creation test only |
| `pages/admin/admin.spec.ts` | Admin page | Basic creation test only |

### 13.3 Test Coverage Philosophy

Tests are minimal — they verify that components/services can be instantiated without errors but do **not** test behavior, API mocking, or edge cases. This is typical of early-stage projects.

### 13.4 Running Tests

```bash
npm test
# or
ng test
```

This starts Karma in watch mode, launches Chrome, and runs all spec files.

---

## 14. Known Observations & Potential Improvements

### Architecture & Code Quality

| Observation | Detail | Recommendation |
|-------------|--------|---------------|
| **No environment config** | Keycloak and API URLs are hardcoded | Use Angular `environments/environment.ts` + `environment.prod.ts` |
| **Auth guard lacks RBAC** | Any authenticated user can access any route | Extend `authGuard` to check required roles per route (route data) |
| **No error handling** | Services don't catch errors, components don't handle error states | Add `catchError` in services, show user-friendly error messages |
| **No loading states** | No spinners/skeletons during API calls | Add loading indicators to improve UX |
| **`any` types used pervasively** | No TypeScript interfaces for API responses | Define interfaces for Claim, Policy, Client, Analytics data models |
| **Auth spec broken** | Imports `Auth` instead of `AuthService` | Fix the import |
| **CDN + PostCSS redundancy** | Both Tailwind CDN and PostCSS plugin are active | Remove the CDN script from `index.html` — PostCSS handles it |
| **Hardcoded redirect URIs** | `localhost:4200` in login/logout URLs | Make configurable via environment variables |
| **No proxy config** | Direct cross-origin API calls | Add `proxy.conf.json` for development to avoid CORS issues |

### Security

| Observation | Risk | Recommendation |
|-------------|------|---------------|
| HTTP-only URLs | Token/cookie interception in production | Enforce HTTPS in all environments |
| No RBAC in guard | Clients see admin UI (though API calls fail) | Add role checks to route guard with route `data` |
| No token refresh queue | If multiple API calls fire simultaneously, each triggers `updateToken()` | Implement a token refresh mutex / shared Promise |
| No Content Security Policy | No CSP headers injected into `index.html` | Add CSP meta tag or configure via server |
| `localStorage.clear()` on logout | Deletes non-auth data too | Only clear auth-related keys |

### Features Not Yet Implemented

| Feature | Notes |
|---------|-------|
| User registration / self-signup | No register flow — users are created by admin |
| Password reset | Not implemented in the frontend (Keycloak handles it if configured) |
| Claims filtering / pagination | All claims are loaded in one call |
| Real-time notifications | No WebSocket or SSE for status changes |
| File download for contracts | Upload exists but no download/view for PDFs |
| Multi-language support | UI is French-only, no i18n framework |
| Mobile responsive design | Tailwind should make this feasible, but not explicitly tested/done |
| Theme toggle | No light/dark toggle (admin is always dark, client always light) |

---

## Quick Reference: Keycloak Integration Flow

```
1. APP_INITIALIZER runs AuthService.init()
   └── keycloak-js checks SSO session silently
   └── Returns authenticated true/false

2. User clicks "Se connecter" on /login
   └── keycloak.login() → redirect to Keycloak login page
   └── User enters credentials in Keycloak UI
   └── Keycloak redirects back to /dashboard with auth code
   └── keycloak-js exchanges code for tokens (JWT + refresh token)

3. Every API call
   └── authInterceptor fires
   └── getToken() → updateToken(30) if needed
   └── Authorization: Bearer <jwt> header added

4. All protected routes
   └── authGuard checks isLoggedIn()
   └── If false → redirect to /login

5. Logout
   └── clearToken() + localStorage.clear() + sessionStorage.clear()
   └── keycloak.logout() → terminate SSO → redirect to /
```

---

*Document generated from codebase analysis — InsureFlow Frontend (testingCss branch)*
