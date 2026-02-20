"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Mail, Chrome, Lock } from "lucide-react";

function LoginForm() {
  const {
    signInWithGoogle,
    signInWithEmailPassword,
    resendEmailConfirmation,
    devSignIn,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error("Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setEmailNotConfirmed(false);
    const { error } = await signInWithEmailPassword(email, password);
    if (error) {
      const msg = (error as { message?: string }).message ?? "Failed to sign in";
      const isUnconfirmed =
        /email not confirmed|confirm your email/i.test(msg);
      if (isUnconfirmed) {
        setEmailNotConfirmed(true);
        toast.error("Please verify your email before signing in.");
      } else {
        toast.error(msg);
      }
      setIsLoading(false);
      return;
    }

    // Successful password sign-in – middleware/onboarding logic will take over.
    router.push("/home");
    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendLoading(true);
    const { error } = await resendEmailConfirmation(email);
    if (error) {
      toast.error(error.message ?? "Failed to resend email");
    } else {
      toast.success("Verification email sent. Check your inbox.");
      setEmailNotConfirmed(false);
    }
    setResendLoading(false);
  };

  const fillTestAccount = () => {
    setEmail("sarah@knot-test.dev");
    setPassword("KnotTest2026!");
    toast.success("Test credentials filled. Click Sign in.");
  };

  const fillGroupChatTestAccount = () => {
    setEmail("david@knot-test.dev");
    setPassword("KnotTest2026!");
    toast.success("Group chat test account filled. Go to Messages after sign-in.");
  };

  const seedTestAccounts = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/seed-matches", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? `Seed failed (${res.status})`);
        return;
      }
      setEmail("sarah@knot-test.dev");
      setPassword("KnotTest2026!");
      toast.success("Test accounts created. You can sign in now.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create test accounts");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="border-zinc-200 bg-white/90 shadow-xl backdrop-blur rounded-3xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-zinc-900 text-xl">Welcome back</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-sm text-center">
            Authentication failed. Please try again.
          </div>
        )}

        {emailNotConfirmed && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm text-center space-y-2">
            <p>Your email isn&apos;t verified yet. Check your inbox for the verification link, or resend it below.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={handleResendVerification}
              disabled={resendLoading}
            >
              {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend verification email"}
            </Button>
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
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
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Sign in
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
          Sign in with Google
        </Button>

        <p className="text-center text-zinc-400 text-[11px]">
          By continuing, you agree to Knot&apos;s Terms of Service and Privacy
          Policy.
        </p>

        <p className="text-center text-xs text-zinc-500">
          New to Knot?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#0052FF] hover:underline"
          >
            Sign up
          </Link>
          {" · "}
          <Link
            href="/waitlist"
            className="font-semibold text-[#0052FF] hover:underline"
          >
            Join waitlist
          </Link>
        </p>

        {(typeof window === "undefined"
          ? process.env.NODE_ENV === "development"
          : window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1") && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-amber-800 text-xs font-medium">
              Dev: Test accounts for simulated match
            </p>
            <button
              type="button"
              onClick={seedTestAccounts}
              disabled={isSeeding}
              className="w-full py-2 px-4 rounded-lg bg-amber-200 border border-amber-400 text-amber-900 text-xs font-medium hover:bg-amber-300 transition-colors disabled:opacity-60"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
                  Creating test accounts…
                </>
              ) : (
                "1. Create test accounts (run seed)"
              )}
            </button>
            <button
              type="button"
              onClick={fillTestAccount}
              className="w-full py-2 px-4 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-medium hover:bg-amber-200 transition-colors"
            >
              2. Fill 1:1 test account (sarah@knot-test.dev)
            </button>
            <button
              type="button"
              onClick={fillGroupChatTestAccount}
              className="w-full py-2 px-4 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-medium hover:bg-amber-200 transition-colors"
            >
              3. Fill group chat test account (david@knot-test.dev)
            </button>
            <p className="text-amber-700 text-[11px]">
              Password: KnotTest2026! — Then click Sign in. If sign-in fails,
              enable &quot;Email&quot; in Supabase → Auth → Providers.
            </p>
            <p className="text-amber-700 text-[11px]">
              <strong>1:1 → group test:</strong> Sign in as david@… → Messages (1:1 with Sophia) → Home → accept Alex&apos;s request → Messages shows Group (3) with same messages. Chris@… already has Group (4).
            </p>
            <button
              type="button"
              onClick={() => {
                devSignIn();
                router.push("/home");
              }}
              className="w-full py-2 px-4 rounded-lg border border-amber-300 text-amber-800 text-xs hover:bg-amber-100 transition-colors"
            >
              🔧 Dev: Mock login (no Supabase)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
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
                        Welcome back. Sign in to keep splitting rides.
                    </p>
                </div>

                <Suspense
                    fallback={
                        <Card className="border-zinc-200 bg-white shadow-xl">
                            <CardContent className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                            </CardContent>
                        </Card>
                    }
                >
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
