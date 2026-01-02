import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { ElevatedCard } from "@/components/ui/elevated-card";
import { Input } from "@/components/ui/input";
import { User, Camera, Briefcase, Users, ShieldCheck } from "lucide-react";

type LuggageLevel = "none" | "carry_on" | "one_suitcase" | "two_plus";
type PartySize = 1 | 2;

const ProfileSetup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [luggageLevel, setLuggageLevel] = useState<LuggageLevel>("carry_on");
    const [partySize, setPartySize] = useState<PartySize>(1);
    const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);

    const luggageOptions: { value: LuggageLevel; label: string; icon: string }[] = [
        { value: "none", label: "None", icon: "🎒" },
        { value: "carry_on", label: "Carry-on", icon: "💼" },
        { value: "one_suitcase", label: "1 Suitcase", icon: "🧳" },
        { value: "two_plus", label: "2+ Suitcases", icon: "🧳🧳" },
    ];

    const handleContinue = () => {
        if (!name.trim() || !safetyAcknowledged) return;
        // TODO: Save profile to Supabase
        navigate("/home");
    };

    const isValid = name.trim().length > 0 && safetyAcknowledged;

    return (
        <div className="min-h-screen bg-background px-4 py-6 pb-safe">
            {/* Header */}
            <div className="mb-8">
                <h1 className="font-headline text-2xl font-bold text-text-main">
                    Set up your profile
                </h1>
                <p className="text-text-muted mt-1">
                    Help other riders know who you are
                </p>
            </div>

            {/* Profile Photo */}
            <div className="flex justify-center mb-8">
                <button className="relative group">
                    <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 group-hover:border-primary transition-colors">
                        <User className="w-12 h-12 text-primary/50" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-float">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                </button>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-main">
                        Name <span className="text-danger">*</span>
                    </label>
                    <Input
                        icon={<User className="w-5 h-5" />}
                        placeholder="Your first name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-text-main">
                        Short bio <span className="text-text-muted">(optional)</span>
                    </label>
                    <textarea
                        placeholder="e.g., Frequent flyer, love good conversation!"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full h-24 px-4 py-3 rounded-2xl border border-transparent bg-slate-50 text-text-main placeholder:text-text-muted resize-none focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Luggage Level */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-text-muted" />
                        <label className="text-sm font-medium text-text-main">
                            Default luggage
                        </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {luggageOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setLuggageLevel(option.value)}
                                className={`py-3 px-2 rounded-xl text-center transition-all duration-200 ${luggageLevel === option.value
                                        ? "bg-primary text-white shadow-card"
                                        : "bg-slate-100 text-text-muted hover:bg-slate-200"
                                    }`}
                            >
                                <div className="text-lg mb-1">{option.icon}</div>
                                <div className="text-xs font-medium">{option.label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Party Size */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted" />
                        <label className="text-sm font-medium text-text-main">
                            Default party size
                        </label>
                    </div>
                    <div className="flex gap-3">
                        {[1, 2].map((size) => (
                            <button
                                key={size}
                                onClick={() => setPartySize(size as PartySize)}
                                className={`flex-1 py-4 rounded-xl text-center font-medium transition-all duration-200 ${partySize === size
                                        ? "bg-primary text-white shadow-card"
                                        : "bg-slate-100 text-text-muted hover:bg-slate-200"
                                    }`}
                            >
                                {size} {size === 1 ? "person" : "people"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Safety Acknowledgement */}
                <ElevatedCard className="p-4">
                    <button
                        onClick={() => setSafetyAcknowledged(!safetyAcknowledged)}
                        className="flex items-start gap-3 w-full text-left"
                    >
                        <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${safetyAcknowledged
                                    ? "bg-primary border-primary"
                                    : "border-slate-300"
                                }`}
                        >
                            {safetyAcknowledged && (
                                <ShieldCheck className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-text-main text-sm">
                                Safety acknowledgement
                            </p>
                            <p className="text-text-muted text-xs mt-1">
                                I agree to meet in public places, verify identity before riding,
                                and understand no payments happen in-app.
                            </p>
                        </div>
                    </button>
                </ElevatedCard>
            </div>

            {/* Continue Button */}
            <div className="mt-8">
                <ActionButton
                    onClick={handleContinue}
                    disabled={!isValid}
                    showArrow
                >
                    Continue
                </ActionButton>
            </div>
        </div>
    );
};

export default ProfileSetup;
