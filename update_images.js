import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_ETNb9slRY6WA@ep-billowing-sound-aydq8obx-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

function normalizeStr(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDimensions(str) {
  const match = str.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (match) {
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
  }
  return null;
}

async function run() {
  const imageDir = path.join(process.cwd(), 'location_images');
  const files = fs.readdirSync(imageDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  });

  console.log(`Found ${files.length} image files in location_images/`);

  // Get all hoardings from DB
  const { rows: hoardings } = await pool.query('SELECT id, location, city, width, height FROM hoardings ORDER BY id ASC');
  console.log(`Found ${hoardings.length} hoardings in database.`);

  let matchedCount = 0;
  let updatedCount = 0;

  for (const hoarding of hoardings) {
    const normLoc = normalizeStr(hoarding.location);
    const normCity = normalizeStr(hoarding.city);
    const hW = Math.round(hoarding.width);
    const hH = Math.round(hoarding.height);

    let bestMatch = null;
    let maxScore = -1;

    for (const file of files) {
      const nameWithoutExt = path.parse(file).name;
      const normFile = normalizeStr(nameWithoutExt);
      const fileDims = extractDimensions(nameWithoutExt);

      let score = 0;

      // Token overlap
      const locTokens = normLoc.split(' ').filter(t => t.length > 2);
      const fileTokens = normFile.split(' ').filter(t => t.length > 2);

      let overlap = 0;
      for (const token of locTokens) {
        if (fileTokens.includes(token)) {
          overlap += 1;
        }
      }

      if (locTokens.length > 0) {
        score = overlap / locTokens.length;
      }

      // Check exact or partial string inclusion
      if (normFile.includes(normLoc) || normLoc.includes(normFile)) {
        score += 0.5;
      }

      // Dimension match bonus
      if (fileDims) {
        const [fW, fH] = fileDims;
        if ((fW === hW && fH === hH) || (fW === hH && fH === hW)) {
          score += 0.4;
        }
      }

      // City match bonus
      if (normCity && normFile.includes(normCity)) {
        score += 0.1;
      }

      if (score > maxScore && score > 0.3) {
        maxScore = score;
        bestMatch = file;
      }
    }

    if (bestMatch) {
      matchedCount++;
      const imageUrl = `https://raw.githubusercontent.com/hariishwaran/ss-Agency/main/location_images/${encodeURIComponent(bestMatch)}`;
      await pool.query('UPDATE hoardings SET image_url = $1 WHERE id = $2', [imageUrl, hoarding.id]);
      updatedCount++;
      console.log(`[MATCH] DB ID ${hoarding.id}: "${hoarding.location}" (${hW}x${hH}) -> "${bestMatch}" (Score: ${maxScore.toFixed(2)})`);
    } else {
      console.log(`[NO MATCH] DB ID ${hoarding.id}: "${hoarding.location}" (${hW}x${hH})`);
    }
  }

  console.log(`\nSummary: Matched & Updated ${updatedCount}/${hoardings.length} hoardings.`);
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
