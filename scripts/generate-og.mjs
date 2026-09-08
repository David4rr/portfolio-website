import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  // 1. Process user portrait from public/assets/mypic.png
  // High quality crop preserving head-and-shoulders with crisp framing
  const photoWidth = 310;
  const photoHeight = 415;

  const croppedPhoto = await sharp('public/assets/mypic.png')
    .extract({ left: 0, top: 15, width: 408, height: 546 })
    .resize(photoWidth, photoHeight, { fit: 'cover' })
    .toBuffer();

  // Subtle rounded corner mask for the photo print
  const photoMaskSvg = `
    <svg width="${photoWidth}" height="${photoHeight}">
      <rect x="0" y="0" width="${photoWidth}" height="${photoHeight}" rx="4" ry="4" fill="#fff" />
    </svg>
  `;
  const maskedPhoto = await sharp(croppedPhoto)
    .composite([{ input: Buffer.from(photoMaskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. Card Placement & Measurements (Flat Architectural Styling in Light Theme)
  const cardPad = 12;
  const cardFooterHeight = 54;
  const cardWidth = photoWidth + cardPad * 2; // 334
  const cardHeight = photoHeight + cardPad * 2 + cardFooterHeight; // 493

  const cardX = 790;
  const cardY = 68;

  // Light Theme palette tuned for perfect contrast & print editorial feel:
  // Canvas: #F8F4EC (Warm cream / archival paper)
  // Card: #FFFFFF (Crisp white elevated card)
  // Badge Fill: #F0EBE0 (Warm stone beige)
  // Text Main: #2C1810 (Deep espresso ink)
  // Text Muted: #5A4332 (Rich sepia walnut - high legibility)
  // Border Crisp: #CDC3B2 (Distinct architectural line)
  // Grid: #E4DCD0 (Hairline drafting grid)
  // Accent: #C84E25 / #D45D33 (Deep Roman Terracotta - WCAG AA compliant)
  const svgContent = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Crisp architectural hairline grid matching light theme paper feel -->
        <pattern id="archGrid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2D9CD" stroke-width="0.75" stroke-opacity="0.85" />
        </pattern>
      </defs>

      <!-- 1. Flat Canvas Background (Pure Solid Light Theme #F8F4EC - No Gradients) -->
      <rect width="${width}" height="${height}" fill="#F8F4EC" />

      <!-- 2. Subtle Architectural Grid -->
      <rect width="${width}" height="${height}" fill="url(#archGrid)" />

      <!-- 3. Outer Architectural Inset Frame -->
      <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="0" fill="none" stroke="#CDC3B2" stroke-width="1.2" />
      <rect x="36" y="36" width="${width - 72}" height="${height - 72}" rx="0" fill="none" stroke="#CDC3B2" stroke-width="0.6" stroke-dasharray="4 4" stroke-opacity="0.7" />

      <!-- Corner Crosshairs (Crisp Solid Terracotta Lines #C84E25) -->
      <g stroke="#C84E25" stroke-width="1.4">
        <!-- Top Left -->
        <line x1="22" y1="28" x2="38" y2="28" />
        <line x1="28" y1="22" x2="28" y2="38" />
        <!-- Top Right -->
        <line x1="${width - 38}" y1="28" x2="${width - 22}" y2="28" />
        <line x1="${width - 28}" y1="22" x2="${width - 28}" y2="38" />
        <!-- Bottom Left -->
        <line x1="22" y1="${height - 28}" x2="38" y2="${height - 28}" />
        <line x1="28" y1="${height - 38}" x2="28" y2="${height - 22}" />
        <!-- Bottom Right -->
        <line x1="${width - 38}" y1="${height - 28}" x2="${width - 22}" y2="${height - 28}" />
        <line x1="${width - 28}" y1="${height - 38}" x2="${width - 28}" y2="${height - 22}" />
      </g>

      <!-- 4. Right Side: Flat Architectural Portrait Card (Pure White #FFFFFF Elevated Surface) -->
      <g>
        <!-- Card Body (Solid Flat #FFFFFF Surface with Crisp Border) -->
        <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="8" fill="#FFFFFF" stroke="#CDC3B2" stroke-width="1.2" />
        <rect x="${cardX + 4}" y="${cardY + 4}" width="${cardWidth - 8}" height="${cardHeight - 8}" rx="6" fill="none" stroke="#E4DCD0" stroke-width="0.6" stroke-dasharray="3 3" />

        <!-- Photo Border Inset -->
        <rect x="${cardX + cardPad - 1}" y="${cardY + cardPad - 1}" width="${photoWidth + 2}" height="${photoHeight + 2}" rx="5" fill="none" stroke="#CDC3B2" stroke-width="1" />

        <!-- Placard Divider Line -->
        <line x1="${cardX + 16}" y1="${cardY + cardPad * 2 + photoHeight}" x2="${cardX + cardWidth - 16}" y2="${cardY + cardPad * 2 + photoHeight}" stroke="#CDC3B2" stroke-width="0.8" />

        <!-- Placard Info (Typography in High Contrast: #2C1810 & #5A4332) -->
        <!-- Left Column in Placard -->
        <text x="${cardX + 18}" y="${cardY + cardPad * 2 + photoHeight + 22}" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#2C1810" letter-spacing="2">
          DAVID ARROZAQI
        </text>
        <text x="${cardX + 18}" y="${cardY + cardPad * 2 + photoHeight + 38}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="500" fill="#5A4332" letter-spacing="1.5">
          CREATIVE DEVELOPER
        </text>

        <!-- Right Column in Placard -->
        <text x="${cardX + cardWidth - 18}" y="${cardY + cardPad * 2 + photoHeight + 22}" font-family="'Fraunces', Georgia, serif" font-size="12" font-style="italic" font-weight="600" fill="#C84E25" text-anchor="end" letter-spacing="1">
          FIG. 01
        </text>
        <text x="${cardX + cardWidth - 18}" y="${cardY + cardPad * 2 + photoHeight + 38}" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="500" fill="#5A4332" text-anchor="end" letter-spacing="1">
          MMXXVI
        </text>
      </g>

      <!-- 5. Left Side: Authentic Editorial Typography in Light Theme -->
      <g transform="translate(76, 0)">
        <!-- Telemetry / Status Pill (Fill #F0EBE0, border #CDC3B2) -->
        <g transform="translate(0, 80)">
          <rect x="0" y="0" width="375" height="30" rx="15" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
          <circle cx="16" cy="15" r="3.5" fill="#C84E25" />
          <text x="32" y="19" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="600" fill="#2C1810" letter-spacing="1.5">CREATIVE DEVELOPER &amp; ARCHITECT</text>
        </g>

        <!-- Main Title (Fraunces Serif in deep espresso ink #2C1810) -->
        <text x="0" y="188" font-family="'Fraunces', Georgia, serif" font-size="62" font-weight="400" fill="#2C1810" letter-spacing="-0.5">
          David Arrozaqi<tspan fill="#C84E25">.</tspan>
        </text>

        <!-- Hero Subtitle Prose (Quote in Rich Sepia #5A4332) -->
        <text x="0" y="240" font-family="'Fraunces', Georgia, serif" font-size="18.5" font-style="italic" fill="#5A4332">
          Weaving logic and design into seamless digital experiences
        </text>
        <text x="0" y="268" font-family="'Fraunces', Georgia, serif" font-size="18.5" font-style="italic" fill="#5A4332">
          across the modern web, mobile platforms, and artificial intelligence.
        </text>

        <!-- Poetic Motto (From Hero.astro line 84) -->
        <g transform="translate(0, 318)">
          <line x1="0" y1="-5" x2="24" y2="-5" stroke="#CDC3B2" stroke-width="1" />
          <text x="36" y="0" font-family="'Fraunces', Georgia, serif" font-size="14" font-style="italic" font-weight="600" fill="#C84E25">
            A gentle hold, lets the truth unfold.
          </text>
          <line x1="295" y1="-5" x2="319" y2="-5" stroke="#CDC3B2" stroke-width="1" />
        </g>

        <!-- Selected Works Roman Index -->
        <g transform="translate(0, 362)">
          <text x="0" y="0" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#5A4332" letter-spacing="1.2">
            <tspan fill="#C84E25" font-weight="700">I.</tspan> WEB SYSTEMS
            <tspan dx="20" fill="#C84E25" font-weight="700">II.</tspan> INTERACTIVE CANVAS
            <tspan dx="20" fill="#C84E25" font-weight="700">III.</tspan> INTELLIGENT AGENTS
          </text>
        </g>

        <!-- Hairline Divider -->
        <line x1="0" y1="395" x2="660" y2="395" stroke="#CDC3B2" stroke-width="1" />

        <!-- Tech Stack Badges (Crisp defined border #CDC3B2) -->
        <g transform="translate(0, 422)">
          <!-- Badge 1: Astro -->
          <g transform="translate(0, 0)">
            <rect width="80" height="32" rx="6" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
            <text x="40" y="20.5" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2C1810" text-anchor="middle">Astro</text>
          </g>
          <!-- Badge 2: TypeScript -->
          <g transform="translate(92, 0)">
            <rect width="114" height="32" rx="6" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
            <text x="57" y="20.5" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2C1810" text-anchor="middle">TypeScript</text>
          </g>
          <!-- Badge 3: Next.js -->
          <g transform="translate(218, 0)">
            <rect width="88" height="32" rx="6" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
            <text x="44" y="20.5" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2C1810" text-anchor="middle">Next.js</text>
          </g>
          <!-- Badge 4: Tailwind CSS -->
          <g transform="translate(318, 0)">
            <rect width="118" height="32" rx="6" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
            <text x="59" y="20.5" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2C1810" text-anchor="middle">Tailwind CSS</text>
          </g>
          <!-- Badge 5: GSAP -->
          <g transform="translate(448, 0)">
            <rect width="76" height="32" rx="6" fill="#F0EBE0" stroke="#CDC3B2" stroke-width="1" />
            <text x="38" y="20.5" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#2C1810" text-anchor="middle">GSAP</text>
          </g>
        </g>

        <!-- Footer Telemetry -->
        <g transform="translate(0, 520)">
          <text x="0" y="0" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="500" fill="#5A4332" letter-spacing="1">
            <tspan fill="#C84E25">✦</tspan> SELECTED WORKS &amp; ARTIFACTS
          </text>
          <text x="660" y="0" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="500" fill="#5A4332" text-anchor="end" letter-spacing="0.5">
            davidarrozaqi.com · github.com/David4rr
          </text>
        </g>
      </g>
    </svg>
  `;

  // Composite SVG and the user's authentic photo
  await sharp(Buffer.from(svgContent))
    .composite([
      {
        input: maskedPhoto,
        top: cardY + cardPad,
        left: cardX + cardPad,
      }
    ])
    .png({ quality: 95 })
    .toFile('public/og-image.png');

  console.log('Successfully generated high-contrast light theme public/og-image.png');
}

generateOgImage().catch(console.error);
