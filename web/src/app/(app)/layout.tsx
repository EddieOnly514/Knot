"use client";

import "../globals.css";
import { ReactNode, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function EmailVerificationBanner() {
  const { user, profile, resendEmailConfirmation } = useAuth();
  const [resending, setResending] = useState(false);

  const shouldShow = useMemo(() => {
    if (!user) return false;
    // If Supabase has confirmed the email, or profile says verified, hide banner
    const confirmedAt =
      (user as unknown as { email_confirmed_at?: string | null }).email_confirmed_at ??
      (user as unknown as { emailConfirmedAt?: string | null }).emailConfirmedAt ??
      null;
    if (confirmedAt) return false;
    if (profile?.email_verified) return false;
    return !!user.email;
  }, [user, profile]);

  const handleResend = async () => {
    if (!user?.email) {
      toast.error("No email found for your account.");
      return;
    }
    setResending(true);
    const { error } = await resendEmailConfirmation(user.email);
    if (error) {
      toast.error(error.message ?? "Failed to resend verification email.");
    } else {
      toast.success("Verification email sent. Check your inbox.");
    }
    setResending(false);
  };

  if (!shouldShow) return null;

  return (
    <div className="mx-4 mb-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm md:mx-8 md:mt-4">
      <div className="flex items-center gap-2">
        <MailWarning className="h-4 w-4 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="font-medium">Verify your email to build trust</p>
          <p className="text-[11px] text-amber-800/90">
            We sent a link to <span className="font-semibold">{user?.email}</span>. Verifying
            helps your matches feel safer messaging and riding with you.
          </p>
        </div>
        <Button
          variant="outline"
          size="xs"
          className="shrink-0 rounded-full border-amber-300 bg-white text-[11px] text-amber-900 hover:bg-amber-100"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending…" : "Resend link"}
        </Button>
      </div>
    </div>
  );
}

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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50/40 via-zinc-50 to-zinc-100/60 text-zinc-900">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 md:my-4 md:rounded-2xl md:border md:border-zinc-200/60 md:bg-white md:shadow-[0_2px_12px_0_rgba(0,0,0,0.04)] md:overflow-hidden">
        <SidebarNav />
        <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white px-4 pt-14 md:px-10 md:pt-8">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

