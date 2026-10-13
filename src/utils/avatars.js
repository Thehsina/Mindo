// src/utils/avatars.js
// Pre-designed, original, non-copyrighted character avatars inspired by Netflix profile selection

const createSvg = (bgGradient, content) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    ${bgGradient}
  </defs>
  <rect width="100" height="100" rx="50" fill="url(#bg)"/>
  ${content}
</svg>`.trim();

export const PRESET_AVATARS = [
  // Animals
  {
    id: "fox",
    name: "Clever Fox",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="100%" stop-color="#c2410c"/>
      </linearGradient>`,
      `<!-- Fox Ears -->
      <polygon points="25,48 20,20 44,34" fill="#ea580c"/>
      <polygon points="26,42 24,24 40,34" fill="#fed7aa"/>
      <polygon points="75,48 80,20 56,34" fill="#ea580c"/>
      <polygon points="74,42 76,24 60,34" fill="#fed7aa"/>
      <!-- Head -->
      <polygon points="50,78 18,48 82,48" fill="#f97316"/>
      <circle cx="50" cy="48" r="28" fill="#f97316"/>
      <!-- White Cheeks -->
      <polygon points="50,78 20,48 38,56" fill="#ffffff"/>
      <polygon points="50,78 80,48 62,56" fill="#ffffff"/>
      <!-- Nose & Eyes -->
      <circle cx="50" cy="74" r="4.5" fill="#1e293b"/>
      <circle cx="36" cy="46" r="4" fill="#0f172a"/>
      <circle cx="64" cy="46" r="4" fill="#0f172a"/>
      <circle cx="37.5" cy="44.5" r="1.5" fill="#ffffff"/>
      <circle cx="65.5" cy="44.5" r="1.5" fill="#ffffff"/>`
    ),
  },
  {
    id: "panda",
    name: "Chill Panda",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10b981"/>
        <stop offset="100%" stop-color="#047857"/>
      </linearGradient>`,
      `<!-- Ears -->
      <circle cx="28" cy="28" r="13" fill="#1e293b"/>
      <circle cx="72" cy="28" r="13" fill="#1e293b"/>
      <!-- Face -->
      <circle cx="50" cy="54" r="32" fill="#ffffff"/>
      <!-- Eye patches -->
      <ellipse cx="37" cy="50" rx="9" ry="11" transform="rotate(-15 37 50)" fill="#1e293b"/>
      <ellipse cx="63" cy="50" rx="9" ry="11" transform="rotate(15 63 50)" fill="#1e293b"/>
      <!-- Eyes -->
      <circle cx="37" cy="48" r="3.5" fill="#ffffff"/>
      <circle cx="63" cy="48" r="3.5" fill="#ffffff"/>
      <circle cx="38" cy="48" r="2" fill="#090d16"/>
      <circle cx="62" cy="48" r="2" fill="#090d16"/>
      <!-- Nose & Mouth -->
      <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#1e293b"/>
      <path d="M 45 68 Q 50 72 55 68" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    ),
  },
  {
    id: "cat",
    name: "Curious Cat",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#5b21b6"/>
      </linearGradient>`,
      `<!-- Ears -->
      <polygon points="20,44 24,18 48,34" fill="#fb923c"/>
      <polygon points="24,38 27,23 43,34" fill="#fecdd3"/>
      <polygon points="80,44 76,18 52,34" fill="#fb923c"/>
      <polygon points="76,38 73,23 57,34" fill="#fecdd3"/>
      <!-- Face -->
      <circle cx="50" cy="54" r="30" fill="#fb923c"/>
      <!-- Muzzle -->
      <ellipse cx="50" cy="64" rx="14" ry="10" fill="#ffffff"/>
      <!-- Eyes -->
      <ellipse cx="36" cy="48" rx="5" ry="7" fill="#10b981"/>
      <ellipse cx="64" cy="48" rx="5" ry="7" fill="#10b981"/>
      <ellipse cx="36" cy="48" rx="2" ry="6" fill="#064e3b"/>
      <ellipse cx="64" cy="48" rx="2" ry="6" fill="#064e3b"/>
      <!-- Nose & Whiskers -->
      <polygon points="47,61 53,61 50,65" fill="#f43f5e"/>
      <path d="M 47 65 Q 44 69 40 68" stroke="#1e293b" stroke-width="2" fill="none"/>
      <path d="M 53 65 Q 56 69 60 68" stroke="#1e293b" stroke-width="2" fill="none"/>
      <line x1="20" y1="58" x2="35" y2="60" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="65" x2="34" y2="64" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="80" y1="58" x2="65" y2="60" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="82" y1="65" x2="66" y2="64" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`
    ),
  },
  {
    id: "owl",
    name: "Wise Owl",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1e3a8a"/>
      </linearGradient>`,
      `<!-- Ear Tufts -->
      <polygon points="26,38 20,18 38,30" fill="#78350f"/>
      <polygon points="74,38 80,18 62,30" fill="#78350f"/>
      <!-- Body -->
      <circle cx="50" cy="54" r="32" fill="#92400e"/>
      <circle cx="50" cy="62" r="22" fill="#fde68a"/>
      <!-- Big Eyes -->
      <circle cx="36" cy="48" r="13" fill="#ffffff"/>
      <circle cx="64" cy="48" r="13" fill="#ffffff"/>
      <circle cx="36" cy="48" r="7" fill="#d97706"/>
      <circle cx="64" cy="48" r="7" fill="#d97706"/>
      <circle cx="36" cy="48" r="4" fill="#0f172a"/>
      <circle cx="64" cy="48" r="4" fill="#0f172a"/>
      <circle cx="38" cy="46" r="1.5" fill="#ffffff"/>
      <circle cx="66" cy="46" r="1.5" fill="#ffffff"/>
      <!-- Beak -->
      <polygon points="46,55 54,55 50,65" fill="#f59e0b"/>`
    ),
  },
  {
    id: "bear",
    name: "Friendly Bear",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>`,
      `<!-- Ears -->
      <circle cx="26" cy="30" r="12" fill="#78350f"/>
      <circle cx="26" cy="30" r="7" fill="#d97706"/>
      <circle cx="74" cy="30" r="12" fill="#78350f"/>
      <circle cx="74" cy="30" r="7" fill="#d97706"/>
      <!-- Head -->
      <circle cx="50" cy="54" r="32" fill="#854d0e"/>
      <!-- Muzzle -->
      <ellipse cx="50" cy="64" rx="16" ry="12" fill="#fef08a"/>
      <!-- Nose & Eyes -->
      <ellipse cx="50" cy="60" rx="7" ry="4.5" fill="#1e293b"/>
      <path d="M 50 64.5 L 50 69 M 45 69 Q 50 72 55 69" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="48" r="3.5" fill="#1e293b"/>
      <circle cx="64" cy="48" r="3.5" fill="#1e293b"/>
      <circle cx="37" cy="47" r="1" fill="#ffffff"/>
      <circle cx="65" cy="47" r="1" fill="#ffffff"/>`
    ),
  },
  {
    id: "bunny",
    name: "Brisk Bunny",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ec4899"/>
        <stop offset="100%" stop-color="#be185d"/>
      </linearGradient>`,
      `<!-- Tall Ears -->
      <ellipse cx="36" cy="24" rx="8" ry="18" fill="#ffffff" transform="rotate(-8 36 24)"/>
      <ellipse cx="36" cy="24" rx="4.5" ry="13" fill="#fbcfe8" transform="rotate(-8 36 24)"/>
      <ellipse cx="64" cy="24" rx="8" ry="18" fill="#ffffff" transform="rotate(8 64 24)"/>
      <ellipse cx="64" cy="24" rx="4.5" ry="13" fill="#fbcfe8" transform="rotate(8 64 24)"/>
      <!-- Face -->
      <circle cx="50" cy="58" r="28" fill="#ffffff"/>
      <!-- Cheeks -->
      <circle cx="32" cy="62" r="5" fill="#fbcfe8"/>
      <circle cx="68" cy="62" r="5" fill="#fbcfe8"/>
      <!-- Eyes -->
      <ellipse cx="38" cy="52" rx="3.5" ry="4.5" fill="#1e293b"/>
      <ellipse cx="62" cy="52" rx="3.5" ry="4.5" fill="#1e293b"/>
      <circle cx="39" cy="51" r="1.5" fill="#ffffff"/>
      <circle cx="63" cy="51" r="1.5" fill="#ffffff"/>
      <!-- Nose & Smile -->
      <polygon points="48,60 52,60 50,63" fill="#f43f5e"/>
      <path d="M 46 64 Q 50 67 54 64" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`
    ),
  },
  {
    id: "koala",
    name: "Calm Koala",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14b8a6"/>
        <stop offset="100%" stop-color="#0f766e"/>
      </linearGradient>`,
      `<!-- Fluffy Ears -->
      <circle cx="24" cy="34" r="16" fill="#94a3b8"/>
      <circle cx="24" cy="34" r="10" fill="#f8fafc"/>
      <circle cx="76" cy="34" r="16" fill="#94a3b8"/>
      <circle cx="76" cy="34" r="10" fill="#f8fafc"/>
      <!-- Face -->
      <circle cx="50" cy="56" r="30" fill="#94a3b8"/>
      <!-- Big Oval Nose -->
      <ellipse cx="50" cy="58" rx="9" ry="14" fill="#1e293b"/>
      <!-- Eyes -->
      <circle cx="33" cy="48" r="3.5" fill="#0f172a"/>
      <circle cx="67" cy="48" r="3.5" fill="#0f172a"/>
      <circle cx="34" cy="47" r="1.2" fill="#ffffff"/>
      <circle cx="68" cy="47" r="1.2" fill="#ffffff"/>`
    ),
  },
  {
    id: "tiger",
    name: "Brave Tiger",
    category: "Animals",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#9a3412"/>
      </linearGradient>`,
      `<!-- Ears -->
      <circle cx="26" cy="30" r="12" fill="#ea580c"/>
      <circle cx="26" cy="30" r="7" fill="#ffffff"/>
      <circle cx="74" cy="30" r="12" fill="#ea580c"/>
      <circle cx="74" cy="30" r="7" fill="#ffffff"/>
      <!-- Face -->
      <circle cx="50" cy="54" r="32" fill="#f97316"/>
      <!-- Stripes -->
      <polygon points="50,24 47,34 53,34" fill="#1e293b"/>
      <polygon points="36,28 39,36 34,36" fill="#1e293b"/>
      <polygon points="64,28 61,36 66,36" fill="#1e293b"/>
      <polygon points="20,48 30,50 20,53" fill="#1e293b"/>
      <polygon points="80,48 70,50 80,53" fill="#1e293b"/>
      <!-- Muzzle -->
      <circle cx="43" cy="65" r="9" fill="#ffffff"/>
      <circle cx="57" cy="65" r="9" fill="#ffffff"/>
      <!-- Nose & Eyes -->
      <polygon points="46,58 54,58 50,63" fill="#be123c"/>
      <circle cx="36" cy="46" r="4" fill="#0f172a"/>
      <circle cx="64" cy="46" r="4" fill="#0f172a"/>
      <circle cx="37" cy="45" r="1.5" fill="#ffffff"/>
      <circle cx="65" cy="45" r="1.5" fill="#ffffff"/>`
    ),
  },

  // Productivity & Characters
  {
    id: "coder",
    name: "Code Wizard",
    category: "Productivity",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>`,
      `<!-- Headphones Band -->
      <path d="M 22 50 A 28 28 0 0 1 78 50" stroke="#f8fafc" stroke-width="6" fill="none"/>
      <!-- Head -->
      <circle cx="50" cy="54" r="26" fill="#fde047"/>
      <!-- Hair/Beanie -->
      <path d="M 24 50 A 26 26 0 0 1 76 50 Z" fill="#334155"/>
      <!-- Glasses -->
      <rect x="30" y="47" width="16" height="12" rx="3" fill="#0f172a"/>
      <rect x="54" y="47" width="16" height="12" rx="3" fill="#0f172a"/>
      <rect x="46" y="51" width="8" height="3" fill="#0f172a"/>
      <line x1="33" y1="50" x2="43" y2="50" stroke="#38bdf8" stroke-width="2"/>
      <line x1="57" y1="50" x2="67" y2="50" stroke="#38bdf8" stroke-width="2"/>
      <!-- Headphone Pads -->
      <rect x="16" y="44" width="8" height="18" rx="4" fill="#f43f5e"/>
      <rect x="76" y="44" width="8" height="18" rx="4" fill="#f43f5e"/>
      <!-- Smile -->
      <path d="M 44 67 Q 50 72 56 67" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    ),
  },
  {
    id: "creator",
    name: "Artistic Mind",
    category: "Characters",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d946ef"/>
        <stop offset="100%" stop-color="#a21caf"/>
      </linearGradient>`,
      `<!-- Beret -->
      <ellipse cx="50" cy="32" rx="32" ry="14" fill="#f43f5e" transform="rotate(-10 50 32)"/>
      <circle cx="46" cy="18" r="3" fill="#f43f5e"/>
      <!-- Head -->
      <circle cx="50" cy="56" r="26" fill="#fed7aa"/>
      <!-- Hair -->
      <path d="M 24 54 C 24 38 76 38 76 54 C 70 42 30 42 24 54 Z" fill="#475569"/>
      <!-- Glasses -->
      <circle cx="37" cy="54" r="8" fill="none" stroke="#f59e0b" stroke-width="3"/>
      <circle cx="63" cy="54" r="8" fill="none" stroke="#f59e0b" stroke-width="3"/>
      <line x1="45" y1="54" x2="55" y2="54" stroke="#f59e0b" stroke-width="3"/>
      <!-- Eyes & Smile -->
      <circle cx="37" cy="54" r="3" fill="#0f172a"/>
      <circle cx="63" cy="54" r="3" fill="#0f172a"/>
      <path d="M 44 68 Q 50 73 56 68" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    ),
  },
  {
    id: "astro",
    name: "Cosmic Explorer",
    category: "Productivity",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#312e81"/>
      </linearGradient>`,
      `<!-- Helmet -->
      <circle cx="50" cy="52" r="34" fill="#f8fafc"/>
      <!-- Visor -->
      <ellipse cx="50" cy="52" rx="26" ry="20" fill="#0f172a"/>
      <!-- Gold/Cyan Visor Reflection -->
      <path d="M 32 44 Q 50 36 68 44 Q 50 40 32 44 Z" fill="#38bdf8"/>
      <circle cx="60" cy="46" r="4" fill="#fbbf24"/>
      <!-- Neck Band -->
      <rect x="30" y="80" width="40" height="10" rx="4" fill="#ef4444"/>
      <circle cx="50" cy="85" r="3" fill="#ffffff"/>`
    ),
  },
  {
    id: "ninja",
    name: "Stealth Achiever",
    category: "Characters",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>`,
      `<!-- Ninja Hood -->
      <circle cx="50" cy="52" r="32" fill="#1e293b"/>
      <!-- Headband -->
      <rect x="20" y="32" width="60" height="10" fill="#dc2626"/>
      <circle cx="50" cy="37" r="3.5" fill="#f8fafc"/>
      <!-- Eye Opening -->
      <rect x="30" y="44" width="40" height="14" rx="4" fill="#fed7aa"/>
      <!-- Determined Eyes -->
      <polygon points="35,49 45,51 45,49" fill="#0f172a"/>
      <polygon points="65,49 55,51 55,49" fill="#0f172a"/>
      <circle cx="41" cy="51" r="2" fill="#0f172a"/>
      <circle cx="59" cy="51" r="2" fill="#0f172a"/>`
    ),
  },
  {
    id: "zen",
    name: "Zen Master",
    category: "Productivity",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#059669"/>
        <stop offset="100%" stop-color="#065f46"/>
      </linearGradient>`,
      `<!-- Head -->
      <circle cx="50" cy="54" r="30" fill="#fde047"/>
      <!-- Lotus Flower atop -->
      <path d="M 50 16 C 44 24 50 30 50 30 C 50 30 56 24 50 16 Z" fill="#ec4899"/>
      <path d="M 44 20 C 40 26 48 30 48 30 C 48 30 50 24 44 20 Z" fill="#f472b6"/>
      <path d="M 56 20 C 60 26 52 30 52 30 C 52 30 50 24 56 20 Z" fill="#f472b6"/>
      <!-- Serene Closed Eyes -->
      <path d="M 34 50 Q 40 56 46 50" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 54 50 Q 60 56 66 50" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Peaceful Smile -->
      <path d="M 43 65 Q 50 71 57 65" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Rosy Cheeks -->
      <circle cx="33" cy="58" r="4" fill="#fca5a5"/>
      <circle cx="67" cy="58" r="4" fill="#fca5a5"/>`
    ),
  },
  {
    id: "bot",
    name: "Byte Buddy",
    category: "Productivity",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#4338ca"/>
      </linearGradient>`,
      `<!-- Antenna -->
      <line x1="50" y1="16" x2="50" y2="28" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="14" r="5" fill="#f43f5e"/>
      <!-- Robot Head -->
      <rect x="22" y="28" width="56" height="50" rx="14" fill="#e2e8f0"/>
      <!-- Screen/Face Plate -->
      <rect x="28" y="36" width="44" height="34" rx="8" fill="#0f172a"/>
      <!-- Digital Eyes -->
      <rect x="36" y="44" width="8" height="8" rx="2" fill="#38bdf8"/>
      <rect x="56" y="44" width="8" height="8" rx="2" fill="#38bdf8"/>
      <!-- Happy Pixel Smile -->
      <path d="M 42 59 Q 50 65 58 59" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Side Bolts -->
      <rect x="17" y="46" width="5" height="14" rx="2" fill="#94a3b8"/>
      <rect x="78" y="46" width="5" height="14" rx="2" fill="#94a3b8"/>`
    ),
  },
  {
    id: "coffee",
    name: "Espresso Dynamo",
    category: "Productivity",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#78350f"/>
      </linearGradient>`,
      `<!-- Steam -->
      <path d="M 40 18 Q 36 24 40 30" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 50 14 Q 54 22 50 28" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 60 18 Q 56 24 60 30" stroke="#fde68a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Mug Body -->
      <rect x="26" y="32" width="48" height="46" rx="12" fill="#f8fafc"/>
      <!-- Handle -->
      <path d="M 74 42 C 86 42 86 64 74 64" stroke="#f8fafc" stroke-width="6" fill="none" stroke-linecap="round"/>
      <!-- Coffee Face -->
      <circle cx="42" cy="48" r="3.5" fill="#1e293b"/>
      <circle cx="58" cy="48" r="3.5" fill="#1e293b"/>
      <circle cx="43" cy="47" r="1.2" fill="#ffffff"/>
      <circle cx="59" cy="47" r="1.2" fill="#ffffff"/>
      <path d="M 46 58 Q 50 63 54 58" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="36" cy="56" r="3" fill="#fca5a5"/>
      <circle cx="64" cy="56" r="3" fill="#fca5a5"/>`
    ),
  },
  {
    id: "spark",
    name: "Electric Spark",
    category: "Characters",
    svg: createSvg(
      `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#eab308"/>
        <stop offset="100%" stop-color="#ca8a04"/>
      </linearGradient>`,
      `<!-- Star Sparkle Shape -->
      <path d="M 50 14 C 50 34 66 50 86 50 C 66 50 50 66 50 86 C 50 66 34 50 14 50 C 34 50 50 34 50 14 Z" fill="#ffffff"/>
      <!-- Cute Face inside Star -->
      <ellipse cx="44" cy="48" rx="3.5" ry="5" fill="#0f172a"/>
      <ellipse cx="56" cy="48" rx="3.5" ry="5" fill="#0f172a"/>
      <circle cx="45" cy="47" r="1.5" fill="#ffffff"/>
      <circle cx="57" cy="47" r="1.5" fill="#ffffff"/>
      <path d="M 47 57 Q 50 61 53 57" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="54" r="3.5" fill="#f472b6"/>
      <circle cx="62" cy="54" r="3.5" fill="#f472b6"/>`
    ),
  },
];

// Helper to convert SVG to Data URI safely
export function svgToDataUri(svgString) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

// Map for instant O(1) lookup
export const AVATAR_MAP = new Map(
  PRESET_AVATARS.map((av) => [av.id, svgToDataUri(av.svg)])
);

// Fallback letter-based avatar generator
export function createLetterAvatar(letter = "U") {
  const char = (letter || "U").charAt(0).toUpperCase();
  const svg = createSvg(
    `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>`,
    `<text x="50" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="900" fill="#ffffff" text-anchor="middle">${char}</text>`
  );
  return svgToDataUri(svg);
}

// Master resolver function
export function getAvatarUrl(avatarValue, displayName = "User") {
  if (!avatarValue) {
    return createLetterAvatar(displayName);
  }

  // If preset ID (e.g. "fox" or "avatar:fox")
  const cleanId = avatarValue.replace(/^avatar:/, "").trim().toLowerCase();
  if (AVATAR_MAP.has(cleanId)) {
    return AVATAR_MAP.get(cleanId);
  }

  // If already data URI or HTTP URL
  if (avatarValue.startsWith("data:") || avatarValue.startsWith("http:") || avatarValue.startsWith("https:") || avatarValue.startsWith("blob:")) {
    return avatarValue;
  }

  return createLetterAvatar(displayName);
}
