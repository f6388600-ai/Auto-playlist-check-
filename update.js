const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

async function updateIPTVPlaylist() {
    try {
        console.log('🔄 Fetching real IPTV playlist from internet...');
        // বাংলাদেশ ও এশিয়ান রিজিওনাল রিয়েল পাবলিক প্লেলিস্ট লিংক
        const playlistUrl = 'https://iptv-org.github.io/iptv/languages/bn.m3u';
        
        const response = await axios.get(playlistUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const data = response.data;
        const lines = data.split('\n');
        let channels = [];
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
                    channels.push({
                        name: currentName,
                        url: line,
                        logo: currentLogo
                    });
                }
                currentName = '';
                currentLogo = '';
            }
        }

        if (channels.length > 0) {
            fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
            console.log(`✅ Success! Saved ${channels.length} real live channels.`);
        } else {
            console.log('⚠️️ Playlist was empty or could not be parsed.');
        }
    } catch (error) {
        console.error('❌ Error fetching from internet:', error.message);
    }
}

updateIPTVPlaylist();
            
