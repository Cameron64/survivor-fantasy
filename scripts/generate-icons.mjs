import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

// Survivor-themed torch/flame icon with tropical vibes
// Orange flame on a dark circle with a subtle palm leaf accent
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="flame" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="40%" style="stop-color:#fb923c"/>
      <stop offset="70%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#fef3c7"/>
    </linearGradient>
    <linearGradient id="innerFlame" x1="50%" y1="100%" x2="50%" y2="0%">
      <stop offset="0%" style="stop-color:#ea580c"/>
      <stop offset="50%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#fbbf24"/>
    </linearGradient>
    <linearGradient id="torch" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:#92400e"/>
      <stop offset="100%" style="stop-color:#78350f"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="40%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#f97316;stop-opacity:0"/>
    </radialGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="url(#bg)"/>

  <!-- Subtle glow behind flame -->
  <circle cx="256" cy="200" r="160" fill="url(#glow)"/>

  <!-- Torch handle -->
  <rect x="240" y="280" width="32" height="120" rx="6" fill="url(#torch)"/>
  <rect x="232" y="270" width="48" height="20" rx="4" fill="#b45309"/>
  <rect x="236" y="390" width="40" height="12" rx="3" fill="#b45309"/>

  <!-- Main flame - outer -->
  <path d="M256 100
    C256 100, 310 160, 315 210
    C320 260, 295 280, 256 280
    C217 280, 192 260, 197 210
    C202 160, 256 100, 256 100Z"
    fill="url(#flame)" opacity="0.9"/>

  <!-- Flame flicker left -->
  <path d="M230 130
    C220 150, 190 190, 195 220
    C200 250, 220 270, 240 275
    C215 265, 195 240, 200 210
    C205 180, 230 130, 230 130Z"
    fill="url(#flame)" opacity="0.6"/>

  <!-- Flame flicker right -->
  <path d="M280 140
    C295 165, 310 195, 308 225
    C305 250, 285 268, 270 275
    C290 260, 310 235, 305 210
    C300 185, 280 140, 280 140Z"
    fill="url(#flame)" opacity="0.6"/>

  <!-- Inner flame - brighter core -->
  <path d="M256 155
    C256 155, 290 195, 292 225
    C295 255, 280 270, 256 270
    C232 270, 217 255, 220 225
    C222 195, 256 155, 256 155Z"
    fill="url(#innerFlame)" opacity="0.85"/>

  <!-- Bright center -->
  <path d="M256 195
    C256 195, 275 215, 276 235
    C277 252, 268 262, 256 262
    C244 262, 235 252, 236 235
    C237 215, 256 195, 256 195Z"
    fill="#fef3c7" opacity="0.7"/>

  <!-- Stars/sparkles around flame -->
  <circle cx="180" cy="160" r="3" fill="#fbbf24" opacity="0.6"/>
  <circle cx="330" cy="170" r="2.5" fill="#fbbf24" opacity="0.5"/>
  <circle cx="200" cy="120" r="2" fill="#fbbf24" opacity="0.4"/>
  <circle cx="315" cy="130" r="2" fill="#fbbf24" opacity="0.4"/>

  <!-- "S50" text at bottom -->
  <text x="256" y="450" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="42" fill="#f97316" letter-spacing="2">S50</text>
</svg>`

writeFileSync(join(iconsDir, 'icon.svg'), svg)

// Generate PNG icons at required sizes
const sizes = [192, 512]

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, `icon-${size}.png`))
  console.log(`Generated icon-${size}.png`)
}

// Also generate a favicon
await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toFile(join(__dirname, '..', 'public', 'favicon.png'))
console.log('Generated favicon.png')

// Generate apple-touch-icon
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile(join(iconsDir, 'apple-touch-icon.png'))
console.log('Generated apple-touch-icon.png')

console.log('All icons generated!')
