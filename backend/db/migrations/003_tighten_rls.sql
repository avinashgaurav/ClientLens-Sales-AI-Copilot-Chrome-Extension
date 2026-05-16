-- Migration 003 — Tighten Row-Level Security on shared org tables
-- Run in Supabase SQL editor after 002_llm_usage.sql
--
-- Closes #10.
--
-- The original `001_initial_schema.sql` declared three policies as
-- `for select using (true)` so any authenticated user could read every row:
--   - design_systems
--   - brand_voice
--   - assets
--
-- Backend routes that touch these tables already check `require_permission`
-- with the service-role client (which bypasses RLS), so the privilege check
-- works there. The hole is the extension's anon-key Supabase client: a
-- `viewer`-role user (or any auth.users row without a `user_profiles` entry)
-- could `select *` directly and enumerate the org's brand assets, case
-- studies, competitor intel, etc.
--
-- Write operations (INSERT / UPDATE / DELETE) are already denied by default:
-- RLS is enabled on these tables but 001 never added write policies, so
-- Postgres falls through to deny for any non-service-key caller. This
-- migration does not change that behaviour — writes remain backend-only via
-- the service key.
--
-- This migration drops the `using (true)` SELECT policies and replaces them
-- with policies that require the caller to have a known role in user_profiles.
-- `viewer` is excluded — viewers are not supposed to see brand internals.
-- The role set matches `require_permission` checks in the corresponding
-- backend routes (`assets:read`, `brand_voice:read`, `design_system:read`).

begin;

-- ── Helper: role-gated read ─────────────────────────────────────────────────
-- Returns true if the calling user has a role with read access to org-wide
-- brand/asset data. Declared as SECURITY INVOKER so it runs in the caller's
-- RLS context — no privilege escalation. STABLE lets Postgres cache the result
-- within a single query (avoids one extra lookup per row).
--
-- Note: if auth.uid() has no user_profiles row (e.g. an orphaned auth.users
-- entry), the subquery returns no rows and exists() evaluates to false.
-- This is intentional — unprovisioned users get no access.

create or replace function public.auth_user_has_brand_read()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from user_profiles
    where id = auth.uid()
      and role in ('admin', 'designer', 'pmm', 'sales_rep')
  );
$$;

-- ── Drop the permissive policies ─────────────────────────────────────────────
drop policy if exists "all_read_design_system" on design_systems;
drop policy if exists "all_read_brand_voice"   on brand_voice;
drop policy if exists "all_read_assets"        on assets;

-- ── Create the tightened replacements ────────────────────────────────────────
create policy "role_gated_read_design_system" on design_systems
  for select using (public.auth_user_has_brand_read());

create policy "role_gated_read_brand_voice" on brand_voice
  for select using (public.auth_user_has_brand_read());

create policy "role_gated_read_assets" on assets
  for select using (public.auth_user_has_brand_read());

commit;

-- ── Rollback (manual) ────────────────────────────────────────────────────────
-- If you need to revert, run:
--   begin;
--   drop policy if exists "role_gated_read_design_system" on design_systems;
--   drop policy if exists "role_gated_read_brand_voice"   on brand_voice;
--   drop policy if exists "role_gated_read_assets"        on assets;
--   create policy "all_read_design_system" on design_systems for select using (true);
--   create policy "all_read_brand_voice"   on brand_voice    for select using (true);
--   create policy "all_read_assets"        on assets         for select using (true);
--   drop function if exists public.auth_user_has_brand_read();
--   commit;
