const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const TARGETS = [
  'project/assets',
  'project/hairstyles',
  'project/hairstyle_props',
  'project/weekly',
  'project/trio.png',
  'project/heal.png',
  'project/avatar.png',
  'project/base_avatar.png',
  'project/clear_avatar.png',
];

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

function walk(targetPath, files = []) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, entry), files);
    }
    return files;
  }

  if (IMAGE_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
    files.push(targetPath);
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function convertImage(sourcePath) {
  const ext = path.extname(sourcePath);
  const outputPath = sourcePath.slice(0, -ext.length) + '.webp';
  const sourceStat = fs.statSync(sourcePath);

  if (fs.existsSync(outputPath)) {
    const outputStat = fs.statSync(outputPath);
    if (outputStat.mtimeMs >= sourceStat.mtimeMs) {
      return {
        sourcePath,
        outputPath,
        skipped: true,
        sourceSize: sourceStat.size,
        outputSize: outputStat.size,
      };
    }
  }

  const pipeline = sharp(sourcePath, { animated: true });
  const lowerExt = ext.toLowerCase();

  if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
    await pipeline.webp({
      quality: 76,
      effort: 6,
    }).toFile(outputPath);
  } else {
    await pipeline.webp({
      quality: 72,
      alphaQuality: 90,
      effort: 6,
      nearLossless: true,
    }).toFile(outputPath);
  }

  const outputStat = fs.statSync(outputPath);
  return {
    sourcePath,
    outputPath,
    skipped: false,
    sourceSize: sourceStat.size,
    outputSize: outputStat.size,
  };
}

async function main() {
  const sourcePaths = TARGETS
    .map((target) => path.join(ROOT, target))
    .filter((target) => fs.existsSync(target))
    .flatMap((target) => walk(target));

  let sourceBytes = 0;
  let outputBytes = 0;
  let convertedCount = 0;
  let skippedCount = 0;

  for (const sourcePath of sourcePaths) {
    const result = await convertImage(sourcePath);
    sourceBytes += result.sourceSize;
    outputBytes += result.outputSize;
    if (result.skipped) {
      skippedCount += 1;
    } else {
      convertedCount += 1;
    }
  }

  const savedBytes = Math.max(0, sourceBytes - outputBytes);
  const ratio = sourceBytes > 0 ? ((1 - outputBytes / sourceBytes) * 100).toFixed(1) : '0.0';

  console.log(`Processed ${sourcePaths.length} images.`);
  console.log(`Converted: ${convertedCount}, skipped: ${skippedCount}`);
  console.log(`Source total: ${formatBytes(sourceBytes)}`);
  console.log(`WebP total: ${formatBytes(outputBytes)}`);
  console.log(`Saved: ${formatBytes(savedBytes)} (${ratio}%)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
