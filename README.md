# Drift by Ukubot

A browser drift-arena game hosted on GitHub Pages. Single-player works without a server.

## Controls
- Keyboard: WASD or arrow keys to drive/steer, Space for handbrake, R to reset.
- Mobile: left joystick steers; pushing up accelerates and down brakes; GAS/BRAKE/HAND buttons are also available.
- Settings toggles touch controls.

## Multiplayer setup (optional)
GitHub Pages cannot host WebSockets. The included `server.js`, `package.json`, and `render.yaml` create a separate Node WebSocket server.

1. In Render, create a **Blueprint** from this repository and let it read `render.yaml` (or create a Node web service manually).
2. Wait until Render says the service is Live.
3. Copy its public hostname and use **wss://YOUR-SERVICE.onrender.com** in the game's Settings → Multiplayer server.
4. Press **Connect Multiplayer**. Other players connect to the same server URL.

Render's free service may sleep when idle; the first connection can take a little time to wake up. Multiplayer requires the server to be deployed; it is not active just because GitHub Pages is published.
