"use client";

import { useState, useEffect, useCallback } from "react";
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
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getConversations } from "@/lib/services/chatService";

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
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = (path: string) => {
    router.push(path);
    onNavigate?.();
  };

  // Fetch unread message count for the sidebar badge
  const fetchUnread = useCallback(async () => {
    if (!profile) return;
    try {
      const convs = await getConversations(profile.id);
      const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {
      // Non-critical — badge just won't show
    }
  }, [profile]);

  useEffect(() => {
    const initialFetchTimeout = setTimeout(() => {
      void fetchUnread();
    }, 0);
    // Poll every 30s for badge updates
    const interval = setInterval(() => {
      void fetchUnread();
    }, 30_000);
    return () => {
      clearTimeout(initialFetchTimeout);
      clearInterval(interval);
    };
  }, [fetchUnread]);

  return (
    <div className="flex h-full flex-col">
      {/* Knot branding */}
      <div className="px-4 pb-7 pt-6">
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="rounded-2xl px-3 py-2 text-left transition-colors hover:bg-blue-50"
        >
          <span className="text-2xl font-extrabold tracking-[-0.05em] text-[#075cff]">Knot</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((it) => {
            const isActive =
              pathname === it.href || pathname.startsWith(`${it.href}/`);
            const Icon = it.icon;
            const showBadge = it.href === "/messages" && unreadCount > 0;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={onNavigate}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-[#075cff] to-[#2587ff] text-white shadow-[0_8px_18px_rgba(7,92,255,0.22)]"
                      : "text-zinc-600 hover:bg-blue-50 hover:text-blue-800",
                  ].join(" ")}
                >
                  <Icon className={[
                    "h-[18px] w-[18px]",
                    isActive ? "text-white" : "text-zinc-400",
                  ].join(" ")} />
                  <span className="flex-1">{it.label}</span>
                  {showBadge && (
                    <Badge className={[
                      "ml-auto h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white text-[#0052FF]"
                        : "bg-[#0052FF] text-white",
                    ].join(" ")}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Profile link */}
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-zinc-50"
          >
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
          </button>
        </div>
      </nav>

      {/* Support section at bottom */}
      <div className="px-4 pb-5 pt-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Support
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Need help with your commute?</p>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help Center
          </button>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: always-visible sidebar — card-like with rounded corner */}
      <aside className="hidden w-64 shrink-0 border-r border-blue-100/70 bg-white/75 md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile: menu button in a compact top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center border-b border-blue-100/70 bg-white/90 px-3 backdrop-blur-xl md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="ml-2">
          <span className="text-xl font-extrabold tracking-[-0.05em] text-[#075cff]">Knot</span>
        </div>
      </div>

      {/* Mobile: sidebar as overlay drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl md:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
            role="dialog"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div>
                <span className="text-xl font-extrabold tracking-[-0.05em] text-[#075cff]">Knot</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 touch-manipulation"
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
