"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Star,
    Car,
    CheckCircle,
    Shield,
    Phone,
    Mail,
    GraduationCap,
    MessageCircle,
    Music,
    Cigarette,
    Users,
    Loader2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Profile } from "@/contexts/AuthContext";

export default function PublicProfilePage() {
    const router = useRouter();
    const params = useParams();
    const profileId = params.id as string;
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", profileId)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
            } else {
                setProfile(data);
            }
            setLoading(false);
        }

        if (profileId) fetchProfile();
    }, [profileId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
                    </div>
                </header>
                <div className="text-center py-16">
                    <p className="text-slate-500">Profile not found.</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const prefLabels: Record<string, string> = {
        chatty: "Chatty",
        chill: "Chill",
        quiet: "Quiet",
        yes: "Music lover",
        no: "No music",
        no_preference: "Any music",
        outside_only: "Outside only",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-900">
                        {profile.first_name}&apos;s Profile
                    </h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Profile Header */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-5">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={profile.photo_url || undefined} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                                    {profile.first_name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {profile.first_name} {profile.last_name?.[0] ? `${profile.last_name[0]}.` : ""}
                                </h2>
                                {profile.school && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                                        <GraduationCap className="w-4 h-4" />
                                        {profile.school}
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1 text-sm">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">{profile.rating?.toFixed(1) || "N/A"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-slate-500">
                                        <Car className="w-4 h-4" />
                                        {profile.total_rides || 0} rides
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bio */}
                {(profile.bio && profile.bio.trim().length > 0) && (
                    <Card>
                        <CardContent className="p-5">
                            <h3 className="font-semibold text-slate-900 mb-2">
                                About
                            </h3>
                            <p className="text-sm text-slate-700 whitespace-pre-line">
                                {profile.bio}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Trust & Verification */}
                <Card>
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            Verification
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.phone_verified && (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                    <Phone className="w-3 h-3 mr-1" />
                                    Phone Verified
                                </Badge>
                            )}
                            {profile.email_verified && (
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Mail className="w-3 h-3 mr-1" />
                                    Email Verified
                                </Badge>
                            )}
                            {profile.id_verified && (
                                <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    ID Verified
                                </Badge>
                            )}
                            {!profile.phone_verified && !profile.email_verified && !profile.id_verified && (
                                <p className="text-sm text-slate-400">No verifications yet</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Ride Preferences */}
                <Card>
                    <CardContent className="p-5">
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            Ride Preferences
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.conversation_pref && (
                                <Badge variant="outline" className="text-sm">
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    {prefLabels[profile.conversation_pref] || profile.conversation_pref}
                                </Badge>
                            )}
                            {profile.music_pref && (
                                <Badge variant="outline" className="text-sm">
                                    <Music className="w-3 h-3 mr-1" />
                                    {prefLabels[profile.music_pref] || profile.music_pref}
                                </Badge>
                            )}
                            {profile.smoking_pref && profile.smoking_pref !== "no" && (
                                <Badge variant="outline" className="text-sm">
                                    <Cigarette className="w-3 h-3 mr-1" />
                                    {prefLabels[profile.smoking_pref] || profile.smoking_pref}
                                </Badge>
                            )}
                            {profile.gender_preference && profile.gender_preference !== "any" && (
                                <Badge variant="outline" className="text-sm">
                                    <Users className="w-3 h-3 mr-1" />
                                    {profile.gender_preference === "male" ? "Prefers Male" : "Prefers Female"}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Member Since */}
                <Card>
                    <CardContent className="p-5">
                        <p className="text-sm text-slate-500">
                            Member since {new Date(profile.created_at).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
