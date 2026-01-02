import * as React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

type BadgeVariant = "verified" | "safety";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant: BadgeVariant;
    children?: React.ReactNode;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
    ({ className, variant, children, ...props }, ref) => {
        const variants = {
            verified: "bg-blue-50 text-primary",
            safety: "bg-slate-900 text-white",
        };

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    variants[variant],
                    className
                )}
                {...props}
            >
                {variant === "verified" && <ShieldCheck className="w-3.5 h-3.5" />}
                {children || (variant === "verified" ? "Verified" : "Safety Warning")}
            </span>
        );
    }
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge };
