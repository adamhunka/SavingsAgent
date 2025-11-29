-- ============================================================================
-- Migration: Initial Schema Setup
-- Description: Creates extensions, ENUM types, and core tables for SavingsAgent
-- Tables: profiles, stores, categories, flyers, pages, products
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable pg_trgm extension for fuzzy text search and similarity matching
-- This allows us to handle typos in product searches
create extension if not exists pg_trgm;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- user_role: Defines user roles in the system
-- admin: Full access to all features including flyer management
-- user: Regular user with read-only access to active products
create type user_role as enum ('admin', 'user');

-- flyer_status: Lifecycle status of promotional flyers
-- draft: Being prepared, not visible to users
-- active: Currently valid and visible to users
-- archived: Past validity date, kept for history
create type flyer_status as enum ('draft', 'active', 'archived');

-- page_processing_status: AI processing pipeline status for flyer pages
-- pending: Awaiting AI processing
-- processing: Currently being analyzed by AI
-- processed: AI extraction complete, awaiting admin verification
-- verified: Admin has reviewed and approved the extracted products
-- error: AI processing failed, requires manual intervention
-- no_products: Page contains no products (e.g., promotional text only)
create type page_processing_status as enum (
    'pending',
    'processing',
    'processed',
    'verified',
    'error',
    'no_products'
);

-- ============================================================================
-- TABLE: profiles
-- ============================================================================

-- Extends auth.users with role management
-- 1:1 relationship with auth.users (Supabase Auth)
-- Automatically created via trigger when new user signs up
create table public.profiles (
    -- Primary key that references auth.users.id
    -- This creates a 1:1 relationship between auth and profiles
    id uuid primary key references auth.users(id) on delete cascade,
    
    -- User role for authorization
    -- Defaults to 'user' for new signups
    -- Only admins can upload flyers and verify AI extractions
    role user_role not null default 'user',
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable row level security on profiles table
-- RLS policies will be added in a separate migration
alter table public.profiles enable row level security;

-- Add table comment for documentation
comment on table public.profiles is 'User profiles with role-based access control';
comment on column public.profiles.role is 'User role: admin has full access, user has read-only access';

-- ============================================================================
-- TABLE: stores
-- ============================================================================

-- Dictionary table for stores (Lidl, Biedronka, etc.)
-- Small, relatively static table that will be seeded with initial data
create table public.stores (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Store name must be unique (e.g., 'Lidl', 'Biedronka')
    name varchar(100) not null unique,
    
    -- URL to store logo in public assets or CDN
    logo_url text,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable row level security on stores table
alter table public.stores enable row level security;

-- Add table comment
comment on table public.stores is 'Dictionary of retail stores';
comment on column public.stores.name is 'Unique store name, used as display text and for slug generation';

-- ============================================================================
-- TABLE: categories
-- ============================================================================

-- Dictionary table for product categories
-- Closed list enforced by system and AI prompts
-- Used for filtering and organizing products
create table public.categories (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Category name must be unique (e.g., 'Owoce i Warzywa')
    name varchar(100) not null unique,
    
    -- Icon name for UI rendering (e.g., 'fruit', 'dairy')
    icon_name varchar(50) not null,
    
    -- Display order for sorting in UI (lower numbers appear first)
    display_order integer not null default 0,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable row level security on categories table
alter table public.categories enable row level security;

-- Add table comment
comment on table public.categories is 'Product category dictionary with display metadata';
comment on column public.categories.display_order is 'Sort order for UI display (ascending)';

-- ============================================================================
-- TABLE: flyers
-- ============================================================================

-- Promotional flyers from stores
-- Each flyer has a validity period and contains multiple pages
create table public.flyers (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Foreign key to stores table
    -- RESTRICT prevents deletion of stores with existing flyers
    store_id uuid not null references stores(id) on delete restrict,
    
    -- Validity period for the promotional flyer
    valid_from date not null,
    valid_to date not null,
    
    -- Lifecycle status of the flyer
    status flyer_status not null default 'draft',
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Ensure valid_to is not before valid_from
    constraint check_valid_dates check (valid_to >= valid_from)
);

-- Enable row level security on flyers table
alter table public.flyers enable row level security;

-- Add table comments
comment on table public.flyers is 'Promotional flyers with validity periods';
comment on column public.flyers.status is 'Lifecycle status: draft (preparing), active (visible to users), archived (past validity)';
comment on constraint check_valid_dates on public.flyers is 'Ensures valid_to date is not before valid_from date';

-- ============================================================================
-- TABLE: pages
-- ============================================================================

-- Individual pages of flyers with AI processing metadata
-- Each page contains an image that will be processed by AI to extract products
create table public.pages (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Foreign key to flyers table
    -- CASCADE deletes all pages when flyer is deleted
    flyer_id uuid not null references flyers(id) on delete cascade,
    
    -- Page number within the flyer (1-indexed)
    page_number integer not null,
    
    -- Path to image in Supabase Storage (relative to bucket)
    -- Format: {store_slug}/{flyer_id}/page_{page_number}.jpg
    image_path text not null,
    
    -- Image dimensions (populated after upload)
    image_width integer,
    image_height integer,
    
    -- AI processing pipeline status
    processing_status page_processing_status not null default 'pending',
    
    -- Timestamp when AI processing started
    processing_started_at timestamptz,
    
    -- Raw AI response for debugging and audit trail
    -- Stored as JSONB for future querying capabilities
    ai_raw_response jsonb,
    
    -- Error details if processing_status = 'error'
    error_details text,
    
    -- Admin who verified this page (for audit trail)
    -- SET NULL preserves audit trail even if admin account is deleted
    verified_by uuid references profiles(id) on delete set null,
    
    -- Timestamp of verification
    verified_at timestamptz,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Constraints
    -- Ensure unique page numbers within a flyer
    constraint unique_page_number unique (flyer_id, page_number),
    
    -- Page numbers must be positive
    constraint check_page_number_positive check (page_number > 0),
    
    -- Image dimensions must both be null or both be positive
    constraint check_image_dimensions check (
        (image_width is null and image_height is null) or 
        (image_width > 0 and image_height > 0)
    )
);

-- Enable row level security on pages table
alter table public.pages enable row level security;

-- Add table comments
comment on table public.pages is 'Flyer pages with AI processing metadata and verification tracking';
comment on column public.pages.ai_raw_response is 'Raw AI response stored as JSONB for debugging and audit purposes';
comment on column public.pages.verified_by is 'Admin who verified the AI extraction results';
comment on constraint unique_page_number on public.pages is 'Prevents duplicate page numbers within the same flyer';

-- ============================================================================
-- TABLE: products
-- ============================================================================

-- Products extracted from flyer pages by AI
-- Contains pricing, categorization, and full-text search capabilities
create table public.products (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Foreign key to pages table
    -- CASCADE deletes all products when page is deleted
    page_id uuid not null references pages(id) on delete cascade,
    
    -- Foreign key to categories table
    -- RESTRICT prevents deletion of categories with existing products
    category_id uuid not null references categories(id) on delete restrict,
    
    -- Product name (e.g., 'Masło Extra')
    name varchar(500) not null,
    
    -- Additional details: weight, producer, variant (e.g., '200g, Mlekovita')
    description text,
    
    -- Promotional price (always required)
    price_promo numeric(10, 2) not null,
    
    -- Regular price (optional, if shown in flyer)
    price_regular numeric(10, 2),
    
    -- Promotional conditions (e.g., 'przy zakupie 2 sztuk')
    conditions text,
    
    -- Bounding box coordinates on the page image for admin panel
    -- Format: {"x": 100, "y": 200, "width": 300, "height": 400}
    bounding_box jsonb,
    
    -- Full-text search vector (automatically populated by trigger)
    search_vector tsvector,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Constraints
    -- Promotional price must be positive
    constraint check_price_promo_positive check (price_promo > 0),
    
    -- Regular price if specified must be positive
    constraint check_price_regular_positive check (price_regular is null or price_regular > 0),
    
    -- Regular price if specified must be greater than or equal to promo price
    constraint check_price_logic check (price_regular is null or price_regular >= price_promo)
);

-- Enable row level security on products table
alter table public.products enable row level security;

-- Add table comments
comment on table public.products is 'Products extracted from flyer pages with pricing and search capabilities';
comment on column public.products.price_promo is 'Promotional price (required, always positive)';
comment on column public.products.price_regular is 'Regular price (optional, must be >= promo price if specified)';
comment on column public.products.bounding_box is 'Product location on page image for admin verification UI';
comment on column public.products.search_vector is 'Full-text search vector, automatically maintained by trigger';
comment on constraint check_price_logic on public.products is 'Ensures regular price is not lower than promotional price';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

