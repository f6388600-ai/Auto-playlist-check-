const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const filePath = path.join(__dirname, 'channels.json');

app.get('/api/channels', (req, res) => {
    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath);
        res.json(JSON.parse(rawData));
    } else {
        res.json([]);
    }
});

app.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
});
