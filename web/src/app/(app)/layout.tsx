"use client";

import "../globals.css";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { loading, isNewUser, user, profile } = useAuth();
  const router = useRouter();

  // Don't render app until we know auth state: wait for profile when user is logged in
  const waitingForProfile = !!user && !profile && !loading;
  const shouldShowSpinner = loading || waitingForProfile || isNewUser;

  // Redirect new users (profile loaded with no name) to onboarding
  useEffect(() => {
    if (!loading && isNewUser) {
      router.replace("/onboarding");
    }
  }, [loading, isNewUser, router]);

  // Warm likely destinations so tab switches feel instant
  useEffect(() => {
    if (shouldShowSpinner) return;
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
  }, [shouldShowSpinner, router]);

  // Spinner while loading, or while logged in but profile not loaded yet, or while new user (redirecting to onboarding)
  if (shouldShowSpinner) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1">
        <SidebarNav />
        <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 pt-14 md:px-10 md:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}

