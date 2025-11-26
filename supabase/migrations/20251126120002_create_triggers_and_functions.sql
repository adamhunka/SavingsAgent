-- ============================================================================
-- Migration: Create Triggers and Functions
-- Description: Creates automation triggers and utility functions
-- Functions: handle_new_user, handle_updated_at, update_product_search_vector, search_products
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- FUNCTION: handle_new_user
-- ============================================================================

-- Automatically creates a profile record when a new user signs up
-- Triggered after INSERT on auth.users table
-- Sets default role to 'user' for all new signups
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    -- Insert new profile with user role
    -- Admin role must be granted manually for security
    insert into public.profiles (id, role)
    values (new.id, 'user');
    
    return new;
end;
$$;

comment on function public.handle_new_user is 'Automatically creates user profile on signup with default user role';

-- Create trigger on auth.users table
-- SECURITY DEFINER is required to allow trigger to insert into profiles table
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- Note: Cannot add comment on trigger in auth schema (permission denied)
-- Trigger creates profile record automatically when new user signs up

-- ============================================================================
-- FUNCTION: handle_updated_at
-- ============================================================================

-- Automatically updates the updated_at timestamp on row modifications
-- Applied to all tables with updated_at column
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    -- Set updated_at to current timestamp
    new.updated_at = now();
    return new;
end;
$$;

comment on function public.handle_updated_at is 'Automatically updates updated_at timestamp on row modifications';

-- ============================================================================
-- TRIGGERS: Automatic updated_at on all tables
-- ============================================================================

-- Apply updated_at trigger to profiles table
create trigger set_updated_at
    before update on profiles
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on profiles is 'Automatically updates updated_at timestamp on profile modifications';

-- Apply updated_at trigger to stores table
create trigger set_updated_at
    before update on stores
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on stores is 'Automatically updates updated_at timestamp on store modifications';

-- Apply updated_at trigger to categories table
create trigger set_updated_at
    before update on categories
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on categories is 'Automatically updates updated_at timestamp on category modifications';

-- Apply updated_at trigger to flyers table
create trigger set_updated_at
    before update on flyers
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on flyers is 'Automatically updates updated_at timestamp on flyer modifications';

-- Apply updated_at trigger to pages table
create trigger set_updated_at
    before update on pages
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on pages is 'Automatically updates updated_at timestamp on page modifications';

-- Apply updated_at trigger to products table
create trigger set_updated_at
    before update on products
    for each row
    execute function handle_updated_at();

comment on trigger set_updated_at on products is 'Automatically updates updated_at timestamp on product modifications';

-- ============================================================================
-- FUNCTION: update_product_search_vector
-- ============================================================================

-- Automatically generates and updates the full-text search vector
-- Triggered before INSERT or UPDATE of name/description on products table
-- Uses Polish language configuration for proper text search
create or replace function public.update_product_search_vector()
returns trigger
language plpgsql
as $$
begin
    -- Generate search vector with weighted fields
    -- 'A' weight for name (highest priority in search results)
    -- 'B' weight for description (secondary priority)
    -- Uses 'polish' configuration for proper stemming and stop words
    new.search_vector := 
        setweight(to_tsvector('polish', coalesce(new.name, '')), 'A') ||
        setweight(to_tsvector('polish', coalesce(new.description, '')), 'B');
    
    return new;
end;
$$;

comment on function public.update_product_search_vector is 'Automatically generates full-text search vector from product name and description with Polish language support';

-- Create trigger on products table
-- Fires on INSERT or when name/description columns are updated
create trigger products_search_vector_update
    before insert or update of name, description on products
    for each row
    execute function update_product_search_vector();

comment on trigger products_search_vector_update on products is 'Maintains full-text search vector when product name or description changes';

-- ============================================================================
-- FUNCTION: search_products
-- ============================================================================

-- Advanced product search with fuzzy matching and typo tolerance
-- Combines full-text search (FTS) with trigram similarity for robust search
-- Returns products ranked by relevance with similarity score
create or replace function public.search_products(
    search_query text,
    similarity_threshold float default 0.3
)
returns table (
    product_id uuid,
    product_name varchar,
    description text,
    price_promo numeric,
    similarity_score float
)
language plpgsql
as $$
begin
    return query
    select 
        p.id,
        p.name,
        p.description,
        p.price_promo,
        -- Calculate similarity score as maximum of name and description matches
        greatest(
            similarity(p.name, search_query),
            similarity(coalesce(p.description, ''), search_query)
        ) as sim_score
    from products p
    inner join pages pg on p.page_id = pg.id
    where 
        -- Only search in verified pages (quality control)
        pg.processing_status = 'verified'
        -- Match using full-text search OR trigram similarity
        and (
            -- Full-text search using Polish configuration
            p.search_vector @@ plainto_tsquery('polish', search_query)
            -- OR fuzzy match on name (handles typos)
            or similarity(p.name, search_query) > similarity_threshold
            -- OR fuzzy match on description (broader search)
            or similarity(coalesce(p.description, ''), search_query) > similarity_threshold
        )
    -- Order by relevance first, then by price (cheapest first)
    order by sim_score desc, p.price_promo asc
    -- Limit results to prevent excessive data transfer
    limit 100;
end;
$$;

comment on function public.search_products is 'Searches products with typo tolerance using FTS and trigram similarity. Returns up to 100 results ranked by relevance and price.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

