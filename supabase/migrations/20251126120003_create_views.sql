-- ============================================================================
-- Migration: Create Views
-- Description: Creates views for simplified queries and business logic aggregation
-- Views: v_active_products
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- VIEW: v_active_products
-- ============================================================================

-- Aggregates business logic for client application
-- Shows only active, verified products from currently valid flyers
-- Simplifies frontend queries by pre-joining all necessary tables
-- Filters out draft/archived flyers and unverified pages
-- Uses security_invoker to ensure RLS policies of the querying user are enforced
create or replace view public.v_active_products
with (security_invoker = true) as
select 
    -- Product information
    p.id as product_id,
    p.name as product_name,
    p.description,
    p.price_promo,
    p.price_regular,
    p.conditions,
    
    -- Category information
    c.id as category_id,
    c.name as category_name,
    c.icon_name as category_icon,
    
    -- Store information
    s.id as store_id,
    s.name as store_name,
    s.logo_url as store_logo,
    
    -- Flyer validity information
    f.valid_from,
    f.valid_to,
    
    -- Page image for potential detail view
    pg.image_path as page_image_path,
    
    -- Audit timestamp
    p.created_at
from products p
-- Join with pages to filter by processing status
inner join pages pg on p.page_id = pg.id
-- Join with flyers to filter by status and validity dates
inner join flyers f on pg.flyer_id = f.id
-- Join with stores to get store information
inner join stores s on f.store_id = s.id
-- Join with categories to get category information
inner join categories c on p.category_id = c.id
where 
    -- Only show products from active flyers
    f.status = 'active'
    -- Only show products from verified pages (quality control)
    and pg.processing_status = 'verified'
    -- Only show products from currently valid flyers
    and f.valid_from <= current_date
    and f.valid_to >= current_date
-- Order by newest products first
order by p.created_at desc;

comment on view public.v_active_products is 'Active, verified products from currently valid flyers with all related information. Used by frontend to display available offers.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

