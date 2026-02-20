"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Settings,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const items = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/post", label: "Post Ride", icon: Plus },
  { href: "/matches", label: "Matches", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const navigate = (path: string) => {
    router.push(path);
    onNavigate?.();
  };

  return (
    <>
      <div className="px-3 pb-6 pt-6">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-left"
        >
          <span className="h-4 w-4 shrink-0" aria-hidden />
          <div className="flex flex-col leading-tight">
            <div className="text-2xl font-bold tracking-tight text-[#0052FF]">
              Knot
            </div>
            <div className="text-xs text-zinc-500">Ride Together</div>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((it) => {
            const isActive =
              pathname === it.href || pathname.startsWith(`${it.href}/`);
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={onNavigate}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-zinc-900 font-semibold"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 text-zinc-500" />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 border-t border-zinc-200 pt-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.photo_url || undefined} />
                <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                  {profile?.first_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <div className="truncate text-sm font-medium text-zinc-900">
                  {profile?.first_name
                    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
                    : "Your profile"}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {profile?.school || "View account"}
                </div>
              </div>
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}

export function SidebarNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: always-visible sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile: menu button in a compact top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center border-b border-zinc-200 bg-white px-3 md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-col leading-tight ml-2">
          <span className="text-lg font-bold tracking-tight text-[#0052FF]">Knot</span>
          <span className="text-[10px] text-zinc-500">Ride Together</span>
        </div>
      </div>

      {/* Mobile: sidebar as overlay drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white shadow-xl md:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-3">
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-bold tracking-tight text-[#0052FF]">Knot</span>
                <span className="text-xs text-zinc-500">Ride Together</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 touch-manipulation"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
