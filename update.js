const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

// একাধিক পাবলিক আইপিটিভি সোর্স (ফলব্যাক সিস্টেম)
const sources = [
    'https://iptv-org.github.io/iptv/languages/bn.m3u',
    'https://iptv-org.github.io/iptv/countries/bgd.m3u' // বাংলাদেশ রিজিওনাল সোর্স
];

async function updateIPTVPlaylist() {
    let channels = [];

    for (let url of sources) {
        try {
            console.log(`🔄 Trying to fetch from: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                timeout: 8000
            });

            const data = response.data;
            const lines = data.split('\n');
            let currentName = '';
            let currentLogo = '';

            for (let line of lines) {
                line = line.trim();

                if (line.startsWith('#EXTINF:')) {
                    let logoMatch = line.match(/tvg-logo="(.*?)"/);
                    currentLogo = logoMatch ? logoMatch[1] : '';

                    let parts = line.split(',');
                    if (parts.length > 1) {
                        currentName = parts[parts.length - 1].trim();
                    }
                } else if (line.startsWith('http')) {
                    if (currentName) {
                        // ডুপ্লিকেট লিংক এড়ানোর জন্য চেক করা
                        let exists = channels.some(ch => ch.url === line);
                        if (!exists) {
                            channels.push({
                                name: currentName,
                                url: line,
                                logo: currentLogo
                            });
                        }
                    }
                    currentName = '';
                    currentLogo = '';
                }
            }

            if (channels.length > 0) {
                console.log(`✅ Successfully fetched ${channels.length} channels from this source.`);
                break; // যদি ডেটা পেয়ে যায়, পরবর্তী সোর্সে যাওয়ার দরকার নেই
            }
        } catch (error) {
            console.log(`⚠️ Failed to fetch from ${url}, trying next source...`);
        }
    }

    // যদি কোনো সোর্স থেকেই লাইভ ডেটা না আসে, তবে ব্যাকআপ হিসেবে টেস্ট স্ট্রিম বা আগের ডেটা বহাল রাখা
    if (channels.length > 0) {
        fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
        console.log(`🚀 Total saved channels: ${channels.length}`);
    } else {
        console.log('❌ All internet sources failed to respond.');
    }
}

updateIPTVPlaylist();
                                                   
