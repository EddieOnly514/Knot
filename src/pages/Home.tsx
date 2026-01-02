import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ElevatedCard } from "@/components/ui/elevated-card";
import { CarFront, PlaneLanding, User, Ticket, MapPin, Clock, ChevronRight } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const userName = "Alex"; // TODO: Get from auth context
  const [hasActiveTrip] = useState(true); // Mock active trip

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleNowClick = () => {
    navigate("/trip-creation?mode=now");
  };

  const handleArrivalClick = () => {
    navigate("/trip-creation?mode=arrival");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-safe pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <div>
          <p className="text-text-muted text-sm">{getGreeting()},</p>
          <h1 className="font-headline text-2xl font-bold text-text-main">
            {userName}
          </h1>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <User className="w-6 h-6 text-primary" />
        </button>
      </div>

      {/* Active Trip Banner */}
      {hasActiveTrip && (
        <ElevatedCard
          pressable
          onClick={() => navigate("/matches")}
          className="p-4 mb-4 border-l-4 border-l-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-text-main text-sm">Active Trip</p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <MapPin className="w-3 h-3" />
                  <span>Downtown SF Area</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>Leaving in 15 min</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </div>
        </ElevatedCard>
      )}

      {/* Section Title */}
      <h2 className="font-headline text-lg font-semibold text-text-main mb-4">
        Where are you headed?
      </h2>

      {/* Mode Selection Cards */}
      <div className="flex-1 flex flex-col gap-4 pb-24">
        {/* NOW Card */}
        <ElevatedCard
          pressable
          onClick={handleNowClick}
          className="flex-1 p-6 flex flex-col justify-between min-h-[180px]"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CarFront className="w-7 h-7 text-primary" />
          </div>
          <div className="mt-4">
            <h3 className="font-headline text-2xl font-bold text-primary">
              NOW
            </h3>
            <p className="text-lg text-text-main font-medium mt-1">
              Leave soon
            </p>
            <p className="text-text-muted text-sm mt-1">
              Find a match near your current location
            </p>
          </div>
        </ElevatedCard>

        {/* ARRIVAL Card */}
        <ElevatedCard
          pressable
          onClick={handleArrivalClick}
          className="flex-1 p-6 flex flex-col justify-between min-h-[180px]"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <PlaneLanding className="w-7 h-7 text-primary" />
          </div>
          <div className="mt-4">
            <h3 className="font-headline text-2xl font-bold text-primary">
              ARRIVAL
            </h3>
            <p className="text-lg text-text-main font-medium mt-1">
              Landing later
            </p>
            <p className="text-text-muted text-sm mt-1">
              Schedule a ride match for your airport arrival
            </p>
          </div>
        </ElevatedCard>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-100 px-6 py-3 pb-safe">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-primary">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Home</span>
          </button>
          <button
            onClick={() => navigate("/matches")}
            className="flex flex-col items-center gap-1 text-text-muted hover:text-primary transition-colors"
          >
            <Ticket className="w-6 h-6" />
            <span className="text-xs font-medium">Trips</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center gap-1 text-text-muted hover:text-primary transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
