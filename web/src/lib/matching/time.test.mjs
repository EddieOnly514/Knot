import assert from "node:assert/strict";
import test from "node:test";
import { classifyTimeCompatibility } from "./time.ts";

const minute = 60_000;
const windowAt = (startMinutes, endMinutes) => ({
    startMs: startMinutes * minute,
    endMs: endMinutes * minute,
});

test("matches 5 PM +/-120 with 3 PM +/-30 as an okay overlap", () => {
    const fivePmFlexible = windowAt(15 * 60, 19 * 60);
    const threePmFlexible = windowAt(14 * 60 + 30, 15 * 60 + 30);

    assert.deepEqual(classifyTimeCompatibility(fivePmFlexible, threePmFlexible), {
        timeTier: "OKAY",
        overlapMinutes: 30,
        gapMinutes: 0,
    });
});

test("classifies overlap boundaries", () => {
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 120), windowAt(60, 180)).timeTier,
        "STRONG"
    );
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 60), windowAt(30, 90)).timeTier,
        "OKAY"
    );
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 30), windowAt(29, 60)).timeTier,
        "WEAK"
    );
});

test("allows non-overlapping windows through the two-hour-per-party extension", () => {
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 60), windowAt(120, 180)).timeTier,
        "BORDERLINE"
    );
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 60), windowAt(121, 181)).timeTier,
        "LAST_RESORT"
    );
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 60), windowAt(300, 360)).timeTier,
        "LAST_RESORT"
    );
    assert.equal(
        classifyTimeCompatibility(windowAt(0, 60), windowAt(301, 361)).timeTier,
        null
    );
});

test("does not round a gap beyond four hours into eligibility", () => {
    const justOver = classifyTimeCompatibility(
        { startMs: 0, endMs: 60 * minute },
        { startMs: 300 * minute + 1_000, endMs: 360 * minute }
    );

    assert.equal(justOver.gapMinutes, 241);
    assert.equal(justOver.timeTier, null);
});
