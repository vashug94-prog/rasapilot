import test from "node:test";
import assert from "node:assert/strict";
import { runPlanningAgent } from "../lib/agent";
import type { BriefInput, QlooEntity } from "../lib/types";

const brief: BriefInput = {
  businessType: "Cloud kitchen",
  city: "Mumbai, India",
  audience: "Curious young professionals",
  priceRange: "$$ · Everyday treat",
  dietaryConstraints: "Vegetarian options, no peanuts",
  cuisines: ["Maharashtrian", "Korean"],
  references: [{ name: "The Lunchbox", type: "movie" }, { name: "Mitski", type: "artist" }],
};

test("demo workflow returns three concepts and discloses fixture provenance", async () => {
  const steps: number[] = [];
  const plan = await runPlanningAgent(brief, step => steps.push(step), { hasCredentials: () => false });
  assert.equal(plan.mode, "demo");
  assert.match(plan.demoDisclosure ?? "", /not live Qloo results/i);
  assert.equal(plan.concepts.length, 3);
  assert.equal(plan.evidence.source, "Demonstration fixture");
  assert.ok(plan.evidence.places.every(place => place.entity_id.startsWith("demo:")));
  assert.ok(plan.concepts.every(concept => concept.rationale.includes("not live Qloo")));
  assert.ok(plan.concepts.every(concept => concept.constraints.some(note => note.includes("no peanuts"))));
  assert.deepEqual(steps, [0, 1, 2, 3, 4]);
});

test("live workflow resolves IDs before Insights and keeps generated ideas separate", async () => {
  const steps: number[] = [];
  const searches: string[] = [];
  let insightIds: string[] = [];
  const resolved = (name: string, type: string): QlooEntity[] => [{ entity_id: `urn:entity:${type}:resolved-${name.toLowerCase()}`, name, type: `urn:entity:${type}` }];
  const plan = await runPlanningAgent(brief, step => steps.push(step), {
    hasCredentials: () => true,
    search: async input => { searches.push(input.name); return resolved(input.name, input.type); },
    insights: async input => { insightIds = input.entityIds; return [{ entity_id: "urn:entity:place:live-1", name: "Qloo-returned café", type: "urn:entity:place", affinity: 0.74 }]; },
  });
  assert.equal(plan.mode, "live");
  assert.equal(plan.demoDisclosure, undefined);
  assert.deepEqual(searches, ["The Lunchbox", "Mitski"]);
  assert.equal(insightIds.length, 2);
  assert.ok(insightIds.every(id => id.includes("resolved-")));
  assert.equal(plan.evidence.places[0].affinity, 0.74);
  assert.ok(plan.concepts.every(concept => concept.rationale.includes("Qloo-returned café")));
  assert.deepEqual(steps, [0, 1, 2, 3, 4]);
});

test("unresolved references are excluded and empty evidence is stated plainly", async () => {
  const plan = await runPlanningAgent(brief, () => {}, {
    hasCredentials: () => true,
    search: async () => [],
    insights: async () => [],
  });
  assert.ok(plan.evidence.references.every(reference => reference.status === "unresolved"));
  assert.equal(plan.evidence.places.length, 0);
  assert.ok(plan.evidence.warnings.some(warning => warning.includes("No Qloo")));
  assert.ok(plan.concepts.every(concept => concept.rationale.includes("no place evidence")));
});
