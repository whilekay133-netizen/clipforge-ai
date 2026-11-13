import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConfigError } from "./env";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

/** Wrap a route handler: maps known errors to safe JSON responses and never leaks internals. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
      if (err instanceof ZodError) return json({ error: err.issues[0]?.message ?? "Invalid input", issues: err.issues }, 400);
      if (err instanceof ConfigError) {
        console.error("[config]", err.message);
        return json({ error: "This feature is not configured yet. An administrator needs to add the required API keys.", code: "NOT_CONFIGURED" }, 503);
      }
      console.error("[api]", err instanceof Error ? err.message : err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}
