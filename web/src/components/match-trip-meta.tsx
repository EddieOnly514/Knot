import { Badge } from "@/components/ui/badge";

export function luggageLabel(spaceCapacity: number) {
  switch (spaceCapacity) {
    case 0:
      return "Personal item only";
    case 1:
      return "1 standard bag";
    case 2:
      return "2 standard bags";
    case 3:
      return "Oversized item";
    default:
      return "Luggage set";
  }
}

export function TripCardMeta({
  spaceCapacity,
  needsXl,
  savingsDollars,
}: {
  spaceCapacity: number;
  needsXl: boolean;
  savingsDollars: number;
}) {
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="rounded-full bg-white text-[11px] text-zinc-700"
        >
          {luggageLabel(spaceCapacity)}
        </Badge>
        {needsXl && (
          <Badge className="rounded-full border-0 bg-amber-100 text-[11px] text-amber-800">
            Uber XL
          </Badge>
        )}
      </div>
      <p className="text-[11px] font-medium text-blue-600">
        Est. savings ~${savingsDollars.toFixed(0)}
      </p>
    </div>
  );
}
