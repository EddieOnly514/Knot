"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const links = [
  { href: "/matches", label: "Find a Ride" },
  { href: "/history", label: "My Trips" },
  { href: "/messages", label: "Inbox" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  // Hide on small screens and unauthenticated routes
  if (
    typeof window !== "undefined" &&
    (pathname === "/" || pathname === "/login" || pathname === "/onboarding")
  ) {
    return null;
  }

  return (
    <header className="hidden border-b border-zinc-200 bg-white/80 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="text-4xl font-bold tracking-tight text-[#0052FF]"
        >
          Knot
        </button>

        <nav className="flex items-center gap-3 text-sm">
          {links.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-zinc-900 font-semibold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Button
            className="h-9 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => router.push("/post")}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Request
          </Button>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="flex items-center gap-3"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.photo_url || undefined} />
              <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-medium">
                {profile?.first_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
}

