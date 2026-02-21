"use client";

import {
    useState,
    useEffect,
    useRef,
    type ChangeEvent,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Loader2,
    MessageCircle,
    Music,
    Users,
    GraduationCap,
    Phone,
    Camera,
} from "lucide-react";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";

export default function OnboardingPage() {
    const { profile, user, updateProfile, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const supabase = getSupabaseClientOrThrow();

    // Pre-fill from Google data
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [school, setSchool] = useState("");
    const [phone, setPhone] = useState("");
    const [conversationPref, setConversationPref] = useState("chill");
    const [musicPref, setMusicPref] = useState("no_preference");
    const [genderPref, setGenderPref] = useState("any");

    // Pre-fill once profile loads
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || "");
            setLastName(profile.last_name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    // Redirect if not authenticated (and not loading)
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [loading, isAuthenticated, router]);

    // Redirect if already onboarded (but not while saving) — gate on first name
    useEffect(() => {
        if (!loading && !saving && profile?.first_name) {
            router.push("/home");
        }
    }, [loading, saving, profile, router]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            event.target.value = "";
            return;
        }

        if (!user) {
            toast.error("User not loaded yet");
            event.target.value = "";
            return;
        }

        setAvatarUploading(true);
        try {
            const ownerId = profile?.id || user.id;
            const fileExt = file.name.split(".").pop() || "jpg";
            const filePath = `avatars/${ownerId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("profile-photos")
                .upload(filePath, file, {
                    upsert: true,
                });

            if (uploadError) {
                console.error("[Onboarding] Avatar upload error:", uploadError);
                toast.error("Failed to upload photo. Please try again.");
                return;
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from("profile-photos").getPublicUrl(filePath);

            const result = await updateProfile({
                photo_url: publicUrl,
            });

            if (result?.error) {
                console.error("[Onboarding] Avatar save error:", result.error);
                toast.error(
                    "Photo uploaded, but saving to profile failed. Please try again.",
                );
            } else {
                toast.success("Profile photo added");
            }
        } catch (error) {
            console.error("[Onboarding] Avatar upload exception:", error);
            toast.error("Something went wrong uploading your photo.");
        } finally {
            setAvatarUploading(false);
            event.target.value = "";
        }
    };

    const handleComplete = async () => {
        if (!firstName.trim()) {
            toast.error("Please enter your first name");
            return;
        }

        setSaving(true);
        try {
            const result = await updateProfile({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                school: school.trim() || null,
                phone: phone || null,
                conversation_pref: conversationPref,
                music_pref: musicPref,
                gender_preference: genderPref,
            });

            if (result?.error) {
                console.error("[Onboarding] Save error:", result.error);
                toast.error("Failed to save: " + (result.error.message || "Unknown error"));
            } else {
                toast.success("Welcome to Knot! 🎉");
                router.push("/home");
            }
        } catch (err) {
            console.error("[Onboarding] Exception:", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50">
            <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold text-blue-600">
                        Knot
                    </h1>
                    <p className="text-xs text-zinc-400">
                        Welcome to Knot
                    </p>
                    <p className="text-sm text-zinc-500">
                        Set up your profile to start matching with ride partners
                    </p>
                </div>

                {/* Avatar preview */}
                <div className="flex justify-center">
                    <div className="relative">
                        <Avatar className="w-24 h-24 border-2 border-blue-200 bg-white shadow-md">
                            <AvatarImage src={profile?.photo_url || undefined} />
                            <AvatarFallback className="bg-blue-50 text-blue-600 text-2xl font-semibold">
                                {firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={avatarUploading}
                            className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
                        >
                            {avatarUploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Camera className="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>

                {/* Profile form */}
                <Card className="border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-5">
                        {/* Name */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-600 mb-1.5 block">
                                    First name *
                                </Label>
                                <Input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="First name"
                                    className="h-11"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-600 mb-1.5 block">
                                    Last name
                                </Label>
                                <Input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Last name"
                                    className="h-11"
                                />
                            </div>
                        </div>

                        {/* School */}
                        <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <GraduationCap className="w-3.5 h-3.5" /> School / company
                            </Label>
                            <Input
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                placeholder="e.g. UCLA, USC, Stanford..."
                                className="h-11"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <Phone className="w-3.5 h-3.5" /> Phone (optional)
                            </Label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(555) 555-5555"
                                className="h-11"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Ride Preferences */}
                <Card className="border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-5">
                        <h3 className="text-sm font-semibold text-zinc-900">
                            Ride Preferences
                        </h3>

                        {/* Conversation */}
                        <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <MessageCircle className="w-3.5 h-3.5" /> Conversation
                            </Label>
                            <Select value={conversationPref} onValueChange={setConversationPref}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="chatty">Chatty</SelectItem>
                                    <SelectItem value="chill">Chill</SelectItem>
                                    <SelectItem value="quiet">Quiet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Music */}
                        <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <Music className="w-3.5 h-3.5" /> Music
                            </Label>
                            <Select value={musicPref} onValueChange={setMusicPref}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="yes">Yes please</SelectItem>
                                    <SelectItem value="no">No thanks</SelectItem>
                                    <SelectItem value="no_preference">Don&apos;t care</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gender */}
                        <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <Users className="w-3.5 h-3.5" /> Gender preference
                            </Label>
                            <Select value={genderPref} onValueChange={setGenderPref}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">No preference</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <Button
                    size="lg"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-sm font-semibold shadow"
                    onClick={handleComplete}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Setting up...
                        </>
                    ) : (
                        "Complete Setup"
                    )}
                </Button>

                <p className="text-center text-[11px] text-zinc-400">
                    You can always update these later in your profile settings.
                </p>
            </main>
        </div>
    );
}
