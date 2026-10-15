import { QLOO_TYPES, type QlooEntity, type ReferenceInput, type ReferenceType } from "./types";

export const DEFAULT_QLOO_BASE_URL = "https://hackathon.api.qloo.com";
const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 12_000;

export class QlooError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = "QlooError"; }
}

function configuredBaseUrl() {
  const raw = process.env.QLOO_BASE_URL || DEFAULT_QLOO_BASE_URL;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new QlooError("QLOO_BASE_URL must be a valid HTTPS origin.");
  }
}

async function requestJson(path: string, params: Record<string, string>, fetcher: typeof fetch = fetch, timeoutMs = TIMEOUT_MS) {
  const key = process.env.QLOO_API_KEY;
  if (!key?.trim()) throw new QlooError("Qloo API credentials are not configured.");
  const url = new URL(`${configuredBaseUrl()}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", "X-Api-Key": key },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw new QlooError("Qloo returned a response that was too large.", response.status);
    if (!response.ok) {
      const detail = safeErrorDetail(text);
      throw new QlooError(detail ? `Qloo request failed (${response.status}): ${detail}` : `Qloo request failed (${response.status}).`, response.status);
    }
    try { return JSON.parse(text) as unknown; }
    catch { throw new QlooError("Qloo returned an unreadable response.", response.status); }
  } catch (error) {
    if (error instanceof QlooError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new QlooError("Qloo did not respond before the request timeout. Please try again.");
    if (error instanceof Error && error.name === "TypeError") throw new QlooError("Could not reach Qloo. Check the server connection and try again.");
    throw new QlooError("The Qloo request could not be completed.");
  } finally { clearTimeout(timeout); }
}

function safeErrorDetail(text: string) {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const candidate = body.message ?? body.error ?? body.detail;
    return typeof candidate === "string" ? candidate.replace(/[\r\n]+/g, " ").slice(0, 180) : "";
  } catch { return ""; }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function extractEntities(payload: unknown): QlooEntity[] {
  const root = asRecord(payload);
  const results = asRecord(root?.results);
  const candidates = results?.entities ?? root?.entities ?? results?.items;
  if (!Array.isArray(candidates)) return [];
  return candidates.flatMap(value => {
    const entity = asRecord(value);
    if (!entity || typeof entity.entity_id !== "string" || typeof entity.name !== "string" || typeof entity.type !== "string") return [];
    const affinity = typeof entity.affinity === "number" && Number.isFinite(entity.affinity) ? entity.affinity : undefined;
    const properties = asRecord(entity.properties);
    return [{
      entity_id: entity.entity_id,
      name: entity.name.slice(0, 160),
      type: entity.type,
      ...(typeof entity.subtype === "string" ? { subtype: entity.subtype.slice(0, 100) } : {}),
      ...(affinity !== undefined ? { affinity } : {}),
      ...(properties ? { properties: safeProperties(properties) } : {}),
      ...(entity.explainability !== undefined ? { explainability: entity.explainability } : {}),
    }];
  });
}

function safeProperties(properties: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of ["address", "city", "country", "description", "category", "genres", "image", "geocode", "website", "release_year"]) {
    const value = properties[key];
    if (typeof value === "string" || typeof value === "number") result[key] = typeof value === "string" ? value.slice(0, 280) : value;
    else if (Array.isArray(value)) result[key] = value.filter(x => typeof x === "string").slice(0, 8).map(x => x.slice(0, 80));
  }
  return result;
}

export async function searchQlooEntity(reference: ReferenceInput, fetcher: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Promise<QlooEntity[]> {
  const payload = await requestJson("/search", {
    query: reference.name,
    types: QLOO_TYPES[reference.type],
    take: "5",
  }, fetcher, timeoutMs);
  const expectedType = QLOO_TYPES[reference.type];
  return extractEntities(payload).filter(entity => entity.type === expectedType);
}

export async function getQlooPlaceInsights(input: { city: string; entityIds: string[] }, fetcher: typeof fetch = fetch, timeoutMs = TIMEOUT_MS) {
  const params: Record<string, string> = {
    "filter.type": "urn:entity:place",
    "filter.location.query": input.city,
    "signal.location.query": input.city,
    take: "8",
    "feature.explainability": "true",
  };
  if (input.entityIds.length) params["signal.interests.entities"] = input.entityIds.join(",");
  const payload = await requestJson("/v2/insights", params, fetcher, timeoutMs);
  return extractEntities(payload).filter(entity => entity.type === "urn:entity:place");
}

export function hasQlooCredentials() { return Boolean(process.env.QLOO_API_KEY?.trim()) && process.env.QLOO_DEMO_MODE !== "true"; }

export function qlooTypeFor(referenceType: ReferenceType) { return QLOO_TYPES[referenceType]; }
