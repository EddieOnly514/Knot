"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Star,
    Car,
    CheckCircle,
    Shield,
    Phone,
    Mail,
    Camera,
    Save,
    Pencil,
} from "lucide-react";

export default function ProfilePage() {
    const { profile, user, updateProfile } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [firstName, setFirstName] = useState(profile?.first_name || "");
    const [lastName, setLastName] = useState(profile?.last_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
        });
        setSaving(false);
        setIsEditing(false);
    };

    const displayName = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ") || "User";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/home")}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Profile Header Card */}
                <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-24" />
                    <CardContent className="relative px-6 pb-6">
                        <div className="flex items-end gap-4 -mt-12">
                            <div className="relative">
                                <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                                    <AvatarImage src={profile?.photo_url || undefined} />
                                    <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                                        {profile?.first_name?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-700 transition-colors">
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="pb-1 flex-1">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {displayName}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {user?.email || "No email"}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mb-1"
                                onClick={() => {
                                    if (isEditing) {
                                        setFirstName(profile?.first_name || "");
                                        setLastName(profile?.last_name || "");
                                        setPhone(profile?.phone || "");
                                    }
                                    setIsEditing(!isEditing);
                                }}
                            >
                                <Pencil className="w-4 h-4 mr-1" />
                                {isEditing ? "Cancel" : "Edit"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center text-2xl font-bold text-slate-900">
                                <Star className="w-5 h-5 mr-1 fill-yellow-400 text-yellow-400" />
                                {profile?.rating?.toFixed(1) ?? "5.0"}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Rating</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center text-2xl font-bold text-slate-900">
                                <Car className="w-5 h-5 mr-1 text-blue-600" />
                                {profile?.total_rides ?? 0}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Rides</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-900">
                                {profile?.default_party_size ?? 1}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Party Size</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Personal Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">Email</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900">
                                        {user?.email || "Not set"}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">Phone</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900">
                                        {profile?.phone || "Not set"}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <Car className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-slate-600">Default Luggage</span>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900 capitalize">
                                        {profile?.default_luggage || "None"}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Verification Status */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            Verification Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">Email Verified</span>
                            </div>
                            {user?.email ? (
                                <Badge className="bg-green-100 text-green-700 border-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-500">
                                    Not verified
                                </Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">Phone Verified</span>
                            </div>
                            {profile?.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-500">
                                    Not verified
                                </Badge>
                            )}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">Identity</span>
                            </div>
                            {profile?.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            ) : (
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                    Verify Now
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Member Since */}
                <Card>
                    <CardContent className="p-4 text-center text-sm text-slate-500">
                        Member since{" "}
                        {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })
                            : "recently"}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
