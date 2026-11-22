# Mova — Supabase Database Architecture & Migration Guide

This document establishes the database infrastructure, version-controlled migration workflow, and schema design conventions for **Mova**.

---

## 1. Directory Structure

```
supabase/
├── config.toml           # Supabase CLI local project configuration
├── .gitignore            # Ignores CLI cache (.temp, .branches, local envs)
├── README.md             # This architecture & workflow guide
└── migrations/           # Version-controlled, timestamped SQL migrations
    ├── 20261025000000_create_profiles.sql
    ├── 20261026000000_create_tasks.sql
    └── 20261027000000_create_classes.sql
```

---

## 2. Migration Workflow

All schema changes in Mova are **forward-only**, **version-controlled**, and **timestamped**. Never modify a remote database directly without committing a matching migration file.

### Step 1: Create a New Migration
Run the Supabase CLI to generate a timestamped migration file:
```bash
npx supabase migration new <migration_name>
```
*Example:* `npx supabase migration new add_quests_table`  
Creates: `supabase/migrations/YYYYMMDDHHMMSS_add_quests_table.sql`.

### Step 2: Write & Review the Migration
When writing SQL:
1. Write explicit, deterministic DDL statements. Do not require migrations to be idempotent or recommend `IF NOT EXISTS` as a substitute for detecting schema drift. Forward-only migrations must fail fast on unexpected object conflicts so drift is surfaced during review and testing rather than silently masked.
2. Always enable and define Row Level Security (RLS) for tables containing user data.
3. Review constraints, foreign key deletion rules, trigger permissions, and function search paths according to the [Database Conventions](#4-mova-database-conventions) below.

### Step 3: Local Validation (Local Development)
Local development uses Docker to run an isolated PostgreSQL instance matching the Supabase production environment.
- **Prerequisite**: Docker Desktop must be running.
- **Start local services**:
  ```bash
  npx supabase start
  ```
- **Apply migrations locally**:
  ```bash
  npx supabase migration up
  ```
- **Reset local database to test clean replay**:
  ```bash
  npx supabase db reset
  ```
  *(WARNING: `db reset` truncates and replays all migrations. Run ONLY locally, NEVER against staging or production.)*
- **Lint database schema**:
  ```bash
  npx supabase db lint --local
  ```

### Step 4: Check Migration Status
To compare local migration files against applied migrations:
```bash
# Check local status
npx supabase migration list --local

# Check linked remote project status
npx supabase migration list --linked
```

### Step 5: Production & Remote Deployment
- **Link remote project** (one-time setup per environment):
  ```bash
  npx supabase link --project-ref <your-supabase-project-id>
  ```
- **Deploy pending migrations**:
  ```bash
  npx supabase db push
  ```
- **Alternative (Supabase Dashboard SQL Editor)**:
  For manual staging/production reviews, copy the contents of the migration file into the Supabase Dashboard **SQL Editor** and execute it directly.

---

## 3. Local Development vs. Production Guardrails

| Action | Local Development | Remote / Production |
| :--- | :--- | :--- |
| **Tooling** | Local Supabase CLI with Docker | Supabase Cloud / CLI with `--linked` |
| **Schema Application** | `npx supabase db reset` or `migration up` | `npx supabase db push` or Dashboard SQL Editor |
| **Destructive Commands** | Allowed on local scratch data | **FORBIDDEN**: Never run `db reset`, `drop`, or `truncate` |
| **Data Safety** | Seed data permitted (`seed.sql`) | Zero real personal data or fake profiles in migrations |
| **Automation** | Automated in local dev loop | Manual approval required before pushing to production |

---

## 4. Mova Database Conventions

Every table, column, index, and policy in Mova must strictly conform to these conventions:

### A. Naming Conventions
- **Tables**: Plural nouns in `snake_case` (e.g. `profiles`, `tasks`, `classes`, `focus_sessions`).
- **Columns**: Descriptive nouns or adjectives in `snake_case` (e.g. `date_of_birth`, `avatar_url`, `is_completed`).
- **Primary Keys**: Always named `id`.
- **Foreign Keys**: Named after the referenced singular entity: `{singular_entity}_id` (e.g. `user_id`, `quest_id`). For 1-to-1 extension tables linked to `auth.users`, `id` is the primary key and foreign key.
- **Indexes**: `idx_{table}_{column(s)}` (e.g. `idx_tasks_user_id`, `idx_focus_sessions_user_created`).
- **Constraints**: `check_{table}_{purpose}` (e.g. `check_name_valid`, `check_date_of_birth_valid`).
- **Triggers**: `on_{table}_{event}` (e.g. `on_profiles_updated`).
- **Functions**: `handle_{action}` for triggers or `{verb}_{noun}` for utilities (e.g. `handle_updated_at`, `calculate_age`).
- **RLS Policies**: Descriptive sentences in double quotes (e.g. `"Users can view own profile"`).

### B. Keys & Relationships
- **Primary Keys**:
  - Independent entities: `id uuid primary key default gen_random_uuid()`
  - 1-to-1 Auth extensions: `id uuid primary key references auth.users(id) on delete cascade`
- **Foreign Keys**:
  - Every foreign key must declare an explicit `on delete` action.
  - User-owned dependent data: `on delete cascade`.
  - Lookup or shared reference data: `on delete restrict` or `on delete set null`.

### C. Types, Timestamps & Timezones
- **Timestamps**: Always use `timestamptz` (timestamp with time zone) defaulting to `now()`. All storage is in UTC.
- **Calendar Dates**: Use `date` (e.g. `date_of_birth`) for calendar-only values. Never store calendar dates in `timestamp` or `timestamptz` to avoid timezone offset shifts.
- **Record Lifecycle**: Tables with mutable data must include both:
  ```sql
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
  ```
  Paired with the `on_{table}_updated` trigger calling `public.handle_updated_at()`.

### D. Constraints & Data Integrity
- Mark all non-nullable columns explicitly as `not null`.
- Add `check` constraints to guard against:
  - Empty or whitespace-only strings: `check (char_length(trim(name)) >= 1)`
  - Length overruns: `check (char_length(name) <= 100)`
  - Impossible dates: `check (date_of_birth <= current_date and date_of_birth >= '1900-01-01')`

### E. Indexing Strategy
- **Foreign Keys**: Create indexes on foreign keys that are used in joins or filter queries.
- **Avoid Over-Indexing**: Do not create speculative indexes on low-cardinality flags (e.g. boolean columns) or small lookup tables.
- **Primary Keys**: PostgreSQL automatically creates unique B-tree indexes for primary keys; never add duplicate single-column indexes on `id`.

### F. Row Level Security (RLS) & Ownership Protection
- **Mandatory RLS**: Every table in `public` containing user data must execute:
  ```sql
  alter table public.<table_name> enable row level security;
  ```
- **Least Privilege**: Define granular policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **Performance Optimization**: Wrap `auth.uid()` in a scalar subquery `(select auth.uid())` to prevent PostgreSQL from re-evaluating the function per row during sequential scans.
- **Impersonation Prevention on UPDATE**: Always specify both `USING` and `WITH CHECK`:
  ```sql
  create policy "Users can update own profile"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);
  ```
  The `with check` clause prevents the user from updating the record's ownership ID to impersonate another user.

### G. Database Functions & Grants
- **Security Mode**: Use `security invoker` by default so functions run with the privileges of the calling user. Only use `security definer` when a trigger or internal helper strictly requires elevated system privileges.
- **Search Path Hardening**: Always declare `set search_path = ''` on stored functions to prevent search-path hijacking. All system functions (`now()`, `current_date`, `age()`) resolve from `pg_catalog`.
- **Explicit Grants**:
  ```sql
  revoke all on function public.<function_name> from public;
  grant execute on function public.<function_name> to authenticated;
  ```
  Never leave functions callable by `public` / `anon` unless explicitly intended as an open endpoint.

---

## 5. Storage Conventions (Profile Pictures & User Assets)

- **Bucket Privacy**: The profile avatar bucket `avatars` is **private** (`public = false`).
- **Path Isolation**: Files must follow the user-isolated directory convention:
  `{user_id}/avatar.{ext}` or `{user_id}/{timestamp}.{ext}`
- **Storage Policies**:
  - `INSERT`, `SELECT`, `UPDATE`, `DELETE` are scoped strictly to the authenticated user's folder:
    ```sql
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
    ```
- **Access**: The client stores the relative path in `profiles.avatar_url` and generates short-lived signed URLs on demand via `supabase.storage.from('avatars').createSignedUrl(path, 3600)`.

---

## 6. Troubleshooting & Common Failure Modes

1. **Schema Drift**:
   - *Symptom*: Remote database behaves differently from local tests.
   - *Fix*: Run `npx supabase db diff --linked` to generate a diff between your migration history and remote state.
2. **Lock Contention / Timed-Out Migrations**:
   - *Symptom*: `ALTER TABLE` hangs on busy production databases.
   - *Fix*: Split heavy column additions or index creations (`create index concurrently`).
3. **RLS Rejection (`42501 permission denied`)**:
   - *Symptom*: Query returns 0 rows or permission denied error.
   - *Fix*: Verify user has an active session (`supabase.auth.getUser()`) and that the row's owner ID matches `(select auth.uid())`.
4. **Shadow Database Errors during `db diff`**:
   - *Symptom*: CLI reports shadow database creation failure.
   - *Fix*: Ensure Docker is running and ports `54320`, `54321`, `54322` are not in use by conflicting processes.
