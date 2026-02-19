"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletedRides } from "@/lib/services/rideService";
import type { CompletedRide } from "@/lib/services/rideService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageSquare,
  CheckCircle,
  Navigation,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function HistoryPage() {
  const { profile, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<CompletedRide[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user || !profile) return;
    try {
      const data = await getCompletedRides(profile.id);
      setRides(data);
    } catch (err) {
      console.error("[HistoryPage] Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchHistory();
    }
  }, [authLoading, user, fetchHistory]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ride history"
        subtitle="Your completed rides"
        backHref="/home"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-500">Loading ride history...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <Navigation className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-900">
            No completed rides yet
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Once you complete a ride, it will show up here.
          </p>
          <Button
            className="mt-5 h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={() => router.push("/post")}
          >
            Post a ride
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            {rides.length} completed {rides.length === 1 ? "ride" : "rides"}
          </p>

          {rides.map((ride) => (
            <Card
              key={ride.request_id}
              className="border border-zinc-200 bg-white shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Partner avatar */}
                  <Avatar
                    className="h-10 w-10 cursor-pointer"
                    onClick={() =>
                      router.push(`/profile/${ride.partner_profile_id}`)
                    }
                  >
                    <AvatarImage src={ride.partner_photo || undefined} />
                    <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                      {ride.partner_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Ride info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900">
                        {ride.partner_name}
                      </span>
                      {ride.partner_school && (
                        <span className="text-xs text-zinc-500">
                          {ride.partner_school}
                        </span>
                      )}
                    </div>

                    {/* Route */}
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="truncate text-xs text-zinc-700">
                          {ride.my_origin}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="truncate text-xs text-zinc-700">
                          {ride.my_dest}
                        </span>
                      </div>
                    </div>

                    {/* Date + status */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ride.departure_earliest && (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-zinc-100 text-[11px] font-normal text-zinc-600"
                        >
                          <CalendarDays className="mr-1 h-3 w-3" />
                          {formatDate(ride.departure_earliest)}
                        </Badge>
                      )}
                      <Badge className="border-0 bg-emerald-50 text-[11px] text-emerald-700">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    </div>
                  </div>

                  {/* View chat */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-8 shrink-0 text-xs"
                    onClick={() => router.push(`/messages/${ride.request_id}`)}
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    View chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
