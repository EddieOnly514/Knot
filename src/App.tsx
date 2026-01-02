
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Home from "./pages/Home";
import TripCreation from "./pages/TripCreation";
import MatchFeed from "./pages/MatchFeed";
import Chat from "./pages/Chat";
import PostTrip from "./pages/PostTrip";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/trip-creation" element={<TripCreation />} />
              <Route path="/matches" element={<MatchFeed />} />
              <Route path="/chat/:matchId" element={<Chat />} />
              <Route path="/post-trip/:matchId" element={<PostTrip />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
