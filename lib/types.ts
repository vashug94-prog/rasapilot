export const REFERENCE_TYPES = ["place", "brand", "artist", "movie"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];
export type Mode = "demo" | "live";

export interface ReferenceInput { name: string; type: ReferenceType }
export interface BriefInput {
  businessType: string;
  city: string;
  audience: string;
  priceRange: string;
  dietaryConstraints: string;
  cuisines: string[];
  references: ReferenceInput[];
}
export interface QlooEntity {
  entity_id: string;
  name: string;
  type: string;
  subtype?: string;
  affinity?: number;
  properties?: Record<string, unknown>;
  explainability?: unknown;
}
export interface ResolvedReference extends ReferenceInput {
  status: "resolved" | "unresolved";
  matches: QlooEntity[];
  selected?: QlooEntity;
}
export interface Evidence {
  mode: Mode;
  source: "Qloo live response" | "Demonstration fixture";
  references: ResolvedReference[];
  places: QlooEntity[];
  rawSummary: { searchQueries: number; insightsQuery: Record<string, string> };
  warnings: string[];
}
export interface Concept {
  id: string;
  name: string;
  format: string;
  positioning: string;
  audience: string;
  rationale: string;
  menuDirection: string[];
  constraints: string[];
  operationalLift: "Light" | "Medium" | "Ambitious";
  experiment: string;
}
export interface LaunchPlan {
  brandDirection: string;
  marketingAngles: string[];
  sampleSocial: string;
  nextSteps: string[];
}
export interface PlanResponse {
  mode: Mode;
  demoDisclosure?: string;
  steps: string[];
  evidence: Evidence;
  concepts: Concept[];
  launchPlan: LaunchPlan;
}

export const QLOO_TYPES: Record<ReferenceType, string> = {
  place: "urn:entity:place",
  brand: "urn:entity:brand",
  artist: "urn:entity:artist",
  movie: "urn:entity:movie",
};
