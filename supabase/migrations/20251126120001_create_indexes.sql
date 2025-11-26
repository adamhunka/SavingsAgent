-- ============================================================================
-- Migration: Create Indexes
-- Description: Creates strategic indexes for query performance optimization
-- Tables: profiles, flyers, pages, products
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- INDEXES: profiles
-- ============================================================================

-- Index on role for efficient admin/user filtering
-- Used by RLS policies and admin dashboard queries
create index idx_profiles_role on profiles(role);

comment on index idx_profiles_role is 'Optimizes queries filtering by user role (admin/user)';

-- ============================================================================
-- INDEXES: flyers
-- ============================================================================

-- Index on store_id for efficient lookups of flyers by store
-- Used when displaying all flyers for a specific store
create index idx_flyers_store_id on flyers(store_id);

comment on index idx_flyers_store_id is 'Optimizes queries filtering flyers by store';

-- Index on status for efficient filtering by lifecycle status
-- Used in admin dashboard and when showing only active flyers
create index idx_flyers_status on flyers(status);

comment on index idx_flyers_status is 'Optimizes queries filtering by flyer status (draft/active/archived)';

-- Composite index on validity dates for date range queries
-- Used when finding currently valid flyers
create index idx_flyers_dates on flyers(valid_from, valid_to);

comment on index idx_flyers_dates is 'Optimizes date range queries for finding valid flyers';

-- Composite index combining store and dates for efficient filtering
-- Used in main user query: "show me active products from Lidl"
create index idx_flyers_store_dates on flyers(store_id, valid_from, valid_to);

comment on index idx_flyers_store_dates is 'Optimizes combined store and date range queries';

-- ============================================================================
-- INDEXES: pages
-- ============================================================================

-- Index on flyer_id for efficient lookups of pages by flyer
-- Used when displaying all pages of a flyer
create index idx_pages_flyer_id on pages(flyer_id);

comment on index idx_pages_flyer_id is 'Optimizes queries retrieving all pages for a specific flyer';

-- Index on processing_status for filtering by AI pipeline status
-- Used in admin dashboard to find pages needing verification
create index idx_pages_processing_status on pages(processing_status);

comment on index idx_pages_processing_status is 'Optimizes queries filtering by AI processing status';

-- Index on verified_by for audit queries
-- Used to track which admin verified which pages
create index idx_pages_verified_by on pages(verified_by);

comment on index idx_pages_verified_by is 'Optimizes audit queries tracking admin verifications';

-- Composite index on flyer_id and page_number
-- Used for efficient page lookups within a flyer
create index idx_pages_flyer_page_number on pages(flyer_id, page_number);

comment on index idx_pages_flyer_page_number is 'Optimizes lookups of specific page numbers within flyers';

-- ============================================================================
-- INDEXES: products
-- ============================================================================

-- Index on page_id for efficient lookups of products by page
-- Used when displaying all products from a page
create index idx_products_page_id on products(page_id);

comment on index idx_products_page_id is 'Optimizes queries retrieving all products from a specific page';

-- Index on category_id for filtering products by category
-- Used in main user feature: browsing products by category
create index idx_products_category_id on products(category_id);

comment on index idx_products_category_id is 'Optimizes queries filtering products by category';

-- Composite index on category and price for sorted category browsing
-- Used when showing "cheapest products in category X"
create index idx_products_category_price on products(category_id, price_promo);

comment on index idx_products_category_price is 'Optimizes category browsing with price sorting';

-- Index on promotional price for price-based sorting and filtering
-- Used for "show all products under X PLN"
create index idx_products_price_promo on products(price_promo);

comment on index idx_products_price_promo is 'Optimizes price-based filtering and sorting';

-- ============================================================================
-- FULL TEXT SEARCH INDEXES: products
-- ============================================================================

-- GIN index on search_vector for fast full-text search
-- Used by search functionality with Polish language support
create index idx_products_search_vector on products using gin(search_vector);

comment on index idx_products_search_vector is 'Enables fast full-text search on product names and descriptions';

-- Trigram GIN index on name for fuzzy matching and typo tolerance
-- Used when exact FTS doesn't match (e.g., "kava" instead of "kawa")
create index idx_products_name_trigram on products using gin(name gin_trgm_ops);

comment on index idx_products_name_trigram is 'Enables fuzzy matching on product names (typo tolerance)';

-- Trigram GIN index on description for fuzzy matching
-- Used for broader fuzzy search including product descriptions
create index idx_products_description_trigram on products using gin(description gin_trgm_ops);

comment on index idx_products_description_trigram is 'Enables fuzzy matching on product descriptions (typo tolerance)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

