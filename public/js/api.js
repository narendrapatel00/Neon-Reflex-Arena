/**
 * Neon Reflex Arena - REST API and Storage Interface
 * Handles communications with the Node/Express backend.
 * Integrates LocalStorage fallback if server connection fails.
 */

const API_BASE = '/api';

const ScoreAPI = {
  // Save local leaderboard fallback
  getLocalLeaderboard() {
    try {
      const scores = localStorage.getItem('neon_reflex_local_scores');
      return scores ? JSON.parse(scores) : [];
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
      return [];
    }
  },

  saveLocalScore(username, score) {
    try {
      const scores = this.getLocalLeaderboard();
      scores.push({
        username: username,
        score: score,
        date: new Date().toISOString()
      });
      // Sort and limit to 10
      scores.sort((a, b) => b.score - a.score);
      const topTen = scores.slice(0, 10);
      localStorage.setItem('neon_reflex_local_scores', JSON.stringify(topTen));
      return topTen;
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
      return [];
    }
  },

  // GET /api/leaderboard
  async fetchLeaderboard() {
    try {
      const response = await fetch(`${API_BASE}/leaderboard`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      
      const scores = await response.json();
      return { success: true, data: scores, source: 'backend' };
    } catch (err) {
      console.warn('Leaderboard API fetch failed. Falling back to local high scores.', err.message);
      const localScores = this.getLocalLeaderboard();
      return { success: true, data: localScores, source: 'local_storage' };
    }
  },

  // POST /api/score
  async postScore(username, score) {
    // Validate arguments locally
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return { success: false, error: 'Invalid username' };
    }
    if (score === undefined || typeof score !== 'number' || score < 0) {
      return { success: false, error: 'Invalid score value' };
    }

    const payload = {
      username: username.trim(),
      score: Math.floor(score)
    };

    try {
      const response = await fetch(`${API_BASE}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const resData = await response.json();
      // Sync local storage as well for high-score checks
      this.saveLocalScore(payload.username, payload.score);
      return { success: true, data: resData, source: 'backend' };
    } catch (err) {
      console.warn('Post score API failed. Writing to local storage only.', err.message);
      const updatedLocal = this.saveLocalScore(payload.username, payload.score);
      return { success: true, data: { message: 'Saved to local storage fallback', data: payload }, source: 'local_storage' };
    }
  }
};

window.ScoreAPI = ScoreAPI;
