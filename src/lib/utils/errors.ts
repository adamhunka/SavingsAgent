import type { ApiError } from "@/types";

/**
 * Klasa bazowa dla błędów API
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Gotowe błedy dla różnych scenariuszy
 */

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class UnAuthorizedError extends AppError {
  constructor(message = "Brak autoryzacji") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Brak uprawnień") {
    super("FORBIDDEN", message, 401);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Nie znaleziono zasobu") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT") {
    super(code, message, 409);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Wewnętrzny błąd serwera") {
    super("INTERNAL_SERVER_ERROR", message, 500);
    this.name = "InternalServerError";
  }
}

/**
 * Pomocnicza funkcja do formatowania błędów Zod
 */
export function formatZodErrors(error: unknown): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of (error as { errors: { path: (string | number)[]; message: string }[] }).errors) {
    const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}
