const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

// লিংক লাইভ আছে কি না চেক করার ফাংশন
async function checkStream(url) {
    try {
        const response = await axios.get(url, { timeout: 4000 });
        return response.status === 200;
    } catch (err) {
        return false;
    }
}

async function updateIPTVPlaylist() {
    try {
        console.log('🔄 Fetching latest IPTV playlist...');
        const playlistUrl = 'https://iptv-org.github.io/iptv/languages/bn.m3u'; 
        const response = await axios.get(playlistUrl);
        const data = response.data;

        const lines = data.split('\n');
        let tempChannels = [];
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
                    tempChannels.push({ ...currentChannel });
                }
                currentChannel = {};
            }
        }

        // স্পিডের জন্য প্রথম ৩০টি চ্যানেল চেক করে ফিল্টার করা (চাইলে পুরো অ্যারে দিতে পারেন)
        let channelsToCheck = tempChannels.slice(0, 30);
        let validChannels = [];
        
        console.log(`🔍 Checking live status for ${channelsToCheck.length} channels...`);
        
        for (let ch of channelsToCheck) {
            let isLive = await checkStream(ch.url);
            if (isLive) {
                validChannels.push(ch);
            }
        }

        fs.writeFileSync(filePath, JSON.stringify(validChannels, null, 2));
        console.log(`✅ Success! Saved ${validChannels.length} live channels to channels.json`);
    } catch (error) {
        console.error('❌ Error updating playlist:', error.message);
    }
}

updateIPTVPlaylist();
              
