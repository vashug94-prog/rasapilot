import { demoEvidence, DEMO_DISCLOSURE } from "./demo-fixtures";
import { getQlooPlaceInsights, hasQlooCredentials, QlooError, searchQlooEntity } from "./qloo";
import type { BriefInput, Concept, Evidence, PlanResponse, QlooEntity, ResolvedReference } from "./types";

const defaultSteps = [
  "Interpret the business brief and constraints",
  "Resolve cultural references to Qloo entities",
  "Discover local place signals through Qloo Insights",
  "Check feasibility and draft three alternatives",
  "Build a practical launch experiment",
];

function selectedNames(evidence: Evidence) {
  const found = evidence.references.flatMap(reference => reference.selected ? [reference.selected.name] : []);
  return found.slice(0, 3);
}

function placeNames(evidence: Evidence) { return evidence.places.slice(0, 3).map(place => place.name); }

function rationaleFor(brief: BriefInput, evidence: Evidence, angle: string) {
  const seeds = selectedNames(evidence);
  const places = placeNames(evidence);
  const cuisine = brief.cuisines.length ? brief.cuisines.join(" × ") : "your regional food point of view";
  const isDemo = evidence.mode === "demo";
  const seedLine = seeds.length
    ? isDemo ? `The demonstration fixture includes the reference${seeds.length > 1 ? "s" : ""} ${seeds.join(", ")}; these are not live Qloo matches.` : `Your Qloo-resolved reference${seeds.length > 1 ? "s" : ""} — ${seeds.join(", ")} — shaped this direction.`
    : "No named reference resolved, so this direction starts from the audience, place and cuisine brief.";
  const placeLine = places.length
    ? isDemo ? `Illustrative demo place rows include ${places.join(", ")}; they are not Qloo results.` : `Qloo Insights returned local place entities including ${places.join(", ")}; this is a discovery signal, not proof of menu demand.`
    : isDemo ? "There are no place rows in this fixture." : "Qloo returned no local place entities for this query, so there is no place evidence to cite.";
  const modeLine = isDemo ? "Demonstration fixture evidence only." : "Based on the Qloo response for this run.";
  return `${angle} ${seedLine} ${placeLine} ${modeLine} The menu translation uses ${cuisine} as a creative direction, not as a Qloo-verified cuisine affinity.`;
}

function constraintChecks(brief: BriefInput): string[] {
  const list: string[] = [];
  list.push(`Designed for ${brief.priceRange} pricing; validate ingredient and packaging costs before publishing.`);
  if (brief.dietaryConstraints) list.push(`Briefed constraint: ${brief.dietaryConstraints}. Confirm recipes, allergen handling and cross-contact with the kitchen team.`);
  else list.push("No dietary constraints were entered; label allergens and provide an accessible alternative.");
  list.push("Keep the pilot to shared components so the kitchen can test demand without adding a full new station.");
  return list;
}

function makeConcepts(brief: BriefInput, evidence: Evidence): Concept[] {
  const anchor = brief.cuisines[0] || "regional comfort food";
  const secondary = brief.cuisines[1] || "a familiar neighborhood favorite";
  const audience = brief.audience;
  const shared = constraintChecks(brief);
  const price = brief.priceRange;
  return [
    {
      id: "signature",
      name: "The Local Signature",
      format: "A recognizable classic, with one thoughtful twist",
      positioning: `A signature ${anchor} plate for ${audience}, rooted in a flavor people already know.`,
      audience,
      rationale: rationaleFor(brief, evidence, "The safest opening move is a clear regional anchor with an ownable detail."),
      menuDirection: [`One hero ${anchor} bowl or plate`, "One vegetarian build using the same base", "A small add-on or drink that lifts the ticket without slowing service"],
      constraints: shared,
      operationalLift: "Light",
      experiment: "Run a 2-day, 40-portion drop against the current best seller. Track sell-through, contribution margin and second-choice feedback before expanding.",
    },
    {
      id: "crossover",
      name: "The Culture Crossover",
      format: "A limited fusion special for curious regulars",
      positioning: `Pair ${anchor} with a cue from ${secondary} in a format that is easy to understand at first glance.`,
      audience: `${audience} who like trying something new when the familiar flavors are still visible.`,
      rationale: rationaleFor(brief, evidence, "This option makes room for a bolder cultural bridge while keeping a familiar entry point."),
      menuDirection: [`A seasonal ${anchor} × ${secondary} special`, "One mild and one more expressive sauce path", "A short story card naming the ingredients and inspiration respectfully"],
      constraints: [...shared, "Describe the inspiration as a creative interpretation; avoid claiming cultural authenticity without community input."],
      operationalLift: "Medium",
      experiment: "Offer the special as a preorder add-on for one weekend. Compare attach rate and customer comments with the signature plate; invite a local cook or community member to review the story.",
    },
    {
      id: "social",
      name: "The Shared Table Drop",
      format: "A small-format tasting box made to travel and share",
      positioning: `A social-first tasting set that lets ${audience} sample a few regional notes in one order.`,
      audience: `Small groups and solo diners in ${audience} looking for an easy discovery occasion.`,
      rationale: rationaleFor(brief, evidence, "A sampler turns discovery into a low-commitment occasion and creates clear feedback on what should stay."),
      menuDirection: [`Three mini portions built from ${anchor} prep`, "One plant-forward component where practical", "A printed tasting map with a simple reorder prompt"],
      constraints: [...shared, "Check that the packaging protects texture and separates allergens during delivery."],
      operationalLift: "Ambitious",
      experiment: "Cap a single Friday batch at 25 boxes. Use a QR poll to ask for one favorite, one skip and a fair price; repeat only if margin and completion rate both clear your target.",
    },
  ];
}

function launchPlan(brief: BriefInput, evidence: Evidence): PlanResponse["launchPlan"] {
  const seed = selectedNames(evidence)[0];
  const city = brief.city.split(",")[0];
  return {
    brandDirection: `Warm neighborhood confidence: tactile paper, a deep leaf-green base and one bright citrus accent. Use ingredient names before trend language; tell the story of ${brief.cuisines[0] || "the regional kitchen"} with care.`,
    marketingAngles: [
      `Local-first: “A new ${city} favorite, tested at the table before it hits the menu.”`,
      `Culture-led: explain the ingredients and the people behind the inspiration; keep the cultural reference as context, not decoration${seed ? ` (the brief included ${seed})` : ""}.`,
      `Value-led: show the portion, price and what makes the dish worth a repeat order.`,
    ],
    sampleSocial: `Meet the first RasaPilot test: ${brief.cuisines[0] || "a local favorite"}, made for ${brief.audience}. We’re serving a small batch in ${city} this weekend. Tell us what you’d bring back, what you’d change and what feels like a fair price. Limited run; honest feedback welcome.`,
    nextSteps: [
      "Cost the leading recipe and confirm allergen controls with the kitchen.",
      "Taste-test the story and dish with 5–8 people from the intended audience.",
      "Set a portion cap, price, sell-through target and feedback question before launch.",
      "Review margin and comments together; keep, revise or retire the concept after the pilot.",
    ],
  };
}

function makeEvidence(brief: BriefInput, refs: ResolvedReference[], places: QlooEntity[], warnings: string[]): Evidence {
  return {
    mode: "live",
    source: "Qloo live response",
    references: refs,
    places,
    rawSummary: {
      searchQueries: brief.references.length,
      insightsQuery: {
        "filter.type": "urn:entity:place",
        "filter.location.query": brief.city,
        "signal.location.query": brief.city,
        "take": "8",
        ...(refs.flatMap(ref => ref.selected ? [ref.selected.entity_id] : []).length ? { "signal.interests.entities": refs.flatMap(ref => ref.selected ? [ref.selected.entity_id] : []).join(",") } : {}),
      },
    },
    warnings,
  };
}

export async function runPlanningAgent(
  brief: BriefInput,
  onStep: (step: number) => void = () => {},
  dependencies: {
    hasCredentials?: () => boolean;
    search?: typeof searchQlooEntity;
    insights?: typeof getQlooPlaceInsights;
  } = {},
): Promise<PlanResponse> {
  onStep(0);
  let evidence: Evidence;
  const live = dependencies.hasCredentials?.() ?? hasQlooCredentials();
  onStep(1);
  if (!live) {
    evidence = demoEvidence(brief);
    onStep(2);
  } else {
    const warnings: string[] = [];
    const resolved = await Promise.all(brief.references.map(async reference => {
      const matches = await (dependencies.search ?? searchQlooEntity)(reference);
      const selected = matches[0];
      return { ...reference, status: selected ? "resolved" as const : "unresolved" as const, matches, ...(selected ? { selected } : {}) };
    }));
    const entityIds = resolved.flatMap(reference => reference.selected ? [reference.selected.entity_id] : []);
    onStep(2);
    const places = await (dependencies.insights ?? getQlooPlaceInsights)({ city: brief.city, entityIds });
    for (const reference of resolved) if (reference.status === "unresolved") warnings.push(`No Qloo ${reference.type} entity matched “${reference.name}”. It was left out of the Insights request.`);
    if (!places.length) warnings.push("Qloo returned no place entities for this city and signal combination. Concepts use the brief only.");
    evidence = makeEvidence(brief, resolved, places, warnings);
  }
  onStep(3);
  const concepts = makeConcepts(brief, evidence);
  onStep(4);
  return {
    mode: evidence.mode,
    ...(evidence.mode === "demo" ? { demoDisclosure: DEMO_DISCLOSURE } : {}),
    steps: defaultSteps,
    evidence,
    concepts,
    launchPlan: launchPlan(brief, evidence),
  };
}

export function safeAgentError(error: unknown) {
  if (error instanceof QlooError) return { status: error.status && error.status >= 400 && error.status < 500 ? error.status : 502, message: error.message };
  return { status: 500, message: "The planning run could not be completed. Please try again." };
}
