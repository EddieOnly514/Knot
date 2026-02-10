"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Mail, Chrome } from "lucide-react";

function LoginForm() {
    const { signInWithGoogle, signInWithEmail } = useAuth();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
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
        if (!email) return;

        setIsLoading(true);
        const { error } = await signInWithEmail(email);
        if (error) {
            toast.error("Failed to send magic link");
            setIsLoading(false);
        } else {
            setEmailSent(true);
            toast.success("Check your email for the magic link!");
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl">
            <CardHeader className="text-center">
                <CardTitle className="text-white text-xl">Welcome back</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-500/20 rounded-lg text-red-200 text-sm text-center">
                        Authentication failed. Please try again.
                    </div>
                )}

                {/* Google Sign In */}
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 border-0 h-12"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <Chrome className="w-5 h-5 mr-2" />
                    )}
                    Continue with Google
                </Button>

                <div className="relative">
                    <Separator className="bg-white/20" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent text-white/60 text-sm px-2">
                        or
                    </span>
                </div>

                {/* Email Magic Link */}
                {emailSent ? (
                    <div className="text-center p-4 bg-green-500/20 rounded-lg">
                        <Mail className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-200">
                            Check your email for the login link!
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleEmailSignIn} className="space-y-3">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="lg"
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white border-0"
                            disabled={isLoading || !email}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Mail className="w-5 h-5 mr-2" />
                            )}
                            Send Magic Link
                        </Button>
                    </form>
                )}

                <p className="text-center text-white/60 text-xs pt-4">
                    By continuing, you agree to Knot&apos;s Terms of Service and
                    Privacy Policy.
                </p>

                {process.env.NODE_ENV === "development" && (
                    <button
                        onClick={() => window.location.href = "/home"}
                        className="w-full mt-3 py-2 px-4 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm hover:bg-yellow-500/30 transition-colors"
                    >
                        🔧 Dev: Skip Login
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo & Tagline */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-2">Knot</h1>
                    <p className="text-blue-200 text-lg">
                        Split rides. Stay safe. Save money.
                    </p>
                </div>

                <Suspense
                    fallback={
                        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-xl">
                            <CardContent className="p-8 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
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
