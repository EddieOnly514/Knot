import * as React from "react";
import { cn } from "@/lib/utils";

interface ElevatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    pressable?: boolean;
}

const ElevatedCard = React.forwardRef<HTMLDivElement, ElevatedCardProps>(
    ({ className, children, pressable = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "bg-surface rounded-3xl shadow-card border border-slate-100",
                    pressable && "transition-transform duration-150 ease-in-out active:scale-[0.98] cursor-pointer",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

ElevatedCard.displayName = "ElevatedCard";

export { ElevatedCard };
