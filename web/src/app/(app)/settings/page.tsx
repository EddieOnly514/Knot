"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, LogOut, ChevronRight, Trash2, User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUser,
} from "@/lib/services/userSafetyService";

interface SettingsItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  action?: () => void;
  disabled?: boolean;
  toggle?: boolean;
  defaultOn?: boolean;
}

export default function SettingsPage() {
  const { signOut, user, profile } = useAuth();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    // Ensure components that may behave differently between
    // server and client (like Radix Switch) only render after mount.
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadBlocked() {
      try {
        setBlockedLoading(true);
        const list = await getBlockedUsers();
        if (!cancelled) {
          setBlockedUsers(list);
        }
      } catch (err) {
        console.error("[SettingsPage] Failed to load blocked users", err);
      } finally {
        if (!cancelled) {
          setBlockedLoading(false);
        }
      }
    }

    loadBlocked();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      if (!res.ok) {
        console.error("[SettingsPage] Failed to delete account", await res.text());
        alert("Something went wrong deleting your account. Please try again.");
        return;
      }

      await signOut();
    } catch (error) {
      console.error("[SettingsPage] Delete account error", error);
      alert("Something went wrong deleting your account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const settingsGroups: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          icon: Shield,
          label: "Edit profile",
          description: "Update your name, school, and preferences",
          action: () => router.push("/profile"),
        },
        {
          icon: Shield,
          label: "Verify phone",
          description: profile?.phone_verified
            ? "Phone number verified"
            : "Add or verify your phone for extra trust",
          action: profile?.phone_verified ? undefined : () => { },
          disabled: profile?.phone_verified,
        },
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: Bell,
          label: "Ride activity",
          description: "New ride requests, ride accepted, ride canceled (coming soon)",
          toggle: true,
          defaultOn: true,
          disabled: true,
        },
        {
          icon: Bell,
          label: "Reminders",
          description: "Upcoming ride and departure time reminders (coming soon)",
          toggle: true,
          defaultOn: true,
          disabled: true,
        },
        {
          icon: Bell,
          label: "Marketing",
          description: "Product updates and promotions (coming soon)",
          toggle: true,
          defaultOn: false,
          disabled: true,
        },
      ],
    },
    {
      title: "Privacy & safety",
      items: [
        {
          icon: Shield,
          label: "Blocked users",
          description:
            blockedUsers.length > 0
              ? `${blockedUsers.length} blocked account${blockedUsers.length > 1 ? "s" : ""}`
              : "Manage blocked accounts",
          action: () => {
            setShowBlocked((prev) => !prev);
          },
        },
        {
          icon: Trash2,
          label: "Delete account",
          description: "Permanently delete your account and data",
          action: handleDeleteAccount,
          disabled: isDeleting,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 pb-6">
      <PageHeader
        title="Settings"
        subtitle="Control your account and app."
        backHref="/profile"
      />

      {settingsGroups.map((group) => (
        <Card key={group.title} className="border-zinc-200 bg-white">
          <CardContent className="px-3 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {group.title}
            </p>
            <div className="space-y-0">
              {group.items.map((item, idx) => (
                <div key={item.label}>
                  {item.toggle ? (
                    <div className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                          <item.icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-zinc-900">
                            {item.label}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      {hasMounted && <Switch defaultChecked={item.defaultOn} disabled={item.disabled} />}
                    </div>
                  ) : (
                    <div
                      role={item.disabled ? undefined : "button"}
                      tabIndex={item.disabled ? -1 : 0}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-left text-sm hover:bg-zinc-50 disabled:cursor-default disabled:opacity-60"
                      onClick={item.disabled ? undefined : item.action}
                      onKeyDown={
                        item.disabled || !item.action
                          ? undefined
                          : (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              item.action?.();
                            }
                          }
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                          <item.icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-zinc-900">
                            {item.label}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      {!item.disabled && (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                  )}
                  {group.title === "Privacy & safety" &&
                    item.label === "Blocked users" &&
                    showBlocked && (
                      <div className="mt-1 space-y-1 rounded-lg bg-zinc-50 px-2 py-2">
                        {blockedLoading && (
                          <p className="text-xs text-zinc-500">
                            Loading blocked users…
                          </p>
                        )}
                        {!blockedLoading && blockedUsers.length === 0 && (
                          <p className="text-xs text-zinc-500">
                            You haven&apos;t blocked anyone yet.
                          </p>
                        )}
                        {!blockedLoading &&
                          blockedUsers.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center justify-between rounded-md px-1 py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-medium text-blue-700">
                                  {u.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={u.photo_url}
                                      alt={u.first_name}
                                      className="h-7 w-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    (u.first_name[0] || "U").toUpperCase()
                                  )}
                                </div>
                                <span className="text-xs font-medium text-zinc-800">
                                  {u.first_name}
                                  {u.last_name
                                    ? ` ${u.last_name[0].toUpperCase()}.`
                                    : ""}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 border-zinc-300 px-2 text-[11px]"
                                onClick={async () => {
                                  const confirmUnblock = window.confirm(
                                    "Unblock this user so they can appear in future matches?",
                                  );
                                  if (!confirmUnblock) return;
                                  try {
                                    await unblockUser(u.blocked_profile_id);
                                    setBlockedUsers((prev) =>
                                      prev.filter((b) => b.id !== u.id),
                                    );
                                  } catch (err) {
                                    console.error(
                                      "[SettingsPage] Failed to unblock user",
                                      err,
                                    );
                                    alert(
                                      "Something went wrong unblocking this user. Please try again.",
                                    );
                                  }
                                }}
                              >
                                Unblock
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  {idx < group.items.length - 1 && (
                    <Separator className="mx-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-zinc-200 bg-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-xs text-zinc-500">
            Sign out of your account.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-zinc-400">
        <Link
          href="/terms"
          className="hover:text-zinc-600 hover:underline"
        >
          Terms of Service
        </Link>{" "}
        ·{" "}
        <Link
          href="/privacy"
          className="hover:text-zinc-600 hover:underline"
        >
          Privacy Policy
        </Link>{" "}
        ·{" "}
        <a
          href="mailto:support@knotapp.com"
          className="hover:text-zinc-600 hover:underline"
        >
          Contact Support
        </a>
      </p>

      <p className="text-center text-[11px] text-zinc-400">
        Knot v1.0.0
      </p>
    </div>
  );
}


