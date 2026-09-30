const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

async function updateIPTVPlaylist() {
    try {
        console.log('🔄 Fetching IPTV playlist...');
        const playlistUrl = 'https://iptv-org.github.io/iptv/languages/bn.m3u';
        const response = await axios.get(playlistUrl);
        const data = response.data;

        const lines = data.split('\n');
        let channels = [];
        let currentName = '';
        let currentLogo = '';

        for (let line of lines) {
            line = line.trim();

            if (line.startsWith('#EXTINF:')) {
                // লোগো এক্সট্রাক্ট করা
                let logoMatch = line.match(/tvg-logo="(.*?)"/);
                currentLogo = logoMatch ? logoMatch[1] : '';

                // চ্যানেলের নাম এক্সট্রাক্ট করা (কমা (,) এর পরের অংশ)
                let parts = line.split(',');
                if (parts.length > 1) {
                    currentName = parts[parts.length - 1].trim();
                }
            } else if (line.startsWith('http')) {
                // লিংক পাওয়ার সাথে সাথে চ্যানেলের অবজেক্ট অ্যারেতে যোগ করা
                if (currentName) {
                    channels.push({
                        name: currentName,
                        url: line,
                        logo: currentLogo
                    });
                }
                // রিসেট
                currentName = '';
                currentLogo = '';
            }
        }

        // যদি কোনো চ্যানেল পাওয়া যায় তবেই ফাইলে সেভ হবে
        if (channels.length > 0) {
            fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
            console.log(`✅ Success! Saved ${channels.length} channels.`);
        } else {
            console.log('⚠️ No channels parsed from playlist.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateIPTVPlaylist();
    
