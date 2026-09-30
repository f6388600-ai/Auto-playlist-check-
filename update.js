const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'channels.json');

// ডিফল্ট বা টেস্ট চ্যানেল লিস্ট (লিংক কাজ না করলে এগুলো ব্যাকআপ হিসেবে থাকবে)
const defaultChannels = [
    {
        name: "Test Big Buck Bunny (Live Stream)",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg"
    },
    {
        name: "Sintel Trailer (HLS Test)",
        url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/220px-Sintel_poster.jpg"
    }
];

function updateIPTVPlaylist() {
    try {
        console.log('🔄 Writing test/live channels to channels.json...');
        
        // সরাসরি ফাইলে ডাটা সেভ করা
        fs.writeFileSync(filePath, JSON.stringify(defaultChannels, null, 2));
        console.log(`✅ Success! Saved ${defaultChannels.length} channels.`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

updateIPTVPlaylist();
