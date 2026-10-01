import fetch from 'node-fetch';
import fs from 'fs/promises';

// 👇 এখানে যত source চান add করুন
const SOURCES = [
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/countries/bd.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/bd.m3u',
  // আপনার নিজের source add করুন
];

// 👇 Keyword filter — এখানে যা দিবেন সেটাই খুঁজবে
const KEYWORDS = ['bangla', 'bd', 'sports', 'news', 'movie'];
const EXCLUDE  = ['xxx', 'adult', 'test'];

function parseM3U(text) {
  const lines = text.split('\n');
  const channels = [];
  let meta = {};
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const name = line.split(',').pop().trim();
      const logo = line.match(/tvg-logo="([^"]*)"/)?.[1] || '';
      const group = line.match(/group-title="([^"]*)"/)?.[1] || '';
      const lang = line.match(/tvg-language="([^"]*)"/)?.[1] || '';
      const country = line.match(/tvg-country="([^"]*)"/)?.[1] || '';
      meta = { name, logo, group, lang, country };
    } else if (line.startsWith('http')) {
      channels.push({ ...meta, url: line.trim() });
    }
  }
  return channels;
}

async function checkLive(url, timeout = 5000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}

async function collect() {
  let all = [];
  for (const src of SOURCES) {
    try {
      console.log(`📡 Fetching ${src}`);
      const res = await fetch(src);
      const text = await res.text();
      all.push(...parseM3U(text));
    } catch (e) { console.error(`❌ ${src}`, e.message); }
  }

  // Keyword filter
  const filtered = all.filter(c => {
    const blob = `${c.name} ${c.group} ${c.lang} ${c.country}`.toLowerCase();
    if (EXCLUDE.some(x => blob.includes(x))) return false;
    if (KEYWORDS.length === 0) return true;
    return KEYWORDS.some(k => blob.includes(k.toLowerCase()));
  });

  // Dedupe
  const seen = new Set();
  const unique = filtered.filter(c => {
    const key = c.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  // Live check (parallel, 20 at a time)
  console.log(`🔍 Checking ${unique.length} streams...`);
  const results = [];
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    const checks = await Promise.all(batch.map(c => checkLive(c.url)));
    batch.forEach((c, idx) => {
      if (checks[idx]) results.push({ ...c, live: true });
    });
    console.log(`✅ ${results.length} live so far`);
  }

  await fs.writeFile('channels.json', JSON.stringify({
    updated: new Date().toISOString(),
    total: results.length,
    channels: results
  }, null, 2));

  console.log(`💾 Saved ${results.length} live channels`);
}

collect();