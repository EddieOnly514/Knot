"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Settings,
  Plus,
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

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white md:flex md:flex-col">
      <div className="px-3 pb-6 pt-6">
        <button
          type="button"
          onClick={() => router.push("/home")}
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
            onClick={() => router.push("/profile")}
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
    </aside>
  );
}

