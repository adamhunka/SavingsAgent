-- ============================================================================
-- Migration: Create Jobs Table
-- Description: Creates jobs table for tracking async page processing tasks
-- Tables: jobs
-- Author: SavingsAgent Development Team
-- Date: 2025-12-04
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- job_status: Lifecycle status of processing jobs
-- queued: Job created and waiting to be picked up by worker
-- processing: Worker is actively processing the job
-- completed: Job finished successfully
-- failed: Job failed with error
-- no_products: Job completed but no products were found on the page
create type job_status as enum (
    'queued',
    'processing',
    'completed',
    'failed',
    'no_products'
);

-- ============================================================================
-- TABLE: jobs
-- ============================================================================

-- Tracks asynchronous page processing jobs (OCR -> LLM -> product extraction)
-- Each job represents one page processing request
create table public.jobs (
    -- Primary key
    id uuid primary key default gen_random_uuid(),
    
    -- Reference to the page being processed
    -- CASCADE delete: if page is deleted, its jobs are also deleted
    page_id uuid not null references public.pages(id) on delete cascade,
    
    -- Job lifecycle status
    status job_status not null default 'queued',
    
    -- Optional hint for LLM model to use (e.g., 'gpt-4o-mini', 'gpt-4')
    model_hint text,
    
    -- Cost limit in cents to prevent runaway API costs
    -- Job should fail if estimated cost exceeds this limit
    cost_limit_cents integer,
    
    -- User ID who requested the job (for audit trail)
    requested_by uuid not null references public.profiles(id) on delete set null,
    
    -- Timestamps for job lifecycle
    created_at timestamptz not null default now(),
    queued_at timestamptz default now(),
    started_at timestamptz,
    finished_at timestamptz,
    
    -- Error details stored as JSONB for structured error information
    -- Example: {"error_type": "ocr_failed", "message": "...", "details": {...}}
    error_details jsonb,
    
    -- Additional metadata as JSONB (extensible for future needs)
    -- Example: {"ocr_provider": "google_vision", "tokens_used": 1234, "cost_cents": 50}
    meta jsonb,
    
    -- Constraints
    constraint jobs_cost_limit_cents_positive check (cost_limit_cents is null or cost_limit_cents > 0),
    constraint jobs_timestamps_logical check (
        (started_at is null or started_at >= queued_at) and
        (finished_at is null or (started_at is not null and finished_at >= started_at))
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for worker to efficiently query pending jobs
-- Worker query: SELECT * FROM jobs WHERE status = 'queued' ORDER BY queued_at LIMIT 1
create index idx_jobs_status_queued_at on public.jobs(status, queued_at)
    where status in ('queued', 'processing');

-- Index for checking active jobs for a specific page (idempotency check)
-- Query: SELECT * FROM jobs WHERE page_id = $1 AND status IN ('queued', 'processing')
create index idx_jobs_page_id_active on public.jobs(page_id, status)
    where status in ('queued', 'processing');

-- Index for audit queries by user
create index idx_jobs_requested_by on public.jobs(requested_by);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on jobs table
alter table public.jobs enable row level security;

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.jobs is 'Asynchronous page processing jobs queue';
comment on column public.jobs.status is 'Job lifecycle status: queued -> processing -> completed/failed/no_products';
comment on column public.jobs.model_hint is 'Optional hint for which LLM model to use';
comment on column public.jobs.cost_limit_cents is 'Maximum allowed cost for this job in cents';
comment on column public.jobs.requested_by is 'User who requested this job (audit trail)';
comment on column public.jobs.error_details is 'Structured error information if job failed';
comment on column public.jobs.meta is 'Additional metadata (tokens used, actual cost, etc.)';

