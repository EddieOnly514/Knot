"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Bell,
    Shield,
    Eye,
    Moon,
    Globe,
    HelpCircle,
    FileText,
    LogOut,
    ChevronRight,
    Trash2,
    User,
    Lock,
    Mail,
} from "lucide-react";

export default function SettingsPage() {
    const { signOut, user } = useAuth();
    const router = useRouter();

    interface SettingsItem {
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        description: string;
        action?: () => void;
        disabled?: boolean;
        toggle?: boolean;
        defaultOn?: boolean;
    }

    const settingsGroups: { title: string; items: SettingsItem[] }[] = [
        {
            title: "Account",
            items: [
                {
                    icon: User,
                    label: "Edit Profile",
                    description: "Name, photo, and personal info",
                    action: () => router.push("/profile"),
                },
                {
                    icon: Mail,
                    label: "Email",
                    description: user?.email || "Not set",
                    disabled: true,
                },
                {
                    icon: Lock,
                    label: "Password & Security",
                    description: "Update your password",
                    action: () => { },
                },
            ],
        },
        {
            title: "Preferences",
            items: [
                {
                    icon: Bell,
                    label: "Notifications",
                    description: "Push and email notifications",
                    toggle: true,
                    defaultOn: true,
                },
                {
                    icon: Moon,
                    label: "Dark Mode",
                    description: "Toggle dark appearance",
                    toggle: true,
                    defaultOn: false,
                },
                {
                    icon: Globe,
                    label: "Language",
                    description: "English",
                    action: () => { },
                },
            ],
        },
        {
            title: "Privacy & Safety",
            items: [
                {
                    icon: Eye,
                    label: "Profile Visibility",
                    description: "Control who can see your profile",
                    action: () => { },
                },
                {
                    icon: Shield,
                    label: "Blocked Users",
                    description: "Manage blocked accounts",
                    action: () => { },
                },
            ],
        },
        {
            title: "Support",
            items: [
                {
                    icon: HelpCircle,
                    label: "Help Center",
                    description: "FAQs and support",
                    action: () => { },
                },
                {
                    icon: FileText,
                    label: "Terms of Service",
                    description: "Read our terms",
                    action: () => { },
                },
                {
                    icon: Shield,
                    label: "Privacy Policy",
                    description: "Read our privacy policy",
                    action: () => { },
                },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/home")}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {settingsGroups.map((group) => (
                    <Card key={group.title}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                                {group.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 p-2">
                            {group.items.map((item, idx) => (
                                <div key={item.label}>
                                    <button
                                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-default"
                                        onClick={item.action}
                                        disabled={item.disabled}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                                                <item.icon className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {item.label}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {item.description}
                                                </div>
                                            </div>
                                        </div>
                                        {item.toggle ? (
                                            <Switch defaultChecked={item.defaultOn} />
                                        ) : (
                                            !item.disabled && (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            )
                                        )}
                                    </button>
                                    {idx < group.items.length - 1 && (
                                        <Separator className="mx-4" />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}

                {/* Sign Out */}
                <Card>
                    <CardContent className="p-2">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors"
                            onClick={signOut}
                        >
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                                <LogOut className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="text-sm font-medium text-red-600">Sign Out</span>
                        </button>
                    </CardContent>
                </Card>

                {/* Delete Account */}
                <Card>
                    <CardContent className="p-2">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors"
                            onClick={() => { }}
                        >
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-red-600">
                                    Delete Account
                                </div>
                                <div className="text-xs text-slate-500">
                                    Permanently remove your data
                                </div>
                            </div>
                        </button>
                    </CardContent>
                </Card>

                {/* Version */}
                <p className="text-center text-xs text-slate-400 pb-4">
                    Knot v1.0.0
                </p>
            </main>
        </div>
    );
}
