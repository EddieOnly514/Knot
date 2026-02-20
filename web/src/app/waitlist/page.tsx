"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Users,
  Car,
  Shield,
  CheckCircle2,
} from "lucide-react";

const SCHOOLS = [
  "UCI",
  "UCLA",
  "USC",
  "UCSD",
  "Cal Poly",
  "other",
] as const;
const AIRPORTS = ["LAX", "SNA", "SAN", "LGB", "ONT", "Other"] as const;

type School = (typeof SCHOOLS)[number];
type Airport = (typeof AIRPORTS)[number];

interface WaitlistStats {
  total: number;
  bySchool: Record<string, number>;
}

export default function WaitlistPage() {
  const [school, setSchool] = useState<School | "">("");
  const [schoolOther, setSchoolOther] = useState("");
  const [email, setEmail] = useState("");
  const [airport, setAirport] = useState<Airport | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<WaitlistStats | null>(null);

  useEffect(() => {
    fetch("/api/waitlist/stats")
      .then((res) => res.json())
      .then((data: WaitlistStats) => setStats(data))
      .catch(() => setStats({ total: 146, bySchool: {} }));
  }, []);

  const total = stats?.total ?? 146;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !email.trim() || !airport) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (school === "other" && !schoolOther.trim()) {
      toast.error("Please type your school name.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school,
          email: email.trim(),
          airport,
          ...(school === "other" && { school_other: schoolOther.trim() }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      toast.success("You’re on the list! We’ll be in touch for early access.");
      setEmail("");
      setSchool("");
      setSchoolOther("");
      setAirport("");
      // Refresh stats
      const statsRes = await fetch("/api/waitlist/stats");
      const newStats = await statsRes.json();
      setStats(newStats);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            Flying out for spring break?
          </h1>
          <p className="mt-4 text-lg text-zinc-600 sm:text-xl">
            Split your airport ride with students from your school.
          </p>
          <p className="mt-2 text-base text-zinc-500">
            Match with nearby students, share the ride, and cut the cost.
          </p>
          <div className="mt-8">
            <a
              href="#waitlist-form"
              className="inline-flex items-center justify-center rounded-full bg-[#0052FF] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,82,255,0.28)] transition hover:bg-[#0042CC]"
            >
              Join early access
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-400">
            Built by students. Focused on safety + same-campus matching.
          </p>
        </div>
      </section>

      {/* Waitlist form */}
      <section
        id="waitlist-form"
        className="scroll-mt-8 px-4 pb-16 md:pb-20"
      >
        <div className="mx-auto max-w-md">
          <Card className="border-zinc-200 bg-white shadow-xl rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-zinc-900 mb-5">
                Join early access
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="school" className="text-zinc-700">
                    School
                  </Label>
                  <Select
                    value={school}
                    onValueChange={(v) => setSchool(v as School)}
                    required
                  >
                    <SelectTrigger
                      id="school"
                      className="w-full h-11 rounded-full border-zinc-200 bg-white"
                    >
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOLS.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="rounded-lg"
                        >
                          {s === "other" ? "Other" : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {school === "other" && (
                    <Input
                      id="school-other"
                      type="text"
                      placeholder="Type your school name"
                      value={schoolOther}
                      onChange={(e) => setSchoolOther(e.target.value)}
                      className="mt-2 h-11 rounded-full border-zinc-200"
                      maxLength={200}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-full border-zinc-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="airport" className="text-zinc-700">
                    Airport traveling to
                  </Label>
                  <Select
                    value={airport}
                    onValueChange={(v) => setAirport(v as Airport)}
                    required
                  >
                    <SelectTrigger
                      id="airport"
                      className="w-full h-11 rounded-full border-zinc-200 bg-white"
                    >
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRPORTS.map((a) => (
                        <SelectItem
                          key={a}
                          value={a}
                          className="rounded-lg"
                        >
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-full bg-[#0052FF] hover:bg-[#0042CC] text-white font-semibold shadow-[0_14px_30px_rgba(0,82,255,0.28)]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Join early access"
                  )}
                </Button>
              </form>
              <p className="mt-4 text-xs text-zinc-500 text-center">
                We’ll only message you about launch + important ride updates. No
                spam.
              </p>
            </CardContent>
          </Card>

          {/* Social proof */}
          <div className="mt-8 text-center">
            <p className="text-2xl font-semibold text-zinc-800">
              {total.toLocaleString()} students joined early access
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 md:py-20 bg-white border-y border-zinc-100">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <Card className="border-zinc-200 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052FF]/10 text-[#0052FF] mb-4">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-900">Post your ride</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Set your pickup area, airport, time window, and preferences.
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052FF]/10 text-[#0052FF] mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-900">Get matched</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  We pair you with compatible students going the same way.
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052FF]/10 text-[#0052FF] mb-4">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-900">Split cost + go</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Confirm, coordinate, and save.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why students use it */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-10">
            Why students use Knot
          </h2>
          <ul className="space-y-4">
            {[
              "Split expensive airport rides (often saves $20–$60)",
              "Same-campus matching for trust",
              "Flexible time windows (not exact time only)",
              "Works for solo travelers and groups",
              "Quick to use on mobile",
            ].map((text, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-zinc-700"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0052FF] mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Safety / Trust */}
      <section className="px-4 py-16 md:py-20 bg-white border-t border-zinc-100">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-8">
            Safety, trust, and transparency
          </h2>
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
              <Shield className="h-7 w-7" />
            </div>
          </div>
          <p className="mt-6 text-center text-zinc-600">
            Knot is built with safety first: same-campus matching so you ride
            with people from your school, in-app coordination, and clear
            expectations before you go. We’re students too—we get it.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-zinc-200 text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="font-medium text-[#0052FF] hover:underline"
        >
          Already have an account? Sign in
        </Link>
      </footer>
    </div>
  );
}
