import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/plan/route";

test("planning endpoint streams each agent stage and a complete result", async () => {
  const prior = process.env.QLOO_API_KEY;
  const priorDemo = process.env.QLOO_DEMO_MODE;
  delete process.env.QLOO_API_KEY;
  delete process.env.QLOO_DEMO_MODE;
  const request = new Request("http://localhost/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessType: "Restaurant", city: "Chennai", audience: "Weekend diners", priceRange: "$$",
      dietaryConstraints: "Vegetarian", cuisines: ["Tamil"], references: [],
    }),
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") ?? "", /text\/event-stream/);
  const body = await response.text();
  assert.equal((body.match(/event: progress/g) ?? []).length, 5);
  assert.match(body, /event: result/);
  const resultBlock = body.split(/\r?\n\r?\n/).find(block => block.startsWith("event: result"));
  assert.ok(resultBlock);
  const json = JSON.parse(resultBlock!.split("\n").find(line => line.startsWith("data:"))!.slice(5));
  assert.equal(json.concepts.length, 3);
  assert.equal(json.mode, "demo");
  assert.match(json.demoDisclosure, /not live Qloo results/i);
  if (prior === undefined) delete process.env.QLOO_API_KEY; else process.env.QLOO_API_KEY = prior;
  if (priorDemo === undefined) delete process.env.QLOO_DEMO_MODE; else process.env.QLOO_DEMO_MODE = priorDemo;
});

test("planning endpoint rejects incomplete briefs before starting the agent", async () => {
  const response = await POST(new Request("http://localhost/api/plan", { method: "POST", body: JSON.stringify({ city: "" }) }));
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /business type/i);
});
