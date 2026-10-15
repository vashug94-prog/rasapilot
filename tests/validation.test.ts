import test from "node:test";
import assert from "node:assert/strict";
import { validateBrief } from "../lib/validation";

const validBrief = {
  businessType: "Cloud kitchen",
  city: "Mumbai, India",
  audience: "Curious young professionals",
  priceRange: "$$ · Everyday treat",
  dietaryConstraints: "Vegetarian options, no peanuts",
  cuisines: ["Maharashtrian", "Korean"],
  references: [{ name: "The Lunchbox", type: "movie" }],
};

test("validates and normalizes a complete business brief", () => {
  const result = validateBrief(validBrief);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.brief.city, "Mumbai, India");
    assert.equal(result.brief.references[0].type, "movie");
    assert.deepEqual(result.brief.cuisines, ["Maharashtrian", "Korean"]);
  }
});

test("rejects missing required fields and unsupported reference types", () => {
  assert.equal(validateBrief({ ...validBrief, city: " " }).ok, false);
  assert.equal(validateBrief({ ...validBrief, references: [{ name: "Anything", type: "urn:entity:place" }] }).ok, false);
  assert.equal(validateBrief({ ...validBrief, references: Array.from({ length: 9 }, () => ({ name: "x", type: "brand" })) }).ok, false);
});

test("accepts an empty reference list and bounds user supplied text", () => {
  const result = validateBrief({ ...validBrief, references: [], dietaryConstraints: "x".repeat(500), cuisines: Array(12).fill("Spice") });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.brief.dietaryConstraints.length, 240);
    assert.equal(result.brief.cuisines.length, 8);
  }
});
