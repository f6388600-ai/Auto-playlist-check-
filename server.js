import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.static('public'));

const data = () => JSON.parse(fs.readFileSync('channels.json', 'utf8'));

// সব channel
app.get('/api/channels', (req, res) => res.json(data()));

// 🔍 Search by keyword
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const d = data();
  const result = d.channels.filter(c =>
    `${c.name} ${c.group} ${c.country}`.toLowerCase().includes(q)
  );
  res.json({ count: result.length, channels: result });
});

// 🎛️ Filter by country / category / lang
app.get('/api/filter', (req, res) => {
  const { country, category, lang } = req.query;
  const d = data();
  const result = d.channels.filter(c =>
    (!country  || c.country?.toLowerCase() === country.toLowerCase()) &&
    (!category || c.group?.toLowerCase().includes(category.toLowerCase())) &&
    (!lang     || c.lang?.toLowerCase() === lang.toLowerCase())
  );
  res.json({ count: result.length, channels: result });
});

// 📊 Stats
app.get('/api/stats', (req, res) => {
  const d = data();
  const byCountry = {}, byGroup = {};
  d.channels.forEach(c => {
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
    byGroup[c.group]     = (byGroup[c.group]     || 0) + 1;
  });
  res.json({ total: d.total, updated: d.updated, byCountry, byGroup });
});

// M3U download
app.get('/playlist.m3u', (req, res) => {
  const d = data();
  let m3u = '#EXTM3U\n';
  d.channels.forEach(c => {
    m3u += `#EXTINF:-1 tvg-logo="${c.logo}" group-title="${c.group}",${c.name}\n${c.url}\n`;
  });
  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.send(m3u);
});

app.listen(process.env.PORT || 3000, () =>
  console.log('🚀 Server running'));