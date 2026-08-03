"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Mail, Chrome, Lock } from "lucide-react";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function SignupForm() {
  const {
    signInWithGoogle,
    signUpWithEmailPassword,
    devSignIn,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    // Pass the next URL through Google OAuth so user lands on the right page
    const redirectTo = nextUrl
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`
      : undefined;
    const { error } = await signInWithGoogle(redirectTo);
    if (error) {
      toast.error("Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    // Pass the next URL through the email confirmation redirect
    const emailRedirectNext = nextUrl ? `/onboarding?next=${encodeURIComponent(nextUrl)}` : "/onboarding";
    const { error: signUpError } = await signUpWithEmailPassword(email, password, emailRedirectNext);
    if (signUpError) {
      toast.error(signUpError.message ?? "Failed to sign up");
      setIsLoading(false);
      return;
    }

    // Fire-and-forget: send welcome email (uses session from same-origin cookie)
    fetch("/api/notify/welcome", { method: "POST" }).catch(() => {});

    toast.success("Account created. Let’s set up your profile. We also emailed you a link to verify your address so your matches can trust you more.");
    const onboardingUrl = nextUrl ? `/onboarding?next=${encodeURIComponent(nextUrl)}` : "/onboarding";
    router.push(onboardingUrl);
    setIsLoading(false);
  };

  return (
    <Card className="border-zinc-200 bg-white/90 shadow-xl backdrop-blur rounded-3xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-zinc-900 text-xl">
          Create your account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-sm text-center">
            Authentication failed. Please try again.
          </div>
        )}

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-400">
                <Mail className="w-4 h-4" />
              </span>
              <Input
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-full bg-white border-zinc-200 pl-10 pr-4 text-base text-zinc-900 placeholder:text-zinc-400 md:text-sm"
                disabled={isLoading}
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-400">
                <Lock className="w-4 h-4" />
              </span>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-full bg-white border-zinc-200 pl-10 pr-4 text-base text-zinc-900 placeholder:text-zinc-400 md:text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 rounded-full bg-[#0052FF] hover:bg-[#0042CC] text-white text-sm font-semibold shadow-[0_14px_30px_rgba(0,82,255,0.28)]"
          disabled={isLoading || !email || !password || !isValidEmail(email)}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            Sign up
          </Button>
        </form>

        <div className="relative">
          <Separator className="bg-zinc-100" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-400 text-xs px-2">
            or
          </span>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 rounded-full bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200 text-sm"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Chrome className="w-5 h-5 mr-2" />
          )}
          Sign up with Google
        </Button>

        <p className="text-center text-zinc-400 text-[11px]">
          By continuing, you agree to Knot&apos;s Terms of Service and Privacy
          Policy.
        </p>

        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0052FF] hover:underline"
          >
            Log in
          </Link>
        </p>

        {process.env.NODE_ENV === "development" && (
          <button
            onClick={() => {
              devSignIn();
              const target = nextUrl ?? "/home";
              router.push(target);
            }}
            className="w-full mt-1 py-2 px-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs hover:bg-amber-100 transition-colors"
          >
            🔧 Dev: Test Login (New User)
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div
      className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-6"
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-blue-600">
            Knot
          </h1>
          <p className="text-sm text-zinc-500">
            Split rides. Stay safe. Save money.
          </p>
        </div>

        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
