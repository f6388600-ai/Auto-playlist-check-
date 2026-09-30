const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

// ইন্টারনেট থেকে ডেটা আনার জন্য বিভিন্ন জনপ্রিয় ওপেন-সোর্স ও পাবলিক আইপিটিভি সোর্স
const sources = [
    'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    'https://iptv-org.github.io/iptv/index.m3u', // মূল গ্লোবাল প্লেলিস্ট (যেখান থেকে বাংলা/এশিয়ান ফিল্টার করা যাবে)
    'https://raw.githubusercontent.com/ipstreet-dev/iptv/main/playlist.m3u'
];

async function updateIPTVPlaylist() {
    let channels = [];

    for (let url of sources) {
        try {
            console.log(`🔄 Trying to fetch from internet source: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                timeout: 15000
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
                        // বাংলাদেশ বা সাধারণ জনপ্রিয় চ্যানেলগুলো ফিল্টার করতে পারেন অথবা সব রাখতে পারেন
                        // এখানে আমরা গ্লোবাল বা পাবলিক লিংকগুলো সংগ্রহ করছি
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
                console.log(`✅ Successfully fetched ${channels.length} channels from ${url}`);
                break; // সফলভাবে ডেটা পেলে লুপ ভেঙে বের হয়ে যাবে
            }
        } catch (error) {
            console.log(`⚠️️ Failed to fetch from ${url}: ${error.message}`);
        }
    }

    // যদি ইন্টারনেট সোর্স থেকে চ্যানেল পাওয়া যায়, তবে সেভ হবে
    if (channels.length > 0) {
        // ফাইলের সাইজ ঠিক রাখার জন্য প্রথম ১০০-২০০ টি চ্যানেল রাখতে পারেন অথবা সব রাখতে পারেন
        fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
        console.log(`🚀 Saved total ${channels.length} channels to channels.json`);
    } else {
        console.log('❌ Error: All internet sources failed or returned 404.');
    }
}

updateIPTVPlaylist();
