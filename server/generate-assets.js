/**
 * Generate all game visuals for Trivia Fetch!
 * Uses BellForge-style multi-tier Imagen pipeline.
 * Run: node generate-assets.js
 * Or called from server startup if images are missing.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateAndSave, throttle } from './imagen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'client', 'public', 'images');

// Gus description based on the REAL photo: cream/white curly goldendoodle,
// dark collar with bone-shaped "Gus" tag, judgy/sassy expression
// STYLE: Cel-shaded, cutesy, clean white background, bold outlines, bright colors
const GUS_STYLE = 'Cel-shaded cartoon style with bold black outlines, flat color shading, big expressive eyes, cute chibi proportions. Clean solid white background with no shadows or gradients behind the character. Bright, cheerful, polished game mascot art like a mobile game character select screen.';
const GUS_BASE = `A cute cel-shaded cartoon cream-white goldendoodle puppy with fluffy curly fur, round head, big adorable dark brown eyes, a small dark nose, floppy soft ears, wearing a dark blue collar with a small bone-shaped tag. ${GUS_STYLE}`;

const ASSETS = [
  {
    name: 'gus-mascot.png',
    prompt: `${GUS_BASE} The puppy is sitting upright facing the viewer with a slightly smug, sassy smirk — one eyebrow raised as if judging you. Cute but sassy. Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'gus-happy.png',
    prompt: `${GUS_BASE} The puppy is SUPER happy and excited — big open-mouth grin showing tongue, sparkly eyes, ears bouncing up, tiny confetti and star particles floating around it. Pure joy energy! Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'gus-wrong.png',
    prompt: `${GUS_BASE} The puppy has a disappointed, unimpressed face — flat mouth, half-lidded eyes, one ear drooping, head slightly tilted as if saying "seriously?" A small sweat drop on its forehead. Cute but judgy. Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'gus-thinking.png',
    prompt: `${GUS_BASE} The puppy has its head tilted to one side with big curious eyes looking upward thoughtfully. One ear perked up, one ear flopped down. A cute small question mark floating above its head. Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'gus-wild.png',
    prompt: `${GUS_BASE} The puppy is going absolutely WILD with excitement — doing a zoomie spin, tongue flying out, eyes wide and crazy with joy, little motion lines and stars swirling around it. Maximum chaotic puppy energy! Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'gus-winner.png',
    prompt: `${GUS_BASE} The puppy is wearing a shiny golden crown slightly tilted on its fluffy head, sitting proudly with a smug champion grin. Sparkles, tiny confetti, and a golden glow around it. Winner energy! Solid pure white background.`,
    aspect: '1:1',
  },
  {
    name: 'game-bg.png',
    prompt: `A cute pastel pattern with tiny scattered paw prints, small dog bones, little stars, and question marks on a warm cream peach background. Soft pink, mint green, and gold pastel accents. Clean minimal repeating pattern for a trivia game. No text, no characters, no dogs.`,
    aspect: '1:1',
  },
  {
    name: 'lobby-bg.png',
    prompt: `A warm cute cartoon living room scene in cel-shaded style with bold outlines. Cozy couch, warm lighting, dog toys on the floor (tennis ball, rope toy, chewed sock), a treat jar on a side table. Warm cream and soft peach color palette with cel-shaded flat colors. Cute and inviting. No text, no characters.`,
    aspect: '16:9',
  },
];

export async function generateAllAssets(onProgress) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < ASSETS.length; i++) {
    const asset = ASSETS[i];
    const outPath = path.join(IMG_DIR, asset.name);

    // Skip if already exists
    if (fs.existsSync(outPath)) {
      skipped++;
      const msg = `[Assets] Skipping ${asset.name} (already exists)`;
      console.log(msg);
      onProgress?.(msg, i + 1, ASSETS.length);
      continue;
    }

    const msg = `[Assets] Generating ${asset.name} (${i + 1}/${ASSETS.length})...`;
    console.log(msg);
    onProgress?.(msg, i + 1, ASSETS.length);

    const ok = await generateAndSave(asset.prompt, outPath, asset.aspect);
    if (ok) {
      generated++;
    } else {
      failed++;
      console.error(`[Assets] FAILED: ${asset.name}`);
    }

    // Throttle between calls to avoid rate limits
    if (i < ASSETS.length - 1) await throttle(2000);
  }

  const summary = `[Assets] Done! Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`;
  console.log(summary);
  onProgress?.(summary, ASSETS.length, ASSETS.length);
  return { generated, skipped, failed };
}

/** Check which assets are missing */
export function getMissingAssets() {
  return ASSETS.filter(a => !fs.existsSync(path.join(IMG_DIR, a.name))).map(a => a.name);
}

/** Check if ALL assets exist */
export function allAssetsExist() {
  return ASSETS.every(a => fs.existsSync(path.join(IMG_DIR, a.name)));
}

// Run directly: node generate-assets.js
if (process.argv[1] && process.argv[1].includes('generate-assets')) {
  console.log('🎨 Generating Trivia Fetch! game assets...\n');
  generateAllAssets((msg) => console.log(msg)).then(({ generated, failed }) => {
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} assets failed — run again to retry.`);
    } else {
      console.log('\n✅ All assets ready!');
    }
  });
}
