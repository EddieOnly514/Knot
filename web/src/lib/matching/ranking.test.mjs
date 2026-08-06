import assert from "node:assert/strict";
import test from "node:test";
import { compareBestMatches, hideLastResortWhenBetter } from "./ranking.ts";

const candidate = (overrides = {}) => ({
  time_tier: "OKAY",
  d_origin_tier: "NEAR",
  d_destination_tier: "VERY_CLOSE",
  d_origin_miles: 0.8,
  d_destination_miles: 0.8,
  gender_compatible: true,
  pref_overall: 0.5,
  ...overrides,
});

test("time compatibility outranks preferences and raw distance", () => {
  const strongFar = candidate({
    time_tier: "STRONG",
    d_origin_tier: "OKAY",
    d_destination_tier: "NEARBY",
    d_origin_miles: 1.9,
    d_destination_miles: 1.9,
    pref_overall: 0,
  });
  const okayClose = candidate({
    time_tier: "OKAY",
    d_origin_tier: "CLOSE",
    d_destination_tier: "SAME_AREA",
    d_origin_miles: 0.1,
    d_destination_miles: 0.1,
    pref_overall: 1,
  });

  assert.ok(compareBestMatches(strongFar, okayClose) < 0);
});

test("balanced distance ranks ahead of a candidate far on one end", () => {
  const balanced = candidate({
    d_origin_tier: "NEAR",
    d_destination_tier: "VERY_CLOSE",
  });
  const oneFar = candidate({
    d_origin_tier: "CLOSE",
    d_destination_tier: "NEARBY",
  });

  assert.ok(compareBestMatches(balanced, oneFar) < 0);
});

test("gender compatibility is applied before minor preference signals", () => {
  const compatible = candidate({ gender_compatible: true, pref_overall: 0 });
  const mismatch = candidate({ gender_compatible: false, pref_overall: 1 });

  assert.ok(compareBestMatches(compatible, mismatch) < 0);
});

test("last-resort candidates appear only when no better tier remains", () => {
  const mixed = [candidate({ time_tier: "LAST_RESORT" }), candidate({ time_tier: "WEAK" })];
  assert.deepEqual(hideLastResortWhenBetter(mixed).map((match) => match.time_tier), ["WEAK"]);

  const lastOnly = [candidate({ time_tier: "LAST_RESORT" })];
  assert.equal(hideLastResortWhenBetter(lastOnly).length, 1);
});

