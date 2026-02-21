"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Star,
  Car,
  CheckCircle,
  Shield,
  Phone,
  Mail,
  Camera,
  Save,
  Calendar,
  MessageCircle,
  Music,
  Users,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import { getMyRequests } from "@/lib/services/matchService";

export default function ProfilePage() {
  const { profile, user, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = getSupabaseClientOrThrow();

  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [school, setSchool] = useState(profile?.school || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [conversationPref, setConversationPref] = useState(
    profile?.conversation_pref || "chill",
  );
  const [musicPref, setMusicPref] = useState(
    profile?.music_pref || "no_preference",
  );
  const [smokingPref, setSmokingPref] = useState(
    profile?.smoking_pref || "no",
  );
  const [genderPref, setGenderPref] = useState(
    profile?.gender_preference || "any",
  );
  const [completedRidesCount, setCompletedRidesCount] = useState<number | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    getMyRequests(profile.id)
      .then((requests) => {
        const count = requests.filter((r) => r.ride_status === "completed").length;
        setCompletedRidesCount(count);
      })
      .catch(() => setCompletedRidesCount(0));
  }, [profile?.id]);

  useEffect(() => {
    if (profile && !isEditing) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
      setSchool(profile.school || "");
      setBio(profile.bio || "");
      setConversationPref(profile.conversation_pref || "chill");
      setMusicPref(profile.music_pref || "no_preference");
      setSmokingPref(profile.smoking_pref || "no");
      setGenderPref(profile.gender_preference || "any");
    }
  }, [profile, isEditing]);

  const handleAvatarClick = () => {
    if (!isEditing) return;
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

    if (!profile || !profile.id) {
      toast.error("Profile not loaded yet");
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `avatars/${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        console.error("[ProfilePage] Avatar upload error:", uploadError);
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
        console.error("[ProfilePage] Avatar save error:", result.error);
        toast.error(
          "Photo uploaded, but saving to profile failed. Please try again.",
        );
      } else {
        toast.success("Profile photo updated");
      }
    } catch (error) {
      console.error("[ProfilePage] Avatar upload exception:", error);
      toast.error("Something went wrong uploading your photo.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        school: school || null,
        bio: bio || null,
        conversation_pref: conversationPref,
        music_pref: musicPref,
        smoking_pref: smokingPref,
        gender_preference: genderPref,
      });
      if (result?.error) {
        console.error("[ProfilePage] Save error:", result.error);
        toast.error(
          "Failed to save: " + (result.error.message || "Unknown error"),
        );
      } else {
        toast.success("Profile updated");
        setIsEditing(false);
      }
    } catch (err) {
      console.error("[ProfilePage] Exception:", err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setPhone(profile?.phone || "");
    setSchool(profile?.school || "");
    setBio(profile?.bio || "");
    setConversationPref(profile?.conversation_pref || "chill");
    setMusicPref(profile?.music_pref || "no_preference");
    setSmokingPref(profile?.smoking_pref || "no");
    setGenderPref(profile?.gender_preference || "any");
    setIsEditing(false);
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <PageHeader
        title="Profile"
        subtitle="How other riders see you."
      />

      {/* Avatar + name */}
      <Card className="border-zinc-200 bg-white">
        <CardContent className="relative flex flex-col items-center gap-2 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-7 rounded-full px-2.5 text-[11px] font-medium text-zinc-600 shadow-none hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => (isEditing ? handleCancel() : setIsEditing(true))}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <div className="relative mt-1">
            <Avatar className="h-20 w-20 border border-zinc-200">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-blue-50 text-lg font-semibold text-blue-600">
                {profile?.first_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {avatarUploading ? (
                  <Save className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="mt-1 w-full space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-zinc-500">
                    First name
                  </Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-zinc-500">
                    Last name
                  </Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-0.5 h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-zinc-500">
                  School / company
                </Label>
                <Input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. UC Irvine · Class of 2027"
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 w-full text-center space-y-1">
              <h2 className="text-sm font-semibold text-zinc-900">
                {[profile?.first_name, profile?.last_name]
                  .filter(Boolean)
                  .join(" ") || "User"}
              </h2>
              {profile?.school && (
                <p className="text-xs text-zinc-500">{profile.school}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About / bio */}
      <Card className="border-zinc-200 bg-white">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            About you
          </h3>
          {isEditing ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500">
                Short bio
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={240}
                placeholder="Add a short intro so other riders know you a bit better."
                className="mt-0.5 text-sm"
                rows={3}
              />
              <p className="text-[11px] text-zinc-400 text-right">
                {bio.length}/240
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-700">
              {profile?.bio?.trim() ||
                "Add a short bio so riders know who they’re sharing a ride with."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-semibold text-zinc-900">
                {profile?.rating?.toFixed(1) ?? "5.0"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Rating</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Car className="h-4 w-4 text-blue-500" />
              <span className="text-lg font-semibold text-zinc-900">
                {completedRidesCount ?? profile?.completed_rides ?? profile?.total_rides ?? 0}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Rides</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 bg-white">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span className="text-lg font-semibold text-zinc-900">
                {memberSince}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Member since</p>
          </CardContent>
        </Card>
      </div>

      {/* Verification */}
      <Card className="border-zinc-200 bg-white">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Shield className="h-4 w-4 text-blue-600" />
            Verification
          </h3>
          <div className="flex flex-wrap gap-2.5">
            <Badge
              variant="outline"
              className={`py-1.5 px-3 text-xs ${
                profile?.id_verified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {profile?.id_verified ? (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Shield className="mr-1.5 h-3.5 w-3.5" />
              )}
              ID verified
            </Badge>
            <Badge
              variant="outline"
              className={`py-1.5 px-3 text-xs ${
                user?.email?.endsWith(".edu")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {user?.email?.endsWith(".edu") ? (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Shield className="mr-1.5 h-3.5 w-3.5" />
              )}
              School email
            </Badge>
            <Badge
              variant="outline"
              className={`py-1.5 px-3 text-xs ${
                profile?.phone_verified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {profile?.phone_verified ? (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Phone className="mr-1.5 h-3.5 w-3.5" />
              )}
              Phone verified
            </Badge>
            <Badge
              variant="outline"
              className={`py-1.5 px-3 text-xs ${
                profile?.email_verified || user?.email
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {profile?.email_verified || user?.email ? (
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Mail className="mr-1.5 h-3.5 w-3.5" />
              )}
              Email verified
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ride preferences */}
      <Card className="border-zinc-200 bg-white">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Car className="h-4 w-4 text-blue-600" />
            Ride preferences
          </h3>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-600">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Conversation
                </Label>
                <Select
                  value={conversationPref}
                  onValueChange={setConversationPref}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatty">Chatty</SelectItem>
                    <SelectItem value="chill">Chill</SelectItem>
                    <SelectItem value="quiet">Quiet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-600">
                  <Music className="h-3.5 w-3.5" />
                  Music
                </Label>
                <Select value={musicPref} onValueChange={setMusicPref}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes please</SelectItem>
                    <SelectItem value="no">No thanks</SelectItem>
                    <SelectItem value="no_preference">Any music</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5 text-xs text-zinc-600">
                  <Users className="h-3.5 w-3.5" />
                  Gender preference
                </Label>
                <Select value={genderPref} onValueChange={setGenderPref}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No preference</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-600">
                  <MessageCircle className="h-4 w-4 text-zinc-400" />
                  Conversation
                </span>
                <span className="text-sm font-medium text-zinc-900">
                  {profile?.conversation_pref === "chatty" && "Chatty"}
                  {profile?.conversation_pref === "chill" && "Chill"}
                  {profile?.conversation_pref === "quiet" && "Quiet"}
                  {!profile?.conversation_pref && "Chill"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-600">
                  <Music className="h-4 w-4 text-zinc-400" />
                  Music
                </span>
                <span className="text-sm font-medium text-zinc-900">
                  {profile?.music_pref === "yes" && "Yes"}
                  {profile?.music_pref === "no" && "No"}
                  {profile?.music_pref === "no_preference" && "Any music"}
                  {!profile?.music_pref && "Any music"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-600">
                  <Users className="h-4 w-4 text-zinc-400" />
                  Gender preference
                </span>
                <span className="text-sm font-medium capitalize text-zinc-900">
                  {profile?.gender_preference === "any"
                    ? "No preference"
                    : profile?.gender_preference || "No preference"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-zinc-200 bg-white">
        <CardContent className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Contact
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600">
                <Mail className="h-4 w-4 text-zinc-400" />
                Email
              </span>
              <span className="text-sm text-zinc-900">
                {user?.email || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600">
                <Phone className="h-4 w-4 text-zinc-400" />
                Phone
              </span>
              {isEditing ? (
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="h-8 w-44 text-right text-sm"
                />
              ) : (
                <span className="text-sm text-zinc-900">
                  {profile?.phone || "+1"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Button
          className="h-10 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save changes"}
        </Button>
      )}
    </div>
  );
}

