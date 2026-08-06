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
}: {
  spaceCapacity: number;
  needsXl: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          variant="secondary"
          className="rounded-full border border-zinc-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-600 shadow-sm"
        >
          {luggageLabel(spaceCapacity)}
        </Badge>
        {needsXl && (
          <Badge className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
            Uber XL likely
          </Badge>
        )}
    </div>
  );
}
