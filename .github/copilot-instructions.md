# Space Defense Cannon

Space Defense Cannon is an HTML5 canvas-based tower defense game built with vanilla JavaScript. The game features auto-targeting cannons, shield systems, ultimate abilities, and wave-based progression with upgrades.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Quick Start - No Build Required
- This is a pure client-side HTML5/JavaScript game with NO build system, dependencies, or compilation steps
- Simply serve the static files with any HTTP server:
  - `python3 -m http.server 8080`
  - Open browser to `http://localhost:8080`
- Game loads instantly - NO waiting or build time required

### Repository Structure
```
.
├── README.md           # Game documentation and features
├── index.html          # Main HTML file with embedded CSS
├── game.js            # Complete game logic (4,352 lines)
├── Pixel Dreams.mp3   # Background music file
└── .github/
    └── copilot-instructions.md  # This file
```

### Development Workflow
- Edit any file directly (index.html, game.js)
- Refresh browser to see changes immediately
- No compilation, bundling, or build steps needed
- Use browser developer tools (F12) for debugging

## Validation and Testing

### Manual Testing Requirements
**CRITICAL**: Always manually test the game after making changes. Simply starting the server is NOT sufficient validation.

#### Required Test Scenarios
1. **Basic Functionality**:
   - Start local server: `python3 -m http.server 8080`
   - Open `http://localhost:8080` in browser
   - Verify game canvas renders with starfield background
   - Verify upgrade buttons are visible and functional

2. **Game Mechanics**:
   - Click heal upgrade button (❤️ Cura) - should increase from Lv.0 to Lv.1
   - Press 'E' key - should activate shield (may see visual effects)
   - Press '1', '2', '3' keys - should trigger ultimate abilities
   - Let game run for 10+ seconds - should see enemies spawning and cannon auto-firing

3. **Audio System**:
   - Click "🎵 Musica ON/OFF" button to test audio toggle
   - Audio requires user interaction to start due to browser policies

4. **Developer Mode**:
   - Press F12 key - should toggle developer panel with parameter sliders
   - Verify developer controls work (God Mode, parameter adjustments)

### No Automated Tests
- No unit tests, integration tests, or test runners exist
- No test commands to run
- All validation must be done manually through gameplay

### No Linting or Code Quality Tools
- No ESLint, Prettier, or similar tools configured
- No lint commands to run
- Manual code review required for style consistency

## Key Game Components

### Core Files
- **index.html**: Contains complete UI with CSS, upgrade buttons, and audio controls
- **game.js**: Single-file game engine containing:
  - Game class with complete game loop
  - Canvas rendering system
  - Physics and collision detection
  - Audio system using Web Audio API
  - Upgrade and progression systems
  - Ultimate abilities and effects

### Important Game Systems
- **Auto-targeting Cannon**: Automatically aims and fires at nearest enemies
- **Shield System**: Activated with 'E' key, absorbs damage
- **Ultimate Abilities**: 
  - Key '1': Nuclear Storm
  - Key '2': Time Freeze  
  - Key '3': Orbital Strike
- **Upgrade System**: 6 upgrade types (damage, fire rate, range, explosive, heal, multi-shot)
- **Wave Progression**: Enemies spawn in waves with increasing difficulty

### Developer Features
- **Developer Mode**: Press F12 to toggle parameter adjustment panel
- **God Mode**: Toggle invincibility
- **Parameter Sliders**: Adjust damage, fire rate, health, enemy settings
- **Special Modes**: Infinite ammo, one-hit kill, disable enemy spawning

## Navigation and Code Organization

### Finding Specific Features
- **Upgrade System**: Search for `upgrades` object and `buyUpgrade` function
- **Ultimate Abilities**: Search for `triggerUltimate` and `ultimateEffects`
- **Rendering**: Look for `render()` method and canvas drawing code
- **Game Loop**: Find `gameLoop()` and `update()` methods
- **Audio**: Search for `setupAudio` and `play*Sound` methods
- **Enemy AI**: Look for enemy update logic in main update loop

### Common Code Patterns
- All game objects stored in arrays: `this.bullets`, `this.enemies`, `this.particles`
- Canvas rendering uses `ctx.save()` and `ctx.restore()` for transformations
- Audio effects generated procedurally using Web Audio API
- Developer mode parameters in `this.developerParams` object

## Common Development Tasks

### Adding New Features
- Most game logic is in the single Game class in game.js
- Add new properties to constructor
- Update game loop for new objects
- Add rendering code to render() method
- Consider adding developer mode controls

### Modifying Gameplay
- Upgrade costs and effects: Search for upgrade-related functions
- Enemy behavior: Look for enemy update loops
- Weapon mechanics: Find shooting and collision detection code
- Visual effects: Modify particle systems and rendering

### UI Changes
- Upgrade buttons: Modify HTML structure in index.html
- CSS styling: Edit embedded styles in index.html head
- Game HUD: Find UI rendering code in game.js render method

## Deployment

### GitHub Pages
- Game is deployed automatically to GitHub Pages
- No build process needed - just push static files
- Live version: https://davvoz.github.io/cannone/

### Local Testing
- Any HTTP server works: `python3 -m http.server 8080`
- File:// URLs may not work due to CORS restrictions with audio files
- Use localhost for full functionality testing

## Troubleshooting

### Common Issues
- **Audio not working**: Requires user interaction (click) to start due to browser autoplay policies
- **Game not loading**: Check browser console for JavaScript errors
- **Performance issues**: Game runs at 60 FPS, check for infinite loops or excessive object creation
- **Canvas not rendering**: Verify canvas element exists and context is obtained

### Browser Compatibility
- Requires HTML5 Canvas support
- Uses Web Audio API for sound effects
- Modern browsers recommended (Chrome, Firefox, Safari, Edge)

## Important Notes

- **No Dependencies**: Pure vanilla JavaScript, no npm, webpack, or external libraries
- **Single File Architecture**: Almost all logic in one 4,352-line game.js file
- **Immediate Feedback**: Changes visible immediately on browser refresh
- **Manual Testing Essential**: No automated testing - always play-test your changes
- **Canvas-Based**: All graphics rendered via HTML5 Canvas API
- **Audio Generated**: Sound effects created programmatically with Web Audio API