# Platform Integration Guide

This document explains how the Space Defense Cannon game is integrated with the Ggameplatform.

## Overview

The game has been integrated with the [Ggameplatform](https://github.com/davvoz/Ggameplatform) using their Platform SDK. This enables the game to communicate with the platform for features like pause/resume, score tracking, and game over events.

## Integration Features

### 1. SDK Initialization
The game automatically initializes the Platform SDK on load:
- Checks if SDK is available
- Initializes with 10-second timeout
- Handles both iframe and standalone modes gracefully

### 2. Pause/Resume Support
When the platform sends pause/resume events:
- **Pause**: Game loop stops updating, background music pauses
- **Resume**: Game loop resumes, background music resumes (if enabled)

The game checks `isPlatformPaused` flag in the main update loop to prevent updates during pause.

### 3. Score Tracking
The game sends score updates to the platform:
- **On Enemy Kill**: Sends current kill count with metadata (wave, health, money)
- **On Wave Completion**: Sends level completion event with bonus information
- **On Game Over**: Sends final score with complete game statistics

### 4. Background Music Control
Background music automatically pauses/resumes based on platform events to ensure proper user experience.

## How It Works

### Files Modified

1. **index.html**
   - Added `<script src="platformsdk.js"></script>` before game scripts

2. **GameEngine.js**
   - Added `initializePlatformSDK()` method
   - Added `isPlatformPaused` state flag
   - Added `sendScoreUpdate()` method
   - Added pause/resume event handlers
   - Modified `update()` to check platform pause state
   - Modified `checkGameOver()` to send game over event
   - Modified `completeWave()` to send level completion event

3. **EnemySystem.js**
   - Modified `killEnemy()` to call `sendScoreUpdate()`

4. **platformsdk.js**
   - Complete SDK library copied from Ggameplatform

## Platform SDK API Usage

### Initialization
```javascript
PlatformSDK.init({ timeout: 10000 })
    .then(() => {
        console.log('Platform SDK initialized successfully');
    })
    .catch(err => {
        console.log('Running in standalone mode:', err);
    });
```

### Event Listeners
```javascript
PlatformSDK.on('pause', () => {
    this.isPlatformPaused = true;
    this.pauseBackgroundMusic();
});

PlatformSDK.on('resume', () => {
    this.isPlatformPaused = false;
    this.resumeBackgroundMusic();
});
```

### Score Updates
```javascript
PlatformSDK.sendScore(this.kills, {
    wave: this.wave,
    health: this.health,
    money: this.money
});
```

### Level Completion
```javascript
PlatformSDK.levelCompleted(waveNumber, {
    bonus: bonus,
    totalKills: this.kills,
    currentMoney: this.money
});
```

### Game Over
```javascript
PlatformSDK.gameOver(this.kills, {
    wave: this.wave,
    totalKills: this.kills,
    finalMoney: this.money,
    experienceEarned: experiencePoints
});
```

## Testing

### Standalone Mode
The game works perfectly in standalone mode (accessing index.html directly):
- SDK initializes with a warning about not being in iframe
- Messages are sent but not received (expected behavior)
- Game functionality is not affected

### Platform Mode
When running inside the Ggameplatform:
1. The platform loads the game in an iframe
2. SDK initializes and establishes communication
3. Platform can send pause/resume/exit events
4. Game sends score/level/gameOver events to platform
5. Platform can display scores and statistics

## Registering the Game with the Platform

To register this game with the Ggameplatform:

1. Copy the game directory to the platform's games folder
2. Use the platform's game registration API:

```bash
# Example registration (from platform repository)
curl -X POST http://localhost:8000/games/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "space-defense-cannon",
    "title": "Space Defense Cannon",
    "description": "Auto-targeting tower defense game with upgrade system",
    "author": "davvoz",
    "version": "1.0.0",
    "thumbnail": "thumbnail.png",
    "entryPoint": "index.html",
    "category": "action",
    "tags": ["tower-defense", "space", "shooting"]
  }'
```

## Compatibility

- **Browser Support**: Same as Platform SDK (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Mobile Support**: Fully compatible with mobile browsers
- **Framework**: Pure Vanilla JavaScript - no dependencies

## Development Notes

### Adding New Platform Events

To add new platform event handlers:

1. Add event listener in `initializePlatformSDK()`:
```javascript
PlatformSDK.on('yourEvent', () => {
    // Handle event
});
```

2. Implement the handler logic in GameEngine

### Sending Custom Events

To send custom events to the platform:

```javascript
// The SDK supports custom event types through log messages
PlatformSDK.log('Custom event description', {
    customData: 'value'
});
```

## Troubleshooting

### SDK Not Available
If `typeof PlatformSDK === 'undefined'`:
- Check that platformsdk.js is loaded before GameEngine.js
- Verify the script path is correct in index.html

### Events Not Received
If platform events are not working:
- Ensure game is running in iframe (check `window.self === window.top`)
- Verify platform is sending correct protocol version (1.0.0)
- Check browser console for SDK warnings

### Score Not Updating
If scores aren't sent to platform:
- Verify `sendScoreUpdate()` is called after kills increment
- Check if `PlatformSDK` is defined when sending
- Ensure game is not in game over state

## License

The Platform SDK integration follows the same license as the Ggameplatform (MIT License).
