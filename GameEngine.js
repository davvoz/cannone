class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameOver = false;
        this.showIntroPopup = { timer: 360 }; // 6 seconds at 60fps
        this.showProgressMenu = false;
        this.showDeveloperPanel = false;
        this.developerMode = false;
        this.musicEnabled = true;
        
        // Initialize progression system
        this.initializeProgressionSystem();
        
        // Initialize game state with permanent bonuses
        this.initializeGameState();
        
        // Initialize developer parameters
        this.initializeDeveloperParams();
        
        // Initialize all systems
        this.initializeSystems();
        
        // Start game loop
        this.gameLoop();
    }

    initializeProgressionSystem() {
        this.permanentProgress = this.loadProgress() || {
            totalKills: 0,
            totalWaves: 0,
            totalGames: 0,
            experiencePoints: 0,
            permanentUpgrades: {
                bulletSize: 0,
                startingDamage: 0,
                startingMoney: 0,
                startingHealth: 0,
                bulletSpeed: 0
            }
        };
    }

    initializeGameState() {
        this.money = 100 + (this.permanentProgress.permanentUpgrades.startingMoney * 50);
        this.kills = 0;
        this.wave = 1;
        this.health = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);
        this.maxHealth = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);
        this.mousePosition = { x: 0, y: 0 };
    }

    initializeDeveloperParams() {
        this.devParams = {
            enemySpeed: 1.0,
            spawnRate: 1.0,
            enemyHealthMultiplier: 1.0,
            playerDamageMultiplier: 1.0,
            moneyMultiplier: 1.0,
            godMode: false,
            infiniteMoney: false,
            noCooldowns: false
        };
    }

    initializeSystems() {
        // Initialize all game systems
        this.audioManager = new AudioManager();
        this.effectsSystem = new EffectsSystem(this);
        this.collisionSystem = new CollisionSystem(this);
        this.upgradeSystem = new UpgradeSystem(this);
        this.weaponSystem = new WeaponSystem(this);
        this.enemySystem = new EnemySystem(this);
        this.shieldSystem = new ShieldSystem(this);
        this.ultimateSystem = new UltimateSystem(this);
        this.renderer = new Renderer(this);
        this.uiManager = new UIManager(this);
        this.inputManager = new InputManager(this);
    }

    update() {
        // Don't update during game over
        if (this.gameOver) return;

        // Apply developer mode settings
        this.applyDeveloperMode();

        // Update all systems
        this.weaponSystem.update();
        this.enemySystem.update();
        this.shieldSystem.update();
        this.ultimateSystem.update();
        this.effectsSystem.update();
        
        // Check collisions
        this.collisionSystem.checkUltimateEffectCollisions();
        this.checkEnemyCannonCollisions();

        // Check wave completion
        this.checkWaveCompletion();

        // Check game over
        this.checkGameOver();

        // Update UI
        this.uiManager.updateUI();
    }

    render() {
        this.renderer.render();
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    applyDeveloperMode() {
        if (this.devParams.infiniteMoney) {
            this.money = 999999;
        }
    }

    checkEnemyCannonCollisions() {
        if (this.devParams.godMode) return;

        for (let i = this.enemySystem.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemySystem.enemies[i];
            if (this.collisionSystem.checkCannonCollision(enemy)) {
                this.health -= 20;
                this.enemySystem.enemies.splice(i, 1);
                this.effectsSystem.createExplosion(enemy.x, enemy.y);
            }
        }
    }

    checkWaveCompletion() {
        if (this.enemySystem.enemiesSpawned >= this.enemySystem.enemiesPerWave && 
            this.enemySystem.enemies.length === 0) {
            this.completeWave();
        }
    }

    completeWave() {
        this.wave++;
        this.enemySystem.resetForNewWave();
        
        // Wave completion bonus
        const bonus = this.wave * 25;
        this.money += bonus;
        this.effectsSystem.createFloatingText(
            this.canvas.width / 2, 
            this.canvas.height / 2, 
            `Wave ${this.wave - 1} Complete! +${bonus}💰`, 
            'bonus'
        );

        // Survival bonus every 5 waves
        if (this.wave % 5 === 1) {
            const survivalBonus = this.wave * 50;
            this.money += survivalBonus;
            this.health = Math.min(this.maxHealth, this.health + 50);
            this.effectsSystem.createFloatingText(
                this.canvas.width / 2, 
                this.canvas.height / 2 + 30, 
                `Survival Bonus! +${survivalBonus}💰 +50❤️`, 
                'heal'
            );
        }
    }

    checkGameOver() {
        if (this.health <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.audioManager.playGameOverSound();
            
            // Update permanent progress
            this.permanentProgress.totalGames++;
            this.permanentProgress.totalWaves = Math.max(this.permanentProgress.totalWaves, this.wave);
            this.permanentProgress.experiencePoints += Math.floor(this.kills * 2 + this.wave * 10);
            this.saveProgress();

            // Setup click handler for restart
            this.canvas.addEventListener('click', () => this.resetGame(), { once: true });
        }
    }

    resetGame() {
        this.gameOver = false;
        this.initializeGameState();
        
        // Reset all systems
        this.enemySystem.enemies = [];
        this.enemySystem.enemiesSpawned = 0;
        this.enemySystem.enemiesPerWave = 10;
        this.weaponSystem.bullets = [];
        this.effectsSystem.explosions = [];
        this.effectsSystem.particles = [];
        this.effectsSystem.floatingTexts = [];
        this.shieldSystem.shield.active = false;
        this.shieldSystem.shield.lastUsed = 0;
        this.shieldSystem.shield.duration = 0;
        this.shieldSystem.shield.particles = [];
        this.ultimateSystem.ultimateEffects.active = false;
        this.ultimateSystem.ultimateEffects.particles = [];
        
        // Reset upgrade system
        this.upgradeSystem.upgrades = {
            damage: { level: 1, baseCost: 50 },
            fireRate: { level: 1, baseCost: 75 },
            range: { level: 1, baseCost: 100 },
            explosive: { level: 0, baseCost: 200 },
            heal: { level: 0, baseCost: 1 },
            multiShot: { level: 1, baseCost: 100 }
        };

        // Reapply permanent upgrades
        this.weaponSystem.cannon.damage = 20 + (this.permanentProgress.permanentUpgrades.startingDamage * 5);
        this.weaponSystem.cannon.bulletSize = 1 + (this.permanentProgress.permanentUpgrades.bulletSize * 0.3);
        this.weaponSystem.cannon.bulletSpeed = 8 + (this.permanentProgress.permanentUpgrades.bulletSpeed * 1);

        // Update UI
        this.uiManager.updateUI();
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.textContent = this.musicEnabled ? '🔊' : '🔇';
        }
    }

    handleProgressMenuClick(mx, my) {
        const menuX = this.canvas.width / 2 - 250;
        const menuY = 50;
        
        const upgradeTypes = ['bulletSize', 'startingDamage', 'startingMoney', 'startingHealth', 'bulletSpeed'];
        for (let i = 0; i < upgradeTypes.length; i++) {
            const yPos = menuY + 100 + i * 60;
            const btnY = yPos - 20;

            if (mx >= menuX + 350 && mx <= menuX + 470 && my >= btnY && my <= btnY + 40) {
                this.upgradeSystem.buyPermanentUpgrade(upgradeTypes[i]);
                break;
            }
        }
    }

    handleDeveloperPanelClick(mx, my) {
        // Developer panel interaction logic would go here
        // For now, just basic slider interaction
        const panelX = this.canvas.width - 320;
        const panelY = 10;
        
        // Calculate toggle positions using same logic as UIManager rendering
        // Match the yOffset calculation from UIManager.renderDeveloperPanel
        let yOffset = 50; // Start after title
        yOffset += 40 * 5; // Skip 5 sliders (Enemy Speed, Spawn Rate, Enemy Health, Player Damage, Money Multiplier)
        yOffset += 60; // Space before toggles
        
        // Toggle interactions with dynamically calculated positions
        const toggles = [
            { y: panelY + yOffset, param: 'godMode' },
            { y: panelY + yOffset + 30, param: 'infiniteMoney' },
            { y: panelY + yOffset + 60, param: 'noCooldowns' }
        ];

        for (let toggle of toggles) {
            if (mx >= panelX + 20 && mx <= panelX + 36 && 
                my >= toggle.y - 8 && my <= toggle.y + 8) {
                this.devParams[toggle.param] = !this.devParams[toggle.param];
                break;
            }
        }
    }

    updateDeveloperParams() {
        // This method would handle updating developer parameters
        // Called when developer mode is activated
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('cannonDefenseProgress');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load progress:', e);
            return null;
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('cannonDefenseProgress', JSON.stringify(this.permanentProgress));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});