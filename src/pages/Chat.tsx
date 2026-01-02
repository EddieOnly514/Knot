import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Lock, Send, MapPin, Phone, MessageCircle, Car } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  timestamp: Date;
  isTemplate?: boolean;
}

type UnlockState = "pending" | "waiting" | "unlocked";

const quickTemplates = [
  "Where are you exactly?",
  "I'm at the pickup zone",
  "UberX or XL?",
  "Leaving now!",
];

const Chat = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey! I saw we're both heading to Downtown SF around the same time. Want to share a ride?",
      isMine: false,
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "2",
      text: "Hi! Yes, I'm leaving in about 15 minutes. Would love to split! What terminal are you at?",
      isMine: true,
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "3",
      text: "I'm at Terminal 4, near the baggage claim. Easy to spot - wearing a blue jacket 👋",
      isMine: false,
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [unlockState, setUnlockState] = useState<UnlockState>("pending");
  const [showTemplates, setShowTemplates] = useState(false);

  const matchName = "Sarah";
  const matchPhoto = "/profiles/sarah.png";
  const matchVerified = true;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (text?: string) => {
    const messageText = text || newMessage;
    if (!messageText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: messageText,
        isMine: true,
        timestamp: new Date(),
      },
    ]);
    setNewMessage("");
    setShowTemplates(false);
  };

  const handleConfirmMeetup = () => {
    setUnlockState("waiting");
    // Simulate other user confirming after 3 seconds
    setTimeout(() => {
      setUnlockState("unlocked");
    }, 3000);
  };

  const handleOpenRideApp = (app: "uber" | "lyft") => {
    // Deep link to ride apps
    const destination = encodeURIComponent("123 Main St, San Francisco, CA");
    if (app === "uber") {
      window.open(`uber://?action=setPickup&pickup=my_location&dropoff=${destination}`, "_blank");
    } else {
      window.open(`lyft://ridetype?id=lyft&destination=${destination}`, "_blank");
    }
  };

  const handleCompleteTrip = () => {
    navigate(`/post-trip/${matchId}`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-surface shadow-card px-4 py-3 flex items-center gap-3 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-text-main" />
        </button>
        <img
          src={matchPhoto}
          alt={matchName}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-semibold text-text-main">
              {matchName}
            </h1>
            {matchVerified && <StatusBadge variant="verified" />}
          </div>
          <p className="text-xs text-text-muted">Active now</p>
        </div>
        <button className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Phone className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Safety Banner */}
      {unlockState !== "unlocked" && (
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            Confirm meetup to reveal exact destinations
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[80%]">
              <div
                className={`px-4 py-3 ${message.isMine
                    ? "gradient-primary text-white rounded-2xl rounded-br-md"
                    : "bg-white shadow-card text-text-main rounded-2xl rounded-bl-md"
                  }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
              <p className={`text-xs text-text-muted mt-1 ${message.isMine ? "text-right" : ""}`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Templates */}
      {showTemplates && (
        <div className="px-4 py-2 bg-surface border-t border-slate-100 flex gap-2 overflow-x-auto">
          {quickTemplates.map((template) => (
            <button
              key={template}
              onClick={() => handleSendMessage(template)}
              className="px-3 py-2 rounded-full bg-slate-100 text-text-muted text-sm whitespace-nowrap hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {template}
            </button>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 py-3 bg-surface border-t border-slate-100">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${showTemplates ? "bg-primary/10 text-primary" : "bg-slate-100 text-text-muted"
              }`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 h-12"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-float disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Lock/Unlock Panel */}
      <div className="bg-surface border-t border-slate-100 px-4 py-4 pb-safe">
        {unlockState === "pending" && (
          <ActionButton onClick={handleConfirmMeetup}>
            <MapPin className="w-5 h-5 mr-2" />
            Confirm Meetup Point
          </ActionButton>
        )}

        {unlockState === "waiting" && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-text-muted animate-pulse-slow">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span>Waiting for {matchName} to confirm...</span>
            </div>
          </div>
        )}

        {unlockState === "unlocked" && (
          <div className="space-y-4 animate-fade-in">
            {/* Map Preview */}
            <div className="h-24 bg-slate-200 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-main">Meetup Point</p>
                  <p className="text-xs text-text-muted">Terminal 4 Pickup Zone</p>
                </div>
              </div>
            </div>

            {/* Ride App Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleOpenRideApp("uber")}
                className="flex-1 h-14 bg-black text-white rounded-xl font-headline font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Car className="w-5 h-5" />
                Open Uber
              </button>
              <button
                onClick={() => handleOpenRideApp("lyft")}
                className="flex-1 h-14 bg-[#FF00BF] text-white rounded-xl font-headline font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Car className="w-5 h-5" />
                Open Lyft
              </button>
            </div>

            {/* Complete Trip */}
            <button
              onClick={handleCompleteTrip}
              className="w-full py-3 text-primary text-sm font-medium"
            >
              Trip completed? Rate your ride partner →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
