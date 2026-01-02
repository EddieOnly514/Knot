import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    showArrow?: boolean;
    isLoading?: boolean;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
    ({ className, children, showArrow = false, isLoading = false, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "w-full h-14 gradient-primary rounded-xl",
                    "text-white font-headline font-bold text-lg",
                    "flex items-center justify-center gap-2",
                    "transition-transform duration-150 ease-in-out",
                    "active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                    "shadow-float",
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        {children}
                        {showArrow && <ArrowRight className="w-5 h-5" />}
                    </>
                )}
            </button>
        );
    }
);

ActionButton.displayName = "ActionButton";

export { ActionButton };
