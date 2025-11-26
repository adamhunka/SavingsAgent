-- ============================================================================
-- Migration: Seed Data
-- Description: Inserts initial data for stores and categories
-- Tables: stores, categories
-- Author: Database Schema Generator
-- Date: 2025-11-26
-- ============================================================================

-- ============================================================================
-- SEED DATA: stores
-- ============================================================================

-- Insert initial stores: Lidl and Biedronka
-- These are the primary discount stores in Poland
insert into stores (name, logo_url) values
    ('Lidl', '/logos/lidl.svg'),
    ('Biedronka', '/logos/biedronka.svg')
on conflict (name) do nothing;

comment on column stores.logo_url is 'Logo file path in public assets folder or full URL to CDN';

-- ============================================================================
-- SEED DATA: categories
-- ============================================================================

-- Insert predefined product categories
-- This is a closed list enforced by the system and AI prompts
-- display_order determines the sort order in UI (ascending)
insert into categories (name, icon_name, display_order) values
    ('Owoce i Warzywa', 'fruit', 10),
    ('Nabiał', 'dairy', 20),
    ('Mięso i Wędliny', 'meat', 30),
    ('Pieczywo', 'bread', 40),
    ('Napoje', 'beverages', 50),
    ('Słodycze', 'sweets', 60),
    ('Chemia Gospodarcza', 'cleaning', 70),
    ('Kosmetyki', 'cosmetics', 80),
    ('Artykuły Przemysłowe', 'industrial', 90),
    ('Inne', 'other', 100)
on conflict (name) do nothing;

-- ============================================================================
-- CATEGORY DESCRIPTIONS
-- ============================================================================

-- Category mapping guide for AI and developers:
--
-- 'Owoce i Warzywa' (Fruits and Vegetables)
--   - Fresh fruits, vegetables, salads, herbs
--
-- 'Nabiał' (Dairy)
--   - Milk, cheese, yogurt, butter, cream, cottage cheese
--
-- 'Mięso i Wędliny' (Meat and Cold Cuts)
--   - Fresh meat, poultry, fish, sausages, cold cuts, deli products
--
-- 'Pieczywo' (Bakery)
--   - Bread, rolls, pastries, cakes, baking mixes
--
-- 'Napoje' (Beverages)
--   - Water, juice, soda, coffee, tea, alcohol
--
-- 'Słodycze' (Sweets)
--   - Chocolate, candy, cookies, snacks, ice cream
--
-- 'Chemia Gospodarcza' (Household Chemicals)
--   - Detergents, cleaning products, dishwashing liquid, fabric softener
--
-- 'Kosmetyki' (Cosmetics)
--   - Personal care products, shampoo, soap, toothpaste, cosmetics
--
-- 'Artykuły Przemysłowe' (Industrial/Non-Food Products)
--   - Tools, hardware, electronics, textiles, home goods
--
-- 'Inne' (Other)
--   - Products that don't fit other categories

-- ============================================================================
-- ADMIN USER SETUP INSTRUCTIONS
-- ============================================================================

-- The first admin user must be created manually after initial setup:
--
-- 1. Sign up a user through the application UI or Supabase Auth
-- 2. Get the user's UUID from auth.users table
-- 3. Run the following SQL to grant admin role:
--
--    update profiles
--    set role = 'admin'
--    where id = 'USER_UUID_HERE';
--
-- Alternative: Use Supabase Dashboard > Authentication > Users
-- and run the update query in SQL Editor
--
-- Security Note: The handle_new_user trigger creates all new users
-- with 'user' role by default. Admin role must be granted manually
-- to prevent unauthorized privilege escalation.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

