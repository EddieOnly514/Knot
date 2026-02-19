"use client";

import "../globals.css";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { loading, isNewUser } = useAuth();
  const router = useRouter();

  // Redirect new users to onboarding before any app content renders
  useEffect(() => {
    if (!loading && isNewUser) {
      router.replace("/onboarding");
    }
  }, [loading, isNewUser, router]);

  // Warm likely destinations so tab switches feel instant.
  useEffect(() => {
    if (loading || isNewUser) return;
    const routes = [
      "/home",
      "/post",
      "/matches",
      "/messages",
      "/history",
      "/profile",
      "/settings",
    ];
    routes.forEach((route) => router.prefetch(route));
  }, [loading, isNewUser, router]);

  // Show loading spinner while auth/profile is resolving
  if (loading || (!loading && isNewUser)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <SidebarNav />
        <main className="flex-1 px-4 pb-20 pt-5 md:px-10 md:pb-8 md:pt-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}

