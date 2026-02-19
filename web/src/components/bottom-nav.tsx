"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, Search, MessageCircle, User } from "lucide-react";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/post", label: "Post", icon: PlusCircle },
  { href: "/matches", label: "Matches", icon: Search },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide on desktop and on unauthenticated routes like landing/login
  const hideOnRoutes = ["/", "/login", "/onboarding"];
  if (hideOnRoutes.some((r) => pathname === r || pathname.startsWith("/auth"))) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/90 py-1.5 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-3">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          const isCoreTab =
            tab.href === "/home" ||
            tab.href === "/matches" ||
            tab.href === "/messages";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-0.5 text-[10px]"
            >
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs transition-all",
                  isActive
                    ? isCoreTab
                      ? "bg-blue-600 text-white shadow-md scale-[1.05]"
                      : "bg-blue-600 text-white"
                    : isCoreTab
                      ? "border border-zinc-200 bg-white text-zinc-600 shadow-xs"
                      : "text-zinc-500 hover:bg-zinc-100",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={
                  isActive
                    ? "font-medium text-[11px] text-zinc-900"
                    : "text-[11px] text-zinc-500"
                }
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

