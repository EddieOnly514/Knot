import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { MatchCandidate, MatchMemberSummary, TimeTier } from "@/types";

type RideRow = {
    id: string;
    user_id: string;
    ride_type: string;
    origin_name: string;
    origin_lat: number;
    origin_lng: number;
    dest_name: string;
    dest_lat: number;
    dest_lng: number;
    departure_earliest: string;
    departure_latest: string;
    departure_preferred: string | null;
    seats_needed: number;
    space_capacity: number;
    gender_pref: string;
    quiet_ride: boolean;
    music_ok: boolean;
    notes: string | null;
    status: string;
};

type ProfileRow = {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    photo_url: string | null;
    bio: string | null;
    school: string | null;
    conversation_pref: string | null;
};

type RideRequestRow = {
    ride_id: string;
    requester_ride_id: string;
    status: string;
    created_at: string;
};

type RideGroupRow = {
    id: string;
    ride_id: string;
};

type GroupSnapshot = {
    hostRide: RideRow;
    rideGroupId: string | null;
    members: Array<RideRow & { profile: ProfileRow | undefined }>;
    intervalStartMs: number;
    intervalEndMs: number;
    intervalMinutes: number;
    effectiveDate: string;
    originCentroidLat: number;
    originCentroidLng: number;
    totalSeats: number;
    totalBags: number;
    hasOversized: boolean;
};

function getAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing Supabase env vars.");
    }
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadiusMiles = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
    return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function luggageUnits(spaceCapacity: number) {
    switch (spaceCapacity) {
        case 1:
            return 1;
        case 2:
            return 2;
        default:
            return 0;
    }
}

function effectiveDateFromRide(ride: RideRow) {
    return new Date(ride.departure_preferred ?? ride.departure_earliest)
        .toISOString()
        .slice(0, 10);
}

function deriveTimeTier(
    myGroup: GroupSnapshot,
    candidate: GroupSnapshot
): { timeTier: TimeTier | null; overlapMinutes: number; gapMinutes: number } {
    const overlapMinutes = Math.max(
        0,
        Math.floor(
            (Math.min(myGroup.intervalEndMs, candidate.intervalEndMs) -
                Math.max(myGroup.intervalStartMs, candidate.intervalStartMs)) /
                60000
        )
    );

    const gapMinutes =
        overlapMinutes > 0
            ? 0
            : Math.max(
                  0,
                  Math.floor(
                      (Math.max(myGroup.intervalStartMs, candidate.intervalStartMs) -
                          Math.min(myGroup.intervalEndMs, candidate.intervalEndMs)) /
                          60000
                  )
              );

    const narrowWindowFloor =
        gapMinutes <= 180 &&
        Math.min(myGroup.intervalMinutes, candidate.intervalMinutes) < 30;

    let timeTier: TimeTier | null = null;
    if (overlapMinutes >= 60) timeTier = "STRONG";
    else if (overlapMinutes >= 30) timeTier = "OKAY";
    else if (overlapMinutes >= 1) timeTier = "WEAK";
    else if (narrowWindowFloor) timeTier = "WEAK";
    else if (gapMinutes <= 60) timeTier = "BORDERLINE";
    else if (gapMinutes <= 180) timeTier = "LAST_RESORT";

    return { timeTier, overlapMinutes, gapMinutes };
}

function buildGroupSnapshot(
    hostRideId: string,
    ridesById: Map<string, RideRow>,
    profilesById: Map<string, ProfileRow>,
    acceptedByHost: Map<string, string[]>,
    rideGroupIdsByHost: Map<string, string>
): GroupSnapshot | null {
    const hostRide = ridesById.get(hostRideId);
    if (!hostRide) return null;

    const memberRideIds = [hostRideId, ...(acceptedByHost.get(hostRideId) ?? [])];
    const members = memberRideIds
        .map((rideId) => {
            const ride = ridesById.get(rideId);
            if (!ride) return null;
            return {
                ...ride,
                profile: profilesById.get(ride.user_id),
            };
        })
        .filter(Boolean) as Array<RideRow & { profile: ProfileRow | undefined }>;

    const intervalStartMs = Math.max(
        ...members.map((member) => new Date(member.departure_earliest).getTime())
    );
    const intervalEndMs = Math.min(
        ...members.map((member) => new Date(member.departure_latest).getTime())
    );

    const originCentroidLat =
        members.reduce((sum, member) => sum + member.origin_lat, 0) / members.length;
    const originCentroidLng =
        members.reduce((sum, member) => sum + member.origin_lng, 0) / members.length;

    const totalSeats = members.reduce((sum, member) => sum + member.seats_needed, 0);
    const totalBags = members.reduce(
        (sum, member) => sum + luggageUnits(member.space_capacity),
        0
    );

    return {
        hostRide,
        rideGroupId: rideGroupIdsByHost.get(hostRideId) ?? null,
        members,
        intervalStartMs,
        intervalEndMs,
        intervalMinutes: Math.max(0, Math.floor((intervalEndMs - intervalStartMs) / 60000)),
        effectiveDate: effectiveDateFromRide(
            members.reduce((latest, member) => {
                const latestTime = new Date(
                    latest.departure_preferred ?? latest.departure_earliest
                ).getTime();
                const memberTime = new Date(
                    member.departure_preferred ?? member.departure_earliest
                ).getTime();
                return memberTime > latestTime ? member : latest;
            }, members[0])
        ),
        originCentroidLat,
        originCentroidLng,
        totalSeats,
        totalBags,
        hasOversized: members.some((member) => member.space_capacity === 3),
    };
}

function timeTierRank(timeTier: TimeTier) {
    switch (timeTier) {
        case "STRONG":
            return 1;
        case "OKAY":
            return 2;
        case "WEAK":
            return 3;
        case "BORDERLINE":
            return 4;
        default:
            return 5;
    }
}

function originTier(distance: number): MatchCandidate["d_origin_tier"] {
    if (distance <= 0.5) return "CLOSE";
    if (distance <= 1.0) return "NEAR";
    return "OKAY";
}

function destinationTier(distance: number): MatchCandidate["d_destination_tier"] {
    if (distance <= 0.5) return "SAME_AREA";
    if (distance <= 1.0) return "VERY_CLOSE";
    return "NEARBY";
}

function toMemberSummary(
    member: RideRow & { profile: ProfileRow | undefined }
): MatchMemberSummary {
    return {
        ride_id: member.id,
        user_id: member.user_id,
        first_name: member.profile?.first_name ?? "Unknown",
        last_name: member.profile?.last_name ?? "",
        photo_url: member.profile?.photo_url ?? null,
        school: member.profile?.school ?? null,
        origin_name: member.origin_name,
        dest_name: member.dest_name,
        departure_earliest: member.departure_earliest,
        departure_latest: member.departure_latest,
        departure_preferred: member.departure_preferred,
        seats_needed: member.seats_needed,
        space_capacity: member.space_capacity,
        gender_pref: member.gender_pref,
        quiet_ride: member.quiet_ride,
        music_ok: member.music_ok,
    };
}

export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const rideId = request.nextUrl.searchParams.get("rideId");
        const maxResults = Number.parseInt(
            request.nextUrl.searchParams.get("maxResults") ?? "10",
            10
        );

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required" }, { status: 400 });
        }

        const supabase = getAdmin();

        const [{ data: rides }, { data: profiles }, { data: rideRequests }, { data: rideGroups }] =
            await Promise.all([
                supabase
                    .from("rides")
                    .select(
                        "id,user_id,ride_type,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,departure_earliest,departure_latest,departure_preferred,seats_needed,space_capacity,gender_pref,quiet_ride,music_ok,notes,status"
                    )
                    .eq("status", "active")
                    .eq("ride_type", "seeking"),
                supabase
                    .from("profiles")
                    .select(
                        "id,user_id,first_name,last_name,photo_url,bio,school,conversation_pref"
                    ),
                supabase
                    .from("ride_requests")
                    .select("ride_id,requester_ride_id,status,created_at"),
                supabase.from("ride_groups").select("id,ride_id"),
            ]);

        const allRides = ((rides ?? []) as RideRow[]).filter(
            (ride) =>
                ride.origin_lat != null &&
                ride.origin_lng != null &&
                ride.dest_lat != null &&
                ride.dest_lng != null
        );
        const myRide = allRides.find((ride) => ride.id === rideId);
        if (!myRide) {
            return NextResponse.json(
                { error: "Ride not found or inactive" },
                { status: 404 }
            );
        }

        const ridesById = new Map(allRides.map((ride) => [ride.id, ride]));
        const profilesById = new Map(
            ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
        );
        const requests = (rideRequests ?? []) as RideRequestRow[];
        const groups = (rideGroups ?? []) as RideGroupRow[];
        const rideGroupIdsByHost = new Map(groups.map((group) => [group.ride_id, group.id]));

        const acceptedByHost = new Map<string, string[]>();
        const hostByRequester = new Map<string, string>();
        for (const req of requests.filter((req) => req.status === "accepted")) {
            hostByRequester.set(req.requester_ride_id, req.ride_id);
            acceptedByHost.set(req.ride_id, [
                ...(acceptedByHost.get(req.ride_id) ?? []),
                req.requester_ride_id,
            ]);
        }

        const myHostRideId =
            rideGroupIdsByHost.has(myRide.id) || !hostByRequester.has(myRide.id)
                ? myRide.id
                : hostByRequester.get(myRide.id)!;

        const myProfile = profilesById.get(myRide.user_id);
        const myGroup = buildGroupSnapshot(
            myHostRideId,
            ridesById,
            profilesById,
            acceptedByHost,
            rideGroupIdsByHost
        );

        if (!myGroup) {
            return NextResponse.json({ error: "Unable to build ride group" }, { status: 500 });
        }

        const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentPairBlocked = (candidateRideId: string) =>
            requests.some((req) => {
                const createdAt = new Date(req.created_at).getTime();
                if (createdAt <= recentCutoff) return false;
                return (
                    (req.ride_id === myRide.id && req.requester_ride_id === candidateRideId) ||
                    (req.ride_id === candidateRideId && req.requester_ride_id === myRide.id)
                );
            });

        const hostIds = new Set<string>();
        for (const ride of allRides) {
            if (ride.id === myRide.id) continue;
            if (ride.user_id === myRide.user_id) continue;
            if (recentPairBlocked(ride.id)) continue;
            const hostId =
                rideGroupIdsByHost.has(ride.id) || !hostByRequester.has(ride.id)
                    ? ride.id
                    : hostByRequester.get(ride.id)!;
            if (hostId === myHostRideId) continue;
            hostIds.add(hostId);
        }

        const candidates: MatchCandidate[] = [];
        for (const hostId of hostIds) {
            const candidate = buildGroupSnapshot(
                hostId,
                ridesById,
                profilesById,
                acceptedByHost,
                rideGroupIdsByHost
            );
            if (!candidate) continue;
            if (candidate.effectiveDate !== myGroup.effectiveDate) continue;
            if (candidate.totalSeats + myGroup.totalSeats > 6) continue;

            const dOrigin = haversineMiles(
                myGroup.originCentroidLat,
                myGroup.originCentroidLng,
                candidate.originCentroidLat,
                candidate.originCentroidLng
            );
            const dDestination = haversineMiles(
                myRide.dest_lat,
                myRide.dest_lng,
                candidate.hostRide.dest_lat,
                candidate.hostRide.dest_lng
            );

            if (dOrigin > 2.0 || dDestination > 2.0) continue;

            const { timeTier, overlapMinutes, gapMinutes } = deriveTimeTier(
                myGroup,
                candidate
            );
            if (!timeTier) continue;

            const musicRatio =
                candidate.members.reduce(
                    (sum, member) => sum + (member.music_ok === myRide.music_ok ? 1 : 0.5),
                    0
                ) / candidate.members.length;

            const vibeRatio =
                candidate.members.reduce((sum, member) => {
                    const vibe = member.profile?.conversation_pref;
                    const myVibe = myProfile?.conversation_pref;
                    if (!vibe || vibe === "either") return sum + 1;
                    if (!myVibe || myVibe === "either") return sum + 1;
                    return sum + (vibe === myVibe ? 1 : 0);
                }, 0) / candidate.members.length;

            const prefOverall = Number((((musicRatio + vibeRatio) / 2)).toFixed(3));
            const needsXl =
                myGroup.totalBags + candidate.totalBags >= 4 ||
                myGroup.hasOversized ||
                candidate.hasOversized;

            candidates.push({
                candidate_id: candidate.rideGroupId ?? candidate.hostRide.id,
                candidate_type: candidate.members.length > 1 ? "group" : "solo",
                request_target_ride_id: candidate.hostRide.id,
                ride_group_id: candidate.rideGroupId,
                ride_id: candidate.hostRide.id,
                user_id: candidate.hostRide.user_id,
                ride_type: "seeking",
                origin_name: candidate.hostRide.origin_name,
                dest_name: candidate.hostRide.dest_name,
                departure_earliest: candidate.hostRide.departure_earliest,
                departure_latest: candidate.hostRide.departure_latest,
                departure_preferred: candidate.hostRide.departure_preferred,
                seats_needed: candidate.hostRide.seats_needed,
                space_capacity: candidate.hostRide.space_capacity,
                gender_pref: candidate.hostRide.gender_pref,
                quiet_ride: candidate.hostRide.quiet_ride,
                music_ok: candidate.hostRide.music_ok,
                notes: candidate.hostRide.notes,
                first_name: candidate.members[0]?.profile?.first_name ?? "Unknown",
                last_name: candidate.members[0]?.profile?.last_name ?? "",
                photo_url: candidate.members[0]?.profile?.photo_url ?? null,
                bio: candidate.members[0]?.profile?.bio ?? null,
                school: candidate.members[0]?.profile?.school ?? null,
                time_tier: timeTier,
                overlap_minutes: overlapMinutes,
                gap_minutes: gapMinutes,
                d_origin_miles: Number(dOrigin.toFixed(2)),
                d_origin_tier: originTier(dOrigin),
                d_destination_miles: Number(dDestination.toFixed(2)),
                d_destination_tier: destinationTier(dDestination),
                needs_xl: needsXl,
                xl_flag_message: needsXl ? "This group may need Uber XL" : null,
                seats_remaining_after_join: Math.max(
                    0,
                    6 - (candidate.totalSeats + myGroup.totalSeats)
                ),
                fill_efficiency: Number(
                    (
                        myRide.seats_needed / Math.max(6 - candidate.totalSeats, 1)
                    ).toFixed(3)
                ),
                gender_compatible: !candidate.members.some(
                    (member) => member.gender_pref !== "any"
                ),
                pref_overall: prefOverall,
                group_size_before_join: candidate.members.length,
                group_size_after_join: candidate.members.length + myGroup.members.length,
                members: candidate.members.map(toMemberSummary),
                match_label:
                    timeTier === "STRONG"
                        ? "Great Match"
                        : timeTier === "OKAY"
                          ? "Okay Match"
                          : timeTier === "WEAK" || timeTier === "BORDERLINE"
                            ? "Possible Match"
                            : "Low Match",
                match_explanation:
                    timeTier === "STRONG"
                        ? "Strong time overlap, close enough to share a ride."
                        : timeTier === "OKAY"
                          ? "Good time overlap for a shared ride."
                          : timeTier === "WEAK"
                            ? "Some time overlap, but less flexibility."
                            : timeTier === "BORDERLINE"
                              ? "Time windows are close but do not fully overlap."
                              : "Shown because there are no better nearby time matches.",
            });
        }

        candidates.sort((a, b) => {
            const aWorstDistance = Math.max(
                a.d_origin_tier === "CLOSE" ? 1 : a.d_origin_tier === "NEAR" ? 2 : 3,
                a.d_destination_tier === "SAME_AREA"
                    ? 1
                    : a.d_destination_tier === "VERY_CLOSE"
                      ? 2
                      : 3
            );
            const bWorstDistance = Math.max(
                b.d_origin_tier === "CLOSE" ? 1 : b.d_origin_tier === "NEAR" ? 2 : 3,
                b.d_destination_tier === "SAME_AREA"
                    ? 1
                    : b.d_destination_tier === "VERY_CLOSE"
                      ? 2
                      : 3
            );

            const aSumDistance =
                (a.d_origin_tier === "CLOSE" ? 1 : a.d_origin_tier === "NEAR" ? 2 : 3) +
                (a.d_destination_tier === "SAME_AREA"
                    ? 1
                    : a.d_destination_tier === "VERY_CLOSE"
                      ? 2
                      : 3);
            const bSumDistance =
                (b.d_origin_tier === "CLOSE" ? 1 : b.d_origin_tier === "NEAR" ? 2 : 3) +
                (b.d_destination_tier === "SAME_AREA"
                    ? 1
                    : b.d_destination_tier === "VERY_CLOSE"
                      ? 2
                      : 3);

            return (
                timeTierRank(a.time_tier) - timeTierRank(b.time_tier) ||
                aWorstDistance - bWorstDistance ||
                aSumDistance - bSumDistance ||
                Number(b.gender_compatible) - Number(a.gender_compatible) ||
                b.pref_overall - a.pref_overall ||
                (a.d_destination_miles ?? 999) - (b.d_destination_miles ?? 999) ||
                (a.d_origin_miles ?? 999) - (b.d_origin_miles ?? 999)
            );
        });

        return NextResponse.json(candidates.slice(0, maxResults));
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
