import { REFERENCE_TYPES, type BriefInput, type ReferenceInput, type ReferenceType } from "./types";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function validateBrief(value: unknown): { ok: true; brief: BriefInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Send a business brief to create concepts." };
  const raw = value as Record<string, unknown>;
  const businessType = clean(raw.businessType, 80);
  const city = clean(raw.city, 120);
  const audience = clean(raw.audience, 180);
  const priceRange = clean(raw.priceRange, 80);
  if (!businessType) return { ok: false, error: "Choose a business type." };
  if (!city || city.length < 2) return { ok: false, error: "Add a city or region with at least two characters." };
  if (!audience || audience.length < 2) return { ok: false, error: "Describe the audience you want to reach." };
  if (!priceRange) return { ok: false, error: "Choose a price range." };
  const cuisines = Array.isArray(raw.cuisines) ? raw.cuisines.map(x => clean(x, 50)).filter(Boolean).slice(0, 8) : [];
  const rawRefs = Array.isArray(raw.references) ? raw.references : [];
  if (rawRefs.length > 8) return { ok: false, error: "Add up to eight cultural references." };
  const references: ReferenceInput[] = [];
  for (const item of rawRefs) {
    if (!item || typeof item !== "object") return { ok: false, error: "One of the cultural references is invalid." };
    const ref = item as Record<string, unknown>;
    const name = clean(ref.name, 100);
    const type = ref.type;
    if (!name) continue;
    if (typeof type !== "string" || !REFERENCE_TYPES.includes(type as ReferenceType)) return { ok: false, error: "A reference category is not supported." };
    references.push({ name, type: type as ReferenceType });
  }
  return { ok: true, brief: {
    businessType,
    city,
    audience,
    priceRange,
    dietaryConstraints: clean(raw.dietaryConstraints, 240),
    cuisines,
    references,
  } };
}
