import React from "react";
import MinddoAnimatedLogo from "./MinddoAnimatedLogo";

/**
 * MinddoSplashScreen - Professional mobile-first app loading / splash screen.
 * - Reuses the exact animated Minddo SVG logo verbatim.
 * - Clean, premium light lavender / white background.
 * - Navy (#0B0F33) and purple (#7234DC) brand colors.
 * - Vertically and horizontally centered with responsive aspect ratio preservation.
 * - Subtle indeterminate brand purple loading indicator.
 * - Respects mobile safe areas and prevents scrolling/overflow.
 * - Distraction-free (no buttons, menus, or cards).
 */
export default function MinddoSplashScreen({ isFadingOut = false }) {
  return (
    <div
      id="minddo-splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none touch-none overscroll-none transition-all duration-350 ease-out ${
        isFadingOut
          ? "opacity-0 scale-[0.985] pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        backgroundColor: "#FAF9FE",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      role="status"
      aria-label="Loading Minddo"
      aria-live="polite"
    >
      <style>{`
        /* Minimalist ambient radial gradient */
        .minddo-splash-backdrop {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 48%, rgba(114, 52, 220, 0.05) 0%, rgba(250, 249, 254, 0.85) 60%, #FAF9FE 100%);
        }

        /* Subtle brand purple loading indicator */
        .minddo-splash-progress-track {
          width: 130px;
          height: 3.5px;
          border-radius: 9999px;
          background-color: rgba(114, 52, 220, 0.12);
          overflow: hidden;
          position: relative;
        }

        @media (min-width: 640px) {
          .minddo-splash-progress-track {
            width: 160px;
            height: 4px;
          }
        }

        .minddo-splash-progress-bar {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 9999px;
          background: linear-gradient(90deg, #7234DC 0%, #9055FA 50%, #7234DC 100%);
          box-shadow: 0 0 8px rgba(114, 52, 220, 0.4);
          animation: splashIndeterminate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes splashIndeterminate {
          0% {
            left: -40%;
            width: 35%;
          }
          50% {
            left: 30%;
            width: 55%;
          }
          100% {
            left: 105%;
            width: 35%;
          }
        }
      `}</style>

      {/* Ambient background glow */}
      <div className="minddo-splash-backdrop" />

      {/* Prominently centered content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-6 max-w-sm sm:max-w-lg md:max-w-xl">
        {/* Exact Minddo Animated SVG Logo */}
        <div className="w-full flex justify-center items-center py-2">
          <MinddoAnimatedLogo maxWidth="100%" className="w-full max-w-[290px] sm:max-w-[420px] md:max-w-[500px]" />
        </div>

        {/* Subtle Brand Purple Loading Indicator */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center justify-center">
          <div className="minddo-splash-progress-track">
            <div className="minddo-splash-progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
