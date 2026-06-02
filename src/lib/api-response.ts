import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details })
      }
    },
    { status }
  );
}

export function notFound(message: string) {
  return apiError("not_found", message, 404);
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(
      "validation_error",
      "요청 데이터가 올바르지 않습니다.",
      400,
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    );
  }

  if (error instanceof SyntaxError) {
    return apiError("invalid_json_body", "JSON 요청 본문이 필요합니다.");
  }

  if (error instanceof Error) {
    return apiError("server_error", error.message, 500);
  }

  return apiError("server_error", "알 수 없는 오류가 발생했습니다.", 500);
}
