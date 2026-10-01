import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

const loadData = () => {
  try {
    return JSON.parse(fs.readFileSync('channels.json', 'utf8'));
  } catch {
    return { updated: null, total: 0, channels: [] };
  }
};

// সব channel
app.get('/api/channels', (req, res) => res.json(loadData()));

// 🔍 Search
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  const d = loadData();
  const channels = q
    ? d.channels.filter(c =>
        `${c.name} ${c.group} ${c.country} ${c.lang}`.toLowerCase().includes(q)
      )
    : d.channels;
  res.json({ count: channels.length, channels });
});

// 🎛️ Filter
app.get('/api/filter', (req, res) => {
  const { country, category, lang } = req.query;
  const d = loadData();
  const channels = d.channels.filter(c =>
    (!country  || (c.country || '').toLowerCase() === country.toLowerCase()) &&
    (!category || (c.group   || '').toLowerCase().includes(category.toLowerCase())) &&
    (!lang     || (c.lang    || '').toLowerCase() === lang.toLowerCase())
  );
  res.json({ count: channels.length, channels });
});

// 📊 Stats
app.get('/api/stats', (req, res) => {
  const d = loadData();
  const byCountry = {}, byGroup = {};
  d.channels.forEach(c => {
    if (c.country) byCountry[c.country] = (byCountry[c.country] || 0) + 1;
    if (c.group)   byGroup[c.group]     = (byGroup[c.group]     || 0) + 1;
  });
  res.json({
    total: d.total,
    updated: d.updated,
    countries: byCountry,
    categories: byGroup,
  });
});

// 📥 M3U download
app.get('/playlist.m3u', (req, res) => {
  const d = loadData();
  let m3u = '#EXTM3U\n';
  d.channels.forEach(c => {
    m3u += `#EXTINF:-1 tvg-logo="${c.logo || ''}" group-title="${c.group || ''}",${c.name}\n${c.url}\n`;
  });
  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
  res.send(m3u);
});

// ❤️ Health
app.get('/health', (req, res) => res.json({ ok: true, time: new Date() }));

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));