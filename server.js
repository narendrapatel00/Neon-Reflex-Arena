const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON request bodies
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup (MongoDB check or JSON fallback)
const MONGODB_URI = process.env.MONGODB_URI;
let mongoose = null;
let ScoreSchema = null;
let ScoreModel = null;
let useMongoDB = false;

const DATA_DIR = path.join(__dirname, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory exists for JSON fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure leaderboard file exists for JSON fallback
if (!fs.existsSync(LEADERBOARD_FILE)) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([], null, 2));
}

if (MONGODB_URI) {
  try {
    mongoose = require('mongoose');
    mongoose.connect(MONGODB_URI)
      .then(() => {
        console.log('Successfully connected to MongoDB.');
        useMongoDB = true;
      })
      .catch((err) => {
        console.warn('MongoDB connection failed. Falling back to JSON database.', err.message);
      });

    ScoreSchema = new mongoose.Schema({
      username: { type: String, required: true, trim: true },
      score: { type: Number, required: true, min: 0 },
      date: { type: Date, default: Date.now }
    });
    
    ScoreModel = mongoose.model('Score', ScoreSchema);
  } catch (err) {
    console.warn('Mongoose package not found or initialization error. Using JSON database fallback.', err.message);
  }
} else {
  console.log('No MONGODB_URI found in environment. Running with local JSON database fallback.');
}

// Helper: Read scores from JSON file
function readLocalScores() {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local leaderboard file:', err.message);
    return [];
  }
}

// Helper: Save score to JSON file
function saveLocalScore(newScore) {
  try {
    const scores = readLocalScores();
    scores.push({
      username: newScore.username,
      score: newScore.score,
      date: newScore.date || new Date().toISOString()
    });
    
    // Sort descending by score, and limit to top 100 to save space
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 100);
    
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(topScores, null, 2), 'utf8');
    return topScores;
  } catch (err) {
    console.error('Error writing to local leaderboard file:', err.message);
    return [];
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// GET /api/leaderboard - Return top 10 scores
app.get('/api/leaderboard', async (req, res) => {
  try {
    if (useMongoDB && ScoreModel) {
      const dbScores = await ScoreModel.find()
        .sort({ score: -1, date: -1 })
        .limit(10)
        .select('username score date -_id');
      return res.json(dbScores);
    } else {
      const localScores = readLocalScores();
      const topTen = localScores.slice(0, 10).map(s => ({
        username: s.username,
        score: s.score,
        date: s.date
      }));
      return res.json(topTen);
    }
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard data' });
  }
});

// POST /api/score - Submit new score
app.post('/api/score', async (req, res) => {
  const { username, score } = req.body;

  // Validate input
  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'Username must be a non-empty string' });
  }
  if (score === undefined || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Score must be a non-negative number' });
  }

  const scoreData = {
    username: username.trim().substring(0, 20), // Truncate very long names
    score: Math.floor(score),
    date: new Date().toISOString()
  };

  try {
    if (useMongoDB && ScoreModel) {
      const newScore = new ScoreModel(scoreData);
      await newScore.save();
      return res.status(201).json({ message: 'Score saved successfully', data: scoreData });
    } else {
      saveLocalScore(scoreData);
      return res.status(201).json({ message: 'Score saved locally', data: scoreData });
    }
  } catch (err) {
    console.error('Score saving error:', err);
    return res.status(500).json({ error: 'Failed to save score' });
  }
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 NEON REFLEX ARENA server is running on port ${PORT}`);
  console.log(`🎮 Access local game at http://localhost:${PORT}`);
  console.log(`==================================================`);
});
