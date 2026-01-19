const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const LEADERBOARD_FILE = path.join(__dirname, 'data', 'leaderboard.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    res.json([]);
  }
});

// Save score to leaderboard
app.post('/api/leaderboard', (req, res) => {
  try {
    const { playerName, score, missCount, level, shotsFired, duration } = req.body;
    
    if (score <= 0 || !playerName) {
      return res.status(400).json({ error: 'Invalid score or player name' });
    }
    
    // Get player IP address
    const playerIp = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     'unknown';
    
    // Read existing leaderboard
    let leaderboard = [];
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      leaderboard = JSON.parse(data);
    }
    
    // Add new score with detailed stats
    leaderboard.push({
      name: playerName,
      score: score,
      missCount: missCount || 0,
      level: level || 1,
      shotsFired: shotsFired || 0,
      duration: duration || 0,
      ipAddress: playerIp,
      timestamp: new Date().getTime(),
      date: new Date().toISOString()
    });
    
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 50 all-time
    leaderboard = leaderboard.slice(0, 50);
    
    // Save to file
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
    
    res.json(leaderboard.slice(0, 10)); // Return top 10
  } catch (error) {
    console.error('Error saving to leaderboard:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, () => {
  console.log(`Space Invaders game running at http://localhost:${PORT}`);
});
