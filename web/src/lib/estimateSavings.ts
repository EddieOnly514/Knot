/**
 * Estimate trip distance (miles) from origin/dest names for savings display.
 * Uses common route keywords; fallback for unknown routes.
 */
function estimateTripMiles(origin: string, dest: string): number {
  const o = (origin || "").toLowerCase();
  const d = (dest || "").toLowerCase();
  const has = (s: string, ...terms: string[]) =>
    terms.some((t) => s.includes(t));

  // LAX area
  const fromLax = has(o, "lax", "los angeles international");
  const toLax = has(d, "lax", "los angeles international");
  if (fromLax || toLax) {
    const other = fromLax ? d : o;
    if (has(other, "uci", "irvine", "orange county")) return 45;
    if (has(other, "sna", "santa ana", "john wayne")) return 40;
    if (has(other, "ucla", "westwood", "la")) return 18;
    if (has(other, "usc", "downtown la")) return 18;
    if (has(other, "berkeley", "oakland", "sf", "san francisco")) return 45;
    return 42; // default airport run
  }

  // SNA / John Wayne
  const fromSna = has(o, "sna", "john wayne", "santa ana airport");
  const toSna = has(d, "sna", "john wayne", "santa ana airport");
  if (fromSna || toSna) {
    const other = fromSna ? d : o;
    if (has(other, "uci", "irvine")) return 8;
    if (has(other, "lax")) return 40;
    return 25;
  }

  // SFO
  const fromSfo = has(o, "sfo", "san francisco international");
  const toSfo = has(d, "sfo", "san francisco international");
  if (fromSfo || toSfo) {
    const other = fromSfo ? d : o;
    if (has(other, "berkeley", "oakland")) return 22;
    if (has(other, "stanford", "palo alto")) return 25;
    if (has(other, "san jose", "sjc")) return 35;
    return 28;
  }

  // Generic "airport" without specific code
  if (has(o, "airport") || has(d, "airport")) return 35;

  // Default for unknown routes (e.g. local)
  return 25;
}

/** Rideshare cost per mile (SoCal/typical), used for savings estimate. */
const DOLLARS_PER_MILE = 2.75;
/** Split between 2 people. */
const SPLIT_FACTOR = 2;

/**
 * Estimate savings in dollars when carpooling vs solo rideshare.
 * Based on estimated trip distance and typical rideshare pricing; split between 2 people.
 */
export function estimateSavingsDollars(
  originName: string,
  destName: string
): number {
  const miles = estimateTripMiles(originName, destName);
  const totalRideshareCost = miles * DOLLARS_PER_MILE;
  const savingsPerPerson = totalRideshareCost / SPLIT_FACTOR;
  const clamped = Math.max(15, Math.min(85, savingsPerPerson));
  return Math.round(clamped * 2) / 2; // round to nearest 0.5
}
