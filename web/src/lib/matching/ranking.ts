import type { MatchCandidate, TimeTier } from "@/types";

export const TIME_TIER_ORDER: Record<TimeTier, number> = {
  STRONG: 0,
  OKAY: 1,
  WEAK: 2,
  BORDERLINE: 3,
  LAST_RESORT: 4,
};

export function distanceBucket(match: MatchCandidate) {
  const origin = match.d_origin_tier === "CLOSE" ? 0 : match.d_origin_tier === "NEAR" ? 1 : 2;
  const destination =
    match.d_destination_tier === "SAME_AREA"
      ? 0
      : match.d_destination_tier === "VERY_CLOSE"
        ? 1
        : 2;

  return {
    worst: Math.max(origin, destination),
    total: origin + destination,
  };
}

export function compareBestMatches(a: MatchCandidate, b: MatchCandidate) {
  const aDistance = distanceBucket(a);
  const bDistance = distanceBucket(b);
  const aMiles = (a.d_origin_miles ?? 2) + (a.d_destination_miles ?? 2);
  const bMiles = (b.d_origin_miles ?? 2) + (b.d_destination_miles ?? 2);

  return (
    TIME_TIER_ORDER[a.time_tier] - TIME_TIER_ORDER[b.time_tier]
    || aDistance.worst - bDistance.worst
    || aDistance.total - bDistance.total
    || Number(b.gender_compatible) - Number(a.gender_compatible)
    || b.pref_overall - a.pref_overall
    || aMiles - bMiles
  );
}

export function hideLastResortWhenBetter<T extends Pick<MatchCandidate, "time_tier">>(matches: T[]) {
  return matches.some((match) => match.time_tier !== "LAST_RESORT")
    ? matches.filter((match) => match.time_tier !== "LAST_RESORT")
    : matches;
}

