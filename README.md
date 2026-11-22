# Mova

A production-oriented college routine and productivity app built with React Native + Expo.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React Native + Expo SDK 58 |
| Navigation | Expo Router (file-based) |
| Language | JavaScript (`.js` / `.jsx`) |
| Backend | Supabase + PostgreSQL |
| Session storage | expo-secure-store |
| Package manager | npm |

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 10
- Expo Go app on your device **or** Android/iOS emulator

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd mova
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase values:

| Variable | Where to find it |
|----------|-----------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

> ⚠️ **Never commit `.env`.** It is in `.gitignore`. Only `.env.example` (with placeholders) is committed.

---

## Running the app

```bash
# Start the Expo development server
npm start

# Open on Android emulator / device
npm run android

# Open on iOS simulator / device (macOS only)
npm run ios

# Open in the browser
npm run web
```

Scan the QR code with the **Expo Go** app on your phone to run on a real device.

---

## Project structure

```
mova/
├── assets/
│   ├── fonts/          # Custom font files (.ttf / .otf)
│   └── images/         # App icons, splash, static images
│
├── src/
│   ├── app/            # Expo Router routes (_layout.jsx, index.jsx, ...)
│   ├── components/     # Reusable UI components
│   │   └── ui/         # Primitive / generic building blocks
│   ├── constants/      # Template-level constants (legacy theme.js)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # External service clients (supabase.js, ...)
│   ├── services/       # Domain service modules (auth, tasks, ...)
│   ├── theme/          # Mova design tokens (index.js)
│   └── utils/          # Pure utility functions
│
├── .env.example        # Environment variable template
├── app.json            # Expo project configuration
└── package.json
```

---

## Naming conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Files & folders | `kebab-case` | `use-theme.js` |
| Components | `PascalCase` | `ThemedText` |
| Hooks | `camelCase` prefixed with `use` | `useTheme` |
| Constants | `SCREAMING_SNAKE_CASE` for true constants, `PascalCase` for object exports | `Colors`, `Spacing` |
| Services | `camelCase` module + named exports | `authService.js` |

---

## Supabase

The Supabase client is initialised in `src/lib/supabase.js`. If the environment variables are missing, the client exports `null` and logs a warning — the app still starts but all Supabase calls will be no-ops until you configure `.env`.

### Tables

Migrations live in `supabase/migrations/` and must be applied in order:

| Migration | Table | Purpose |
|-----------|-------|---------|
| `20261025000000_create_profiles.sql` | `public.profiles` | User profile linked 1-to-1 with `auth.users` |
| `20261026000000_create_tasks.sql` | `public.tasks` | Daily Focus tasks and recurrence |
| `20261027000000_create_classes.sql` | `public.classes` | Recurring weekly timetable slots |

Every table has Row Level Security enabled with separate `select` / `insert` / `update` / `delete` policies scoped to `(select auth.uid()) = user_id`, so each user can only read and modify their own data. See [supabase/README.md](supabase/README.md) for the migration workflow.

Apply them locally with `npx supabase start && npx supabase migration up`, or remotely with `npx supabase db push` after linking the project.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start + open Android |
| `npm run ios` | Start + open iOS |
| `npm run web` | Start + open browser |
| `npm test` | Run profile, task and timetable validation unit tests |
| `npm run lint` | Run Expo's ESLint configuration |
| `npm run reset-project` | Reset to blank template (destructive) |
