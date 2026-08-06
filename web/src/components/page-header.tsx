"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  rightSlot?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  rightSlot,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (backHref) {
      router.push(backHref);
    } else {
      router.push("/home");
    }
  };

  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-zinc-500 hover:bg-blue-50 hover:text-blue-700 touch-manipulation md:h-9 md:w-9 md:min-h-0 md:min-w-0"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {rightSlot}
    </header>
  );
}

