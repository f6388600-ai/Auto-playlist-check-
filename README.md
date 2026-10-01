# 📺 IPTV Live Search (GitHub Pages)

একটা সুন্দর **স্ট্যাটিক** IPTV চ্যানেল সার্চার।  
GitHub Pages-এ হোস্ট করা যায় — কোনো সার্ভার লাগে না।

### Features
- 🔍 রিয়েল-টাইম সার্চ বার
- 🌍 Country + Category ফিল্টার (ডেটা থাকলে)
- ▶️ HLS প্লেয়ার (ব্রাউজারেই চ্যানেল চলে)
- ⬇ M3U প্লেলিস্ট ডাউনলোড
- 🔄 GitHub Actions দিয়ে প্রতি ৬ ঘণ্টায় অটো আপডেট

---

## কিভাবে GitHub Pages-এ চালাবেন

1. এই রিপোজিটরি GitHub-এ আপলোড করুন (বা Fork করুন)
2. **Settings → Pages** এ যান
3. Source: **Deploy from a branch**
4. Branch: `main` (বা `master`) → `/ (root)` সিলেক্ট করুন
5. Save করুন

কিছুক্ষণ পর আপনার সাইট লাইভ হবে:  
`https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## লোকাল টেস্ট

শুধু `index.html` ও `channels.json` একই ফোল্ডারে থাকলেই চলে।

```bash
# যেকোনো সিম্পল সার্ভার দিয়ে
npx serve .
# বা
python -m http.server 3000
```

তারপর ব্রাউজারে `http://localhost:3000` খুলুন।

---

## অটো আপডেট চালু করতে

GitHub Actions ইতিমধ্যে সেটআপ করা আছে।  
**Actions** ট্যাবে গিয়ে **Auto Update IPTV** workflow-এ **Run workflow** চাপলে ম্যানুয়ালিও চালানো যায়।

`update.js` ফাইলে KEYWORDS ও SOURCES এডিট করে আপনার পছন্দের চ্যানেল বাড়াতে/কমাতে পারবেন।

---

## ফাইল স্ট্রাকচার

```
├── index.html          ← মূল UI (সার্চ + ফিল্টার)
├── channels.json       ← চ্যানেল ডেটা
├── update.js           ← অটো আপডেট স্ক্রিপ্ট
└── .github/workflows/
    └── update.yml      ← প্রতি ৬ ঘণ্টায় রান হয়
```
