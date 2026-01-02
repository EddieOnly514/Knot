import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { ElevatedCard } from "@/components/ui/elevated-card";
import { Star, ThumbsUp, Flag, Ban, ArrowLeft, CheckCircle } from "lucide-react";

const PostTrip = () => {
    const navigate = useNavigate();
    const { matchId } = useParams();

    const [step, setStep] = useState<"confirm" | "rate" | "done">("confirm");
    const [tripCompleted, setTripCompleted] = useState<boolean | null>(null);
    const [rating, setRating] = useState(0);
    const [wouldRideAgain, setWouldRideAgain] = useState<boolean | null>(null);
    const [comment, setComment] = useState("");
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState("");

    const matchName = "Sarah K."; // TODO: Get from match data
    const matchPhoto = "/profiles/sarah.png";

    const handleConfirmTrip = (completed: boolean) => {
        setTripCompleted(completed);
        if (completed) {
            setStep("rate");
        } else {
            setShowReport(true);
        }
    };

    const handleSubmitRating = () => {
        // TODO: Submit to Supabase
        console.log({ rating, wouldRideAgain, comment });
        setStep("done");
    };

    const handleBlock = () => {
        // TODO: Block user in Supabase
        console.log("Blocking user");
        navigate("/home");
    };

    const handleReport = () => {
        // TODO: Submit report to Supabase
        console.log({ reportReason });
        navigate("/home");
    };

    if (step === "done") {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-safe">
                <div className="text-center animate-scale-in">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="font-headline text-2xl font-bold text-text-main mb-2">
                        Thanks for your feedback!
                    </h1>
                    <p className="text-text-muted">
                        Your rating helps keep Knot safe and friendly.
                    </p>
                </div>
                <div className="w-full max-w-sm mt-8">
                    <ActionButton onClick={() => navigate("/home")}>
                        Back to Home
                    </ActionButton>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-4 py-6 pb-safe">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center"
                >
                    <ArrowLeft className="w-5 h-5 text-text-main" />
                </button>
                <h1 className="font-headline text-xl font-bold text-text-main">
                    Trip Complete
                </h1>
            </div>

            {/* Profile Card */}
            <ElevatedCard className="p-6 mb-6">
                <div className="flex items-center gap-4">
                    <img
                        src={matchPhoto}
                        alt={matchName}
                        className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                        <h2 className="font-headline font-semibold text-text-main text-lg">
                            {matchName}
                        </h2>
                        <p className="text-text-muted text-sm">Your ride partner</p>
                    </div>
                </div>
            </ElevatedCard>

            {step === "confirm" && !showReport && (
                <div className="space-y-4 animate-fade-in">
                    <h2 className="font-headline text-lg font-semibold text-text-main text-center">
                        Did you complete the trip with {matchName}?
                    </h2>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleConfirmTrip(true)}
                            className="flex-1 py-4 rounded-xl bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors"
                        >
                            ✓ Yes, we rode together
                        </button>
                        <button
                            onClick={() => handleConfirmTrip(false)}
                            className="flex-1 py-4 rounded-xl bg-slate-100 text-text-muted font-medium hover:bg-slate-200 transition-colors"
                        >
                            ✗ No, it didn't happen
                        </button>
                    </div>
                </div>
            )}

            {step === "rate" && (
                <div className="space-y-6 animate-fade-in">
                    {/* Star Rating */}
                    <div className="text-center">
                        <p className="text-text-muted text-sm mb-3">
                            How was your ride with {matchName}?
                        </p>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-10 h-10 ${star <= rating
                                                ? "fill-yellow-400 text-yellow-400"
                                                : "text-slate-300"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Would Ride Again */}
                    <div>
                        <p className="text-text-muted text-sm mb-3 text-center">
                            Would you ride with {matchName} again?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setWouldRideAgain(true)}
                                className={`flex-1 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${wouldRideAgain === true
                                        ? "bg-primary text-white shadow-card"
                                        : "bg-slate-100 text-text-muted hover:bg-slate-200"
                                    }`}
                            >
                                <ThumbsUp className="w-5 h-5" />
                                Yes!
                            </button>
                            <button
                                onClick={() => setWouldRideAgain(false)}
                                className={`flex-1 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${wouldRideAgain === false
                                        ? "bg-slate-800 text-white shadow-card"
                                        : "bg-slate-100 text-text-muted hover:bg-slate-200"
                                    }`}
                            >
                                <ThumbsUp className="w-5 h-5 rotate-180" />
                                No
                            </button>
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <textarea
                            placeholder="Optional: Leave a comment..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full h-24 px-4 py-3 rounded-2xl border border-transparent bg-slate-50 text-text-main placeholder:text-text-muted resize-none focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <ActionButton
                        onClick={handleSubmitRating}
                        disabled={rating === 0}
                    >
                        Submit Rating
                    </ActionButton>
                </div>
            )}

            {showReport && (
                <div className="space-y-4 animate-fade-in">
                    <ElevatedCard className="p-4">
                        <h3 className="font-medium text-text-main mb-3">
                            What happened?
                        </h3>
                        <textarea
                            placeholder="Tell us what went wrong..."
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 bg-white text-text-main placeholder:text-text-muted resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </ElevatedCard>

                    <div className="flex gap-3">
                        <button
                            onClick={handleReport}
                            className="flex-1 py-4 rounded-xl bg-orange-50 text-orange-600 font-medium flex items-center justify-center gap-2"
                        >
                            <Flag className="w-5 h-5" />
                            Report
                        </button>
                        <button
                            onClick={handleBlock}
                            className="flex-1 py-4 rounded-xl bg-red-50 text-red-600 font-medium flex items-center justify-center gap-2"
                        >
                            <Ban className="w-5 h-5" />
                            Block
                        </button>
                    </div>

                    <button
                        onClick={() => navigate("/home")}
                        className="w-full py-3 text-text-muted text-sm"
                    >
                        Skip for now
                    </button>
                </div>
            )}
        </div>
    );
};

export default PostTrip;
