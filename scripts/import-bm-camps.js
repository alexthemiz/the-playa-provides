/**
 * import-bm-camps.js
 * One-off script: seeds the camps table with official Burning Man camp data (2015–2025).
 * Run from project root: node scripts/import-bm-camps.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// 1. Read .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const raw = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ---------------------------------------------------------------------------
// 2. Archive URLs (2020 and 2021 omitted — Burning Man was cancelled)
// ---------------------------------------------------------------------------
const YEARS = [2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025];

function archiveUrl(year) {
  return `https://bm-innovate.s3.amazonaws.com/archive/${year}/camps.json`;
}

// ---------------------------------------------------------------------------
// 3. Normalization helpers
// ---------------------------------------------------------------------------
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation and special chars
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// 4. Fetch a single year archive
// ---------------------------------------------------------------------------
async function fetchYear(year) {
  const url = archiveUrl(year);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  WARN: ${year} archive returned HTTP ${res.status} — skipping`);
    return null;
  }
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.warn(`  WARN: ${year} archive could not be parsed as JSON — skipping`);
    return null;
  }
  // Some years wrap in { camps: [...] }, others are bare arrays
  const camps = Array.isArray(parsed) ? parsed : (parsed.camps || parsed.data || []);
  if (!Array.isArray(camps) || camps.length === 0) {
    console.warn(`  WARN: ${year} archive returned empty array — skipping`);
    return null;
  }
  return { year, camps };
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------
async function main() {
  let totalBmRecords = 0;
  let sameYearDuplicates = 0;

  // Map: normalizedName -> { year, uid, homepage_url, description, hometown, display_name }
  const dedupMap = new Map();

  console.log('Fetching BM archives...');
  for (const year of YEARS) {
    process.stdout.write(`  ${year}... `);
    const result = await fetchYear(year);
    if (!result) continue;

    const { camps } = result;
    totalBmRecords += camps.length;
    console.log(`${camps.length} camps`);

    // Track normalized names seen this year to catch same-year dupes
    const seenThisYear = new Set();

    for (const camp of camps) {
      const rawName = (camp.name || camp.camp_name || '').trim();
      if (!rawName) continue;

      const norm = normalizeName(rawName);
      if (!norm) continue;

      if (seenThisYear.has(norm)) {
        console.log(`  DUPE (same year ${year}): "${rawName}" — skipping`);
        sameYearDuplicates++;
        continue;
      }
      seenThisYear.add(norm);

      const uid = camp.uid || camp.id || null;
      const homepageUrl = camp.homepage_url || camp.url || null;
      const description = camp.description || null;
      const hometown = camp.hometown || null;

      if (!dedupMap.has(norm)) {
        dedupMap.set(norm, {
          display_name: rawName,
          bm_uid: uid ? String(uid) : null,
          bm_homepage_url: homepageUrl || null,
          description,
          hometown,
          year,
        });
      } else {
        const existing = dedupMap.get(norm);
        // Keep earliest bm_uid (don't overwrite if one already exists)
        if (!existing.bm_uid && uid) existing.bm_uid = String(uid);
        // Keep most recent homepage_url (overwrite with newer year's value if present)
        if (homepageUrl) existing.bm_homepage_url = homepageUrl;
        // Keep most recent description and hometown
        if (description) existing.description = description;
        if (hometown) existing.hometown = hometown;
        // Keep most recent display_name
        existing.display_name = rawName;
        // Update year to most recent
        existing.year = year;
      }
    }
  }

  const uniqueAfterDedup = dedupMap.size;
  console.log(`\nDedup complete. Total BM records: ${totalBmRecords}, Unique camps: ${uniqueAfterDedup}`);

  // ---------------------------------------------------------------------------
  // 6. Build final records array with slug collision handling
  // ---------------------------------------------------------------------------
  console.log('\nBuilding final records...');
  const slugSet = new Set();
  const records = [];

  for (const [, entry] of dedupMap) {
    let slug = toSlug(entry.display_name);
    if (slugSet.has(slug)) {
      let i = 2;
      while (slugSet.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }
    slugSet.add(slug);

    records.push({
      display_name: entry.display_name,
      slug,
      bm_uid: entry.bm_uid,
      bm_homepage_url: entry.bm_homepage_url,
      description: entry.description,
      homebase: entry.hometown || null,
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Pre-fetch existing camps to determine what to write conditionally
  // ---------------------------------------------------------------------------
  console.log('\nPre-fetching existing camps from DB...');
  let existingMap = new Map();
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('camps')
      .select('slug, description, homebase')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error('Error fetching existing camps:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    for (const row of data) existingMap.set(row.slug, row);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`  Found ${existingMap.size} existing camps in DB`);

  // ---------------------------------------------------------------------------
  // 8. Split records into upsert groups based on which fields to write
  //
  // Supabase upsert generates SET clause from columns present in the payload.
  // Records in the same batch must have the same shape, so we group by
  // which conditional fields (description, homebase) should be included.
  //
  // Groups:
  //   A — new record: include all fields
  //   B — existing, desc=null & homebase=null: include all fields
  //   C — existing, desc=null only: include + description
  //   D — existing, homebase=null only: include + homebase
  //   E — existing, neither null: always-write fields only
  // ---------------------------------------------------------------------------
  const ALWAYS_WRITE = (r) => ({
    display_name: r.display_name,
    slug: r.slug,
    bm_uid: r.bm_uid,
    bm_homepage_url: r.bm_homepage_url,
  });

  const groupA = []; // new: all fields
  const groupB = []; // existing, both desc+homebase null: all fields
  const groupC = []; // existing, desc null only: always + description
  const groupD = []; // existing, homebase null only: always + homebase
  const groupE = []; // existing, neither null: always-write only

  for (const rec of records) {
    const existing = existingMap.get(rec.slug);
    if (!existing) {
      groupA.push(rec);
    } else {
      const descNull = existing.description === null;
      const homebaseNull = existing.homebase === null;
      if (descNull && homebaseNull) {
        groupB.push({ ...ALWAYS_WRITE(rec), description: rec.description, homebase: rec.homebase });
      } else if (descNull) {
        groupC.push({ ...ALWAYS_WRITE(rec), description: rec.description });
      } else if (homebaseNull) {
        groupD.push({ ...ALWAYS_WRITE(rec), homebase: rec.homebase });
      } else {
        groupE.push(ALWAYS_WRITE(rec));
      }
    }
  }

  const totalNew = groupA.length;
  const totalUpdated = groupB.length + groupC.length + groupD.length + groupE.length;

  console.log(`\nNew records to insert: ${totalNew}`);
  console.log(`Existing records to update: ${totalUpdated}`);

  // ---------------------------------------------------------------------------
  // 9. Upsert in batches of 100
  // ---------------------------------------------------------------------------
  async function upsertBatch(label, rows) {
    if (rows.length === 0) return;
    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('camps')
        .upsert(batch, { onConflict: 'slug' });
      if (error) {
        console.error(`  ERROR in ${label} batch ${Math.floor(i / BATCH) + 1}:`, error.message);
      } else {
        process.stdout.write('.');
      }
    }
  }

  console.log('\nUpserting...');
  process.stdout.write('Group A (new): ');
  await upsertBatch('A', groupA);
  console.log(` ${groupA.length} records`);

  process.stdout.write('Group B (existing, both null): ');
  await upsertBatch('B', groupB);
  console.log(` ${groupB.length} records`);

  process.stdout.write('Group C (existing, desc null): ');
  await upsertBatch('C', groupC);
  console.log(` ${groupC.length} records`);

  process.stdout.write('Group D (existing, homebase null): ');
  await upsertBatch('D', groupD);
  console.log(` ${groupD.length} records`);

  process.stdout.write('Group E (existing, no nulls): ');
  await upsertBatch('E', groupE);
  console.log(` ${groupE.length} records`);

  // ---------------------------------------------------------------------------
  // 10. Check for similar-but-not-identical slugs (potential same-camp dupes)
  // ---------------------------------------------------------------------------
  console.log('\nChecking for similar slug collisions...');
  const { data: allSlugs, error: slugErr } = await supabase
    .from('camps')
    .select('slug, display_name');

  if (slugErr) {
    console.warn('Could not fetch slugs for collision check:', slugErr.message);
  } else {
    // Normalize slugs by stripping all hyphens and underscores
    const normalizedSlugMap = new Map(); // stripped -> [slug, ...]
    for (const row of allSlugs) {
      const stripped = row.slug.replace(/[-_]/g, '');
      if (!normalizedSlugMap.has(stripped)) normalizedSlugMap.set(stripped, []);
      normalizedSlugMap.get(stripped).push({ slug: row.slug, display_name: row.display_name });
    }
    let collisions = 0;
    for (const [, group] of normalizedSlugMap) {
      if (group.length > 1) {
        collisions++;
        console.log(`  POSSIBLE DUPLICATE slugs (manual review needed):`);
        for (const { slug, display_name } of group) {
          console.log(`    slug="${slug}"  display_name="${display_name}"`);
        }
      }
    }
    if (collisions === 0) console.log('  No similar slug collisions found.');
    else console.log(`  ${collisions} potential collision group(s) flagged above for manual review in Supabase.`);
  }

  // ---------------------------------------------------------------------------
  // 11. Summary
  // ---------------------------------------------------------------------------
  console.log(`
Import complete.
Records in BM data:          ${totalBmRecords}
Unique camps after dedup:    ${uniqueAfterDedup}
Inserted (new):              ${totalNew}
Updated (existing):          ${totalUpdated}
Skipped (same-year dupes):   ${sameYearDuplicates}
`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
