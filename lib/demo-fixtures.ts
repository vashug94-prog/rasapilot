import type { BriefInput, Evidence, QlooEntity, ResolvedReference } from "./types";

const references: Record<string, QlooEntity> = {
  "the bombay canteen": { entity_id: "demo:place:bombay-canteen", name: "The Bombay Canteen", type: "urn:entity:place", properties: { city: "Mumbai" } },
  "dishoom": { entity_id: "demo:place:dishoom", name: "Dishoom", type: "urn:entity:place", properties: { city: "London" } },
  "tame impala": { entity_id: "demo:artist:tame-impala", name: "Tame Impala", type: "urn:entity:artist" },
  "mitski": { entity_id: "demo:artist:mitski", name: "Mitski", type: "urn:entity:artist" },
  "blue tokai": { entity_id: "demo:brand:blue-tokai", name: "Blue Tokai", type: "urn:entity:brand" },
  "the lunchbox": { entity_id: "demo:movie:the-lunchbox", name: "The Lunchbox", type: "urn:entity:movie" },
};

export function demoEvidence(brief: BriefInput): Evidence {
  const resolved: ResolvedReference[] = brief.references.map(reference => {
    const match = references[reference.name.toLowerCase()];
    const type = `urn:entity:${reference.type}`;
    const selected = match?.type === type ? match : undefined;
    return { ...reference, status: selected ? "resolved" : "unresolved", matches: selected ? [selected] : [], selected };
  });
  const city = brief.city.split(",")[0].trim();
  const places: QlooEntity[] = [
    { entity_id: "demo:place:monsoon-table", name: `Monsoon Table · ${city}`, type: "urn:entity:place", properties: { city, category: "modern regional kitchen", demonstration: true } },
    { entity_id: "demo:place:little-lime", name: `Little Lime · ${city}`, type: "urn:entity:place", properties: { city, category: "neighborhood café", demonstration: true } },
    { entity_id: "demo:place:house-of-rice", name: `House of Rice · ${city}`, type: "urn:entity:place", properties: { city, category: "casual dining", demonstration: true } },
  ];
  return {
    mode: "demo",
    source: "Demonstration fixture",
    references: resolved,
    places,
    rawSummary: { searchQueries: brief.references.length, insightsQuery: { "filter.type": "urn:entity:place", "filter.location.query": brief.city, take: "8" } },
    warnings: [],
  };
}

export const DEMO_DISCLOSURE = "DEMO MODE · These sample entities are illustrative fixtures, not live Qloo results. Add a QLOO_API_KEY on the server to switch to real Qloo requests.";
