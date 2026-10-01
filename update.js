// ✅ Node 20+ native fetch
import fs from 'fs/promises';

// ============ CONFIG ============
const SOURCES = [
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/countries/bd.m3u',
  'https://iptv-org.github.io/iptv/countries/in.m3u',
  'https://iptv-org.github.io/iptv/countries/us.m3u',
  'https://iptv-org.github.io/iptv/countries/uk.m3u',
  'https://iptv-org.github.io/iptv/languages/ben.m3u',
  'https://iptv-org.github.io/iptv/languages/hin.m3u',
];

// 🔍 Keyword filter (empty array = keep everything)
const KEYWORDS = [
  'bangla', 'bd', 'sports', 'news', 'movie',
  'music', 'kids', 'entertainment', 'bangladesh'
];

// 🚫 Exclude these
const EXCLUDE = ['xxx', 'adult', '18+', 'test', 'porn'];

const CHECK_TIMEOUT = 5000;   // 5s per stream
const PARALLEL = 25;          // parallel checks
// ================================

function parseM3U(text) {
  const lines = text.split('\n');
  const out = [];
  let meta = {};
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#EXTINF')) {
      const name = t.split(',').pop().trim();
      meta = {
        name,
        logo:    t.match(/tvg-logo="([^"]*)"/)?.[1] || '',
        group:   t.match(/group-title="([^"]*)"/)?.[1] || '',
        lang:    t.match(/tvg-language="([^"]*)"/)?.[1] || '',
        country: t.match(/tvg-country="([^"]*)"/)?.[1] || '',
      };
    } else if (t.startsWith('http')) {
      out.push({ ...meta, url: t });
    }
  }
  return out;
}

async function checkLive(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT);
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 IPTV-Checker' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

async function fetchSource(src) {
  try {
    console.log(`📡 ${src}`);
    const res = await fetch(src, {
      headers: { 'User-Agent': 'Mozilla/5.0 IPTV-Collector' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseM3U(text);
    console.log(`   → ${parsed.length} channels`);
    return parsed;
  } catch (e) {
    console.error(`   ❌ ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting IPTV collection...\n');

  // 1. Collect from all sources
  const batches = await Promise.all(SOURCES.map(fetchSource));
  let all = batches.flat();
  console.log(`\n📦 Total raw: ${all.length}`);

  // 2. Keyword filter
  const filtered = all.filter(c => {
    const blob = `${c.name} ${c.group} ${c.lang} ${c.country}`.toLowerCase();
    if (EXCLUDE.some(x => blob.includes(x))) return false;
    if (KEYWORDS.length === 0) return true;
    return KEYWORDS.some(k => blob.includes(k.toLowerCase()));
  });
  console.log(`🔍 After keyword filter: ${filtered.length}`);

  // 3. Dedupe by URL (ignore query)
  const seen = new Set();
  const unique = filtered.filter(c => {
    const key = c.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`🧹 After dedupe: ${unique.length}`);

  // 4. Live check (parallel batches)
  console.log(`\n🔎 Checking live streams (${PARALLEL} parallel)...`);
  const live = [];
  for (let i = 0; i < unique.length; i += PARALLEL) {
    const batch = unique.slice(i, i + PARALLEL);
    const results = await Promise.all(
      batch.map(async c => ({ c, ok: await checkLive(c.url) }))
    );
    results.forEach(({ c, ok }) => { if (ok) live.push({ ...c, live: true }); });
    console.log(`   ✅ ${live.length} live / ${i + batch.length} checked`);
  }

  // 5. Save in structure that the frontend expects
  const output = {
    updated: new Date().toISOString(),
    total: live.length,
    channels: live,
  };
  await fs.writeFile('channels.json', JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved ${live.length} live channels to channels.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
