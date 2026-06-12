# Neon Reflex Arena 🎮⚡

[![Tech Stack](https://img.shields.io/badge/tech--stack-HTML5%20%7C%20CSS3%20%7C%20JS%20%7C%20Node.js-blue)](https://github.com)
[![Engine](https://img.shields.io/badge/3D%20Engine-Three.js-00F5FF)](https://threejs.org/)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API%20Synth-A855F7)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Status](https://img.shields.io/badge/Build-Stable-10B981)](https://github.com)

**Neon Reflex Arena** is a premium, high-octane 3D browser reflex-click game wrapped in an ultra-futuristic cyberpunk gaming dashboard. Renders real-time 3D vector spaces with Three.js, synthesizes dynamic audio patterns using the browser's Web Audio API, and tracks scores on an Express server backend.

---

## 🎮 Gameplay Mechanics
- **Aim**: Target and click floating 3D energy orbs before they self-destruct within **60 seconds**.
- **Orb Classes**:
  - **Cyan Orbs**: Standard speed and size (`+10 pts` base).
  - **Purple Orbs**: Medium speed (`+15 pts` base).
  - **Pink Orbs**: Rare, high-velocity target (`+25 pts` base).
- **Combo Multiplier**: Score hits consecutively to scale your multiplier through **x2, x3, and x5**. Missing target clicks resets the multiplier immediately.
- **Dynamic Adaption**: Difficulty increases linearly. Spawn frequencies escalate, target scaling decreases, and path movements increase as the session runs down.

---

## 🚀 Advanced Tech Highlights

### 1. WebGL 3D Vector Arena (`Three.js`)
- **Interactive Targets**: Orbs are rendered with reflective metallic and emissive physical properties.
- **Ambient Point Lighting**: Each orb carries a local point-light color source, casting real-time lighting onto rotating background geometries.
- **Particle Dynamics**: Real-time 3D particle dust explosions expand spherically on successful orb hits.
- **Camera Effects**: Built-in mouse parallax shifting and shake offsets that trigger on hits/misses.

### 2. Procedural Synth Synthesizer (`Web Audio API`)
- Generates all laser blasters, sub-bass misses, and combo chimes procedurally without loading heavy mp3 files.
- Sequences a 125-BPM synthwave bassline/lead melody in the background. The music speed and highpass filter cutoff frequency dynamically adapt to your active combo multiplier!

### 3. Glassmorphic Responsive Dashboard
- Design aesthetic using saturated overlays, blur filters, and neon drop-shadows.
- Features digital score tickers, live match telemetry tables, and local achievements tracker (First Contact, Neural Flow, Sniper Chrome, Cyber God).
- Complete layout scalability for Mobile, Tablet, and Desktop screen widths.

### 4. Robust API & Dual DB Fallback
- Score POST and Leaderboard GET routes are powered by Node.js + Express.
- Automatically connects to MongoDB if a URI string is present, otherwise falls back dynamically to a local JSON file database under `/data`.
- Frontend includes a local storage fallback if the server goes offline, ensuring full playability.

---

## 🏆 REST API Endpoints

### 1. Submit Score
- **Route**: `POST /api/score`
- **Request Body**:
  ```json
  {
    "username": "ZeroCool",
    "score": 450
  }
  ```
- **Response**:
  ```json
  {
    "message": "Score saved successfully",
    "data": {
      "username": "ZeroCool",
      "score": 450,
      "date": "2026-06-12T16:49:56.498Z"
    }
  }
  ```

### 2. Fetch Leaderboard
- **Route**: `GET /api/leaderboard`
- **Response (Top 10)**:
  ```json
  [
    {
      "username": "ZeroCool",
      "score": 450,
      "date": "2026-06-12T16:49:56.498Z"
    }
  ]
  ```

---

## 🛠️ Local Installation & Launch

1. **Clone project repository**:
   ```bash
   git clone <repository-url>
   cd neon-reflex-arena
   ```

2. **Install node dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment (Optional)**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Boot Server**:
   ```bash
   npm start
   ```
   Open your browser to [http://localhost:3000](http://localhost:3000) and click initialize!
