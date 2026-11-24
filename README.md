# VEX Live Mobile — 1.0 alpha
Android interactive TikTok LIVE game prototype. Native Java shell, local HTML/Canvas projected 3D scenes, no PC required for rendering. Five game concepts share the same event engine; Halay is the main game. The other four are early visual prototypes, not finished standalone games.
## Build
GitHub Actions builds a debug APK with Gradle 8.7 / Android SDK 34. See Actions or the prerelease after a successful run.
## Usage
1. Start a mobile gaming / screen-sharing LIVE in TikTok (account eligibility required).
2. Open VEX; set username and Euler Stream API key, or your own WSS bridge URL. Connect and open the game. API key stays in memory for the current connection, not in settings.
3. Demo mode uses labeled synthetic events only; it cannot run alongside a requested live connection.
4. Choose map, FPS, quality, orientation, cap, goal, moderation and music. Only use licensed audio.
## Bridge
Optional Node service: cd bridge; npm install; set BRIDGE_TOKEN to a long random value; npm start. Reverse proxy localhost:8080 using TLS and WebSocket upgrades. Enter wss://your-domain/live?token=YOUR_TOKEN in the app. Restrict access; do not publish tokens. The unofficial connector may require provider credentials or changes when TikTok updates. Euler requires an API key and may have quotas/costs.
## Scope
Implemented: offline visual game modes, projected 3D-style Halay, event normalization, participant limits, likes and gift counters, leaderboards, goals, demo isolation, local music, generated rhythm, WSS reconnect, settings, screen-share guidance. Direct RTMP/RTMPS streaming, real skeletal animation, production-grade game mechanics and verified device/live testing are not implemented. No claim of TikTok official integration. 

## 1.1 Studio update
Three.js r160.1 is bundled at build time (MIT license), with offline WebGL rendering and the original Canvas fallback. Five game-specific scenes, articulated dance figures, mining production, simulated monster duels, village construction and lap-based racing. Original synthesized five-track soundtrack (no commercial recordings), music selection and volume. These are interactive alpha games, not production-tested on Android. TikTok LIVE access requirements are unchanged.
