import React from "react";

/**
 * Exact animated Minddo SVG logo as requested.
 * Preserves all original SVG paths, colors, CSS animations, keyframes, transforms, and effects verbatim.
 * Scalable and responsive with aspectRatio preserved via viewBox="0 0 760 250".
 */
export default function MinddoAnimatedLogo({ className = "", maxWidth = "740px" }) {
  return (
    <div className={`w-full flex justify-center items-center ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 760 250"
        className="minddo-exact-svg"
        width="100%"
        height="100%"
        style={{ maxWidth, height: "auto", overflow: "visible" }}
      >
        <style>{`
          /* Monoline stroke styles matching exact logo font */
          .brand-stroke-navy {
            fill: none;
            stroke: #0B0F33;
            stroke-width: 20;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          .brand-stroke-purple {
            fill: none;
            stroke: #7234DC;
            stroke-width: 20;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          .brand-fill-navy {
            fill: #0B0F33;
          }
          
          /* Root subtle cheer bounce */
          .minddo-root {
            transform-origin: 370px 145px;
            animation: globalCheer 5.20s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
          }
          @keyframes globalCheer {
            0%, 75% { transform: translateY(0); }
            78% { transform: translateY(-7px) scale(1.01, 0.99); }
            84% { transform: translateY(0) scale(1, 1); }
            100% { transform: translateY(0) scale(1, 1); }
          }

          /* --- LETTER 1: 'm' Drop & Tiptoe Step --- */
          .walk-char-m {
            transform-origin: 104px 190px;
            animation: walkDropM 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropM {
            0% { transform: translateY(-240px) rotate(-16deg); opacity: 0; }
            2% { opacity: 1; }
            12% { transform: translateY(0) rotate(5deg) scale(1.14, 0.86); }
            17% { transform: translateY(-16px) rotate(-3deg) scale(0.95, 1.05); }
            22% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
          }

          /* --- LETTER 2: 'i' Stem Drop --- */
          .walk-char-i {
            transform-origin: 236px 190px;
            animation: walkDropI 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropI {
            0%, 4% { transform: translateY(-240px) rotate(14deg); opacity: 0; }
            6% { opacity: 1; }
            16% { transform: translateY(0) rotate(-6deg) scale(1.16, 0.84); }
            21% { transform: translateY(-14px) rotate(2deg) scale(0.94, 1.06); }
            26% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
          }

          /* --- LETTER 3: 'n' Drop --- */
          .walk-char-n {
            transform-origin: 310px 190px;
            animation: walkDropN 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropN {
            0%, 8% { transform: translateY(-240px) rotate(-12deg); opacity: 0; }
            10% { opacity: 1; }
            20% { transform: translateY(0) rotate(5deg) scale(1.15, 0.85); }
            25% { transform: translateY(-14px) rotate(-2deg) scale(0.95, 1.05); }
            30% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
          }

          /* --- LETTER 4: First 'd' Drop (Navy) --- */
          .walk-char-d1 {
            transform-origin: 424px 190px;
            animation: walkDropD1 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropD1 {
            0%, 12% { transform: translateY(-240px) rotate(12deg); opacity: 0; }
            14% { opacity: 1; }
            24% { transform: translateY(0) rotate(-5deg) scale(1.16, 0.84); }
            29% { transform: translateY(-14px) rotate(2deg) scale(0.94, 1.06); }
            34% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
          }

          /* --- LETTER 5: Second 'd' Drop (Purple) & Squash Reaction --- */
          .walk-char-d2 {
            transform-origin: 538px 190px;
            animation: walkDropD2 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropD2 {
            0%, 16% { transform: translateY(-240px) rotate(-14deg); opacity: 0; }
            18% { opacity: 1; }
            28% { transform: translateY(0) rotate(6deg) scale(1.18, 0.82); }
            33% { transform: translateY(-16px) rotate(-2deg) scale(0.92, 1.08); }
            38% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            /* Pre-impact and tick shockwave squash */
            72% { transform: scale(1, 1); }
            74% { transform: scale(0.92, 1.08) translateY(-4px); }
            76% { transform: scale(1.22, 0.78) translateY(8px); }
            81% { transform: scale(0.94, 1.08) translateY(-3px); }
            86% { transform: scale(1, 1) translateY(0); }
            100% { transform: scale(1, 1) translateY(0); }
          }

          /* --- LETTER 6: 'o' Drop --- */
          .walk-char-o {
            transform-origin: 652px 190px;
            animation: walkDropO 5.20s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes walkDropO {
            0%, 20% { transform: translateY(-240px) rotate(16deg); opacity: 0; }
            22% { opacity: 1; }
            32% { transform: translateY(0) rotate(-6deg) scale(1.2, 0.8); }
            37% { transform: translateY(-14px) rotate(2deg) scale(0.94, 1.06); }
            42% { transform: translateY(0) rotate(0deg) scale(1, 1); }
            100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
          }

          /* --- THE MISCHIEVOUS DOT OF 'i' --- */
          .character-dot-i {
            transform-origin: 236px 54px;
            animation: dotTrampolinePlay 5.20s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes dotTrampolinePlay {
            0%, 36% {
              transform: translate(-100px, -240px) scale(0.5);
              opacity: 0;
            }
            37% { opacity: 1; }
            /* Hits right hump of 'm' at x=176, y=104 */
            43% {
              transform: translate(-60px, 48px) scale(1.4, 0.6);
            }
            /* High trampoline leap */
            49% {
              transform: translate(-28px, -45px) scale(0.8, 1.25) rotate(35deg);
            }
            /* Lands on top of 'i' stem */
            54% {
              transform: translate(0px, 8px) scale(1.35, 0.65);
            }
            /* Wobbles left */
            59% {
              transform: translate(-8px, -8px) scale(0.95, 1.05) rotate(-20deg);
            }
            /* Catches balance right */
            65% {
              transform: translate(6px, -3px) scale(1.05, 0.95) rotate(14deg);
            }
            /* Centers neatly */
            70% {
              transform: translate(0px, 0px) scale(1, 1) rotate(0deg);
            }
            /* Involuntary hop from tick impact shock */
            76% {
              transform: translate(0px, -22px) scale(0.86, 1.2);
            }
            81% {
              transform: translate(0px, 0px) scale(1.14, 0.86);
            }
            86%, 100% {
              transform: translate(0px, 0px) scale(1, 1);
              opacity: 1;
            }
          }

          /* --- THE SUPERHERO TICK SWOOP & IMPACT --- */
          .character-tick {
            transform-origin: 536px 150px;
            animation: tickSuperheroArrival 5.20s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
            will-change: transform, opacity;
          }
          @keyframes tickSuperheroArrival {
            0%, 68% {
              transform: translate(260px, -180px) rotate(55deg) scale(0.3);
              opacity: 0;
            }
            69% { opacity: 1; }
            /* Enters with high-speed skid neatly into the hollow of purple 'd' */
            76% {
              transform: translate(0px, 5px) rotate(-6deg) scale(1.3, 0.75);
            }
            /* Rebound spring */
            81% {
              transform: translate(0px, -8px) rotate(2deg) scale(0.95, 1.08);
            }
            /* Locks perfectly into logo position */
            87% {
              transform: translate(0px, 0px) rotate(0deg) scale(1.02, 1.02);
            }
            93%, 100% {
              transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
              opacity: 1;
            }
          }

          /* Impact Shockwave and Sparkles */
          .impact-shockwave {
            transform-origin: 538px 147px;
            animation: pulseWave 5.20s ease-out infinite;
            opacity: 0;
          }
          @keyframes pulseWave {
            0%, 75% { opacity: 0; transform: scale(0.2); }
            76% { opacity: 0.85; transform: scale(0.4); }
            84% { opacity: 0; transform: scale(2.4); }
            100% { opacity: 0; }
          }

          .sparkle-1 { transform-origin: 538px 147px; animation: spark1 5.20s ease-out infinite; }
          .sparkle-2 { transform-origin: 538px 147px; animation: spark2 5.20s ease-out infinite; }
          .sparkle-3 { transform-origin: 538px 147px; animation: spark3 5.20s ease-out infinite; }

          @keyframes spark1 {
            0%, 75% { opacity: 0; transform: translate(0,0) scale(0); }
            77% { opacity: 1; }
            84% { opacity: 0; transform: translate(44px, -42px) scale(1.4); }
            100% { opacity: 0; }
          }
          @keyframes spark2 {
            0%, 75% { opacity: 0; transform: translate(0,0) scale(0); }
            77% { opacity: 1; }
            84% { opacity: 0; transform: translate(-42px, -35px) scale(1.3); }
            100% { opacity: 0; }
          }
          @keyframes spark3 {
            0%, 75% { opacity: 0; transform: translate(0,0) scale(0); }
            77% { opacity: 1; }
            84% { opacity: 0; transform: translate(40px, 38px) scale(1.3); }
            100% { opacity: 0; }
          }
        `}</style>

        <g className="minddo-root">
          {/* Superhero landing effects centered at purple d (cx=538, cy=147) */}
          <circle className="impact-shockwave" cx="538" cy="147" r="46" fill="none" stroke="#7234DC" strokeWidth="4.5" strokeOpacity="0.8" />
          <circle className="sparkle-1" cx="538" cy="147" r="3.5" fill="#FFC837" />
          <circle className="sparkle-2" cx="538" cy="147" r="3.5" fill="#7234DC" />
          <circle className="sparkle-3" cx="538" cy="147" r="3" fill="#00E599" />

          {/* ==================== 'm' ==================== */}
          <g className="walk-char-m">
            <path className="brand-stroke-navy" d="M 32 190 L 32 104 M 32 131 C 41 114, 60 104, 81 104 C 105 104, 119 119, 119 142 L 119 190" />
            <path className="brand-stroke-navy" d="M 119 131 C 128 114, 147 104, 168 104 C 192 104, 206 119, 206 142 L 206 190" />
          </g>

          {/* ==================== 'i' ==================== */}
          <g className="walk-char-i">
            <line className="brand-stroke-navy" x1="236" y1="104" x2="236" y2="190" />
          </g>
          {/* Dot of 'i' */}
          <circle className="brand-fill-navy character-dot-i" cx="236" cy="54" r="14" />

          {/* ==================== 'n' ==================== */}
          <g className="walk-char-n">
            <line className="brand-stroke-navy" x1="266" y1="104" x2="266" y2="190" />
            <path className="brand-stroke-navy" d="M 266 131 C 275 114, 294 104, 315 104 C 339 104, 353 119, 353 142 L 353 190" />
          </g>

          {/* ==================== FIRST 'd' (Dark Navy) ==================== */}
          <g className="walk-char-d1">
            <circle className="brand-stroke-navy" cx="424" cy="147" r="43" />
            <line className="brand-stroke-navy" x1="467" y1="36" x2="467" y2="190" />
          </g>

          {/* ==================== SECOND 'd' (Purple) ==================== */}
          <g className="walk-char-d2">
            <circle className="brand-stroke-purple" cx="538" cy="147" r="43" />
            <line className="brand-stroke-purple" x1="581" y1="36" x2="581" y2="190" />
          </g>

          {/* ==================== 'o' (Dark Navy) ==================== */}
          <g className="walk-char-o">
            <circle className="brand-stroke-navy" cx="652" cy="147" r="43" />
          </g>

          {/* ==================== BRAND TICK (COMPLETELY INSIDE INNER 'd' COUNTER) ==================== */}
          {/* Inner hollow circle radius is 33px (cx=538, cy=147).
               This tick stays cleanly within [x: 517 to 559, y: 133 to 166], matching the logo's inner placement. */}
          <path
            className="brand-fill-navy character-tick"
            d="M 527.2 153.8
               C 524.4 150.2, 520.6 148.0, 517.2 149.0
               C 515.1 149.6, 514.4 151.9, 515.9 153.8
               C 518.8 157.3, 523.2 162.3, 527.8 165.2
               C 529.7 166.4, 532.2 165.7, 533.8 163.3
               C 539.6 154.5, 549.0 140.2, 558.8 133.2
               C 560.8 132.1, 560.1 129.8, 558.0 130.0
               C 552.4 130.6, 543.5 136.6, 534.2 147.2
               C 530.8 151.1, 528.2 154.8, 527.2 153.8
               Z"
          />
        </g>
      </svg>
    </div>
  );
}
