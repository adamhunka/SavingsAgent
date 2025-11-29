-- ============================================================================
-- Migration: Row Level Security Policies
-- Description: Creates granular RLS policies for data access control
-- Tables: profiles, stores, categories, flyers, pages, products
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- RLS POLICIES: profiles
-- ============================================================================

-- Allow anonymous users to read all profiles
-- Needed for displaying admin names in audit trails and verification info
create policy "profiles_select_anon"
    on profiles
    for select
    to anon
    using (true);

comment on policy "profiles_select_anon" on profiles is 'Allows anonymous users to view all profiles for audit trail display';

-- Allow authenticated users to read all profiles
-- Needed for displaying admin names in audit trails and verification info
create policy "profiles_select_authenticated"
    on profiles
    for select
    to authenticated
    using (true);

comment on policy "profiles_select_authenticated" on profiles is 'Allows authenticated users to view all profiles for audit trail display';

-- Allow only admins to insert profiles
-- Prevents unauthorized profile creation
create policy "profiles_insert_admin"
    on profiles
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "profiles_insert_admin" on profiles is 'Only admins can create new profiles manually';

-- Allow only admins to update profiles
-- Prevents users from elevating their own privileges
create policy "profiles_update_admin"
    on profiles
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "profiles_update_admin" on profiles is 'Only admins can modify profiles (prevents privilege escalation)';

-- Allow only admins to delete profiles
-- Prevents unauthorized account deletion
create policy "profiles_delete_admin"
    on profiles
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "profiles_delete_admin" on profiles is 'Only admins can delete profiles';

-- ============================================================================
-- RLS POLICIES: stores
-- ============================================================================

-- Allow anonymous users to read all stores
-- Stores are public reference data needed for browsing products
create policy "stores_select_anon"
    on stores
    for select
    to anon
    using (true);

comment on policy "stores_select_anon" on stores is 'Allows anonymous users to view all stores (public reference data)';

-- Allow authenticated users to read all stores
-- Stores are public reference data needed for browsing products
create policy "stores_select_authenticated"
    on stores
    for select
    to authenticated
    using (true);

comment on policy "stores_select_authenticated" on stores is 'Allows authenticated users to view all stores (public reference data)';

-- Allow only admins to insert stores
-- Only admins can add new stores to the system
create policy "stores_insert_admin"
    on stores
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "stores_insert_admin" on stores is 'Only admins can add new stores';

-- Allow only admins to update stores
-- Only admins can modify store information
create policy "stores_update_admin"
    on stores
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "stores_update_admin" on stores is 'Only admins can modify store information';

-- Allow only admins to delete stores
-- Only admins can remove stores from the system
create policy "stores_delete_admin"
    on stores
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "stores_delete_admin" on stores is 'Only admins can delete stores';

-- ============================================================================
-- RLS POLICIES: categories
-- ============================================================================

-- Allow anonymous users to read all categories
-- Categories are public reference data needed for filtering products
create policy "categories_select_anon"
    on categories
    for select
    to anon
    using (true);

comment on policy "categories_select_anon" on categories is 'Allows anonymous users to view all categories (public reference data)';

-- Allow authenticated users to read all categories
-- Categories are public reference data needed for filtering products
create policy "categories_select_authenticated"
    on categories
    for select
    to authenticated
    using (true);

comment on policy "categories_select_authenticated" on categories is 'Allows authenticated users to view all categories (public reference data)';

-- Allow only admins to insert categories
-- Only admins can add new categories
create policy "categories_insert_admin"
    on categories
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "categories_insert_admin" on categories is 'Only admins can add new categories';

-- Allow only admins to update categories
-- Only admins can modify category information
create policy "categories_update_admin"
    on categories
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "categories_update_admin" on categories is 'Only admins can modify category information';

-- Allow only admins to delete categories
-- Only admins can remove categories
create policy "categories_delete_admin"
    on categories
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "categories_delete_admin" on categories is 'Only admins can delete categories';

-- ============================================================================
-- RLS POLICIES: flyers
-- ============================================================================

-- Allow anonymous users to read active flyers
-- Users can see active flyers but not drafts or archived ones
create policy "flyers_select_anon"
    on flyers
    for select
    to anon
    using (status = 'active');

comment on policy "flyers_select_anon" on flyers is 'Allows anonymous users to view only active flyers';

-- Allow authenticated non-admin users to read active flyers
-- Regular users can see active flyers but not drafts or archived ones
-- Admins can see all flyers regardless of status
create policy "flyers_select_authenticated"
    on flyers
    for select
    to authenticated
    using (
        status = 'active'
        or exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "flyers_select_authenticated" on flyers is 'Allows authenticated users to view active flyers; admins can view all flyers';

-- Allow only admins to insert flyers
-- Only admins can create new flyers
create policy "flyers_insert_admin"
    on flyers
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "flyers_insert_admin" on flyers is 'Only admins can create new flyers';

-- Allow only admins to update flyers
-- Only admins can modify flyer information
create policy "flyers_update_admin"
    on flyers
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "flyers_update_admin" on flyers is 'Only admins can modify flyer information';

-- Allow only admins to delete flyers
-- Only admins can remove flyers
create policy "flyers_delete_admin"
    on flyers
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "flyers_delete_admin" on flyers is 'Only admins can delete flyers';

-- ============================================================================
-- RLS POLICIES: pages
-- ============================================================================

-- Allow anonymous users to read verified pages from active flyers
-- Users can only see pages that have been verified by an admin
create policy "pages_select_anon"
    on pages
    for select
    to anon
    using (processing_status = 'verified');

comment on policy "pages_select_anon" on pages is 'Allows anonymous users to view only verified pages';

-- Allow authenticated non-admin users to read verified pages
-- Regular users can only see verified pages
-- Admins can see all pages regardless of status
create policy "pages_select_authenticated"
    on pages
    for select
    to authenticated
    using (
        processing_status = 'verified'
        or exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "pages_select_authenticated" on pages is 'Allows authenticated users to view verified pages; admins can view all pages';

-- Allow only admins to insert pages
-- Only admins can upload new flyer pages
create policy "pages_insert_admin"
    on pages
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "pages_insert_admin" on pages is 'Only admins can upload new flyer pages';

-- Allow only admins to update pages
-- Only admins can modify page information and verification status
create policy "pages_update_admin"
    on pages
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "pages_update_admin" on pages is 'Only admins can modify page information and verification status';

-- Allow only admins to delete pages
-- Only admins can remove pages
create policy "pages_delete_admin"
    on pages
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "pages_delete_admin" on pages is 'Only admins can delete pages';

-- ============================================================================
-- RLS POLICIES: products
-- ============================================================================

-- Allow anonymous users to read products from verified pages
-- Users can only see products from pages verified by an admin
-- This ensures quality control of displayed products
create policy "products_select_anon"
    on products
    for select
    to anon
    using (
        exists (
            select 1 from pages
            where pages.id = products.page_id
            and pages.processing_status = 'verified'
        )
    );

comment on policy "products_select_anon" on products is 'Allows anonymous users to view products from verified pages only';

-- Allow authenticated non-admin users to read products from verified pages
-- Regular users can only see products from verified pages
-- Admins can see all products regardless of verification status
create policy "products_select_authenticated"
    on products
    for select
    to authenticated
    using (
        exists (
            select 1 from pages
            where pages.id = products.page_id
            and pages.processing_status = 'verified'
        )
        or exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "products_select_authenticated" on products is 'Allows authenticated users to view products from verified pages; admins can view all products';

-- Allow only admins to insert products
-- Only admins can add new products (typically via AI processing)
create policy "products_insert_admin"
    on products
    for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "products_insert_admin" on products is 'Only admins can create new products';

-- Allow only admins to update products
-- Only admins can modify product information
create policy "products_update_admin"
    on products
    for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "products_update_admin" on products is 'Only admins can modify product information';

-- Allow only admins to delete products
-- Only admins can remove products
create policy "products_delete_admin"
    on products
    for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

comment on policy "products_delete_admin" on products is 'Only admins can delete products';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

