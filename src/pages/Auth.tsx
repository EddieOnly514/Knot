import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { Phone } from "lucide-react";

const KnotLogo = () => (
    <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-float-up"
    >
        {/* Two interlocking circles */}
        <circle
            cx="28"
            cy="40"
            r="20"
            stroke="#0052FF"
            strokeWidth="4"
            fill="none"
        />
        <circle
            cx="52"
            cy="40"
            r="20"
            stroke="#4D7CFF"
            strokeWidth="4"
            fill="none"
        />
    </svg>
);

const Auth = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger fade-in animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleContinue = () => {
        navigate("/profile-setup");
    };

    const handleBypass = () => {
        navigate("/home");
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-between px-6 py-12 pb-safe">
            {/* Top spacer */}
            <div className="flex-1" />

            {/* Center content */}
            <div
                className={`flex flex-col items-center gap-6 transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
            >
                <KnotLogo />
                <div className="text-center">
                    <h1 className="font-headline text-3xl font-bold text-text-main">
                        Knot
                    </h1>
                    <p className="text-text-muted text-lg mt-2">
                        Get moving together.
                    </p>
                </div>
            </div>

            {/* Bottom spacer */}
            <div className="flex-1" />

            {/* Bottom buttons */}
            <div
                className={`w-full max-w-sm space-y-3 transition-all duration-700 ease-out delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}
            >
                <ActionButton onClick={handleContinue} showArrow>
                    <Phone className="w-5 h-5 mr-1" />
                    Continue with Phone
                </ActionButton>

                {/* Dev bypass button */}
                <button
                    onClick={handleBypass}
                    className="w-full py-3 text-text-muted text-sm font-medium hover:text-primary transition-colors"
                >
                    Skip for now (Dev Mode)
                </button>
            </div>
        </div>
    );
};

export default Auth;
