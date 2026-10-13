import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import samAvatar from "../assets/sam-avatar.png";

const SAM_MESSAGES = [
  "Hi, it's me Sam! How can I help?",
  "Hi, it's me Sam! Need help with your tasks?",
  "Hi, it's me Sam! Ready when you are.",
  "Hi, it's me Sam! What's on your mind today?",
  "Hi, it's me Sam! Tap here to chat with me.",
];

export default function FloatingSamButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showBubble, setShowBubble] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  // If already on the Sam chat page, do not render redundant FAB or bubble
  const isSamPage = location.pathname === "/sam" || location.pathname === "/command-center";

  // Recurring 1-minute interval timer + initial prompt
  useEffect(() => {
    if (isSamPage) {
      setShowBubble(false);
      return;
    }

    // Initial greeting shortly after load (4 seconds)
    const initialTimer = setTimeout(() => {
      setShowBubble(true);
    }, 4000);

    // Prompt every 1 minute (60,000 ms) frequently
    const intervalTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SAM_MESSAGES.length);
      setShowBubble(true);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isSamPage]);

  // Auto-dismiss the bubble after 8 seconds of display
  useEffect(() => {
    if (!showBubble) return;

    const autoDismiss = setTimeout(() => {
      setShowBubble(false);
    }, 8000);

    return () => clearTimeout(autoDismiss);
  }, [showBubble]);

  if (isSamPage) {
    return null;
  }

  const handleOpenChat = () => {
    setShowBubble(false);
    navigate("/sam");
  };

  return (
    <div
      className="fixed bottom-[85px] right-[16px] lg:bottom-6 lg:right-6 z-50 flex flex-col items-end pointer-events-none"
      aria-label="Sam AI Assistant"
    >
      {/* Speech Bubble / Chat Message Popup appearing frequently every minute */}
      {showBubble && (
        <div
          onClick={handleOpenChat}
          className="pointer-events-auto mb-2 mr-0.5 sm:mr-1 max-w-[240px] sm:max-w-[270px] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-[#703ceb]/40 dark:border-[#703ceb]/40 shadow-xl shadow-[#703ceb]/20 rounded-2xl rounded-br-xs p-3 text-left cursor-pointer transition-all duration-300 animate-scale-in hover:scale-[1.02] active:scale-98 group select-none relative"
          role="alert"
          aria-live="polite"
        >
          {/* Header Row: Online status badge + Dismiss button */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a782f7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#703ceb]"></span>
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#703ceb] dark:text-[#a782f7] flex items-center gap-1">
                Sam
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Message Content */}
          <p className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
            {SAM_MESSAGES[messageIndex]}
          </p>

          {/* Subtle Call To Action */}
          <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
            <span>Tap to chat</span>
            <span className="text-[#703ceb] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </div>

          {/* Speech Bubble Arrow Tail pointing towards floating Sam avatar */}
          <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white/95 dark:bg-[#18181b]/95 border-r border-b border-[#703ceb]/40 dark:border-[#703ceb]/40 transform rotate-45 pointer-events-none" />
        </div>
      )}

      {/* Circular Floating Action Button (FAB) for Sam */}
      <button
        type="button"
        onClick={handleOpenChat}
        className="pointer-events-auto relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#703ceb] hover:bg-[#5f2fd0] shadow-xl shadow-[#703ceb]/35 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#703ceb]/30 overflow-hidden"
        title="Chat with Sam"
        aria-label="Open Sam Chat"
      >
        {/* Minddo brand purple background, circular, waving hand keyframe animation */}
        <img
          src={samAvatar}
          alt="Sam AI Assistant"
          className="h-full w-full rounded-full object-cover sam-waving bg-[#703ceb] pointer-events-none select-none"
        />
      </button>
    </div>
  );
}
