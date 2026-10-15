import test from "node:test";
import assert from "node:assert/strict";
import { getQlooPlaceInsights, searchQlooEntity } from "../lib/qloo";

const priorKey = process.env.QLOO_API_KEY;
const priorBase = process.env.QLOO_BASE_URL;

test("entity search uses the documented endpoint, category and server-only API key header", async () => {
  process.env.QLOO_API_KEY = "unit-test-secret";
  process.env.QLOO_BASE_URL = "https://hackathon.api.qloo.com";
  let seenUrl = "";
  let seenKey = "";
  const fetcher: typeof fetch = async (input, init) => {
    seenUrl = String(input);
    seenKey = new Headers(init?.headers).get("X-Api-Key") ?? "";
    return Response.json({ results: { entities: [
      { entity_id: "urn:entity:artist:fixture-1", name: "Example Artist", type: "urn:entity:artist", properties: { description: "An artist" } },
      { entity_id: "urn:entity:movie:fixture-2", name: "Wrong type", type: "urn:entity:movie" },
    ] } });
  };
  const entities = await searchQlooEntity({ name: "Example Artist", type: "artist" }, fetcher);
  const url = new URL(seenUrl);
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("query"), "Example Artist");
  assert.equal(url.searchParams.get("types"), "urn:entity:artist");
  assert.equal(url.searchParams.get("take"), "5");
  assert.equal(seenKey, "unit-test-secret");
  assert.deepEqual(entities.map(entity => entity.name), ["Example Artist"]);
  assert.equal(JSON.stringify(entities).includes("unit-test-secret"), false);
});

test("Insights uses supported place, locality, entity signal and explainability parameters", async () => {
  process.env.QLOO_API_KEY = "unit-test-secret";
  process.env.QLOO_BASE_URL = "https://hackathon.api.qloo.com";
  let seenUrl = "";
  const fetcher: typeof fetch = async input => {
    seenUrl = String(input);
    return Response.json({ results: { entities: [
      { entity_id: "urn:entity:place:fixture-1", name: "Example Place", type: "urn:entity:place", affinity: 0.62, properties: { city: "Mumbai", private_field: "discard" } },
      { entity_id: "urn:entity:brand:fixture-2", name: "Wrong type", type: "urn:entity:brand" },
    ] } });
  };
  const entities = await getQlooPlaceInsights({ city: "Mumbai, India", entityIds: ["urn:entity:movie:fixture-1"] }, fetcher);
  const url = new URL(seenUrl);
  assert.equal(url.pathname, "/v2/insights");
  assert.equal(url.searchParams.get("filter.type"), "urn:entity:place");
  assert.equal(url.searchParams.get("filter.location.query"), "Mumbai, India");
  assert.equal(url.searchParams.get("signal.location.query"), "Mumbai, India");
  assert.equal(url.searchParams.get("signal.interests.entities"), "urn:entity:movie:fixture-1");
  assert.equal(url.searchParams.get("feature.explainability"), "true");
  assert.equal(url.searchParams.has("/recs"), false);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].affinity, 0.62);
  assert.equal(entities[0].properties?.private_field, undefined);
});

test("upstream errors and invalid base URLs are surfaced without credential values", async () => {
  process.env.QLOO_API_KEY = "unit-test-secret";
  process.env.QLOO_BASE_URL = "https://hackathon.api.qloo.com";
  const failedFetcher: typeof fetch = async () => new Response(JSON.stringify({ message: "Invalid request" }), { status: 400 });
  await assert.rejects(() => searchQlooEntity({ name: "Bad", type: "brand" }, failedFetcher), /Qloo request failed \(400\): Invalid request/);
  process.env.QLOO_BASE_URL = "http://localhost:1234";
  await assert.rejects(() => searchQlooEntity({ name: "Bad", type: "brand" }, failedFetcher), /valid HTTPS origin/);
  if (priorKey === undefined) delete process.env.QLOO_API_KEY; else process.env.QLOO_API_KEY = priorKey;
  if (priorBase === undefined) delete process.env.QLOO_BASE_URL; else process.env.QLOO_BASE_URL = priorBase;
});

test("aborts a Qloo request that exceeds its timeout", async () => {
  process.env.QLOO_API_KEY = "unit-test-secret";
  process.env.QLOO_BASE_URL = "https://hackathon.api.qloo.com";
  const fetcher: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  });
  await assert.rejects(() => searchQlooEntity({ name: "Example", type: "artist" }, fetcher, 10), /request timeout/i);
  if (priorKey === undefined) delete process.env.QLOO_API_KEY; else process.env.QLOO_API_KEY = priorKey;
  if (priorBase === undefined) delete process.env.QLOO_BASE_URL; else process.env.QLOO_BASE_URL = priorBase;
});
