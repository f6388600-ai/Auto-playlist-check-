# IPTV Auto Aggregator (Final)

Public free-to-air IPTV playlist aggregator with automatic updates, health checks, and GitHub Pages support.

---

## Features

| Feature                        | Status |
|--------------------------------|--------|
| Unlimited public sources       | ✅     |
| M3U + JSON support             | ✅     |
| Health check (working only)    | ✅     |
| Deduplication                  | ✅     |
| Country / Category filters     | ✅     |
| Auto update every 30 minutes   | ✅     |
| GitHub Pages live site         | ✅     |
| Clean M3U + JSON output        | ✅     |
| Detailed logs                  | ✅     |
| Manual run button              | ✅     |

---

## Quick Setup (5 minutes)

### 1. Create Repository
- GitHub → **New repository**
- Name: anything (example: `iptv-auto`)
- Public recommended (for easy Pages)

### 2. Upload Files
Upload all files from this package:
```
├── .github/workflows/update-iptv.yml
├── scripts/update.py
├── sources.yaml
├── requirements.txt
├── README.md
├── .gitignore
└── playlists/          (empty is fine)
```

### 3. Enable GitHub Pages
1. Go to **Settings → Pages**
2. Source: **GitHub Actions**
3. Save

### 4. Enable Workflow
1. Go to **Actions** tab
2. Enable workflows if prompted
3. Click **IPTV Auto Update** → **Run workflow** (first time)

### 5. Done
After first successful run you will get:

- Live page: `https://YOUR_USERNAME.github.io/REPO_NAME/`
- Online playlist: `https://YOUR_USERNAME.github.io/REPO_NAME/playlists/online.m3u`
- Full playlist: `https://YOUR_USERNAME.github.io/REPO_NAME/playlists/playlist.m3u`
- JSON: `https://YOUR_USERNAME.github.io/REPO_NAME/playlists/channels.json`

---

## Add Unlimited Sources

Edit `sources.yaml`:

```yaml
sources:
  - name: "My Public Playlist"
    url: "https://raw.githubusercontent.com/USER/REPO/main/list.m3u"
    type: m3u
    enabled: true

  - name: "JSON Source"
    url: "https://example.com/channels.json"
    type: json
    enabled: true
```

Just keep adding. No limit.

---

## Settings

Inside `sources.yaml`:

```yaml
settings:
  max_channels_per_source: 3000
  health_check: true
  health_timeout: 6
  health_workers: 40
  remove_duplicates: true
  keep_only_https: false
  preferred_countries: []     # ["BD", "IN", "US"]
  preferred_categories: []    # ["News", "Sports"]
```

---

## Output Files

| File                      | Description                     |
|---------------------------|---------------------------------|
| `playlists/online.m3u`    | Only working streams (recommended) |
| `playlists/playlist.m3u`  | All unique channels             |
| `playlists/channels.json` | Full JSON data                  |
| `playlists/status.json`   | Last update stats               |
| `playlists/update.log`    | Detailed log                    |
| `index.html`              | GitHub Pages landing page       |

---

## Local Run

```bash
pip install -r requirements.txt
python scripts/update.py
```

---

## Notes

- Only use **public** free-to-air playlist URLs
- First run can take 5–20 minutes (depends on health check size)
- GitHub free tier is enough for 30-minute schedule
- Respect original source licenses

---

## License

This aggregator code is free to use.  
Stream URLs belong to their respective owners / original sources.
