"use client";

import {
    useState,
    useEffect,
    useRef,
    Suspense,
    type ChangeEvent,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
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
    Shield,
} from "lucide-react";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";

function OnboardingContent() {
    const { profile, user, updateProfile, isAuthenticated, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get("next");
    const [saving, setSaving] = useState(false);

    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Pre-fill from Google data
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [school, setSchool] = useState("");
    const [phone, setPhone] = useState("");
    const [conversationPref, setConversationPref] = useState("chill");
    const [musicPref, setMusicPref] = useState("no_preference");
    const [genderIdentity, setGenderIdentity] = useState<
        "woman" | "man" | "nonbinary" | "prefer_not_to_say"
    >("prefer_not_to_say");
    const [genderPref, setGenderPref] = useState<"any" | "same_only">("any");
    const [bio, setBio] = useState("");

    // Pre-fill from existing profile data only (not Google metadata — user should type their own name)
    useEffect(() => {
        if (profile) {
            setFirstName((profile.first_name || "").trim());
            setLastName((profile.last_name || "").trim());
            setSchool(profile.school || "");
            setPhone(profile.phone || "");
            setBio(profile.bio || "");
            setConversationPref(profile.conversation_pref || "chill");
            setMusicPref(profile.music_pref || "no_preference");
            setGenderIdentity(profile.gender_identity || "prefer_not_to_say");
            setGenderPref(profile.gender_preference || "any");
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
        if (!loading && !saving && profile?.first_name?.trim()) {
            router.push(nextUrl ?? "/home");
        }
    }, [loading, saving, profile, router, nextUrl]);

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
            const supabase = getSupabaseClientOrThrow();
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
                bio: bio.trim() || null,
                conversation_pref: conversationPref,
                music_pref: musicPref,
                gender_identity: genderIdentity,
                gender_preference: genderPref,
            });

            if (result?.error) {
                console.error("[Onboarding] Save error:", result.error);
                toast.error("Failed to save: " + (result.error.message || "Unknown error"));
            } else {
                toast.success("Welcome to Knot! 🎉");
                router.push(nextUrl ?? "/home");
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

                        {/* Bio */}
                        <div>
                            <Label className="text-xs text-zinc-600 mb-1.5 block">
                                Bio (optional)
                            </Label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value.slice(0, 240))}
                                placeholder="A short bio so riders know who they're sharing a ride with."
                                className="w-full min-h-[80px] rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                maxLength={240}
                            />
                            <p className="mt-1 text-[11px] text-zinc-400">{bio.length}/240</p>
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
                                    <SelectItem value="no_preference">Any music</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <Users className="w-3.5 h-3.5" /> Your gender
                            </Label>
                            <Select
                                value={genderIdentity}
                                onValueChange={(value) => setGenderIdentity(value as typeof genderIdentity)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="woman">Woman</SelectItem>
                                    <SelectItem value="man">Man</SelectItem>
                                    <SelectItem value="nonbinary">Nonbinary</SelectItem>
                                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-zinc-600 flex items-center gap-1.5 mb-1.5">
                                <Shield className="w-3.5 h-3.5" /> Group preference
                            </Label>
                            <Select
                                value={genderPref}
                                onValueChange={(value) => setGenderPref(value as typeof genderPref)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any gender</SelectItem>
                                    <SelectItem value="same_only">Same gender only</SelectItem>
                                </SelectContent>
                            </Select>
                          </div>
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

export default function OnboardingPage() {
    return (
        <Suspense>
            <OnboardingContent />
        </Suspense>
    );
}
