const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

async function updateIPTVPlaylist() {
    try {
        console.log('🔄 Fetching latest IPTV playlist...');
        const playlistUrl = 'https://iptv-org.github.io/iptv/languages/bn.m3u'; 
        const response = await axios.get(playlistUrl);
        const data = response.data;

        const lines = data.split('\n');
        let channels = [];
        let currentChannel = {};

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                let tvgLogoMatch = line.match(/tvg-logo="(.*?)"/);
                let nameMatch = line.split(',');
                
                currentChannel.logo = tvgLogoMatch ? tvgLogoMatch[1] : '';
                currentChannel.name = nameMatch[nameMatch.length - 1].trim();
            } else if (line.startsWith('http')) {
                currentChannel.url = line;
                
                if (currentChannel.name && currentChannel.url) {
                    channels.push({
                        name: currentChannel.name,
                        url: currentChannel.url,
                        logo: currentChannel.logo
                    });
                }
                currentChannel = {}; // রিসেট
            }
        }

        // ডাটা সরাসরি সেভ করা
        fs.writeFileSync(filePath, JSON.stringify(channels, null, 2));
        console.log(`✅ Success! Saved ${channels.length} channels to channels.json`);
    } catch (error) {
        console.error('❌ Error updating playlist:', error.message);
    }
}

updateIPTVPlaylist();
