/**
 * import-bm-2026-camps.js
 * Syncs the camps table with Burning Man's live 2026 registered-camp roster
 * (api.burningman.org — requires BURNING_MAN_API_KEY in .env.local).
 *
 * Re-runnable by design: placement addresses (location_string) are empty in
 * the API until BM publishes placement (~late August). Run once now to mark
 * returning camps + insert new ones, then run again after placement drops
 * to fill camps.playa_location. Nothing is ever nulled out on re-run.
 *
 * Run from project root: node scripts/import-bm-2026-camps.js
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
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const BM_API_KEY = env['BURNING_MAN_API_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
  process.exit(1);
}
if (!BM_API_KEY) {
  console.error('ERROR: BURNING_MAN_API_KEY missing from .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const YEAR = 2026;

// ---------------------------------------------------------------------------
// 2. Normalization helpers (same rules as import-bm-camps.js)
// ---------------------------------------------------------------------------
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
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

// The API's location object can carry structure even before location_string
// is set; prefer the string, fall back to assembling frontage/intersection.
function extractPlayaLocation(camp) {
  if (camp.location_string && String(camp.location_string).trim()) {
    return String(camp.location_string).trim();
  }
  const loc = camp.location;
  if (loc && typeof loc === 'object') {
    if (loc.string && String(loc.string).trim()) return String(loc.string).trim();
    const frontage = loc.frontage ? String(loc.frontage).trim() : '';
    const intersection = loc.intersection ? String(loc.intersection).trim() : '';
    if (frontage && intersection) return `${frontage} & ${intersection}`;
    if (frontage) return frontage;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Fetching ${YEAR} camps from api.burningman.org...`);
  const res = await fetch(`https://api.burningman.org/api/camp?year=${YEAR}`, {
    headers: { 'X-API-Key': BM_API_KEY },
  });
  if (!res.ok) {
    console.error(`ERROR: BM API returned HTTP ${res.status}`);
    process.exit(1);
  }
  const camps = await res.json();
  if (!Array.isArray(camps) || camps.length === 0) {
    console.error('ERROR: BM API returned no camps');
    process.exit(1);
  }
  console.log(`  ${camps.length} registered ${YEAR} camps`);

  const withPlacement = camps.filter(c => extractPlayaLocation(c)).length;
  console.log(`  ${withPlacement} have placement addresses (${withPlacement === 0 ? 'placement not yet published — re-run after it drops' : 'placement is live'})`);

  // Dedupe within the API data by normalized name (same-year dupes are rare but possible)
  const seen = new Set();
  const apiCamps = [];
  for (const c of camps) {
    const rawName = (c.name || '').trim();
    if (!rawName) continue;
    const norm = normalizeName(rawName);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    apiCamps.push({ ...c, _norm: norm, _name: rawName });
  }

  // ---------------------------------------------------------------------------
  // 4. Fetch all existing camps
  // ---------------------------------------------------------------------------
  console.log('\nFetching existing camps from DB...');
  const existing = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('camps')
      .select('id, slug, display_name, description, homebase, bm_uid, bm_homepage_url, playa_location, returning_2026')
      .range(offset, offset + PAGE - 1);
    if (error) { console.error('Error fetching camps:', error.message); process.exit(1); }
    existing.push(...(data || []));
    if (!data || data.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`  ${existing.length} camps in DB`);

  const byNorm = new Map();
  const slugSet = new Set();
  for (const row of existing) {
    byNorm.set(normalizeName(row.display_name), row);
    slugSet.add(row.slug);
  }

  // ---------------------------------------------------------------------------
  // 5. Diff API camps against DB
  // ---------------------------------------------------------------------------
  const updates = []; // { id, patch }
  const inserts = [];
  let alreadyCurrent = 0;

  for (const c of apiCamps) {
    const playaLocation = extractPlayaLocation(c);
    const match = byNorm.get(c._norm);

    if (match) {
      const patch = {};
      if (!match.returning_2026) patch.returning_2026 = true;
      if (playaLocation && match.playa_location !== playaLocation) patch.playa_location = playaLocation;
      if (!match.description && c.description) patch.description = c.description;
      if (!match.homebase && c.hometown) patch.homebase = c.hometown;
      if (!match.bm_uid && c.uid) patch.bm_uid = String(c.uid);
      if (c.url && match.bm_homepage_url !== c.url) patch.bm_homepage_url = c.url;

      if (Object.keys(patch).length > 0) updates.push({ id: match.id, patch });
      else alreadyCurrent++;
    } else {
      let slug = toSlug(c._name);
      if (!slug) continue;
      if (slugSet.has(slug)) {
        let i = 2;
        while (slugSet.has(`${slug}-${i}`)) i++;
        slug = `${slug}-${i}`;
      }
      slugSet.add(slug);
      inserts.push({
        display_name: c._name,
        slug,
        description: c.description || null,
        homebase: c.hometown || null,
        bm_uid: c.uid ? String(c.uid) : null,
        bm_homepage_url: c.url || null,
        playa_location: playaLocation,
        returning_2026: true,
        is_claimed: false,
      });
    }
  }

  console.log(`\nMatched, needing updates: ${updates.length}`);
  console.log(`Matched, already current:  ${alreadyCurrent}`);
  console.log(`New camps to insert:       ${inserts.length}`);

  // ---------------------------------------------------------------------------
  // 6. Apply updates (row-by-row — each patch differs)
  // ---------------------------------------------------------------------------
  console.log('\nApplying updates...');
  let updateErrors = 0;
  for (let i = 0; i < updates.length; i++) {
    const { id, patch } = updates[i];
    const { error } = await supabase.from('camps').update(patch).eq('id', id);
    if (error) { console.error(`  ERROR updating camp ${id}:`, error.message); updateErrors++; }
    if ((i + 1) % 100 === 0) process.stdout.write('.');
  }
  console.log(` done (${updates.length - updateErrors} ok, ${updateErrors} errors)`);

  // ---------------------------------------------------------------------------
  // 7. Insert new camps in batches
  // ---------------------------------------------------------------------------
  console.log('Inserting new camps...');
  let insertErrors = 0;
  const BATCH = 100;
  for (let i = 0; i < inserts.length; i += BATCH) {
    const batch = inserts.slice(i, i + BATCH);
    const { error } = await supabase.from('camps').insert(batch);
    if (error) { console.error(`  ERROR in insert batch ${Math.floor(i / BATCH) + 1}:`, error.message); insertErrors += batch.length; }
    else process.stdout.write('.');
  }
  console.log(` done (${inserts.length - insertErrors} ok, ${insertErrors} errors)`);

  // ---------------------------------------------------------------------------
  // 8. Summary
  // ---------------------------------------------------------------------------
  console.log(`
Sync complete.
API camps (${YEAR}):            ${camps.length}
  with placement address:    ${withPlacement}
Updated existing:            ${updates.length - updateErrors}
Already current:             ${alreadyCurrent}
Inserted new:                ${inserts.length - insertErrors}
Errors:                      ${updateErrors + insertErrors}
${withPlacement === 0 ? '\nNOTE: no placement addresses yet — re-run this script after BM publishes placement (~late August) to fill playa_location.' : ''}
`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
