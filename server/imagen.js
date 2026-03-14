/**
 * Multi-tier image generation with automatic fallback.
 * Ported from BellForge's imagen.ts — the proven pattern that "works all the time".
 *
 * IMAGE MODEL CHAIN (each has its own daily quota):
 *   Tier 1: imagen-4.0-generate-001       — highest quality, 70/day
 *   Tier 2: imagen-4.0-fast-generate-001   — fast variant, separate 70/day quota
 *   Tier 3: gemini-2.5-flash-image         — native Gemini image gen, separate quota pool
 *
 * Circuit breaker: when a model returns RESOURCE_EXHAUSTED (daily quota hit),
 * it's skipped for all remaining calls in this server session.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const IMAGE_MODELS = [
  { id: 'imagen-4.0-generate-001', type: 'predict', name: 'Imagen 4.0' },
  { id: 'imagen-4.0-fast-generate-001', type: 'predict', name: 'Imagen 4.0 Fast' },
  { id: 'gemini-2.5-flash-image', type: 'generateContent', name: 'Gemini Flash Image' },
];

// Circuit breaker: models that have hit their daily quota this session
const exhaustedModels = new Set();

function isQuotaExhausted(bodyText) {
  return bodyText.includes('RESOURCE_EXHAUSTED') || bodyText.includes('quota');
}

function aspectHint(ratio) {
  const hints = {
    '16:9': 'wide landscape 16:9 composition,',
    '9:16': 'tall portrait 9:16 composition,',
    '3:4': 'portrait 3:4 composition,',
    '4:3': 'landscape 4:3 composition,',
    '1:1': 'square 1:1 composition,',
  };
  return hints[ratio] || '';
}

async function tryImagenPredict(model, prompt, aspectRatio, apiKey) {
  const url = `${API_BASE}/models/${model.id}:predict?key=${apiKey}`;
  const MAX_RETRIES = 4;
  const TIMEOUT_MS = 90000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio },
        }),
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const body = await res.text();
        if (isQuotaExhausted(body)) {
          console.warn(`[${model.name}] Daily quota exhausted — circuit breaker tripped`);
          return 'QUOTA_EXHAUSTED';
        }
        if (attempt < MAX_RETRIES) {
          const wait = 4000 * Math.pow(2, attempt);
          console.warn(`[${model.name}] Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return null;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[${model.name}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }

      const data = await res.json();
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return data.predictions[0].bytesBase64Encoded;
      }
      console.error(`[${model.name}] No image data in response`);
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const wait = 3000 * Math.pow(2, attempt);
        console.warn(`[${model.name}] Error, retry in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function tryGeminiImage(model, prompt, aspectRatio, apiKey) {
  const url = `${API_BASE}/models/${model.id}:generateContent?key=${apiKey}`;
  const MAX_RETRIES = 5;
  const TIMEOUT_MS = 90000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${aspectHint(aspectRatio)} ${prompt}` }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const body = await res.text();
        if (isQuotaExhausted(body)) {
          console.warn(`[${model.name}] Daily quota exhausted — circuit breaker tripped`);
          return 'QUOTA_EXHAUSTED';
        }
        if (attempt < MAX_RETRIES) {
          const wait = 5000 * Math.pow(2, attempt);
          console.warn(`[${model.name}] Rate limited, waiting ${wait / 1000}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        return null;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[${model.name}] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
      console.error(`[${model.name}] No image data in response`);
      return null;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const wait = 5000 * Math.pow(2, attempt);
        console.warn(`[${model.name}] Error, retry in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Generate a single image using the multi-tier model chain.
 * Returns base64-encoded PNG string, or null if ALL tiers fail.
 */
export async function generateImage(prompt, aspectRatio = '1:1') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ImageGen] No API key');
    return null;
  }

  for (const model of IMAGE_MODELS) {
    if (exhaustedModels.has(model.id)) continue;

    const result = model.type === 'predict'
      ? await tryImagenPredict(model, prompt, aspectRatio, apiKey)
      : await tryGeminiImage(model, prompt, aspectRatio, apiKey);

    if (result === 'QUOTA_EXHAUSTED') {
      exhaustedModels.add(model.id);
      console.warn(`[ImageGen] ${model.name} quota exhausted, trying next tier...`);
      continue;
    }

    if (result) {
      console.log(`[ImageGen] ✓ Generated via ${model.name}`);
      return result;
    }

    console.warn(`[ImageGen] ${model.name} failed, trying next tier...`);
  }

  console.error('[ImageGen] All image generation tiers exhausted');
  return null;
}

/**
 * Generate an image and save it to disk as a PNG.
 * Returns true on success, false on failure.
 */
export async function generateAndSave(prompt, outputPath, aspectRatio = '1:1') {
  const base64 = await generateImage(prompt, aspectRatio);
  if (!base64) return false;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));
  console.log(`[ImageGen] Saved: ${outputPath}`);
  return true;
}

// Throttle between sequential calls
export function throttle(ms = 1500) {
  return new Promise(r => setTimeout(r, ms));
}
