"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowRight,
  MessageSquare,
  Users,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Loader2,
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddressInput } from "@/components/address-input";

const WAITLIST_SCHOOLS = ["UCI", "UCLA", "USC", "UCSD", "Cal Poly", "other"] as const;
const WAITLIST_AIRPORTS = ["LAX", "SNA", "SAN", "LGB", "ONT", "Other"] as const;
type WaitlistSchool = (typeof WAITLIST_SCHOOLS)[number];
type WaitlistAirport = (typeof WAITLIST_AIRPORTS)[number];
interface WaitlistStats {
  total: number;
  bySchool: Record<string, number>;
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [waitlistSchool, setWaitlistSchool] = useState<WaitlistSchool | "">("");
  const [waitlistSchoolOther, setWaitlistSchoolOther] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistAirport, setWaitlistAirport] = useState<WaitlistAirport | "">("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistStats, setWaitlistStats] = useState<WaitlistStats | null>(null);

  // Search bar state
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
  const [searchSeats, setSearchSeats] = useState("1");

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const mapBgRef = useRef<HTMLDivElement>(null);
  const dotsBgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/waitlist/stats")
      .then((res) => res.json())
      .then((data: WaitlistStats) => setWaitlistStats(data))
      .catch(() => setWaitlistStats({ total: 146, bySchool: {} }));
  }, []);

  const waitlistTotal = waitlistStats?.total ?? 146;

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistSchool || !waitlistEmail.trim() || !waitlistAirport) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (waitlistSchool === "other" && !waitlistSchoolOther.trim()) {
      toast.error("Please type your school name.");
      return;
    }
    setWaitlistSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: waitlistSchool,
          email: waitlistEmail.trim(),
          airport: waitlistAirport,
          ...(waitlistSchool === "other" && { school_other: waitlistSchoolOther.trim() }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        setWaitlistSubmitting(false);
        return;
      }
      toast.success("You're on the list! We'll be in touch for early access.");
      setWaitlistEmail("");
      setWaitlistSchool("");
      setWaitlistSchoolOther("");
      setWaitlistAirport("");
      const statsRes = await fetch("/api/waitlist/stats");
      const newStats = await statsRes.json();
      setWaitlistStats(newStats);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const createObserver = (
      ref: React.RefObject<HTMLElement | null>,
      className: string
    ) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add(className);
            }
          });
        },
        { threshold: 0.1 }
      );

      if (ref.current) {
        observer.observe(ref.current);
        observers.push(observer);
      }
    };

    // Observe sections
    createObserver(heroRef, "animate-fade-in-up");
    createObserver(featuresRef, "animate-fade-in-up");
    createObserver(howItWorksRef, "animate-fade-in-up");

    // Enhanced scroll animations for individual elements
    const animateElements = () => {
      const elements = document.querySelectorAll("[data-scroll-animate]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              const delay = reduceMotion ? 0 : index * 100;
              setTimeout(() => {
                entry.target.classList.add("animate-in");
              }, delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );

      elements.forEach((el) => observer.observe(el));
      observers.push(observer);
    };

    // Staggered animations for stats
    const animateStats = () => {
      const stats = document.querySelectorAll("[data-stat-animate]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              const delay = reduceMotion ? 0 : index * 150;
              setTimeout(() => {
                entry.target.classList.add("animate-scale-in");
              }, delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );

      stats.forEach((stat) => observer.observe(stat));
      observers.push(observer);
    };

    // Parallax animation for map and dots backgrounds
    let raf = 0;
    const onScroll = () => {
      if (reduceMotion) return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        const mapOffset = Math.min(40, y * 0.12);
        const dotsOffset = Math.min(18, y * 0.05);
        if (mapBgRef.current) {
          mapBgRef.current.style.transform = `translate3d(0, ${mapOffset}px, 0)`;
        }
        if (dotsBgRef.current) {
          dotsBgRef.current.style.transform = `translate3d(0, ${dotsOffset}px, 0)`;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Initialize element animations
    setTimeout(() => {
      animateElements();
      animateStats();
    }, 100);

    return () => {
      observers.forEach((obs) => obs.disconnect());
      window.removeEventListener("scroll", onScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);

  const accordionItems = [
    {
      id: 0,
      title: "Post your ride",
      content:
        "Enter your destination, preferred time window, and flight details. Our system anchors your timing to your flight schedule for perfect coordination.",
      icon: MapPin,
    },
    {
      id: 1,
      title: "Smart matching algorithm",
      content:
        "We match you with verified travelers heading the same way. Our algorithm considers time overlap, destination proximity, and user compatibility scores to find your perfect ride partner.",
      icon: Sparkles,
    },
    {
      id: 2,
      title: "Message and coordinate",
      content:
        "Chat directly with your match to coordinate meetup details, split the fare, and ensure a smooth ride together. All communication happens securely within Knot.",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen bg-white relative">
      {/* Full-page faded map background */}
      <div
        aria-hidden="true"
        ref={mapBgRef}
        className="pointer-events-none fixed inset-0 z-0 will-change-transform opacity-[0.40]"
      >
        <Image
          src="/map-bg.png"
          alt="Map background"
          fill
          priority
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent mix-blend-overlay" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-gray-200/20 backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#0052FF]">
              Knot
            </span>
          </Link>



          <div className="flex items-center gap-4">
            <a
              href="#waitlist-form"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Early access
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Login
            </Link>
            <Link href="/signup">
              <Button className="h-9 px-5 bg-[#0052FF] hover:bg-[#0042CC] text-white rounded-full font-medium">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Page 1) */}
      <section
        ref={heroRef}
        className="pt-28 pb-16 px-6 lg:min-h-[78vh] opacity-0 transition-opacity duration-1000 relative overflow-hidden z-10"
      >
        {/* Subtle dotted background */}
        <div
          aria-hidden="true"
          ref={dotsBgRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{
            backgroundImage:
              "radial-gradient(rgba(15,23,42,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage:
              "radial-gradient(ellipse at 35% 30%, black 55%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 35% 30%, black 55%, transparent 75%)",
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className="space-y-8 pl-6 lg:pl-8">
              <div className="space-y-5">
                <h2 className="text-5xl md:text-6xl font-bold text-[#0F172A] leading-tight">
                  <span className="block">Same trip.</span>
                  <span className="block text-[#0052FF] ml-16 md:ml-24">Smaller bill.</span>
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                  Why pay <span className="line-through">$100</span> when it's{" "}
                  <span className="font-semibold text-[#0052FF]">$25 each</span>
                  ? Connect with verified travelers heading your way and split
                  the fare instantly.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex -space-x-2">
                  {["ea", "km", "sr"].map((name) => (
                    <div
                      key={name}
                      className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <Image
                        src={`/avatars/${name}.png`}
                        alt={name.toUpperCase()}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  <div className="size-9 rounded-full bg-gray-900 text-white border border-white shadow-sm flex items-center justify-center text-[11px] font-semibold">
                    1k+
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Join 1,000+ happy travelers this week.
                </p>
              </div>
            </div>

            {/* Right Column - Savings visualization */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-white to-[#EFF6FF] p-6 lg:p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out hover:scale-[1.02] border border-gray-100">
                <div className="grid gap-6">
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500">
                        Arriving at
                      </p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        JFK Terminal 4
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-semibold text-gray-500">
                        Heading to
                      </p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        Brooklyn
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-[#FEE2E2]/40 border border-[#FECACA] px-5 py-5 text-center">
                      <p className="text-xs font-semibold text-gray-500">
                        Solo Ride
                      </p>
                      <p className="text-2xl font-bold text-[#0F172A] mt-2">
                        $102
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#DCFCE7]/40 border border-[#BBF7D0] px-5 py-5 text-center">
                      <p className="text-xs font-semibold text-gray-500">
                        With Knot
                      </p>
                      <p className="text-2xl font-bold text-[#0052FF] mt-2">
                        $28
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
                          <Image
                            src="/avatars/sarah.png"
                            alt="Sarah"
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
                          <Image
                            src="/avatars/mike.png"
                            alt="Mike"
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm font-semibold text-[#0F172A]">
                          Matched with Sarah & Mike
                        </p>
                        <p className="text-xs text-gray-500">
                          Flight UA234 · Landing in 15m
                        </p>
                      </div>
                    </div>
                    <div className="size-9 rounded-full bg-[#0052FF]/10 border border-[#BFDBFE] flex items-center justify-center">
                      <MessageSquare className="size-4 text-[#0052FF]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-10 lg:mt-14">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.10)] border border-gray-100 p-4 md:p-5">
              <p className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0052FF]" />
                Post a ride — tell us where you&apos;re heading
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end">
                {/* From */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">From</label>
                  <AddressInput
                    value={searchFrom}
                    onChange={(val) => setSearchFrom(val)}
                    placeholder="Leaving from"
                    inputId="landing-from"
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm"
                  />
                </div>

                {/* To */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">To</label>
                  <AddressInput
                    value={searchTo}
                    onChange={(val) => setSearchTo(val)}
                    placeholder="Going to"
                    inputId="landing-to"
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 w-full min-w-[150px] justify-start bg-gray-50 border-gray-200 rounded-lg text-sm text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                        {searchDate
                          ? format(searchDate, "MMM d, yyyy")
                          : <span className="text-gray-400">Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={searchDate}
                        onSelect={setSearchDate}
                        disabled={(d) => d < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Passengers */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Passengers</label>
                  <Select value={searchSeats} onValueChange={setSearchSeats}>
                    <SelectTrigger className="h-11 w-full min-w-[110px] bg-gray-50 border-gray-200 rounded-lg text-sm">
                      <Users className="mr-2 h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} {n === 1 ? "passenger" : "passengers"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search / Post Button */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-transparent select-none hidden lg:block">Go</label>
                  <Button
                    onClick={() => {
                      if (!searchFrom.trim() || !searchTo.trim()) {
                        toast.error("Please enter where you're leaving from and going to.");
                        return;
                      }
                      const params = new URLSearchParams();
                      params.set("from", searchFrom.trim());
                      params.set("to", searchTo.trim());
                      if (searchDate) {
                        params.set("date", format(searchDate, "yyyy-MM-dd"));
                      }
                      if (searchSeats !== "1") {
                        params.set("seats", searchSeats);
                      }
                      const postUrl = `/post-ride?${params.toString()}`;
                      router.push(postUrl);
                    }}
                    className="h-11 w-full px-6 bg-[#0052FF] hover:bg-[#0042CC] text-white rounded-lg font-semibold text-sm shadow-[0_8px_20px_rgba(0,82,255,0.25)] transition-all hover:scale-[1.02]"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Post a ride
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Use a general area like UCLA or LAX. You can share the exact meetup spot later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist — Early access */}
      <section
        id="waitlist-form"
        className="scroll-mt-20 py-16 px-6 bg-white/60 backdrop-blur-[2px] border-t border-gray-100/50 relative z-10"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-[#0F172A]">
              Flying out for spring break?
            </h3>
            <p className="mt-3 text-lg text-gray-600">
              Split your airport ride with students from your school. Match with nearby students, share the ride, and cut the cost.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Built by students. Focused on safety + same-campus matching.
            </p>
          </div>
          <Card className="border-gray-200 bg-white shadow-xl rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <h4 className="text-lg font-semibold text-[#0F172A] mb-5">
                Join early access
              </h4>
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="waitlist-school" className="text-gray-700">
                    School
                  </Label>
                  <Select
                    value={waitlistSchool}
                    onValueChange={(v) => setWaitlistSchool(v as WaitlistSchool)}
                    required
                  >
                    <SelectTrigger
                      id="waitlist-school"
                      className="w-full h-11 rounded-full border-gray-200 bg-white"
                    >
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAITLIST_SCHOOLS.map((s) => (
                        <SelectItem key={s} value={s} className="rounded-lg">
                          {s === "other" ? "Other" : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {waitlistSchool === "other" && (
                    <Input
                      id="waitlist-school-other"
                      type="text"
                      placeholder="Type your school name"
                      value={waitlistSchoolOther}
                      onChange={(e) => setWaitlistSchoolOther(e.target.value)}
                      className="mt-2 h-11 rounded-full border-gray-200"
                      maxLength={200}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-email" className="text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    placeholder="you@school.edu"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    className="h-11 rounded-full border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-airport" className="text-gray-700">
                    Airport traveling to
                  </Label>
                  <Select
                    value={waitlistAirport}
                    onValueChange={(v) => setWaitlistAirport(v as WaitlistAirport)}
                    required
                  >
                    <SelectTrigger
                      id="waitlist-airport"
                      className="w-full h-11 rounded-full border-gray-200 bg-white"
                    >
                      <SelectValue placeholder="Select airport" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAITLIST_AIRPORTS.map((a) => (
                        <SelectItem key={a} value={a} className="rounded-lg">
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
                  disabled={waitlistSubmitting}
                >
                  {waitlistSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Join early access"
                  )}
                </Button>
              </form>
              <p className="mt-4 text-xs text-gray-500 text-center">
                We'll only message you about launch + important ride updates. No spam.
              </p>
            </CardContent>
          </Card>
          <div className="mt-8 text-center">
            <p className="text-xl font-semibold text-[#0F172A]">
              {waitlistTotal.toLocaleString()} students joined early access
            </p>
          </div>
        </div>
      </section>

      {/* Impact & Focus Section (Page 2) */}
      <section
        ref={featuresRef}
        className="py-28 px-6 bg-white/40 backdrop-blur-[2px] opacity-0 transition-opacity duration-1000 delay-200 border-t border-gray-100/50 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h3
              data-scroll-animate
              className="text-4xl font-bold text-[#0F172A] mb-4 opacity-0 translate-y-8"
            >
              Designed for shared trips
            </h3>
            <p
              data-scroll-animate
              className="text-xl text-gray-600 max-w-2xl mx-auto opacity-0 translate-y-8"
            >
              Knot brings people heading to the same direction into one ride,
              turning solo trips into shared savings.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-14">
            <div
              data-stat-animate
              className="space-y-2 text-center opacity-0 translate-y-8 transition-all duration-700"
            >
              <div className="text-5xl font-bold text-[#0F172A] mb-2">
                75%
              </div>
              <div className="text-lg text-gray-600">Average savings</div>
            </div>
            <div
              data-stat-animate
              className="space-y-2 text-center opacity-0 translate-y-8 transition-all duration-700"
            >
              <div className="text-5xl font-bold text-[#0F172A] mb-2">
                12K+
              </div>
              <div className="text-lg text-gray-600">Rides matched</div>
            </div>
            <div
              data-stat-animate
              className="space-y-2 text-center opacity-0 translate-y-8 transition-all duration-700"
            >
              <div className="text-5xl font-bold text-[#0F172A] mb-2">
                4.9★
              </div>
              <div className="text-lg text-gray-600">Traveler rating</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Maximum Savings",
                description:
                  "Split fares and save up to 75% on rides. Why pay full price when you can share the cost?",
              },
              {
                icon: Users,
                title: "Verified Community",
                description:
                  "All users are verified with email and phone. See ratings and ride history before you match.",
              },
              {
                icon: CheckCircle2,
                title: "Smart Coordination",
                description:
                  "Our algorithm matches you with travelers heading the same way at the same time. No hassle.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                data-scroll-animate
                className="bg-white text-[#0F172A] p-8 rounded-xl space-y-4 transition-all hover:scale-105 hover:shadow-xl border border-gray-200 opacity-0 translate-y-8 scale-95 group"
              >
                <feature.icon className="w-12 h-12 mb-4 text-[#0052FF] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                <h4 className="text-xl font-semibold">{feature.title}</h4>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section (Page 3) */}
      <section
        ref={howItWorksRef}
        id="how-it-works"
        className="py-28 px-6 bg-white/40 backdrop-blur-[2px] opacity-0 transition-opacity duration-1000 delay-300 border-t border-gray-100/50 relative z-10"
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h3
              data-scroll-animate
              className="text-4xl font-bold text-[#0F172A] mb-4 opacity-0 translate-y-8"
            >
              How It Works
            </h3>
            <p
              data-scroll-animate
              className="text-xl text-gray-600 opacity-0 translate-y-8"
            >
              Three simple steps to start saving on your next ride.
            </p>
          </div>

          <div className="space-y-2">
            {accordionItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeAccordion === item.id;
              return (
                <div
                  key={item.id}
                  data-scroll-animate
                  className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:border-[#0052FF] opacity-0 translate-y-8 scale-95"
                >
                  <button
                    onClick={() =>
                      setActiveAccordion(isActive ? null : item.id)
                    }
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-6 h-6 text-[#0052FF]" />
                      <span className="text-lg font-semibold text-[#0F172A]">
                        {item.title}
                      </span>
                    </div>
                    <ArrowRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${isActive ? "rotate-90" : ""
                        }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${isActive ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                  >
                    <div className="px-6 pb-5 pt-2 text-gray-600 leading-relaxed">
                      {item.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            data-scroll-animate
            className="mt-14 border-t border-gray-200 pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-0 translate-y-8"
          >
            <div className="space-y-3 max-w-md">
              <h4 className="text-2xl font-semibold text-[#0F172A]">
                Ready to split your next ride?
              </h4>
              <p className="text-base text-gray-600">
                Post a ride, get matched, and message your ride partner—all in
                a few taps. Same trip, smaller bill.
              </p>
            </div>
            <Link href="/login">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-[#0052FF] hover:bg-[#0042CC] text-white rounded-lg transition-all hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-200/50 bg-white/40 backdrop-blur-[2px] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Knot. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-[#0052FF] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#0052FF] transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-[#0052FF] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
