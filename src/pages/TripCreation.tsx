import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Briefcase } from "lucide-react";

type LuggageOption = "none" | "carry-on" | "suitcase";

const TripCreation = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode") || "now";

    const [destination, setDestination] = useState("");
    const [time, setTime] = useState("");
    const [luggage, setLuggage] = useState<LuggageOption>("none");

    const handleFindMatches = () => {
        navigate("/matches");
    };

    const luggageOptions: { value: LuggageOption; label: string }[] = [
        { value: "none", label: "None" },
        { value: "carry-on", label: "Carry-on" },
        { value: "suitcase", label: "Suitcase" },
    ];

    return (
        <div className="min-h-screen relative">
            {/* Map Background (Placeholder - greyscale style) */}
            <div className="absolute inset-0 bg-slate-200">
                <div className="w-full h-full opacity-50 bg-gradient-to-b from-slate-300 to-slate-200" />
                {/* Simulated map grid lines */}
                <div className="absolute inset-0 opacity-20">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={`h-${i}`}
                            className="absolute w-full h-px bg-slate-400"
                            style={{ top: `${i * 10}%` }}
                        />
                    ))}
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={`v-${i}`}
                            className="absolute h-full w-px bg-slate-400"
                            style={{ left: `${i * 10}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl shadow-modal p-6 pb-8 animate-slide-up safe-area-inset">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

                <h2 className="font-headline text-xl font-bold text-text-main mb-6">
                    {mode === "now" ? "Where are you headed?" : "Plan your arrival ride"}
                </h2>

                <div className="space-y-4">
                    {/* Destination Input */}
                    <Input
                        icon={<MapPin className="w-5 h-5" />}
                        placeholder="Where to?"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                    />

                    {/* Time Input */}
                    <Input
                        icon={<Clock className="w-5 h-5" />}
                        placeholder="When?"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />

                    {/* Luggage Toggle */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-text-muted">
                            <Briefcase className="w-4 h-4" />
                            <span className="text-sm font-medium">Luggage</span>
                        </div>
                        <div className="flex gap-2">
                            {luggageOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setLuggage(option.value)}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${luggage === option.value
                                            ? "bg-primary text-white shadow-card"
                                            : "bg-slate-100 text-text-muted hover:bg-slate-200"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <ActionButton onClick={handleFindMatches} showArrow>
                        Find Matches
                    </ActionButton>
                </div>
            </div>
        </div>
    );
};

export default TripCreation;
