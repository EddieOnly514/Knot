export const EXTENDED_MATCH_GAP_MINUTES = 240;

export type MatchTimeTier =
    | "STRONG"
    | "OKAY"
    | "WEAK"
    | "BORDERLINE"
    | "LAST_RESORT";

export interface TimeWindow {
    startMs: number;
    endMs: number;
}

export interface TimeCompatibility {
    timeTier: MatchTimeTier | null;
    overlapMinutes: number;
    gapMinutes: number;
}

/**
 * Classify two posted departure windows. Extending both windows by two hours
 * means their original windows can be at most four hours apart.
 */
export function classifyTimeCompatibility(
    first: TimeWindow,
    second: TimeWindow
): TimeCompatibility {
    const overlapMinutes = Math.max(
        0,
        Math.floor(
            (Math.min(first.endMs, second.endMs) -
                Math.max(first.startMs, second.startMs)) /
                60_000
        )
    );

    const gapMinutes =
        overlapMinutes > 0
            ? 0
            : Math.max(
                  0,
                  Math.ceil(
                      (Math.max(first.startMs, second.startMs) -
                          Math.min(first.endMs, second.endMs)) /
                          60_000
                  )
              );

    let timeTier: MatchTimeTier | null;
    if (overlapMinutes >= 60) timeTier = "STRONG";
    else if (overlapMinutes >= 30) timeTier = "OKAY";
    else if (overlapMinutes >= 1) timeTier = "WEAK";
    else if (gapMinutes <= 60) timeTier = "BORDERLINE";
    else if (gapMinutes <= EXTENDED_MATCH_GAP_MINUTES) timeTier = "LAST_RESORT";
    else timeTier = null;

    return { timeTier, overlapMinutes, gapMinutes };
}
