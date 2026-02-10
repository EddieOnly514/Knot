"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Car,
    Star,
    Plus,
    Clock,
    MessageSquare,
    Settings,
    LogOut,
    CheckCircle,
    Search,
    ArrowRight,
} from "lucide-react";

export default function HomePage() {
    const { profile, signOut } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-blue-600">Knot</h1>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/settings")}
                        >
                            <Settings className="w-5 h-5" />
                        </Button>
                        <Avatar
                            className="w-8 h-8 cursor-pointer"
                            onClick={() => router.push("/profile")}
                        >
                            <AvatarImage src={profile?.photo_url || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                                {profile?.first_name?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Welcome Card */}
                <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    Hey, {profile?.first_name || "there"}!
                                </h2>
                                <p className="text-blue-100">
                                    Ready to find a ride share partner?
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {profile?.is_verified && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-white/20 text-white border-0"
                                    >
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verified
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold">
                                    {profile?.total_rides ?? 0}
                                </div>
                                <div className="text-blue-200 text-sm">Rides</div>
                            </div>
                            <Separator
                                orientation="vertical"
                                className="h-10 bg-white/20"
                            />
                            <div className="text-center">
                                <div className="flex items-center justify-center text-2xl font-bold">
                                    <Star className="w-5 h-5 mr-1 fill-yellow-400 text-yellow-400" />
                                    {profile?.rating?.toFixed(1) ?? "5.0"}
                                </div>
                                <div className="text-blue-200 text-sm">Rating</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Primary CTA */}
                <Button
                    size="lg"
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-lg font-semibold shadow-lg"
                    onClick={() => router.push("/post")}
                >
                    <Plus className="w-6 h-6 mr-2" />
                    Post a Ride Request
                </Button>

                {/* Browse Matches */}
                <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push("/matches")}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <Search className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Browse Matches
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Find travelers going your way
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                    </CardContent>
                </Card>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push("/history")}
                    >
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Trip History</h3>
                                <p className="text-xs text-slate-500">Past rides</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => router.push("/messages")}
                    >
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Messages</h3>
                                <p className="text-xs text-slate-500">Chat with matches</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* How it works */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                1
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">
                                    Post your ride request
                                </h4>
                                <p className="text-sm text-slate-500">
                                    Choose your airport, destination & time window
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                2
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">
                                    Browse compatible matches
                                </h4>
                                <p className="text-sm text-slate-500">
                                    Find travelers heading the same way
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                3
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">
                                    Coordinate & share the ride
                                </h4>
                                <p className="text-sm text-slate-500">
                                    Chat, meetup, and split the fare!
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sign Out */}
                <Button
                    variant="ghost"
                    className="w-full text-slate-500"
                    onClick={signOut}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </main>
        </div>
    );
}
