"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Calendar as CalendarIcon,
  Search,
  ShieldCheck,
  Phone,
  GraduationCap,
  Star,
  Instagram,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddressInput } from "@/components/address-input";
import { cn } from "@/lib/utils";

const HOW_KNOT_WORKS_STEPS = [
  {
    id: 0,
    title: "Post a ride",
    description: "Enter your destination and departure time.",
    icon: MapPin,
  },
  {
    id: 1,
    title: "Match riders",
    description: "Find riders going the same way.",
    icon: Users,
  },
  {
    id: 2,
    title: "Split the cost",
    description: "Ride together and pay a fraction of the price.",
    icon: CheckCircle2,
  },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Search bar state
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState<Date | undefined>(undefined);
  const [searchSeats, setSearchSeats] = useState("1");

  // How It Works state
  const [howItWorksProgress, setHowItWorksProgress] = useState(0);
  const [activeHowItWorksStep, setActiveHowItWorksStep] = useState(0);
  const [howItWorksLineMetrics, setHowItWorksLineMetrics] = useState({ top: 20, height: 0 });

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const mapBgRef = useRef<HTMLDivElement>(null);
  const dotsBgRef = useRef<HTMLDivElement>(null);
  const howItWorksSectionRef = useRef<HTMLDivElement>(null);
  const howItWorksStepRefs = useRef<Array<HTMLDivElement | null>>([]);
  const howItWorksIconRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Scroll animations + parallax
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
            if (entry.isIntersecting) entry.target.classList.add(className);
          });
        },
        { threshold: 0.1 }
      );
      if (ref.current) {
        observer.observe(ref.current);
        observers.push(observer);
      }
    };

    createObserver(heroRef, "animate-fade-in-up");
    createObserver(featuresRef, "animate-fade-in-up");

    // data-scroll-animate elements
    const animateElements = () => {
      const elements = document.querySelectorAll("[data-scroll-animate]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              const delay = reduceMotion ? 0 : index * 100;
              setTimeout(() => entry.target.classList.add("animate-in"), delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );
      elements.forEach((el) => observer.observe(el));
      observers.push(observer);
    };

    // data-animate elements (how-it-works steps)
    const animateDataAnimate = () => {
      const elements = document.querySelectorAll("[data-animate]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
      );
      elements.forEach((el) => observer.observe(el));
      observers.push(observer);
    };

    // Stats stagger
    const animateStats = () => {
      const stats = document.querySelectorAll("[data-stat-animate]");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              const delay = reduceMotion ? 0 : index * 150;
              setTimeout(() => entry.target.classList.add("animate-scale-in"), delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      stats.forEach((stat) => observer.observe(stat));
      observers.push(observer);
    };

    // Parallax
    let raf = 0;
    const onScroll = () => {
      if (reduceMotion || raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        if (mapBgRef.current)
          mapBgRef.current.style.transform = `translate3d(0, ${Math.min(40, y * 0.12)}px, 0)`;
        if (dotsBgRef.current)
          dotsBgRef.current.style.transform = `translate3d(0, ${Math.min(18, y * 0.05)}px, 0)`;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    setTimeout(() => {
      animateElements();
      animateDataAnimate();
      animateStats();
    }, 100);

    return () => {
      observers.forEach((obs) => obs.disconnect());
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // How It Works scroll progress
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateProgress = () => {
      const section = howItWorksSectionRef.current;
      const stepEls = howItWorksStepRefs.current.filter((s): s is HTMLDivElement => s !== null);
      const iconEls = howItWorksIconRefs.current.filter((i): i is HTMLDivElement => i !== null);
      if (!section || stepEls.length === 0 || iconEls.length === 0) return;

      const sectionRect = section.getBoundingClientRect();
      const marker = window.innerHeight * 0.42;
      const iconCenters = iconEls.map((icon) => {
        const r = icon.getBoundingClientRect();
        return r.top - sectionRect.top + r.height / 2;
      });
      const lineTop = iconCenters[0];
      const lineHeight = Math.max(iconCenters[iconCenters.length - 1] - lineTop, 1);
      const markerOffset = marker - sectionRect.top;
      const nextProgress = Math.min(Math.max((markerOffset - lineTop) / lineHeight, 0), 1);

      let nextActiveStep = 0;
      for (let i = 1; i < stepEls.length; i++) {
        const prev = stepEls[i - 1].getBoundingClientRect();
        const curr = stepEls[i].getBoundingClientRect();
        const switchPoint =
          (prev.top - sectionRect.top + prev.height / 2 +
            curr.top - sectionRect.top + curr.height / 2) / 2;
        if (markerOffset >= switchPoint) nextActiveStep = i;
      }

      setHowItWorksProgress(nextProgress);
      setActiveHowItWorksStep(nextActiveStep);
      setHowItWorksLineMetrics((prev) => {
        const t = Math.round(lineTop);
        const h = Math.round(lineHeight);
        return prev.top === t && prev.height === h ? prev : { top: t, height: h };
      });
    };

    let frame = 0;
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; updateProgress(); });
    };

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

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
            <span className="text-2xl font-bold tracking-tight text-[#0052FF]">Knot</span>
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              How it works
            </a>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
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

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="pt-28 pb-16 px-6 lg:min-h-[78vh] opacity-0 transition-opacity duration-1000 relative overflow-hidden z-10"
      >
        <div
          aria-hidden="true"
          ref={dotsBgRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{
            backgroundImage: "radial-gradient(rgba(15,23,42,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(ellipse at 35% 30%, black 55%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 35% 30%, black 55%, transparent 75%)",
          }}
        />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8 pl-6 lg:pl-8">
              <div className="space-y-5">
                <h2 className="text-5xl md:text-6xl font-bold text-[#0F172A] leading-tight tracking-tight">
                  <span className="block">Your people are</span>
                  <span className="block text-[#0052FF]">already heading</span>
                  <span className="block">your way.</span>
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                  Knot matches you with verified students from your campus heading the same way — so you never have to uber solo again.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex -space-x-2">
                  {["ea", "km", "sr"].map((name) => (
                    <div key={name} className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
                      <Image src={`/avatars/${name}.png`} alt={name.toUpperCase()} width={36} height={36} className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <div className="size-9 rounded-full bg-gray-900 text-white border border-white shadow-sm flex items-center justify-center text-[11px] font-semibold">
                    1k+
                  </div>
                </div>
                <p className="text-sm text-gray-600">Join 1,000+ happy travelers this week.</p>
              </div>
            </div>

            {/* Right Column - Savings visualization */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#E0E7FF] via-white to-[#DBEAFE] p-6 lg:p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out hover:scale-[1.02] border border-gray-100">
                <div className="grid gap-6">
                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-center gap-3">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-gray-500">From</p>
                      <p className="text-sm font-semibold text-[#0F172A]">UCI</p>
                    </div>
                    <div className="flex flex-1 items-center gap-1 px-4">
                      <div className="h-px flex-1 bg-[#BFDBFE]" />
                      <ArrowRight className="size-4 shrink-0 text-[#0052FF]" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-gray-500">To</p>
                      <p className="text-sm font-semibold text-[#0F172A]">LAX</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-[#FEE2E2]/40 border border-[#FECACA] px-5 py-5 text-center">
                      <p className="text-xs font-semibold text-gray-500">Solo Ride</p>
                      <p className="text-2xl font-bold text-[#0F172A] mt-2">$102</p>
                    </div>
                    <div className="rounded-2xl bg-[#DCFCE7]/40 border border-[#BBF7D0] px-5 py-5 text-center">
                      <p className="text-xs font-semibold text-gray-500">With Knot</p>
                      <p className="text-2xl font-bold text-[#0052FF] mt-2">$28</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
                          <Image src="/avatars/sarah.png" alt="Sarah" width={36} height={36} className="h-full w-full object-cover" />
                        </div>
                        <div className="size-9 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden">
                          <Image src="/avatars/mike.png" alt="Mike" width={36} height={36} className="h-full w-full object-cover" />
                        </div>
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm font-semibold text-[#0F172A]">Matched with Sarah & Mike</p>
                        <p className="text-xs text-gray-500">Flight UA234 · Landing in 15m</p>
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
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.10)] border-2 border-[#0052FF] p-5 md:p-7 lg:p-8">
              <p className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0052FF]" />
                Post a ride now!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">From</label>
                  <AddressInput value={searchFrom} onChange={setSearchFrom} placeholder="Leaving from" inputId="landing-from" className="h-12 bg-gray-50 border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">To</label>
                  <AddressInput value={searchTo} onChange={setSearchTo} placeholder="Going to" inputId="landing-to" className="h-12 bg-gray-50 border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-12 w-full min-w-[150px] justify-start bg-gray-50 border-gray-200 rounded-lg text-sm text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                        {searchDate ? format(searchDate, "MMM d, yyyy") : <span className="text-gray-400">Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={searchDate} onSelect={setSearchDate} disabled={(d) => d < new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Passengers</label>
                  <Select value={searchSeats} onValueChange={setSearchSeats}>
                    <SelectTrigger className="h-12 w-full min-w-[110px] bg-gray-50 border-gray-200 rounded-lg text-sm">
                      <Users className="mr-2 h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "passenger" : "passengers"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      if (searchDate) params.set("date", format(searchDate, "yyyy-MM-dd"));
                      if (searchSeats !== "1") params.set("seats", searchSeats);
                      router.push(`/post-ride?${params.toString()}`);
                    }}
                    className="h-12 w-full px-6 bg-[#0052FF] hover:bg-[#0042CC] text-white rounded-lg font-semibold text-sm shadow-[0_8px_20px_rgba(0,82,255,0.25)] transition-all hover:scale-[1.02]"
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

      {/* Shared Trips Feature Section */}
      <section
        ref={featuresRef}
        className="py-24 px-6 bg-white/60 backdrop-blur-[2px] opacity-0 transition-opacity duration-1000 delay-200 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p data-scroll-animate className="text-sm font-semibold uppercase tracking-widest text-[#0052FF] mb-3 opacity-0 translate-y-8">
              Why Knot
            </p>
            <h3 data-scroll-animate className="text-4xl font-bold text-[#0F172A] opacity-0 translate-y-8">
              Designed for shared trips
            </h3>
            <p data-scroll-animate className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto opacity-0 translate-y-8">
              Knot brings students heading the same direction into one ride, turning solo fares into shared savings.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { val: "75%", label: "Average savings", sub: "vs. solo ride" },
              { val: "12K+", label: "Rides matched", sub: "and counting" },
              { val: "4.9★", label: "Traveler rating", sub: "from verified riders" },
            ].map(({ val, label, sub }) => (
              <div
                key={label}
                data-stat-animate
                className="rounded-2xl border border-gray-100 bg-white px-6 py-8 text-center shadow-sm opacity-0 translate-y-8 transition-all duration-700"
              >
                <div className="text-5xl font-bold text-[#0052FF]">{val}</div>
                <div className="mt-2 text-lg font-semibold text-[#0F172A]">{label}</div>
                <div className="mt-1 text-sm text-gray-400">{sub}</div>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Maximum Savings",
                description: "Split fares with students heading the same way. Pay a fraction of the solo price every trip.",
              },
              {
                icon: Users,
                title: "Campus-first Matching",
                description: "Knot prioritises people from your school heading toward the same destination window.",
              },
              {
                icon: CheckCircle2,
                title: "Clear Coordination",
                description: "One shared ride plan, one visible split, and less back-and-forth before pickup.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                data-scroll-animate
                className="group rounded-2xl border border-gray-200 bg-white p-8 text-[#0F172A] shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 opacity-0 translate-y-8 scale-95"
              >
                <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-[#EFF6FF]">
                  <feature.icon className="size-6 text-[#0052FF]" />
                </div>
                <h4 className="text-lg font-semibold">{feature.title}</h4>
                <p className="mt-3 leading-relaxed text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-12 px-6 bg-white/60 backdrop-blur-[2px] relative z-10"
      >
        <div className="max-w-5xl mx-auto">
          <div data-animate className="how-step-reveal mb-4 text-center">
            <h3 className="text-4xl font-bold text-[#0052FF]">How Knot Works</h3>
          </div>

          <div ref={howItWorksSectionRef} className="relative">
            {/* Progress line */}
            <div
              aria-hidden="true"
              className="absolute left-6 hidden w-px bg-gray-200 sm:block"
              style={{ top: `${howItWorksLineMetrics.top}px`, height: `${howItWorksLineMetrics.height}px` }}
            />
            <div
              aria-hidden="true"
              className="absolute left-6 hidden w-px bg-[#0052FF] sm:block"
              style={{ top: `${howItWorksLineMetrics.top}px`, height: `${howItWorksLineMetrics.height * howItWorksProgress}px` }}
            />

            <div className="space-y-0">
              {HOW_KNOT_WORKS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isStepActive = index <= activeHowItWorksStep;
                const isCurrentStep = index === activeHowItWorksStep;
                const isPast = index < activeHowItWorksStep;

                return (
                  <div
                    key={step.id}
                    data-animate
                    aria-current={isCurrentStep ? "step" : undefined}
                    ref={(el) => { howItWorksStepRefs.current[index] = el; }}
                    className="how-step-reveal how-works-step-card relative flex min-h-[85vh] items-center"
                    style={{ transitionDelay: `${index * 150}ms` }}
                  >
                    <div className={cn(
                      "relative grid w-full gap-5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-8 transition-all duration-500",
                      isCurrentStep
                        ? "opacity-100 scale-100"
                        : isPast
                          ? "opacity-40 scale-[0.97]"
                          : "opacity-30 scale-[0.97]"
                    )}>
                    <div
                      ref={(el) => { howItWorksIconRefs.current[index] = el; }}
                      className={cn(
                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 sm:mx-auto",
                        isCurrentStep
                          ? "border-[#BFDBFE] bg-[#0052FF] text-white shadow-[0_14px_32px_rgba(0,82,255,0.32)] scale-110"
                          : isStepActive
                            ? "border-[#BFDBFE] bg-[#0052FF] text-white shadow-[0_8px_20px_rgba(0,82,255,0.15)]"
                            : "border-gray-200 bg-white text-gray-400"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <div className={cn(
                      "rounded-3xl border bg-white p-8 sm:p-12 transition-all duration-500",
                      isCurrentStep
                        ? "border-[#BFDBFE] shadow-[0_32px_80px_rgba(0,82,255,0.14)]"
                        : "border-gray-200 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                    )}>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300",
                          isCurrentStep ? "bg-[#0052FF] text-white" : "bg-gray-100 text-gray-400"
                        )}>
                          {index + 1}
                        </span>
                        <p className={cn(
                          "text-sm font-semibold uppercase tracking-wider transition-colors duration-300",
                          isCurrentStep ? "text-[#0052FF]" : "text-gray-400"
                        )}>Step {index + 1}</p>
                      </div>
                      <h4 className="mt-5 text-4xl font-bold text-[#0F172A]">{step.title}</h4>
                      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">{step.description}</p>

                      {index === 0 ? (
                        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {[
                              ["From", "LAX Terminal 2"],
                              ["To", "UCLA Campus"],
                              ["Date", "Fri, Mar 20 · 5:30 PM"],
                              ["Passengers", "2 seats"],
                              ["Preference", "Conversation"],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
                                <p className="mt-2 text-lg font-semibold text-[#0F172A]">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {index === 1 ? (
                        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
                          <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                            {/* Your ride card */}
                            <div className="match-column rounded-2xl border border-gray-200 bg-white p-6">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Your ride</p>
                              <p className="mt-3 text-xl font-semibold text-[#0F172A]">LAX → UCLA</p>
                              <p className="mt-2 text-sm text-gray-500">Fri, Mar 20 · 5:30 PM</p>
                            </div>

                            {/* Connection */}
                            <div className="match-arrow flex flex-col items-center justify-center gap-2 py-2">
                              <div className="hidden h-full w-px bg-[#BFDBFE] sm:block" />
                              <div className="flex items-center gap-2 text-[#0052FF]">
                                <CheckCircle2 className="size-5" />
                                <span className="text-base font-semibold whitespace-nowrap">92% route match</span>
                              </div>
                              <div className="hidden h-full w-px bg-[#BFDBFE] sm:block" />
                            </div>

                            {/* Matched rider card */}
                            <div className="match-column rounded-2xl border border-gray-200 bg-white p-6">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0052FF] text-sm font-semibold text-white">KM</div>
                                <div>
                                  <p className="text-lg font-semibold text-[#0F172A]">Kevin M.</p>
                                  <p className="text-sm text-gray-500">UCLA · 4.9 ★</p>
                                </div>
                              </div>
                              <p className="mt-4 text-xl font-semibold text-[#0F172A]">LAX → Westwood</p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {index === 2 ? (
                        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-8">
                          <div className="cost-split-visual relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-6 sm:px-8">
                            <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
                              <p className="-translate-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Total ride cost</p>
                              <div className="split-total mt-2 flex h-20 w-20 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#0052FF] text-[1.75rem] font-bold text-white shadow-[0_14px_32px_rgba(0,82,255,0.22)]">
                                $100
                              </div>
                              <div className="-mt-px h-6 w-px bg-[#93C5FD]" />
                              <div className="relative w-full">
                                <div className="mx-auto h-px bg-[#93C5FD]" style={{ width: "75%" }} />
                                <div className="grid grid-cols-2 sm:grid-cols-4">
                                  {[1, 2, 3, 4].map((share) => (
                                    <div key={share} className="flex flex-col items-center">
                                      <div className="split-line h-5 w-px bg-[#93C5FD]" style={{ transitionDelay: `${share * 60}ms` }} />
                                      <div className="split-share w-full border border-gray-200 bg-gray-50 px-2 py-4 text-center" style={{ transitionDelay: `${share * 80}ms` }}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Person {share}</p>
                                        <p className="mt-1 text-2xl font-semibold text-[#0F172A]">$25</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* Safety Section */}
      <section className="py-28 px-6 bg-white/60 backdrop-blur-[2px] relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-1.5 text-sm font-semibold text-[#0052FF] mb-4">
              <ShieldCheck className="size-4" />
              Safety first
            </div>
            <h3 className="text-4xl font-bold text-[#0F172A]">We value your safety</h3>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Every rider on Knot is verified. We built multiple layers of trust so you can ride with confidence.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Phone,
                title: "Phone verified",
                desc: "Every account requires SMS verification before posting or joining a ride.",
              },
              {
                icon: GraduationCap,
                title: "School verified",
                desc: "Riders verify their .edu email so you know you're sharing with a real student.",
              },
              {
                icon: Star,
                title: "Rider ratings",
                desc: "Rate every ride. Low-rated users are flagged and reviewed by our team.",
              },
              {
                icon: Users,
                title: "Ride preferences",
                desc: "Filter by gender preference, max passengers, and verified-only riders.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white/90 p-7 text-center transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#0052FF]">
                    <Icon className="size-6" />
                  </div>
                  <h4 className="text-lg font-semibold text-[#0F172A]">{item.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-20 px-6 bg-white/60 backdrop-blur-[2px] relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-md">
            <h4 className="text-2xl font-semibold text-[#0F172A]">Ready to split your next ride?</h4>
            <p className="text-base text-gray-600">Post a ride, get matched, and message your ride partner—all in a few taps.</p>
          </div>
          <Link href="/login">
            <Button size="lg" className="h-14 px-8 text-lg bg-[#0052FF] hover:bg-[#0042CC] text-white rounded-lg transition-all hover:scale-105">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-200/30 bg-white/60 backdrop-blur-[2px] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-gray-600 text-sm">© {new Date().getFullYear()} Knot. All rights reserved.</div>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-[#0052FF] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#0052FF] transition-colors">Terms</Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
              <a href="mailto:eddiewang46@gmail.com" className="hover:text-[#0052FF] transition-colors">
                eddiewang46@gmail.com
              </a>
              <a href="tel:6124699098" className="hover:text-[#0052FF] transition-colors">
                6124699098
              </a>
            </div>
            <div className="flex items-center">
              <a
                href="https://www.instagram.com/knot_ride/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-[#BFDBFE] hover:text-[#0052FF]"
              >
                <Instagram className="size-4" />
                Instagram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
