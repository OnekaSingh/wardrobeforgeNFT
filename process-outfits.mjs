import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUTFITS_DIR = "/Users/kalikelaux/Desktop/wardrobeforge/NFTs/head";
const AVATAR_PATH = "/Users/kalikelaux/Desktop/wardrobeforge/hair_avatar.png";
const OUTPUT_DIR = "/Users/kalikelaux/Desktop/wardrobeforge/NFTs/head/final_head";

const PROMPT_1 =
  "Regenerate the headpiece so its angled from the front, and put the front generated headpiece on the person. Make the background white.";
const PROMPT_2 =
  "Remove everything from this photo except the headpiece, don't include the hair, face, or head.";

const API_KEY = process.env.WAVESPEED_API_KEY;
const BASE_URL = "https://api.wavespeed.ai/api/v3";
const HEADERS = { Authorization: `Bearer ${API_KEY}` };

if (!API_KEY) {
  console.error("Error: WAVESPEED_API_KEY environment variable is not set.");
  process.exit(1);
}

async function poll(taskUrl) {
  while (true) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(taskUrl, { headers: HEADERS });
    const json = await res.json();
    const data = json?.data ?? json;
    const status = data?.status;
    if (status === "completed") {
      const outputs = data?.outputs;
      if (Array.isArray(outputs) && outputs.length > 0) return outputs[0];
      throw new Error(`No outputs in completed response: ${JSON.stringify(json)}`);
    }
    if (status === "failed") {
      throw new Error(`Task failed: ${data?.error ?? JSON.stringify(json)}`);
    }
    process.stdout.write(".");
  }
}

async function wanEditFiles(filePaths, prompt) {
  const images = filePaths.map((fp) => {
    const buf = fs.readFileSync(fp);
    return `data:image/png;base64,${buf.toString("base64")}`;
  });
  const res = await fetch(`${BASE_URL}/alibaba/wan-2.7/image-edit`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ images, prompt, size: "1024*1024" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`wan-edit (files) error: ${JSON.stringify(json)}`);
  const taskUrl = json?.data?.urls?.get;
  if (!taskUrl) throw new Error(`No task URL in response: ${JSON.stringify(json)}`);
  return poll(taskUrl);
}

async function wanEditUrls(imageUrls, prompt) {
  const res = await fetch(`${BASE_URL}/alibaba/wan-2.7/image-edit`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ images: imageUrls, prompt, size: "1024*1024" }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`wan-edit (urls) error: ${JSON.stringify(json)}`);
  const taskUrl = json?.data?.urls?.get;
  if (!taskUrl) throw new Error(`No task URL in response: ${JSON.stringify(json)}`);
  return poll(taskUrl);
}

async function removeBg(imageUrl) {
  const res = await fetch(`${BASE_URL}/wavespeed-ai/image-background-remover`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageUrl }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`bg-remover error: ${JSON.stringify(json)}`);
  const taskUrl = json?.data?.urls?.get;
  if (!taskUrl) throw new Error(`No task URL in response: ${JSON.stringify(json)}`);
  return poll(taskUrl);
}

async function saveFromUrl(url, destPath) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buf));
}

async function processOutfit(outfitPath) {
  const outfitName = path.basename(outfitPath, ".png");
  const outputPath = path.join(OUTPUT_DIR, `${outfitName}_final.png`);

  if (fs.existsSync(outputPath)) {
    console.log(`  Skipping (already done): ${outfitName}`);
    return;
  }

  console.log(`\nProcessing: ${outfitName}`);

  console.log("  Step 1: wan image-edit with outfit + avatar...");
  const step1Url = await wanEditFiles([outfitPath, AVATAR_PATH], PROMPT_1);
  console.log(`  Step 1 → ${step1Url}`);

  console.log("  Step 2: wan image-edit to isolate outfit...");
  const step2Url = await wanEditUrls([step1Url], PROMPT_2);
  console.log(`  Step 2 → ${step2Url}`);

  console.log("  Step 3: removing background...");
  const finalUrl = await removeBg(step2Url);
  console.log(`  Step 3 → ${finalUrl}`);

  await saveFromUrl(finalUrl, outputPath);
  console.log(`  Saved → ${outputPath}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const outfitFiles = fs
    .readdirSync(OUTFITS_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => path.join(OUTFITS_DIR, f))
    .sort();

  console.log(`Found ${outfitFiles.length} outfits to process.`);
  console.log(`Avatar: ${AVATAR_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  for (const outfitPath of outfitFiles) {
    try {
      await processOutfit(outfitPath);
    } catch (err) {
      console.error(`  ERROR [${path.basename(outfitPath)}]: ${err.message}`);
    }
  }

  console.log("\nAll done! Results saved to final_outfit/");
}

main();
