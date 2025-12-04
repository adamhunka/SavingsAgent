import type { supabaseClient } from "@/db/supabase.client";
import type { CreateJobCommand, JobDTO, JobEntity, JobStatus } from "@/types";
import { ConflictError, InternalServerError, NotFoundError } from "@/lib/utils/errors";

/**
 * JobService
 * Serwis zarządzający zadaniami przetwarzania stron (jobs).
 * Obsługuje tworzenie, pobieranie i aktualizację statusów zadań.
 */
export class JobService {
  constructor(private supabase: typeof supabaseClient) {}

  /**
   * Tworzy nowe zadanie przetwarzania strony
   * @param command - Dane zadania (page_id, model_hint, cost_limit_cents, force, requested_by)
   * @returns Promise<JobDTO> - Utworzone zadanie
   * @throws NotFoundError jeśli strona nie istnieje
   * @throws ConflictError jeśli istnieje już aktywne zadanie i force=false
   * @throws InternalServerError w przypadku błędu DB
   */
  async createJob(command: CreateJobCommand): Promise<JobDTO> {
    // 1. Sprawdzenie czy strona istnieje
    await this.ensurePageExists(command.page_id);

    // 2. Sprawdzenie czy nie istnieje już aktywne zadanie (jeśli force=false)
    if (!command.force) {
      await this.ensureNoActiveJob(command.page_id);
    }

    // 3. Utworzenie zadania w bazie
    const { data, error } = await this.supabase
      .from("jobs")
      .insert({
        page_id: command.page_id,
        model_hint: command.model_hint,
        cost_limit_cents: command.cost_limit_cents,
        requested_by: command.requested_by,
        status: "queued",
        queued_at: new Date().toISOString(),
      })
      .select("id, page_id, status, created_at, started_at, finished_at, error_details, meta")
      .single();

    if (error) {
      throw new InternalServerError("Nie udało się utworzyć zadania");
    }

    return data as JobDTO;
  }

  /**
   * Pobiera zadanie po ID
   * @param jobId - UUID zadania
   * @returns Promise<JobDTO | null> - Zadanie lub null jeśli nie istnieje
   * @throws InternalServerError w przypadku błędu DB
   */
  async getJob(jobId: string): Promise<JobDTO | null> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("id, page_id, status, created_at, started_at, finished_at, error_details, meta")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się pobrać zadania");
    }

    return data as JobDTO | null;
  }

  /**
   * Pobiera wszystkie zadania dla danej strony
   * @param pageId - UUID strony
   * @returns Promise<JobDTO[]> - Lista zadań
   * @throws InternalServerError w przypadku błędu DB
   */
  async getJobsForPage(pageId: string): Promise<JobDTO[]> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("id, page_id, status, created_at, started_at, finished_at, error_details, meta")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new InternalServerError("Nie udało się pobrać zadań dla strony");
    }

    return (data as JobDTO[]) || [];
  }

  /**
   * Aktualizuje status zadania
   * @param jobId - UUID zadania
   * @param status - Nowy status
   * @param additionalData - Dodatkowe dane do aktualizacji (started_at, finished_at, error_details, meta)
   * @returns Promise<JobDTO> - Zaktualizowane zadanie
   * @throws NotFoundError jeśli zadanie nie istnieje
   * @throws InternalServerError w przypadku błędu DB
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    additionalData?: {
      started_at?: string;
      finished_at?: string;
      error_details?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    }
  ): Promise<JobDTO> {
    const updateData: Record<string, unknown> = {
      status,
      ...additionalData,
    };

    const { data, error } = await this.supabase
      .from("jobs")
      .update(updateData)
      .eq("id", jobId)
      .select("id, page_id, status, created_at, started_at, finished_at, error_details, meta")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Zadanie o ID "${jobId}" nie zostało znalezione`);
      }
      throw new InternalServerError("Nie udało się zaktualizować zadania");
    }

    return data as JobDTO;
  }

  /**
   * Sprawdza czy strona istnieje
   * @param pageId - UUID strony
   * @throws NotFoundError jeśli strona nie istnieje
   * @throws InternalServerError w przypadku błędu DB
   */
  private async ensurePageExists(pageId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("pages")
      .select("id")
      .eq("id", pageId)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się sprawdzić istnienia strony");
    }

    if (!data) {
      throw new NotFoundError(`Strona o ID "${pageId}" nie została znaleziona`);
    }
  }

  /**
   * Sprawdza czy nie istnieje już aktywne zadanie dla danej strony
   * @param pageId - UUID strony
   * @throws ConflictError jeśli istnieje aktywne zadanie
   * @throws InternalServerError w przypadku błędu DB
   */
  private async ensureNoActiveJob(pageId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("id, status")
      .eq("page_id", pageId)
      .in("status", ["queued", "processing"])
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się sprawdzić aktywnych zadań");
    }

    if (data) {
      throw new ConflictError(
        `Dla strony o ID "${pageId}" istnieje już aktywne zadanie (${data.status}). Użyj force=true aby utworzyć nowe zadanie.`
      );
    }
  }

  /**
   * Pobiera następne zadanie z kolejki do przetworzenia (dla workera)
   * @returns Promise<JobEntity | null> - Zadanie lub null jeśli kolejka jest pusta
   * @throws InternalServerError w przypadku błędu DB
   */
  async getNextQueuedJob(): Promise<JobEntity | null> {
    const { data, error } = await this.supabase
      .from("jobs")
      .select("*")
      .eq("status", "queued")
      .order("queued_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się pobrać zadania z kolejki");
    }

    return data as JobEntity | null;
  }
}

