/**
 * demoImageSeed.ts
 * Seeds the IndexedDB image store with a demo X-ray SVG image
 * so all 9 demo reports have a visible image without requiring
 * an actual file upload.
 *
 * The SVG mimics the visual style of a chest X-ray radiograph.
 */

import { seedDemoImage } from './imageStorage';

export const DEMO_IMAGE_KEY = 'demo-img-001';

// Chest X-ray style SVG encoded as a data URL
const DEMO_XRAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <radialGradient id="lungL" cx="40%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#0d0d0d"/>
    </radialGradient>
    <radialGradient id="lungR" cx="60%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2a2a2a"/>
      <stop offset="100%" stop-color="#0d0d0d"/>
    </radialGradient>
    <filter id="blur1">
      <feGaussianBlur stdDeviation="1.5"/>
    </filter>
    <filter id="blur2">
      <feGaussianBlur stdDeviation="0.8"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="700" fill="url(#bgGrad)"/>

  <!-- Outer chest wall / soft tissue -->
  <ellipse cx="300" cy="370" rx="265" ry="300" fill="#111111" opacity="0.9"/>

  <!-- Ribcage structure -->
  <g stroke="#888888" stroke-width="1.2" fill="none" opacity="0.6">
    <!-- Right ribs (patient left on image) -->
    <path d="M300,120 Q370,130 400,160 Q430,190 420,230" />
    <path d="M300,145 Q375,155 408,188 Q438,220 425,262" />
    <path d="M300,170 Q378,182 415,218 Q445,252 430,295" />
    <path d="M300,195 Q380,208 418,247 Q448,283 433,328" />
    <path d="M300,220 Q380,235 420,277 Q450,315 434,362" />
    <path d="M300,248 Q378,264 418,308 Q448,348 432,396" />
    <path d="M300,275 Q374,292 414,338 Q443,380 427,430" />
    <path d="M300,302 Q368,320 407,368 Q435,412 419,462" />
    <!-- Left ribs -->
    <path d="M300,120 Q230,130 200,160 Q170,190 180,230" />
    <path d="M300,145 Q225,155 192,188 Q162,220 175,262" />
    <path d="M300,170 Q222,182 185,218 Q155,252 170,295" />
    <path d="M300,195 Q220,208 182,247 Q152,283 167,328" />
    <path d="M300,220 Q220,235 180,277 Q150,315 166,362" />
    <path d="M300,248 Q222,264 182,308 Q152,348 168,396" />
    <path d="M300,275 Q226,292 186,338 Q157,380 173,430" />
    <path d="M300,302 Q232,320 193,368 Q165,412 181,462" />
  </g>

  <!-- Spine (central vertical structure) -->
  <g opacity="0.85">
    <rect x="289" y="100" width="22" height="460" rx="4" fill="#6a6a6a" filter="url(#blur2)"/>
    <!-- Vertebrae segments -->
    <g fill="#7a7a7a" stroke="#555" stroke-width="0.5">
      <rect x="287" y="108" width="26" height="18" rx="3"/>
      <rect x="287" y="132" width="26" height="18" rx="3"/>
      <rect x="287" y="156" width="26" height="18" rx="3"/>
      <rect x="287" y="180" width="26" height="18" rx="3"/>
      <rect x="287" y="204" width="26" height="18" rx="3"/>
      <rect x="287" y="228" width="26" height="18" rx="3"/>
      <rect x="287" y="252" width="26" height="18" rx="3"/>
      <rect x="287" y="276" width="26" height="18" rx="3"/>
      <rect x="287" y="300" width="26" height="18" rx="3"/>
      <rect x="287" y="324" width="26" height="18" rx="3"/>
      <rect x="287" y="348" width="26" height="18" rx="3"/>
      <rect x="287" y="372" width="26" height="18" rx="3"/>
      <rect x="287" y="396" width="26" height="18" rx="3"/>
      <rect x="287" y="420" width="26" height="18" rx="3"/>
      <rect x="287" y="444" width="26" height="18" rx="3"/>
      <rect x="287" y="468" width="26" height="18" rx="3"/>
      <rect x="287" y="492" width="26" height="18" rx="3"/>
      <rect x="287" y="516" width="26" height="18" rx="3"/>
    </g>
  </g>

  <!-- Left lung field (image right) -->
  <ellipse cx="185" cy="330" rx="100" ry="165" fill="#1e1e1e" opacity="0.95"/>
  <!-- Lung markings / vascularity - left -->
  <g stroke="#3a3a3a" stroke-width="0.8" fill="none" opacity="0.7">
    <path d="M190,180 Q175,230 168,290 Q162,350 170,410"/>
    <path d="M210,185 Q198,240 192,300 Q187,360 196,420"/>
    <path d="M220,190 Q215,250 212,310 Q210,370 218,430"/>
    <path d="M160,200 Q152,255 148,315 Q145,375 155,430"/>
    <path d="M230,210 Q228,270 228,325 Q228,380 234,430"/>
    <path d="M170,240 Q185,280 190,330 Q195,375 185,415"/>
    <path d="M145,260 Q158,295 162,340 Q165,380 157,415"/>
  </g>

  <!-- Right lung field (image left) -->
  <ellipse cx="415" cy="330" rx="100" ry="165" fill="#1e1e1e" opacity="0.95"/>
  <!-- Lung markings / vascularity - right -->
  <g stroke="#3a3a3a" stroke-width="0.8" fill="none" opacity="0.7">
    <path d="M410,180 Q425,230 432,290 Q438,350 430,410"/>
    <path d="M390,185 Q402,240 408,300 Q413,360 404,420"/>
    <path d="M380,190 Q385,250 388,310 Q390,370 382,430"/>
    <path d="M440,200 Q448,255 452,315 Q455,375 445,430"/>
    <path d="M370,210 Q372,270 372,325 Q372,380 366,430"/>
    <path d="M430,240 Q415,280 410,330 Q405,375 415,415"/>
    <path d="M455,260 Q442,295 438,340 Q435,380 443,415"/>
  </g>

  <!-- Heart shadow (mediastinum) -->
  <ellipse cx="280" cy="370" rx="60" ry="75" fill="#3a3a3a" opacity="0.7" filter="url(#blur1)"/>
  <ellipse cx="290" cy="375" rx="55" ry="70" fill="#444444" opacity="0.6"/>

  <!-- Clavicles -->
  <g stroke="#999999" stroke-width="3" fill="none" opacity="0.8">
    <path d="M300,115 Q265,112 235,118 Q210,124 195,140"/>
    <path d="M300,115 Q335,112 365,118 Q390,124 405,140"/>
  </g>

  <!-- Diaphragm -->
  <g opacity="0.75">
    <path d="M120,490 Q185,510 300,515 Q415,510 480,490" stroke="#888888" stroke-width="2.5" fill="none"/>
    <path d="M125,495 Q190,513 300,518 Q410,513 475,495" stroke="#666666" stroke-width="1.5" fill="none"/>
  </g>

  <!-- Trachea -->
  <rect x="293" y="100" width="14" height="80" rx="7" fill="#4a4a4a" opacity="0.6"/>

  <!-- Lung apices highlight -->
  <ellipse cx="195" cy="185" rx="45" ry="30" fill="#252525" opacity="0.5"/>
  <ellipse cx="405" cy="185" rx="45" ry="30" fill="#252525" opacity="0.5"/>

  <!-- Costophrenic angles -->
  <path d="M120,490 Q130,520 145,535" stroke="#777" stroke-width="1.5" fill="none" opacity="0.6"/>
  <path d="M480,490 Q470,520 455,535" stroke="#777" stroke-width="1.5" fill="none" opacity="0.6"/>

  <!-- Label overlay -->
  <rect x="0" y="650" width="600" height="50" fill="#000000" opacity="0.7"/>
  <text x="10" y="672" font-family="monospace" font-size="11" fill="#00ff88" opacity="0.9">HealthGrid IQ — Demo X-Ray</text>
  <text x="10" y="688" font-family="monospace" font-size="10" fill="#888888">PA CHEST | kV: 120 | mAs: 3.2 | DEMO</text>
  <text x="490" y="672" font-family="monospace" font-size="10" fill="#888888">R</text>
  <text x="80" y="672" font-family="monospace" font-size="10" fill="#888888">L</text>

  <!-- R/L markers -->
  <text x="82" y="145" font-family="monospace" font-size="18" font-weight="bold" fill="#ffffff" opacity="0.8">L</text>
  <text x="495" y="145" font-family="monospace" font-size="18" font-weight="bold" fill="#ffffff" opacity="0.8">R</text>
</svg>`;

function svgToDataUrl(svg: string): string {
  // Encode SVG as a data URL
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export async function seedDemoXray(): Promise<void> {
  try {
    const dataUrl = svgToDataUrl(DEMO_XRAY_SVG);
    await seedDemoImage(DEMO_IMAGE_KEY, dataUrl);
  } catch (err) {
    console.warn('Demo X-ray seed failed (non-critical):', err);
  }
}
