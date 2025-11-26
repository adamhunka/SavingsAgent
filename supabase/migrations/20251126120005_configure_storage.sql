-- ============================================================================
-- Migration: Storage Configuration
-- Description: Creates storage bucket and policies for flyer page images
-- Bucket: flyer-pages (public)
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKET: flyer-pages
-- ============================================================================

-- Create public storage bucket for flyer page images
-- Public bucket allows direct URL access to images without signed URLs
-- Path structure: {store_slug}/{flyer_id}/page_{page_number}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'flyer-pages',
    'flyer-pages',
    true,  -- Public bucket for easy image access
    10485760,  -- 10MB file size limit per image
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']  -- Only allow image files
);

-- Note: Cannot add comments to storage schema objects (permission denied)
-- Public bucket allows direct URL access: {SUPABASE_URL}/storage/v1/object/public/flyer-pages/{path}

-- ============================================================================
-- STORAGE POLICIES: Public Read Access
-- ============================================================================

-- Allow anonymous users to view flyer images
-- Required for displaying products to all users without authentication
create policy "flyer_pages_select_anon"
    on storage.objects
    for select
    to anon
    using (bucket_id = 'flyer-pages');

-- Allows anonymous users to view all flyer page images

-- Allow authenticated users to view flyer images
-- Required for displaying products to authenticated users
create policy "flyer_pages_select_authenticated"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'flyer-pages');

-- Allows authenticated users to view all flyer page images

-- ============================================================================
-- STORAGE POLICIES: Admin-Only Write Access
-- ============================================================================

-- Allow only admins to upload flyer images
-- Prevents unauthorized users from uploading files to storage
create policy "flyer_pages_insert_admin"
    on storage.objects
    for insert
    to authenticated
    with check (
        bucket_id = 'flyer-pages'
        and exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Only admins can upload flyer page images

-- Allow only admins to update flyer images
-- Prevents unauthorized modification of existing images
create policy "flyer_pages_update_admin"
    on storage.objects
    for update
    to authenticated
    using (
        bucket_id = 'flyer-pages'
        and exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Only admins can update flyer page images

-- Allow only admins to delete flyer images
-- Prevents unauthorized deletion of images
create policy "flyer_pages_delete_admin"
    on storage.objects
    for delete
    to authenticated
    using (
        bucket_id = 'flyer-pages'
        and exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Only admins can delete flyer page images

-- ============================================================================
-- STORAGE PATH NAMING CONVENTION
-- ============================================================================

-- Path structure documentation:
-- flyer-pages/{store_slug}/{flyer_id}/page_{page_number}.jpg
--
-- Examples:
-- - flyer-pages/lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg
-- - flyer-pages/biedronka/660e8400-e29b-41d4-a716-446655440001/page_1.jpg
--
-- Full public URL format:
-- {SUPABASE_URL}/storage/v1/object/public/flyer-pages/{image_path}
--
-- The image_path in pages table should be stored as:
-- {store_slug}/{flyer_id}/page_{page_number}.jpg
-- (without the 'flyer-pages/' bucket prefix)

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

