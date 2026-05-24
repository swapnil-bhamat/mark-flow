# AI Agent Instructions for course-tracker

## Project Overview
A Nuxt 4 + Vue 3 + TypeScript application for tracking software architecture learning progress. Integrates with Google Drive for persistent data storage and Google Calendar for scheduling study sessions. The app uses Pinia for state management and Bootstrap Vue for UI.

**Key Tech Stack:**
- Framework: Nuxt 4 (SSR-capable), Vue 3 (script setup), TypeScript
- State: Pinia stores (auth, curriculum)
- Styling: Bootstrap 5, custom CSS (glass-morphism design)
- Backend: Nuxt Server API routes (H3 framework)
- Auth: Google OAuth 2.0
- External APIs: Google Drive, Google Calendar, Google Sheets

## Architecture

### Data Flow & Core Domains
1. **Authentication (Google OAuth)**
   - User logs in via `/api/auth/login` → Google consent screen → `/api/auth/callback`
   - Tokens stored as cookies (`google_tokens`) server-side
   - `useAuthStore()` manages user state & authenticated flag
   - Route protection: Dashboard redirects unauthenticated users to home

2. **Curriculum Management**
   - Central data structure in `useCurriculumStore()` (Pinia)
   - Data originates from `/public/data.json` (initial seeding)
   - Syncs with Google Drive file `sa_study_tracker_data.json` (user's own Drive)
   - **Hierarchy:** `Curriculum` → `Domain` (e.g., LLD, HLD, AWS) → `Section` → `Topic`
   - Each Topic tracks: name, status (pending/in_progress/completed), material links, repo link, estimated hours

3. **Google Drive Sync**
   - On app load: `loadFromDrive()` checks Drive → falls back to local JSON
   - Debounced saves (1000ms) to Drive on any CRUD operation
   - File format: JSON with structure matching `Curriculum` interface
   - All save operations call `saveToDrive()` which debounces via `useDebounceFn`

### File Structure & Key Components
- `app/stores/`: Pinia stores (auth, curriculum) - **single source of truth for client state**
- `app/services/curriculum.ts`: Type definitions & initial curriculum data interface
- `server/api/`: H3 event handlers for Drive/Auth operations
- `server/utils/`: Shared server utilities (Google OAuth setup, token management)
- `app/pages/`: Route components (index=login, dashboard=main, manage=admin)
- `app/layouts/default.vue`: Global wrapper with navbar, auth checks

## Critical Workflows

### Running the Application
```bash
npm run dev        # Start dev server on port 3008
npm run build      # Production build
npm run generate   # Static generation
npm run preview    # Test production build locally
```

### Development Notes
- **Environment Variables Required:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `APP_SECRET`, `BASE_URL`
- **Port:** Configurable via `PORT` env var (default 3008)
- **Debugging:** Chrome DevTools + Nuxt DevTools enabled in dev
- **Type Checking:** `tsconfig.json` strict mode enabled

## Project Patterns & Conventions

### State Management
- Pinia stores use Composition API syntax (setup stores, not Options API)
- Stores auto-export via `~/stores/` alias (Nuxt auto-imports)
- Async operations use `useFetch()` (Nuxt composable) or `$fetch()` for direct calls
- Example: `const { data } = await useFetch('/api/drive/data')`

### API Routes & Server Logic
- File-based routing: `server/api/[feature]/[action].[method].ts`
- All auth-protected routes: Read `google_tokens` cookie, validate tokens exist
- Error handling: Use `createError({ statusCode, message })` 
- Google API client: `useGoogleOAuth()` returns pre-configured oauth2Client
- Token refresh: Not explicitly handled; assume fresh tokens in cookies

### Data Type Definitions
- Located in `app/services/curriculum.ts`
- Interfaces: `Curriculum`, `Domain`, `Section`, `Topic`
- Curriculum keys can be domain IDs (arbitrary strings) except `meta` (reserved for metadata)
- Status enum: `'pending' | 'in_progress' | 'completed'`

### UI & Styling
- Bootstrap 5 utility classes + custom CSS variables (glass-morphism effects)
- Lucide Vue Next icons (e.g., `<GraduationCap>`, `<CheckCircle>`)
- Toast notifications: `toast.success()`, `toast.error()` from vue-sonner
- Modal/Form patterns: v-model binding, local refs for form state

### Google API Integrations
- **Drive:** File ops (create/update JSON data file)
- **Calendar:** URL-based event creation (no direct API calls; clients redirect to Google Calendar URL)
- **Auth:** OAuth 2.0 with offline access for Drive/Calendar operations
- Scopes: userinfo, drive.file (user's Drive only), calendar.events

## When to Reference Key Files
| Task | Key Files |
|------|-----------|
| Add new curriculum domain | `app/services/curriculum.ts` (schema), `public/data.json` (seed data) |
| Modify auth flow | `server/utils/auth.ts`, `server/utils/google.ts`, `server/api/auth/*` |
| Change Drive sync logic | `app/stores/curriculum.ts` (client), `server/api/drive/*` (server) |
| Add new pages/routes | `app/pages/[page].vue` (auto-routed) |
| Update data types | `app/services/curriculum.ts` (must sync with server expectations) |
| Style components | `app/assets/css/main.css` (globals), Vue `<style scoped>` blocks |

## Known Implementation Details
- **Cookies:** Google tokens stored server-side in cookies, NOT in localStorage (security)
- **Debounce:** Client-side save operations debounced to prevent excessive Drive API calls
- **Fallback Logic:** Missing Drive data → local JSON → empty curriculum
- **Domain Selection:** Dashboard defaulting to first domain in list (`LLD`)
- **Calendar Integration:** No backend calendar write—clients generate Google Calendar URLs client-side

## Common Pitfalls to Avoid
1. **Don't** use `localStorage` for auth tokens; use `useAuthStore()` which relies on cookies
2. **Don't** directly mutate curriculum without calling `saveToDrive()`—changes won't persist
3. **Don't** forget `await` on async operations; this is TypeScript, strict mode enabled
4. **Don't** hardcode API URLs; use `$fetch()` which respects base URL config
5. **Don't** add new Google scopes without updating `server/utils/google.ts` and user consent flow
