class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.showIntroPopup = { timer: 360 }; // 6 secondi a 60fps

        // Audio setup
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setupAudio();

        // Sfondo spaziale
        this.stars = [];
        this.initStars();

        // Sistema di progressione permanente
        this.permanentProgress = this.loadProgress() || {
            totalKills: 0,
            totalWaves: 0,
            totalGames: 0,
            experiencePoints: 0, // XP iniziali
            permanentUpgrades: {
                bulletSize: 0,      // Livello ingrandimento proiettili
                startingDamage: 0,  // Danno iniziale bonus
                startingMoney: 0,   // Soldi iniziali bonus
                startingHealth: 0,  // Vita iniziale bonus
                bulletSpeed: 0      // Velocità proiettili bonus
            }
        };

        // Game state con bonus permanenti
        this.money = 100 + (this.permanentProgress.permanentUpgrades.startingMoney * 50);
        this.kills = 0;
        this.wave = 1;
        this.health = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);
        this.maxHealth = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);

        // Cannon properties con bonus permanenti
        this.cannon = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            damage: 20 + (this.permanentProgress.permanentUpgrades.startingDamage * 5),
            fireRate: 500, // milliseconds
            range: 300,
            explosiveLevel: 0,
            lastShot: 0,
            rotation: 0, // angolo di rotazione in radianti
            multiShot: 1, // numero di colpi sparati in una volta
            bulletSize: 1 + (this.permanentProgress.permanentUpgrades.bulletSize * 0.3), // Dimensione proiettili
            bulletSpeed: 8 + (this.permanentProgress.permanentUpgrades.bulletSpeed * 1) // Velocità proiettili
        };

        // Shield system
        this.shield = {
            active: false,
            cooldown: 0,
            maxCooldown: 8000, // 8 secondi di cooldown
            lastUsed: 0,
            duration: 0,
            maxDuration: 3000, // 3 secondi di durata base
            particles: [],
            y: this.canvas.height - 150, // Posizione Y della linea dello scudo
            width: this.canvas.width, // Larghezza dello scudo (intero schermo)
            height: 5, // Spessore della linea dello scudo
            color: "#22AAFF" // Colore base dello scudo
        };

        // Ultimate system - ogni ultimate con proprio cooldown
        this.ultimates = {
            types: [
                {
                    name: "Nuclear Storm",
                    description: "Pioggia nucleare devastante",
                    color: "#FF4444",
                    key: "1",
                    maxCooldown: 15000,
                    cooldown: 0,
                    lastUsed: 0
                },
                {
                    name: "Time Freeze",
                    description: "Ferma il tempo e spara laser",
                    color: "#44AAFF",
                    key: "2",
                    maxCooldown: 18000,
                    cooldown: 0,
                    lastUsed: 0
                },
                {
                    name: "Orbital Strike",
                    description: "Colpo orbitale distruttivo",
                    color: "#FFAA44",
                    key: "3",
                    maxCooldown: 20000,
                    cooldown: 0,
                    lastUsed: 0
                }
            ]
        };

        // Ultimate effects
        this.ultimateEffects = {
            active: false,
            type: null,
            duration: 0,
            maxDuration: 0,
            particles: [],
            freezeTime: false
        };

        // Upgrade levels and costs
        this.upgrades = {
            damage: { level: 1, baseCost: 50 },
            fireRate: { level: 1, baseCost: 75 },
            range: { level: 1, baseCost: 100 },
            explosive: { level: 0, baseCost: 200 },
            heal: { level: 0, baseCost: 1 },
            multiShot: { level: 1, baseCost: 100 }
        };

        // Game objects
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.particles = [];
        this.floatingTexts = []; // Testi fluttuanti per danni e premi

        // Wave management - Progressione più aggressiva
        this.enemiesSpawned = 0;
        this.enemiesPerWave = 8; // Inizia con più nemici
        this.spawnTimer = 0;
        this.spawnDelay = 1500; // Spawn più veloce dall'inizio

        // Wave kills tracking
        this.waveKills = 0; // Nemici uccisi nell'ondata corrente

        // Wave reward notification
        this.showWaveReward = null;

        // Game over popup
        this.showGameOver = null;

        // Show permanent progress UI
        this.showProgressMenu = false;

        // Developer mode
        this.developerMode = false;
        this.showDeveloperPanel = false;
        this.developerParams = {
            // Game parameters
            playerHealth: this.health,
            playerMoney: this.money,
            currentWave: this.wave,
            enemySpawnRate: this.spawnDelay,
            enemiesPerWave: this.enemiesPerWave,

            // Cannon parameters
            cannonDamage: this.cannon.damage,
            cannonFireRate: this.cannon.fireRate,
            cannonRange: this.cannon.range,
            bulletSize: this.cannon.bulletSize,
            bulletSpeed: this.cannon.bulletSpeed,
            multiShot: this.cannon.multiShot,

            // Ultimate parameters
            ultimateCooldown: 5000,
            shieldPower: 100,
            shieldDuration: 5000,

            // XP and progression
            experiencePoints: this.permanentProgress.experiencePoints,

            // Enemy parameters
            enemyHealthMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyRewardMultiplier: 1.0,

            // Special modes
            godMode: false,
            infiniteAmmo: false,
            oneHitKill: false,
            noEnemySpawn: false
        };

        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }

    // Salva il progresso permanente nel localStorage
    saveProgress() {
        localStorage.setItem('cannonGameProgress', JSON.stringify(this.permanentProgress));
    }

    // Carica il progresso permanente dal localStorage
    loadProgress() {
        const saved = localStorage.getItem('cannonGameProgress');
        return saved ? JSON.parse(saved) : null;
    }

    // Aggiorna il progresso permanente alla fine del gioco
    updatePermanentProgress() {
        this.permanentProgress.totalKills += this.kills;
        this.permanentProgress.totalWaves += (this.wave - 1); // -1 perché wave parte da 1
        this.permanentProgress.totalGames += 1;

        // Calcola punti esperienza basati sulla performance
        const waveBonus = (this.wave - 1) * 10; // 10 XP per ondata completata
        const killBonus = this.kills * 2; // 2 XP per kill
        const survivalBonus = Math.min(100, this.wave * 5); // Bonus sopravvivenza

        const earnedXP = waveBonus + killBonus + survivalBonus;
        this.permanentProgress.experiencePoints += earnedXP;

        // Salva i progressi
        this.saveProgress();

        return earnedXP;
    }

    // Calcola il costo di un upgrade permanente
    getPermanentUpgradeCost(upgradeType) {
        const currentLevel = this.permanentProgress.permanentUpgrades[upgradeType];
        const baseCosts = {
            bulletSize: 50,
            startingDamage: 75,
            startingMoney: 100,
            startingHealth: 125,
            bulletSpeed: 60
        };

        return Math.floor(baseCosts[upgradeType] * Math.pow(1.8, currentLevel));
    }

    // Acquista un upgrade permanente
    buyPermanentUpgrade(upgradeType) {
        const cost = this.getPermanentUpgradeCost(upgradeType);
        const maxLevels = {
            bulletSize: 10,
            startingDamage: 15,
            startingMoney: 12,
            startingHealth: 8,
            bulletSpeed: 10
        };

        const currentLevel = this.permanentProgress.permanentUpgrades[upgradeType];

        if (this.permanentProgress.experiencePoints >= cost && currentLevel < maxLevels[upgradeType]) {
            this.permanentProgress.experiencePoints -= cost;
            this.permanentProgress.permanentUpgrades[upgradeType]++;
            this.saveProgress();
            this.updateProgressUI();

            // Suono di upgrade permanente
            this.playPermanentUpgradeSound();

            return true;
        }

        return false;
    }

    // Suono di upgrade permanente
    playPermanentUpgradeSound() {
        const duration = 0.8;

        // Oscillatore principale
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(783, this.audioContext.currentTime + duration / 2); // G5
        oscillator.frequency.exponentialRampToValueAtTime(1047, this.audioContext.currentTime + duration); // C6

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Aggiorna UI progressi (placeholder - implementazione nella render)
    updateProgressUI() {
        // Implementato nella funzione render
    }

    isMouseOverRect(x, y, width, height) {
        if (!this.mousePosition) return false;
        return (
            this.mousePosition.x >= x &&
            this.mousePosition.x <= x + width &&
            this.mousePosition.y >= y &&
            this.mousePosition.y <= y + height
        );
    }

    setupEventListeners() {
        // Mouse position tracking
        this.mousePosition = { x: 0, y: 0 };

        document.getElementById('upgradeDamage').addEventListener('click', () => this.buyUpgrade('damage'));
        document.getElementById('upgradeFireRate').addEventListener('click', () => this.buyUpgrade('fireRate'));
        document.getElementById('upgradeRange').addEventListener('click', () => this.buyUpgrade('range'));
        document.getElementById('upgradeExplosive').addEventListener('click', () => this.buyUpgrade('explosive'));
        document.getElementById('upgradeHeal').addEventListener('click', () => this.buyUpgrade('heal'));
        document.getElementById('upgradeMultiShot').addEventListener('click', () => this.buyUpgrade('multiShot'));

        // Movimento e tracking del mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
            this.cannon.targetX = this.mousePosition.x;
            this.cannon.targetY = this.mousePosition.y;
        });

        // Gestione click su canvas
        this.canvas.addEventListener('click', (e) => {
            // Click coordinates are already tracked in mousePosition

            // Gestione click game over
            if (this.showGameOver) {
                const panelW = 500;
                const panelH = 420; // Aggiornato
                const panelX = (this.canvas.width - panelW) / 2;
                const panelY = (this.canvas.height - panelH) / 2;

                // Pulsante Gioca Ancora
                const playAgainBtnW = 240;
                const playAgainBtnH = 60;
                const playAgainBtnX = panelX + (panelW - playAgainBtnW) / 2;
                const playAgainBtnY = panelY + 240; // Aggiornato

                if (this.isMouseOverRect(playAgainBtnX, playAgainBtnY, playAgainBtnW, playAgainBtnH)) {
                    this.resetGame();
                    return;
                }
            }
            if (!this.showProgressMenu && !this.showDeveloperPanel) return;
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            if (this.showProgressMenu) {
                this.handleProgressMenuClick(mx, my);
            } else if (this.showDeveloperPanel) {
                this.handleDeveloperPanelClick(mx, my);
            }
        });

        // Ultimate controls con tasti diretti
        document.addEventListener('keydown', (e) => {
            // Ultimate con tasti numerici
            if (e.code === 'Digit1') {
                e.preventDefault();
                this.triggerUltimate(0); // Nuclear Storm
            }
            if (e.code === 'Digit2') {
                e.preventDefault();
                this.triggerUltimate(1); // Time Freeze
            }
            if (e.code === 'Digit3') {
                e.preventDefault();
                this.triggerUltimate(2); // Orbital Strike
            }
            // Shield control
            if (e.code === 'KeyE') {
                e.preventDefault();
                this.activateShield();
            }
            // Toggle progress menu
            if (e.code === 'KeyP') {
                e.preventDefault();
                this.showProgressMenu = !this.showProgressMenu;
            }
            // Toggle developer panel
            if (e.code === 'F1') {
                e.preventDefault();
                this.developerMode = !this.developerMode;
                this.showDeveloperPanel = this.developerMode;
                if (this.developerMode) {
                    this.updateDeveloperParams();
                }
            }
        });
    }

    handleProgressMenuClick(mx, my) {
        const menuW = 500, menuH = 400;
        const menuX = (this.canvas.width - menuW) / 2;
        const menuY = (this.canvas.height - menuH) / 2;

        // Bottone Chiudi (X)
        if (mx >= menuX + menuW - 30 && mx <= menuX + menuW - 10 &&
            my >= menuY + 10 && my <= menuY + 30) {
            this.showProgressMenu = false;
            return;
        }

        // Bottone Nuova Partita
        if (mx >= menuX + 20 && mx <= menuX + 150 &&
            my >= menuY + menuH - 50 && my <= menuY + menuH - 20) {
            this.resetGame();
            this.showProgressMenu = false;
            return;
        }

        // Bottoni upgrade permanenti
        const upgradeTypes = ['bulletSize', 'startingDamage', 'startingMoney', 'startingHealth', 'bulletSpeed'];
        for (let i = 0; i < upgradeTypes.length; i++) {
            const yPos = menuY + 100 + i * 60;
            const btnY = yPos - 20;

            if (mx >= menuX + 350 && mx <= menuX + 470 && my >= btnY && my <= btnY + 40) {
                this.buyPermanentUpgrade(upgradeTypes[i]);
                break;
            }
        }
    }

    // Aggiorna i parametri developer con i valori attuali del gioco
    updateDeveloperParams() {
        this.developerParams.playerHealth = this.health;
        this.developerParams.playerMoney = this.money;
        this.developerParams.currentWave = this.wave;
        this.developerParams.enemySpawnRate = this.spawnDelay;
        this.developerParams.enemiesPerWave = this.enemiesPerWave;
        this.developerParams.cannonDamage = this.cannon.damage;
        this.developerParams.cannonFireRate = this.cannon.fireRate;
        this.developerParams.cannonRange = this.cannon.range;
        this.developerParams.bulletSize = this.cannon.bulletSize;
        this.developerParams.bulletSpeed = this.cannon.bulletSpeed;
        this.developerParams.multiShot = this.cannon.multiShot;
        this.developerParams.experiencePoints = this.permanentProgress.experiencePoints;
    }

    // Applica i parametri developer al gioco
    applyDeveloperParams() {
        this.health = this.developerParams.playerHealth;
        this.money = this.developerParams.playerMoney;
        this.wave = this.developerParams.currentWave;
        this.spawnDelay = this.developerParams.enemySpawnRate;
        this.enemiesPerWave = this.developerParams.enemiesPerWave;
        this.cannon.damage = this.developerParams.cannonDamage;
        this.cannon.fireRate = this.developerParams.cannonFireRate;
        this.cannon.range = this.developerParams.cannonRange;
        this.cannon.bulletSize = this.developerParams.bulletSize;
        this.cannon.bulletSpeed = this.developerParams.bulletSpeed;
        this.cannon.multiShot = this.developerParams.multiShot;
        this.permanentProgress.experiencePoints = this.developerParams.experiencePoints;

        // Aggiorna UI
        this.updateUI();
    }

    // Gestisce i click nel pannello developer
    handleDeveloperPanelClick(mx, my) {
        const panelW = 600, panelH = 700;
        const panelX = (this.canvas.width - panelW) / 2;
        const panelY = (this.canvas.height - panelH) / 2;

        // Bottone Chiudi (X)
        if (mx >= panelX + panelW - 30 && mx <= panelX + panelW - 10 &&
            my >= panelY + 10 && my <= panelY + 30) {
            this.showDeveloperPanel = false;
            this.developerMode = false;
            return;
        }

        // Bottone Apply Changes
        if (mx >= panelX + 20 && mx <= panelX + 150 &&
            my >= panelY + panelH - 50 && my <= panelY + panelH - 20) {
            this.applyDeveloperParams();
            return;
        }

        // Bottone Reset to Default
        if (mx >= panelX + 170 && mx <= panelX + 320 &&
            my >= panelY + panelH - 50 && my <= panelY + panelH - 20) {
            this.resetDeveloperParams();
            return;
        }

        // Toggle buttons per modalità speciali
        const toggleY = panelY + 580;
        if (my >= toggleY && my <= toggleY + 30) {
            if (mx >= panelX + 20 && mx <= panelX + 120) {
                this.developerParams.godMode = !this.developerParams.godMode;
            } else if (mx >= panelX + 140 && mx <= panelX + 260) {
                this.developerParams.infiniteAmmo = !this.developerParams.infiniteAmmo;
            } else if (mx >= panelX + 280 && mx <= panelX + 380) {
                this.developerParams.oneHitKill = !this.developerParams.oneHitKill;
            } else if (mx >= panelX + 400 && mx <= panelX + 520) {
                this.developerParams.noEnemySpawn = !this.developerParams.noEnemySpawn;
            }
        }

        // Slider controls (implementazione semplificata)
        this.handleSliderClick(mx, my, panelX, panelY);
    }

    // Gestisce i click sui slider
    handleSliderClick(mx, my, panelX, panelY) {
        const sliderWidth = 200;
        const sliderHeight = 20;
        const sliderX = panelX + 350;

        const sliders = [
            { param: 'playerHealth', min: 1, max: 1000, y: panelY + 80 },
            { param: 'playerMoney', min: 0, max: 10000, y: panelY + 110 },
            { param: 'currentWave', min: 1, max: 100, y: panelY + 140 },
            { param: 'enemySpawnRate', min: 100, max: 5000, y: panelY + 170 },
            { param: 'enemiesPerWave', min: 1, max: 50, y: panelY + 200 },
            { param: 'cannonDamage', min: 1, max: 500, y: panelY + 250 },
            { param: 'cannonFireRate', min: 50, max: 2000, y: panelY + 280 },
            { param: 'cannonRange', min: 100, max: 1000, y: panelY + 310 },
            { param: 'bulletSize', min: 0.5, max: 5.0, y: panelY + 340 },
            { param: 'bulletSpeed', min: 1, max: 20, y: panelY + 370 },
            { param: 'multiShot', min: 1, max: 10, y: panelY + 400 },
            { param: 'experiencePoints', min: 0, max: 10000, y: panelY + 450 },
            { param: 'enemyHealthMultiplier', min: 0.1, max: 10.0, y: panelY + 500 },
            { param: 'enemySpeedMultiplier', min: 0.1, max: 5.0, y: panelY + 530 }
        ];

        for (let slider of sliders) {
            if (mx >= sliderX && mx <= sliderX + sliderWidth &&
                my >= slider.y && my <= slider.y + sliderHeight) {

                const percent = (mx - sliderX) / sliderWidth;
                const value = slider.min + (slider.max - slider.min) * percent;
                this.developerParams[slider.param] = Math.round(value * 100) / 100; // 2 decimali
                break;
            }
        }
    }

    // Reset parametri developer ai valori di default
    resetDeveloperParams() {
        this.developerParams = {
            playerHealth: 200,
            playerMoney: 100,
            currentWave: 1,
            enemySpawnRate: 1500,
            enemiesPerWave: 8,
            cannonDamage: 20,
            cannonFireRate: 500,
            cannonRange: 300,
            bulletSize: 1.0,
            bulletSpeed: 8,
            multiShot: 1,
            ultimateCooldown: 5000,
            shieldPower: 100,
            shieldDuration: 5000,
            experiencePoints: 100,
            enemyHealthMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyRewardMultiplier: 1.0,
            godMode: false,
            infiniteAmmo: false,
            oneHitKill: false,
            noEnemySpawn: false
        };
    }

    buyUpgrade(type) {
        const upgrade = this.upgrades[type];
        const cost = this.getUpgradeCost(type);

        // Limite livello range
        if (type === 'range' && upgrade.level >= 9) return;
        if (this.money >= cost) {
            this.money -= cost;
            upgrade.level++;

            // Suono specifico per l'upgrade acquistato
            this.playUpgradeSound(type);

            // Aggiorna immediatamente l'UI per evitare doppi click
            this.updateUI();
            switch (type) {
                case 'damage':
                    this.cannon.damage += 15;
                    break;
                case 'fireRate':
                    this.cannon.fireRate = Math.max(100, this.cannon.fireRate - 50);
                    break;
                case 'range':
                    this.cannon.range += 50;
                    break;
                case 'explosive':
                    this.cannon.explosiveLevel++;
                    break;
                case 'heal':
                    const oldHealth = this.health;
                    this.health = Math.min(this.maxHealth, this.health + 20);
                    const actualHeal = this.health - oldHealth;

                    // Testo fluttuante per la cura
                    if (actualHeal > 0) {
                        this.createFloatingText(this.cannon.x, this.cannon.y - 30, `+${actualHeal}❤️`, 'heal');
                    }
                    break;
                case 'multiShot':
                    this.cannon.multiShot = upgrade.level;
                    break;
            }
        }
    }

    getUpgradeCost(type) {
        const upgrade = this.upgrades[type];
        if (type === 'heal') {
            return upgrade.baseCost * (upgrade.level + 1); // costo lineare: 1, 2, 3, ...
        }
        if (type === 'multiShot') {
            return Math.floor(upgrade.baseCost * Math.pow(2, upgrade.level - 1));
        }
        return Math.floor(upgrade.baseCost * Math.pow(1.5, upgrade.level - 1));
    }

    spawnEnemy() {
        // Tipi di nemici con probabilità più aggressive per ondate avanzate
        const waveMultiplier = Math.min(3, 1 + this.wave * 0.1);
        const types = [
            { type: 'normale', weight: Math.max(10, 35 - this.wave * 2) },
            { type: 'veloce', weight: 25 + this.wave * 1.5 },
            { type: 'zigzag', weight: 20 + this.wave * 1.2 },
            { type: 'boss', weight: Math.min(25, 5 + this.wave * 0.8) },
            { type: 'splitter', weight: 15 + this.wave * 1.0 }
        ];

        // Seleziona tipo basato su peso
        const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedType;
        for (let t of types) {
            if (random < t.weight) {
                selectedType = t.type;
                break;
            }
            random -= t.weight;
        }
        const minX = Math.max(0, this.cannon.x - this.cannon.range);
        const maxX = Math.min(this.canvas.width, this.cannon.x + this.cannon.range);
        const x = Math.random() * (maxX - minX) + minX;
        const y = Math.random() * 40 + 10;
        let enemy;

        // Scaling molto più aggressivo per difficoltà estrema
        const difficultyMultiplier = Math.pow(1.3, this.wave); // Crescita esponenziale

        if (selectedType === 'normale') {
            enemy = {
                x: x,
                y: y,
                speed: (0.7 + Math.pow(this.wave, 1.6) * 0.15) * waveMultiplier * (this.developerMode ? this.developerParams.enemySpeedMultiplier : 1),
                health: Math.floor((30 + Math.pow(this.wave, 2.5)) * difficultyMultiplier * (this.developerMode ? this.developerParams.enemyHealthMultiplier : 1)),
                maxHealth: Math.floor((30 + Math.pow(this.wave, 2.5)) * difficultyMultiplier * (this.developerMode ? this.developerParams.enemyHealthMultiplier : 1)),
                reward: Math.floor((10 + Math.pow(this.wave, 1.8)) * waveMultiplier * (this.developerMode ? this.developerParams.enemyRewardMultiplier : 1)),
                width: 20,
                height: 20,
                type: 'normale',
                anim: 0,
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.3 + 0.15,
                chaosLevel: Math.min(1.5, this.wave * 0.08),
                rotationDirection: Math.random() < 0.5 ? 1 : -1,
                energyRings: Array(3).fill(0).map(() => ({
                    angle: Math.random() * Math.PI * 2,
                    speed: (Math.random() * 0.02 + 0.01) * (1 + this.wave * 0.1),
                    radius: Math.random() * 0.3 + 0.4
                })),
                powerLevel: Math.min(2, this.wave / 15),
                aggressionLevel: Math.min(1, this.wave * 0.05) // Nuovo: livello aggressività
            };
        } else if (selectedType === 'veloce') {
            enemy = {
                x: x,
                y: y,
                speed: (2 + Math.pow(this.wave, 1.8) * 0.2) * waveMultiplier,
                health: Math.floor((20 + Math.pow(this.wave, 2.2)) * difficultyMultiplier),
                maxHealth: Math.floor((20 + Math.pow(this.wave, 2.2)) * difficultyMultiplier),
                reward: Math.floor((15 + Math.pow(this.wave, 1.8)) * waveMultiplier),
                width: 16,
                height: 16,
                type: 'veloce',
                anim: 0,
                trailPoints: [],
                lastPos: { x: x, y: y },
                chaosSpeed: Math.min(5, this.wave * 0.25),
                chaosAngle: 0,
                dashCooldown: 0,
                dashReady: true,
                afterImages: [],
                boostPhase: 0,
                sparkles: Array(Math.min(10, 5 + this.wave)).fill(0).map(() => ({
                    offset: Math.random() * Math.PI * 2,
                    speed: (Math.random() * 0.1 + 0.05) * (1 + this.wave * 0.1),
                    size: Math.random() * 2 + 1
                })),
                hyperMode: this.wave > 10, // Modalità iper per ondate avanzate
                dashFrequency: Math.min(0.08, 0.02 + this.wave * 0.003) // Dash più frequenti
            };
        } else if (selectedType === 'zigzag') {
            enemy = {
                x: x,
                y: y,
                speed: (1.2 + Math.pow(this.wave, 1.6) * 0.18) * waveMultiplier,
                health: Math.floor((25 + Math.pow(this.wave, 2.3)) * difficultyMultiplier),
                maxHealth: Math.floor((25 + Math.pow(this.wave, 2.3)) * difficultyMultiplier),
                reward: Math.floor((20 + Math.pow(this.wave, 1.8)) * waveMultiplier),
                width: 18,
                height: 18,
                type: 'zigzag',
                anim: 0,
                zigzagPhase: Math.random() * Math.PI * 2,
                colorPhase: Math.random() * 360,
                zigzagAmplitude: 3 + Math.min(15, this.wave * 0.8),
                zigzagSpeed: Math.max(5, 15 - this.wave * 0.5),
                erraticMode: this.wave > 8, // Movimento più erratico
                phaseShift: Math.random() * 0.1 + 0.05
            };
        } else if (selectedType === 'boss') {
            const bossSize = Math.min(60, 40 + this.wave * 2);
            enemy = {
                x: x,
                y: y,
                speed: (0.5 + Math.pow(this.wave, 1.3) * 0.06) * waveMultiplier,
                health: Math.floor((100 + Math.pow(this.wave, 2.8)) * difficultyMultiplier),
                maxHealth: Math.floor((100 + Math.pow(this.wave, 2.8)) * difficultyMultiplier),
                reward: Math.floor((50 + Math.pow(this.wave, 2.2)) * waveMultiplier),
                width: bossSize,
                height: bossSize,
                type: 'boss',
                anim: 0,
                rotationSpeed: 0.02 + this.wave * 0.001,
                shieldAngle: 0,
                shieldActive: true,
                innerRotation: 0,
                armorLevel: Math.min(5, Math.floor(this.wave / 3)), // Armatura crescente
                regeneration: this.wave > 15 ? Math.floor(this.wave / 5) : 0, // Rigenerazione per boss avanzati
                lastRegen: Date.now()
            };
        } else if (selectedType === 'splitter') {
            enemy = {
                x: x,
                y: y,
                speed: (1.5 + Math.pow(this.wave, 1.4) * 0.08) * waveMultiplier,
                health: Math.floor((40 + Math.pow(this.wave, 2.0)) * difficultyMultiplier),
                maxHealth: Math.floor((40 + Math.pow(this.wave, 2.0)) * difficultyMultiplier),
                reward: Math.floor((25 + Math.pow(this.wave, 1.6)) * waveMultiplier),
                width: 24,
                height: 24,
                type: 'splitter',
                anim: 0,
                splitCount: 0,
                pulsePhase: 0,
                glowIntensity: 1,
                maxSplits: Math.min(3, 1 + Math.floor(this.wave / 8)), // Più splits per ondate avanzate
                splitSize: Math.max(0.5, 0.8 - this.wave * 0.02) // Splits più piccoli ma più numerosi
            };
        }
        this.enemies.push(enemy);
    }

    createFloatingText(x, y, text, type) {
        // Limita il numero di testi fluttuanti per performance
        if (this.floatingTexts.length > 15) {
            this.floatingTexts.splice(0, 5); // Rimuovi i più vecchi
        }

        // Crea un testo fluttuante con animazione ottimizzata
        const floatingText = {
            x: x,
            y: y,
            text: text,
            type: type, // 'damage', 'money', 'heal', 'crit'
            life: 45, // Ridotto da 90 a 45 (0.75 secondi a 60fps)
            maxLife: 45,
            vx: (Math.random() - 0.5) * 1.5, // Movimento ridotto
            vy: -1.5 - Math.random() * 1, // Movimento verso l'alto ridotto
            scale: 0.8,
            alpha: 1
        };

        this.floatingTexts.push(floatingText);
    }

    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];

            // Aggiorna posizione (semplificato)
            text.x += text.vx;
            text.y += text.vy;

            // Rallenta il movimento (semplificato)
            text.vx *= 0.98;
            text.vy *= 0.98;

            // Animazione di scala semplificata
            const lifePercent = text.life / text.maxLife;
            if (lifePercent > 0.7) {
                // Fase iniziale: scala crescente veloce
                text.scale = 0.5 + (1 - lifePercent) * 3.33 * 1.5;
            } else if (lifePercent > 0.3) {
                // Fase intermedia: scala normale
                text.scale = 1;
            } else {
                // Fase finale: fade out
                text.scale = lifePercent * 3.33;
                text.alpha = lifePercent * 3.33;
            }

            // Decrementa vita
            text.life--;

            // Rimuovi se morto
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    renderFloatingTexts() {
        for (let text of this.floatingTexts) {
            this.ctx.save();

            // Trasforma al centro del testo (senza rotazione)
            this.ctx.translate(text.x, text.y);
            this.ctx.scale(text.scale, text.scale);
            this.ctx.globalAlpha = text.alpha;

            // Configura font e stile in base al tipo (semplificato)
            let fontSize, color, strokeColor;
            switch (text.type) {
                case 'damage':
                    fontSize = 16;
                    color = '#FFFF00';
                    strokeColor = '#FF6600';
                    break;
                case 'crit':
                    fontSize = 20;
                    color = '#FF3333';
                    strokeColor = '#990000';
                    break;
                case 'money':
                    fontSize = 14;
                    color = '#00FF00';
                    strokeColor = '#006600';
                    break;
                case 'heal':
                    fontSize = 18;
                    color = '#00FFFF';
                    strokeColor = '#0066CC';
                    break;
                case 'shield':
                    fontSize = 20;
                    color = '#44AAFF';
                    strokeColor = '#0066AA';
                    break;
                default:
                    fontSize = 14;
                    color = '#FFFFFF';
                    strokeColor = '#000000';
            }

            // Font semplificato
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Ombra semplificata
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;

            // Contorno sottile
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1.5;
            this.ctx.strokeText(text.text, 0, 0);

            // Testo principale
            this.ctx.fillStyle = color;
            this.ctx.fillText(text.text, 0, 0);

            this.ctx.restore();
        }
    }

    shoot() {
        const now = Date.now();
        // Find closest enemy in range
        let target = null;
        let minDistance = this.cannon.range;
        for (let enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.cannon.x, 2) +
                Math.pow(enemy.y - this.cannon.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                target = enemy;
            }
        }
        if (target) {
            // Mira perfetta verso il centro del nemico
            const targetCenterX = target.x;
            const targetCenterY = target.y;
            const desiredRotation = Math.atan2(targetCenterY - this.cannon.y, targetCenterX - this.cannon.x);
            this.cannon.rotation = desiredRotation;

            if (now - this.cannon.lastShot > this.cannon.fireRate) {
                // MultiShot: spara più colpi con angoli leggermente diversi
                const shots = this.cannon.multiShot;
                const spread = Math.PI / 12; // 15 gradi tra i colpi
                const startAngle = desiredRotation - (spread * (shots - 1) / 2);
                for (let s = 0; s < shots; s++) {
                    const angle = startAngle + spread * s;
                    const bullet = {
                        x: this.cannon.x,
                        y: this.cannon.y,
                        speed: this.cannon.bulletSpeed,
                        damage: this.cannon.damage,
                        explosive: this.cannon.explosiveLevel > 0,
                        vx: Math.cos(angle) * this.cannon.bulletSpeed,
                        vy: Math.sin(angle) * this.cannon.bulletSpeed,
                        size: 3 * this.cannon.bulletSize, // Dimensione scalata
                        glowSize: 16 * this.cannon.bulletSize, // Effetto glow scalato
                        trailLength: 3 * this.cannon.bulletSize // Lunghezza scia scalata
                    };
                    this.bullets.push(bullet);
                }
                this.playShootSound();
                this.cannon.lastShot = now;
            }
        }
    }

    resetGame() {
        // Reset delle statistiche di gioco
        this.health = this.maxHealth;
        this.wave = 1;
        this.kills = 0;
        this.waveKills = 0;
        this.score = 0;

        // Reset dei nemici e proiettili
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.particles = [];

        // Reset delle ultimate
        this.ultimates.types.forEach(ultimate => {
            ultimate.cooldown = 0;
        });

        // Reset dello scudo
        this.shield.cooldown = 0;
        this.shield.active = false;

        // Reset dello stato di gioco
        this.showGameOver = null;
        this.enemiesSpawned = 0;
        this.enemiesPerWave = this.calculateEnemiesForWave(1);

        // Ripristina il tempo di spawn
        this.lastSpawnTime = Date.now();
    }

    update() {
        const now = Date.now();
        if (this.showIntroPopup) {
            this.showIntroPopup.timer--;
            if (this.showIntroPopup.timer <= 0) {
                this.showIntroPopup = null;
            }
        }
        // Se il gioco è finito (game over), non aggiorniamo gli elementi di gioco
        if (this.showGameOver) {
            // Aggiorniamo solo gli effetti visivi (particelle, esplosioni, testi fluttuanti)
            this.updateFloatingTexts();

            // Aggiorniamo le esplosioni esistenti
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                const explosion = this.explosions[i];
                explosion.time++;
                if (explosion.time > explosion.maxTime) {
                    this.explosions.splice(i, 1);
                }
            }

            // Aggiorniamo le particelle esistenti
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                particle.vy += 0.1;
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vx *= 0.99;
                particle.vy *= 0.99;
                particle.life--;
                if (particle.size > 0.5) {
                    particle.size -= 0.05;
                }
                if (particle.life <= 0 || particle.size <= 0.5) {
                    this.particles.splice(i, 1);
                }
            }

            return; // Usciamo dal metodo update senza eseguire altro
        }

        // Applica modalità developer
        if (this.developerMode) {
            // God Mode - impedisce la perdita di vita
            if (this.developerParams.godMode) {
                this.health = Math.max(this.health, 1);
            }

            // No Enemy Spawn - ferma la generazione di nemici
            if (this.developerParams.noEnemySpawn) {
                // Non genera nemici
            } else {
                // Spawn enemies con parametri developer
                if (this.enemiesSpawned < this.enemiesPerWave && now - this.spawnTimer > this.spawnDelay) {
                    this.spawnEnemy();
                    this.enemiesSpawned++;
                    this.spawnTimer = now;
                }
            }
        } else {
            // Spawn enemies normale
            if (this.enemiesSpawned < this.enemiesPerWave && now - this.spawnTimer > this.spawnDelay) {
                this.spawnEnemy();
                this.enemiesSpawned++;
                this.spawnTimer = now;
            }
        }

        // Update ultimate cooldowns (ognuna col proprio cooldown)
        for (let ultimate of this.ultimates.types) {
            if (ultimate.cooldown > 0) {
                ultimate.cooldown = Math.max(0, ultimate.maxCooldown - (now - ultimate.lastUsed));
            }
        }

        // Update shield cooldown and duration
        if (this.shield.cooldown > 0) {
            this.shield.cooldown = Math.max(0, this.shield.maxCooldown - (now - this.shield.lastUsed));
        }

        if (this.shield.active) {
            this.shield.duration -= 16; // Circa 60fps
            if (this.shield.duration <= 0) {
                this.shield.active = false;
                this.shield.particles = [];
                this.shield.lastUsed = now;
                this.shield.cooldown = this.shield.maxCooldown;
            }
            // Aggiorna le particelle dello scudo
            this.updateShieldParticles();
        }

        // Update ultimate effects
        this.updateUltimateEffects();

        // Check wave completion
        if (this.enemiesSpawned >= this.enemiesPerWave && this.enemies.length === 0) {
            this.wave++;
            this.enemiesSpawned = 0;

            // Premio in denaro che include base ondata + bonus uccisioni
            const baseWaveReward = Math.floor(50 + (this.wave - 1) * 25 + Math.pow(this.wave - 1, 1.5) * 10);
            const killBonus = Math.floor(this.waveKills * (5 + this.wave * this.waveKills)); // Bonus crescente per uccisione
            const totalWaveReward = baseWaveReward + killBonus;

            this.money += totalWaveReward;

            // Suono di completamento ondata
            this.playWaveCompleteSound();

            // Progressione difficoltà molto più aggressiva
            this.enemiesPerWave += Math.floor(3 + this.wave * 1.5); // Molti più nemici per ondata
            this.spawnDelay = Math.max(200, this.spawnDelay - Math.floor(this.wave * 25)); // Spawn molto più veloce

            // Bonus vita e soldi aggiuntivi per sopravvivenza (ogni 5 ondate)
            if (this.wave % 5 === 0) {
                this.health = Math.min(this.maxHealth, this.health + 15);
                const bonusReward = this.wave * 10;
                this.money += bonusReward;
            }

            // Mostra notifica del premio con dettagli
            this.showWaveReward = {
                baseAmount: baseWaveReward,
                killBonus: killBonus,
                totalAmount: totalWaveReward,
                killCount: this.waveKills,
                timer: 240, // frames (4 secondi a 60fps)
                wave: this.wave - 1
            };

            // Reset contatore nemici uccisi per la prossima ondata
            this.waveKills = 0;
        }

        // Auto-shoot
        this.shoot();

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Remove bullets that go off screen
            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Check collision with enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.checkCollision(bullet, enemy)) {
                    // Create explosion effect
                    if (bullet.explosive) {
                        this.createExplosion(bullet.x, bullet.y);
                        this.playExplosionSound();
                        // Damage nearby enemies
                        for (let k = 0; k < this.enemies.length; k++) {
                            const nearbyEnemy = this.enemies[k];
                            const distance = Math.sqrt(
                                Math.pow(nearbyEnemy.x - bullet.x, 2) +
                                Math.pow(nearbyEnemy.y - bullet.y, 2)
                            );
                            if (distance < 60) {
                                const explosiveDamage = Math.floor(bullet.damage * 0.5);
                                nearbyEnemy.health -= explosiveDamage;

                                // Testo fluttuante per danno esplosivo
                                this.createFloatingText(nearbyEnemy.x + (Math.random() - 0.5) * 20,
                                    nearbyEnemy.y - 15,
                                    `-${explosiveDamage}💥`, 'damage');
                            }
                        }
                    }

                    enemy.health -= bullet.damage;

                    // One Hit Kill mode
                    if (this.developerMode && this.developerParams.oneHitKill) {
                        enemy.health = 0;
                    }

                    this.bullets.splice(i, 1);
                    this.playHitSound();

                    // Testo fluttuante per il danno
                    const isDead = enemy.health <= 0;
                    if (isDead) {
                        // Danno critico se uccide
                        this.createFloatingText(enemy.x, enemy.y - 10, `-${bullet.damage}`, 'crit');
                    } else {
                        // Danno normale
                        this.createFloatingText(enemy.x, enemy.y - 10, `-${bullet.damage}`, 'damage');
                    }

                    if (enemy.health <= 0) {
                        this.money += enemy.reward;
                        this.kills++;
                        this.waveKills++; // Incrementa contatore nemici uccisi nell'ondata

                        // Testo fluttuante per i soldi guadagnati
                        this.createFloatingText(enemy.x, enemy.y + 10, `+${enemy.reward}💰`, 'money');

                        this.enemies.splice(j, 1);
                        this.createParticles(enemy.x, enemy.y);
                    }
                    break;
                }
            }
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Skip enemy update if time is frozen (except for ultimate effects)
            if (this.ultimateEffects.freezeTime && this.ultimateEffects.active) {
                continue;
            }

            enemy.anim++;

            // Controlla collisione con lo scudo
            if (this.shield.active && enemy.y >= this.shield.y - this.shield.height / 2 &&
                enemy.y <= this.shield.y + this.shield.height / 2) {
                
                // Lo scudo distrugge completamente il nemico
                // Assegna il premio per l'eliminazione
                this.money += enemy.reward;
                this.kills++;
                this.waveKills++;

                // Crea testo fluttuante per l'eliminazione con scudo
                this.createFloatingText(enemy.x, enemy.y - 10, "SHIELD KILL!", 'shield');
                this.createFloatingText(enemy.x, enemy.y + 10, `+${enemy.reward}$`, 'money');

                // Crea effetto di impatto e esplosione
                this.createShieldImpactEffect(enemy.x, this.shield.y);
                this.createExplosion(enemy.x, enemy.y);

                // Rimuovi il nemico
                this.enemies.splice(i, 1);
                continue;
            }

            if (enemy.type === 'normale') {
                enemy.y += enemy.speed;
                // Movimento caotico molto più aggressivo
                const chaosFactor = Math.sin(enemy.anim * 0.1) * enemy.chaosLevel;
                const aggressionBonus = Math.sin(enemy.anim * 0.05) * enemy.aggressionLevel * 2;
                enemy.x += (chaosFactor + aggressionBonus) * 4;

                // Movimenti erratici per ondate avanzate
                if (this.wave > 5) {
                    enemy.x += Math.sin(enemy.anim * 0.03) * (this.wave * 0.3);
                    enemy.y += Math.cos(enemy.anim * 0.07) * (this.wave * 0.1);
                }

                // Aggiorna anelli di energia più velocemente
                enemy.energyRings.forEach(ring => {
                    ring.angle += ring.speed * enemy.rotationDirection * (1 + enemy.powerLevel);
                });

                // Aumenta la potenza e aggressività con il tempo
                if (enemy.powerLevel < 2) {
                    enemy.powerLevel += 0.002;
                }
                if (enemy.aggressionLevel < 1) {
                    enemy.aggressionLevel += 0.001;
                }
            } else if (enemy.type === 'veloce') {
                // Sistema di dash più aggressivo
                if (enemy.dashCooldown > 0) {
                    enemy.dashCooldown--;
                } else if (enemy.dashReady && Math.random() < enemy.dashFrequency) {
                    // Dash più potenti per ondate avanzate
                    const dashMultiplier = enemy.hyperMode ? 4.0 : 2.5;
                    enemy.speed *= dashMultiplier;
                    enemy.dashReady = false;
                    enemy.dashCooldown = Math.max(20, 60 - this.wave * 2); // Cooldown più corto

                    // Più afterimages per nemici iper
                    const imageCount = enemy.hyperMode ? 8 : 5;
                    enemy.afterImages = Array(imageCount).fill(0).map(() => ({
                        x: enemy.x,
                        y: enemy.y,
                        alpha: 1
                    }));
                }

                // Movimento molto più caotico e veloce
                enemy.chaosAngle += enemy.chaosSpeed * 0.15;
                enemy.y += enemy.speed;
                const chaosIntensity = enemy.hyperMode ? 2.0 : 1.0;
                enemy.x += Math.sin(enemy.chaosAngle) * enemy.chaosSpeed * chaosIntensity;

                // Movimento imprevedibile per ondate avanzate
                if (this.wave > 7) {
                    enemy.x += Math.sin(enemy.anim * 0.02) * (this.wave * 0.2);
                    enemy.y += Math.cos(enemy.anim * 0.05) * Math.min(2, this.wave * 0.1);
                }

                // Aggiorna afterimages più velocemente
                if (enemy.afterImages.length > 0) {
                    enemy.afterImages.forEach((image, i) => {
                        image.alpha -= enemy.hyperMode ? 0.08 : 0.05;
                        if (i > 0) {
                            image.x += (enemy.afterImages[i - 1].x - image.x) * 0.3;
                            image.y += (enemy.afterImages[i - 1].y - image.y) * 0.3;
                        }
                    });
                    enemy.afterImages = enemy.afterImages.filter(img => img.alpha > 0);
                }

                // Ritorna alla velocità normale dopo il dash
                if (!enemy.dashReady && enemy.dashCooldown === 0) {
                    const dashMultiplier = enemy.hyperMode ? 4.0 : 2.5;
                    enemy.speed /= dashMultiplier;
                    enemy.dashReady = true;
                }

                // Aggiorna effetti visivi più velocemente
                enemy.boostPhase += 0.15;
                enemy.sparkles.forEach(sparkle => {
                    sparkle.offset += sparkle.speed * (1 + this.wave * 0.05);
                });

                enemy.lastPos = { x: enemy.x, y: enemy.y };
            } else if (enemy.type === 'zigzag') {
                enemy.y += enemy.speed;
                const zigzagIntensity = enemy.erraticMode ? 1.5 : 1.0;
                const baseZigzag = Math.sin(enemy.anim / enemy.zigzagSpeed + enemy.zigzagPhase) * enemy.zigzagAmplitude;

                if (enemy.erraticMode) {
                    // Movimento più erratico e imprevedibile
                    const erraticFactor = Math.sin(enemy.anim * enemy.phaseShift) * (this.wave * 0.3);
                    const chaosZigzag = Math.cos(enemy.anim * 0.03) * (this.wave * 0.2);
                    enemy.x += (baseZigzag + erraticFactor + chaosZigzag) * zigzagIntensity;
                } else {
                    enemy.x += baseZigzag * zigzagIntensity;
                }

                // Fase di colore più veloce per effetto ipnotico
                enemy.colorPhase = (enemy.colorPhase + 3 + this.wave * 0.2) % 360;
            } else if (enemy.type === 'boss') {
                enemy.y += enemy.speed * 0.5;

                // Rigenerazione per boss avanzati
                if (enemy.regeneration > 0) {
                    const now = Date.now();
                    if (now - enemy.lastRegen > 2000) { // Ogni 2 secondi
                        enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.regeneration);
                        enemy.lastRegen = now;
                    }
                }

                // Movimento più aggressivo per boss di alto livello
                if (this.wave > 10) {
                    enemy.x += Math.sin(enemy.anim * 0.02) * (this.wave * 0.1);
                    enemy.y += Math.cos(enemy.anim * 0.03) * Math.min(1, this.wave * 0.05);
                }

                // Scudo più dinamico
                const shieldFrequency = Math.max(100, 200 - this.wave * 5);
                if (enemy.anim % shieldFrequency === 0) {
                    enemy.shieldActive = !enemy.shieldActive;
                }

                // Rotazione più veloce con il livello
                enemy.rotationSpeed += this.wave * 0.0001;
            } else if (enemy.type === 'splitter' && enemy.health <= enemy.maxHealth * 0.5 && enemy.splitCount < enemy.maxSplits) {
                // Sistema di split migliorato
                enemy.splitCount++;
                const splitAmount = Math.min(4, 2 + Math.floor(this.wave / 10));

                for (let j = 0; j < splitAmount; j++) {
                    const angle = (j * Math.PI * 2) / splitAmount;
                    const distance = 25 + Math.random() * 15;
                    const smallEnemy = {
                        x: enemy.x + Math.cos(angle) * distance,
                        y: enemy.y + Math.sin(angle) * distance,
                        speed: enemy.speed * (1.2 + this.wave * 0.05),
                        health: Math.floor(enemy.health * enemy.splitSize),
                        maxHealth: Math.floor(enemy.health * enemy.splitSize),
                        reward: Math.floor(enemy.reward * 0.25),
                        width: Math.max(8, enemy.width * enemy.splitSize),
                        height: Math.max(8, enemy.height * enemy.splitSize),
                        type: 'veloce',
                        anim: 0,
                        trailPoints: [],
                        lastPos: { x: enemy.x, y: enemy.y },
                        chaosSpeed: Math.min(6, this.wave * 0.3),
                        chaosAngle: angle,
                        dashCooldown: 0,
                        dashReady: true,
                        afterImages: [],
                        boostPhase: 0,
                        sparkles: Array(Math.min(8, 3 + this.wave)).fill(0).map(() => ({
                            offset: Math.random() * Math.PI * 2,
                            speed: (Math.random() * 0.15 + 0.08) * (1 + this.wave * 0.1),
                            size: Math.random() * 1.5 + 0.5
                        })),
                        hyperMode: this.wave > 5,
                        dashFrequency: Math.min(0.12, 0.04 + this.wave * 0.005),
                        splitGeneration: true // Marca come generato da split
                    };
                    this.enemies.push(smallEnemy);
                }
            } else if (enemy.type === 'splitter') {
                enemy.y += enemy.speed;
                // Movimento più aggressivo per splitter avanzati
                if (this.wave > 6) {
                    enemy.x += Math.sin(enemy.anim * 0.04) * (this.wave * 0.15);
                }
            }
            // Check if enemy reached bottom
            if (enemy.y > this.canvas.height) {
                // Danno crescente basato sull'ondata e tipo di nemico
                let damage = 5;
                if (enemy.type === 'boss') damage = Math.min(50, 15 + this.wave * 2);
                else if (enemy.type === 'splitter') damage = Math.min(25, 8 + this.wave);
                else if (enemy.type === 'veloce') damage = Math.min(20, 6 + this.wave);
                else if (enemy.type === 'zigzag') damage = Math.min(15, 7 + this.wave);
                else damage = Math.min(12, 5 + Math.floor(this.wave * 0.5));

                // Applica il danno direttamente (lo scudo ora distrugge i nemici, non assorbe danni)
                this.health -= damage;
                this.enemies.splice(i, 1);

                // Effetto visivo per indicare danno pesante
                if (damage > 10) {
                    this.createParticles(this.canvas.width / 2, this.canvas.height - 30);
                }
            }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.time++;
            if (explosion.time > explosion.maxTime) {
                this.explosions.splice(i, 1);
            }
        }

        // Update particles with enhanced physics (ottimizzato)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Aggiorna posizione con effetto di gravità
            particle.vy += 0.1;
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Applica resistenza dell'aria
            particle.vx *= 0.99;
            particle.vy *= 0.99;

            // Effetto di dissolvenza
            particle.life--;

            // Aggiorna dimensione
            if (particle.size > 0.5) {
                particle.size -= 0.05; // Semplificato
            }

            // Rimuovi particelle morte
            if (particle.life <= 0 || particle.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }

        // Aggiorna sempre la UI degli upgrade
        this.updateUI();

        // Aggiorna notifica premio ondata
        if (this.showWaveReward) {
            this.showWaveReward.timer--;
            if (this.showWaveReward.timer <= 0) {
                this.showWaveReward = null;
            }
        }

        // Aggiorna testi fluttuanti
        this.updateFloatingTexts();

        // Check game over
        if (this.health <= 0 && !this.showGameOver) {
            // Aggiorna il progresso permanente
            const earnedXP = this.updatePermanentProgress();

            // Riproduci il suono di game over
            this.playGameOverSound();

            // Mostra schermata game over con XP guadagnati
            this.showGameOver = {
                earnedXP: earnedXP,
                wave: this.wave,
                kills: this.kills,
                displayTime: Date.now()
            };
        }
    }

    playGameOverSound() {
        // Suono drammatico per il game over
        const duration = 2.0;

        // Base esplosiva grave
        const baseOsc = this.audioContext.createOscillator();
        const baseGain = this.audioContext.createGain();
        baseOsc.type = 'sawtooth';
        baseOsc.frequency.setValueAtTime(60, this.audioContext.currentTime);
        baseOsc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + duration);
        baseGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        baseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Suono discendente drammatico
        const descendingOsc = this.audioContext.createOscillator();
        const descendingGain = this.audioContext.createGain();
        descendingOsc.type = 'square';
        descendingOsc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        descendingOsc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
        descendingGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        descendingGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Rumore per effetto drammatico
        const bufferSize = this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noise.buffer = noiseBuffer;
        noiseGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        // Connetti tutto
        baseOsc.connect(baseGain);
        descendingOsc.connect(descendingGain);
        noise.connect(noiseGain);
        baseGain.connect(this.masterGain);
        descendingGain.connect(this.masterGain);
        noiseGain.connect(this.masterGain);

        // Avvia e ferma
        baseOsc.start();
        descendingOsc.start();
        noise.start();
        baseOsc.stop(this.audioContext.currentTime + duration);
        descendingOsc.stop(this.audioContext.currentTime + duration);
        noise.stop(this.audioContext.currentTime + 0.5);
    }


    triggerUltimate(index) {
        const now = Date.now();
        const ultimate = this.ultimates.types[index];

        // Verifica se questa ultimate è in cooldown o se c'è già un'ultimate attiva
        if (ultimate.cooldown > 0 || this.ultimateEffects.active) return;

        // Attiva il cooldown per questa ultimate
        ultimate.lastUsed = now;
        ultimate.cooldown = ultimate.maxCooldown;

        this.ultimateEffects.active = true;
        this.ultimateEffects.type = index;
        this.ultimateEffects.particles = [];

        switch (index) {
            case 0: // Nuclear Storm
                this.activateNuclearStorm();
                break;
            case 1: // Time Freeze
                this.activateTimeFreeze();
                break;
            case 2: // Orbital Strike
                this.activateOrbitalStrike();
                break;
        }
    }

    // Non serve più lo switch tra ultimate
    // switchUltimate() {
    //     this.ultimates.current = (this.ultimates.current + 1) % this.ultimates.types.length;
    // }

    activateNuclearStorm() {
        this.ultimateEffects.maxDuration = 3000; // 3 secondi
        this.ultimateEffects.duration = this.ultimateEffects.maxDuration;

        // Suono epico Nuclear Storm
        this.playNuclearStormSound();

        // Crea pioggia nucleare
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const x = Math.random() * this.canvas.width;
                const y = -50;
                this.createNuclearMissile(x, y);
            }, i * 100);
        }
    }

    activateTimeFreeze() {
        this.ultimateEffects.maxDuration = 5000; // 5 secondi
        this.ultimateEffects.duration = this.ultimateEffects.maxDuration;
        this.ultimateEffects.freezeTime = true;

        // Suono glaciale Time Freeze
        this.playTimeFreezeSound();

        // Laser continui verso tutti i nemici
        this.ultimateEffects.lasers = [];
    }

    activateOrbitalStrike() {
        this.ultimateEffects.maxDuration = 2000; // 2 secondi
        this.ultimateEffects.duration = this.ultimateEffects.maxDuration;

        // Suono devastante Orbital Strike
        this.playOrbitalStrikeSound();

        // Seleziona 3 punti di impatto
        this.ultimateEffects.strikes = [];
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height * 0.7 + 100;
            this.ultimateEffects.strikes.push({
                x: x,
                y: y,
                chargeTime: 1000,
                charged: false,
                particles: []
            });
        }
    }

    createNuclearMissile(x, y) {
        this.ultimateEffects.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: 8 + Math.random() * 4,
            life: 60,
            type: 'nuclear',
            size: 8,
            rotation: 0,
            trail: []
        });
    }

    activateShield() {
        const now = Date.now();
        // Verifica se lo scudo è in cooldown o già attivo
        if (this.shield.cooldown > 0 || this.shield.active) return;

        // Attiva lo scudo
        this.shield.active = true;

        // Calcola la durata dello scudo basata sull'ondata
        // Durata crescente con l'avanzare delle ondate
        const baseDuration = 3000; // 3 secondi base
        const waveDurationBonus = this.wave * 500; // +0.5 secondi per ondata
        const maxBonusDuration = 10000; // Massimo 10 secondi di bonus
        
        this.shield.duration = baseDuration + Math.min(maxBonusDuration, waveDurationBonus);

        // Crea particelle per l'effetto visivo dello scudo
        this.createShieldParticles();

        // Suono di attivazione scudo
        this.playShieldSound();
    }

    createShieldImpactEffect(x, y) {
        // Crea particelle per l'effetto di impatto
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI;
            const speed = 2 + Math.random() * 3;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: -Math.sin(angle) * speed, // Solo verso l'alto
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 3 + Math.random() * 2,
                color: this.shield.color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }

        // Effetto flash
        const flash = {
            x: x,
            y: y,
            life: 10,
            maxLife: 10,
            size: 20,
            color: '#FFFFFF',
            type: 'flash'
        };
        this.particles.push(flash);

        // Suono di impatto
        this.playShieldImpactSound();
    }

    createShieldParticles() {
        // Crea particelle distribuite lungo la linea dello scudo
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const x = this.cannon.x + Math.cos(angle) * this.shield.radius;
            const y = this.cannon.y + Math.sin(angle) * this.shield.radius;

            this.shield.particles.push({
                x: x,
                y: y,
                baseX: this.cannon.x,
                baseY: this.cannon.y,
                angle: angle,
                radius: this.shield.radius,
                size: 5 + Math.random() * 3,
                pulseFactor: Math.random() * 0.2 + 0.9,
                rotationSpeed: 0.01 + Math.random() * 0.02,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    updateShieldParticles() {
        // Aggiorna la posizione e animazione delle particelle dello scudo
        for (let particle of this.shield.particles) {
            // Aggiorna fase di pulsazione
            particle.phase += 0.05;

            // Calcola raggio pulsante
            const pulseRadius = particle.radius * (1 + Math.sin(particle.phase) * 0.1);

            // Rotazione graduale delle particelle
            particle.angle += particle.rotationSpeed;

            // Aggiorna posizione
            particle.x = this.cannon.x + Math.cos(particle.angle) * pulseRadius;
            particle.y = this.cannon.y + Math.sin(particle.angle) * pulseRadius;
        }
    }

    playShieldSound() {
        // Suono di attivazione scudo
        const duration = 1.0;

        // Oscillatore principale
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + duration);

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Filtro per effetto shield
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + duration);
        filter.Q.value = 15;

        // Connetti tutto
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Avvia e ferma
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createShieldImpactEffect() {
        // Crea particelle per simulare l'impatto sul scudo
        const impactAngle = Math.random() * Math.PI * 2;
        const impactX = this.cannon.x + Math.cos(impactAngle) * this.shield.radius;
        const impactY = this.cannon.y + Math.sin(impactAngle) * this.shield.radius;

        // Aggiungi particelle di impatto
        for (let i = 0; i < 8; i++) {
            const angle = impactAngle + (Math.random() - 0.5) * 1.5;
            const speed = 1 + Math.random() * 2;

            this.particles.push({
                x: impactX,
                y: impactY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 10,
                maxLife: 30,
                color: this.shield.color,
                size: 2 + Math.random() * 3,
                alpha: 0.8,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }


    updateUltimateEffects() {
        if (!this.ultimateEffects.active) return;

        this.ultimateEffects.duration -= 16; // Circa 60fps

        if (this.ultimateEffects.duration <= 0) {
            this.ultimateEffects.active = false;
            this.ultimateEffects.freezeTime = false;
            this.ultimateEffects.particles = [];
            return;
        }

        switch (this.ultimateEffects.type) {
            case 0: // Nuclear Storm
                this.updateNuclearStorm();
                break;
            case 1: // Time Freeze
                this.updateTimeFreeze();
                break;
            case 2: // Orbital Strike
                this.updateOrbitalStrike();
                break;
        }
    }

    updateNuclearStorm() {
        // Aggiorna missili nucleari
        for (let i = this.ultimateEffects.particles.length - 1; i >= 0; i--) {
            const missile = this.ultimateEffects.particles[i];
            missile.x += missile.vx;
            missile.y += missile.vy;
            missile.rotation += 0.1;
            missile.life--;

            // Aggiungi scia
            missile.trail.unshift({ x: missile.x, y: missile.y });
            if (missile.trail.length > 10) missile.trail.pop();

            // Check impatto o fuori schermo
            if (missile.y > this.canvas.height || missile.life <= 0) {
                this.createMegaExplosion(missile.x, missile.y, 0); // Nuclear Storm
                this.ultimateEffects.particles.splice(i, 1);
            }
        }
    }

    updateTimeFreeze() {
        // Crea laser verso tutti i nemici
        this.ultimateEffects.lasers = [];
        for (let enemy of this.enemies) {
            this.ultimateEffects.lasers.push({
                startX: this.cannon.x,
                startY: this.cannon.y,
                endX: enemy.x,
                endY: enemy.y,
                intensity: 0.8 + Math.sin(Date.now() * 0.01) * 0.2
            });

            // Danneggia nemico
            enemy.health -= 2;
            if (enemy.health <= 0) {
                this.money += enemy.reward;
                this.kills++;
                this.waveKills++; // Incrementa contatore nemici uccisi nell'ondata

                // Testo fluttuante per uccisione Time Freeze
                this.createFloatingText(enemy.x, enemy.y - 10, `-2❄️`, 'crit');
                this.createFloatingText(enemy.x, enemy.y + 10, `+${enemy.reward}💰`, 'money');

                this.createParticles(enemy.x, enemy.y);
                this.playUltimateKillSound(1); // Suono specifico Time Freeze
                this.enemies.splice(this.enemies.indexOf(enemy), 1);
            }
        }
    }

    updateOrbitalStrike() {
        for (let strike of this.ultimateEffects.strikes) {
            strike.chargeTime -= 16;

            if (!strike.charged && strike.chargeTime <= 0) {
                strike.charged = true;
                this.createMegaExplosion(strike.x, strike.y, 2); // Orbital Strike
            }

            // Particelle di carica
            if (!strike.charged) {
                strike.particles.push({
                    x: strike.x + (Math.random() - 0.5) * 100,
                    y: strike.y + (Math.random() - 0.5) * 100,
                    vx: (strike.x - (strike.x + (Math.random() - 0.5) * 100)) * 0.1,
                    vy: (strike.y - (strike.y + (Math.random() - 0.5) * 100)) * 0.1,
                    life: 30,
                    size: 3
                });
            }
        }
    }

    createMegaExplosion(x, y, ultimateType = -1) {
        // Esplosione mega potenziata
        this.explosions.push({
            x: x,
            y: y,
            time: 0,
            maxTime: 60,
            particles: Array(20).fill(0).map(() => ({
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 4 + 4,
                size: Math.random() * 8 + 4,
                color: `hsl(${Math.random() * 60 + 20}, 100%, 50%)`
            })),
            shockwave: {
                radius: 0,
                maxRadius: 150,
                width: 8
            }
        });

        // Danneggia tutti i nemici in un raggio ampio
        for (let enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - x, 2) +
                Math.pow(enemy.y - y, 2)
            );
            if (distance < 120) {
                enemy.health -= 200;

                // Testo fluttuante per danno ultimate
                const ultimateSymbols = ['☢️', '❄️', '🚀']; // Nuclear, Time Freeze, Orbital
                const symbol = ultimateType >= 0 ? ultimateSymbols[ultimateType] : '💥';
                this.createFloatingText(enemy.x + (Math.random() - 0.5) * 30,
                    enemy.y - 20,
                    `-200${symbol}`, 'crit');

                if (enemy.health <= 0) {
                    this.money += enemy.reward;
                    this.kills++;
                    this.waveKills++; // Incrementa contatore nemici uccisi nell'ondata

                    // Testo fluttuante per soldi da ultimate
                    this.createFloatingText(enemy.x, enemy.y + 15, `+${enemy.reward}💰`, 'money');

                    this.createParticles(enemy.x, enemy.y);
                    // Suono specifico in base al tipo di ultimate
                    if (ultimateType >= 0) {
                        this.playUltimateKillSound(ultimateType);
                    } else {
                        this.playExplosionSound(); // Default per esplosioni normali
                    }
                    this.enemies.splice(this.enemies.indexOf(enemy), 1);
                }
            }
        }

        // Particelle mega (ridotte)
        for (let i = 0; i < 15; i++) { // Ridotto da 30 a 15
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16,
                life: 50, // Ridotto da 80 a 50
                maxLife: 50,
                color: `hsl(${Math.random() * 60 + 20}, 100%, 70%)`,
                size: Math.random() * 6 + 3, // Ridotto leggermente
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }

    checkCollision(bullet, enemy) {
        return bullet.x < enemy.x + enemy.width &&
            bullet.x + 5 > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + 5 > enemy.y;
    }

    createExplosion(x, y) {
        // Esplosione principale con onde d'urto (ottimizzata)
        this.explosions.push({
            x: x,
            y: y,
            time: 0,
            maxTime: 20, // Ridotto da 30 a 20
            particles: Array(4).fill(0).map(() => ({ // Ridotto da 8 a 4
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 2 + 2,
                size: Math.random() * 3 + 2,
                color: `hsl(${Math.random() * 60 + 20}, 100%, 50%)`
            })),
            shockwave: {
                radius: 0,
                maxRadius: 60,
                width: 2
            }
        });

        // Particelle di energia secondarie (ridotte)
        for (let i = 0; i < 6; i++) { // Ridotto da 12 a 6
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30, // Ridotto da 45 a 30
                color: `hsl(${Math.random() * 60 + 20}, 100%, 70%)`,
                size: Math.random() * 3 + 1,
                spin: Math.random() * 0.4 - 0.2,
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    createParticles(x, y) {
        // Limita il numero di particelle per performance
        if (this.particles.length > 100) {
            this.particles.splice(0, 20); // Rimuovi le più vecchie
        }

        const colors = ['#FFC107', '#FF9800', '#FF5722', '#FFEB3B'];
        for (let i = 0; i < 6; i++) { // Ridotto da 12 a 6
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
            const speed = Math.random() * 3 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 25, // Ridotto da 40 a 25
                maxLife: 25,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 3 + 1.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    initStars() {
        // Ridotto il numero di stelle da 200 a 100 per performance
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5,
                twinkle: Math.random() * Math.PI
            });
        }
    }

    updateStars() {
        for (let star of this.stars) {
            // Muovi la stella verso il basso
            star.y += star.speed;
            // Effetto twinkle
            star.twinkle += 0.05;
            star.brightness = 0.5 + Math.sin(star.twinkle) * 0.3;

            // Se la stella esce dallo schermo, riposizionala in alto
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        }
    }

    render() {
        // Clear canvas con sfondo spaziale scuro
        this.ctx.fillStyle = 'rgba(5, 15, 32, 1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.showIntroPopup) {
            this.ctx.save();
            const alpha = Math.min(1, this.showIntroPopup.timer / 60); // Fade out ultimi 60 frame
            this.ctx.globalAlpha = alpha;
            const w = 520, h = 210; // Aumentato per contenere più testo
            const x = (this.canvas.width - w) / 2;
            const y = 70; // Spostato leggermente più in alto
            this.ctx.fillStyle = 'rgba(30, 30, 45, 0.95)';
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 4;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeRect(x, y, w, h);

            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Benvenuto in Cannone!', x + w / 2, y + 35);

            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText('Difendi la base sparando ai nemici e superando le ondate.', x + w / 2, y + 65);

            this.ctx.font = '15px Arial';
            this.ctx.fillStyle = '#22AAFF';
            this.ctx.fillText('Premi E per attivare lo scudo protettivo (distrugge i nemici)!', x + w / 2, y + 90);

            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText('Ogni partita ti fa accumulare XP permanenti!', x + w / 2, y + 115);

            this.ctx.font = '14px Arial';
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.fillText('Usa gli XP per sbloccare upgrade che ti aiutano nelle partite future.', x + w / 2, y + 140);

            this.ctx.font = '13px Arial';
            this.ctx.fillStyle = '#AAAAAA';
            this.ctx.fillText('Premi P per vedere i tuoi progressi e acquistare upgrade.', x + w / 2, y + 165);

            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#CCCCCC';
            this.ctx.fillText('Usa i tasti 1-2-3 per le ultimate speciali!', x + w / 2, y + 185);

            this.ctx.restore();
        }

        // Disegna le stelle
        this.updateStars();
        for (let star of this.stars) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // GUI: info testo con statistiche permanenti
        this.ctx.save();
        this.ctx.font = 'bold 22px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`💰 ${this.money}`, 30, 40);
        this.ctx.fillText(`👥 ${this.kills}`, 30, 70);
        this.ctx.fillText(`🌊 ${this.wave}`, 30, 100);

        // Mostra nemici uccisi nell'ondata corrente
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(`🎯 Ondata: ${this.waveKills}`, 30, 125);

        // Mostra punti esperienza permanenti
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillText(`⭐ XP: ${this.permanentProgress.experiencePoints}`, 30, 145);

        // Indica che si può aprire il menu progressi
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.fillText(`Premi P per Progressi`, 30, 160);

        // Developer mode indicator
        if (this.developerMode) {
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#FF6600';
            this.ctx.fillText(`🛠️ DEVELOPER MODE`, 30, 180);
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#FFAA88';
            this.ctx.fillText(`F1 per pannello controlli`, 30, 195);
        } else {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#666666';
            this.ctx.fillText(`F1 per Developer Mode`, 30, 180);
        }

        // Ultimate UI - multiple con proprio cooldown
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`Ultimate:`, 30, 185);

        // Disegna ciascuna ultimate con la propria barra
        let yOffset = 195;
        for (let i = 0; i < this.ultimates.types.length; i++) {
            const ultimate = this.ultimates.types[i];
            const cooldownPercent = 1 - (ultimate.cooldown / ultimate.maxCooldown);

            // Nome ultimate con tasto
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = ultimate.color;
            this.ctx.fillText(`${i + 1}: ${ultimate.name}`, 30, yOffset + 10);

            // Barra cooldown
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(30, yOffset + 15, 200, 8);
            this.ctx.fillStyle = cooldownPercent >= 1 ? '#00FF00' : ultimate.color;
            this.ctx.fillRect(30, yOffset + 15, 200 * cooldownPercent, 8);
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(30, yOffset + 15, 200, 8);

            // Tempo rimanente
            if (ultimate.cooldown > 0) {
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.textAlign = 'right';
                const secondsLeft = Math.ceil(ultimate.cooldown / 1000);
                this.ctx.fillText(`${secondsLeft}s`, 230, yOffset + 22);
                this.ctx.textAlign = 'left';
            }

            yOffset += 25; // Spazio tra le ultimate
        }

        // Shield UI - con stile coerente alle ultimate
        const shieldCooldownPercent = 1 - (this.shield.cooldown / this.shield.maxCooldown);

        // Titolo sezione Scudo
        const yOffsetShield = yOffset + 15; // Parte dopo l'ultima ultimate
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('Scudo:', 30, yOffsetShield);

        // Nome dello scudo con tasto e stato
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = this.shield.color;
        this.ctx.fillText(`E: ${this.shield.active ? "Attivo" : "Pronto"}`, 30, yOffsetShield + 20);

        // Visualizza la potenza dello scudo in base all'ondata
        const shieldPowerPercent = this.shield.power / 100;
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#ADD8E6';
        this.ctx.fillText(`Potenza: ${Math.floor(this.shield.power)}%`, 130, yOffsetShield + 20);

        // Barra cooldown scudo (stesso stile delle ultimate)
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(30, yOffsetShield + 25, 200, 8);
        this.ctx.fillStyle = shieldCooldownPercent >= 1 ? '#00AAFF' : '#888888';
        this.ctx.fillRect(30, yOffsetShield + 25, 200 * shieldCooldownPercent, 8);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(30, yOffsetShield + 25, 200, 8);

        // Tempo rimanente cooldown scudo
        if (this.shield.cooldown > 0) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'right';
            const secondsLeft = Math.ceil(this.shield.cooldown / 1000);
            this.ctx.fillText(`${secondsLeft}s`, 230, yOffsetShield + 32);
            this.ctx.textAlign = 'left';
        }

        // Se lo scudo è attivo, mostra il tempo rimanente di durata
        if (this.shield.active) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#00AAFF';
            const durationLeft = Math.ceil(this.shield.duration / 1000);
            this.ctx.fillText(`Durata: ${durationLeft}s`, 30, yOffsetShield + 40);
        }

        if (this.ultimateEffects.active) {
            const currentUlt = this.ultimates.types[this.ultimateEffects.type];
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = currentUlt.color;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${currentUlt.name.toUpperCase()} ACTIVE!`, this.canvas.width / 2, 50);
        }

        // Barra della vita spostata dopo lo scudo
        const yOffsetHealth = yOffsetShield + 55; // Posizione dopo lo scudo
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(30, yOffsetHealth, 220, 18);
        this.ctx.fillStyle = '#e53935';
        const hpPercent = this.health / this.maxHealth;
        this.ctx.fillRect(30, yOffsetHealth, 220 * hpPercent, 18);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(30, yOffsetHealth, 220, 18);
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Vita: ${this.health} / ${this.maxHealth}`, 140, yOffsetHealth + 14);

        // Barra nemici rimanenti
        const total = this.enemiesPerWave;
        const left = total - this.enemiesSpawned + this.enemies.length;
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(this.canvas.width - 250, 40, 220, 18);
        this.ctx.fillStyle = '#2196f3';
        const leftPercent = left / total;
        this.ctx.fillRect(this.canvas.width - 250, 40, 220 * leftPercent, 18);
        this.ctx.strokeStyle = '#fff';
        this.ctx.strokeRect(this.canvas.width - 250, 40, 220, 18);
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Nemici rimasti: ${left} / ${total}`, this.canvas.width - 140, 54);
        this.ctx.restore();

        // Notifica premio ondata
        if (this.showWaveReward) {
            this.ctx.save();
            const alpha = Math.min(1, this.showWaveReward.timer / 30); // Fade out negli ultimi 30 frames
            this.ctx.globalAlpha = alpha;

            // Sfondo della notifica (più grande per più informazioni)
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
            this.ctx.strokeStyle = 'rgba(255, 165, 0, 1)';
            this.ctx.lineWidth = 3;
            const notifWidth = 400;
            const notifHeight = 110;
            const notifX = (this.canvas.width - notifWidth) / 2;
            const notifY = 100;

            this.ctx.fillRect(notifX, notifY, notifWidth, notifHeight);
            this.ctx.strokeRect(notifX, notifY, notifWidth, notifHeight);

            // Testo del premio
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`ONDATA ${this.showWaveReward.wave} COMPLETATA!`, notifX + notifWidth / 2, notifY + 22);

            // Dettagli delle uccisioni
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillText(`👥 ${this.showWaveReward.killCount} nemici eliminati`, notifX + notifWidth / 2, notifY + 45);

            // Premi dettagliati
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#2E7D32';
            this.ctx.fillText(`Base: ${this.showWaveReward.baseAmount}💰 + Bonus: ${this.showWaveReward.killBonus}💰`, notifX + notifWidth / 2, notifY + 65);

            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillStyle = '#1B5E20';
            this.ctx.fillText(`TOTALE: +${this.showWaveReward.totalAmount} 💰`, notifX + notifWidth / 2, notifY + 88);

            // Effetto sparkle attorno alla notifica
            const sparkleCount = 10;
            for (let i = 0; i < sparkleCount; i++) {
                const angle = (Date.now() * 0.005 + i * Math.PI * 2 / sparkleCount) % (Math.PI * 2);
                const radius = 45 + Math.sin(Date.now() * 0.01 + i) * 12;
                const sparkleX = notifX + notifWidth / 2 + Math.cos(angle) * radius;
                const sparkleY = notifY + notifHeight / 2 + Math.sin(angle) * radius;
                const sparkleSize = 2 + Math.sin(Date.now() * 0.02 + i) * 1.5;

                this.ctx.fillStyle = `rgba(255, 255, 0, ${0.8 * alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        // Draw cannon
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        this.ctx.rotate(this.cannon.rotation + Math.PI / 2);
        // Base del cannone con gradiente energetico
        const basePulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
        const baseGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        baseGradient.addColorStop(0, `rgba(76,175,80,${basePulse})`);
        baseGradient.addColorStop(0.5, '#43A047');
        baseGradient.addColorStop(1, '#1B5E20');
        this.ctx.shadowColor = `rgba(76,175,80,${basePulse})`;
        this.ctx.shadowBlur = 18 + Math.sin(Date.now() * 0.005) * 8;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = baseGradient;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Dettagli metallici
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            const x = Math.cos(angle) * 11;
            const y = Math.sin(angle) * 11;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255,255,255,0.18)';
            this.ctx.fill();
        }

        // Canna del cannone con riflesso energetico
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(-5, -25, 10, 25);
        const barrelGradient = this.ctx.createLinearGradient(-5, -25, 5, 0);
        barrelGradient.addColorStop(0, '#A5D6A7');
        barrelGradient.addColorStop(0.5, '#388E3C');
        barrelGradient.addColorStop(1, '#1B5E20');
        this.ctx.fillStyle = barrelGradient;
        this.ctx.fill();

        // Glow energetico sulla canna
        this.ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.008) * 0.2;
        this.ctx.shadowColor = '#B2FF59';
        this.ctx.shadowBlur = 16;
        this.ctx.beginPath();
        this.ctx.arc(0, -25, 7, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(178,255,89,0.7)';
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
        this.ctx.restore();

        // Dettaglio centrale luminoso
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.18)';
        this.ctx.fill();

        this.ctx.restore();

        // Draw range indicator (subtle)
        this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, this.cannon.range, 0, Math.PI * 2);
        this.ctx.stroke();

        // Render shield if active
        if (this.shield.active) {
            this.ctx.save();

            // Effetto pulsante dello scudo
            const shieldPulse = 0.2 + Math.sin(Date.now() * 0.003) * 0.1;
            const shieldOpacity = 0.4 + shieldPulse;

            // Calcola intensità colore basata sulla durata rimanente
            const durationPercent = this.shield.duration / (3000 + Math.min(10000, this.wave * 500));
            const r = Math.floor(34 + (1 - durationPercent) * 200); // Più rosso quando sta per finire
            const g = Math.floor(170 + durationPercent * 85);
            const b = Math.floor(255);
            const shieldColor = `rgba(${r}, ${g}, ${b}, ${shieldOpacity})`;

            // Disegna la linea principale dello scudo
            this.ctx.shadowColor = shieldColor;
            this.ctx.shadowBlur = 15 + durationPercent * 10;
            this.ctx.strokeStyle = shieldColor;
            this.ctx.lineWidth = this.shield.height + durationPercent * 3;

            // Linea principale
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.shield.y);
            this.ctx.lineTo(this.shield.width, this.shield.y);
            this.ctx.stroke();

            // Effetto energetico
            const particleCount = 20;
            for (let i = 0; i < particleCount; i++) {
                const x = (this.shield.width / particleCount) * i;
                const yOffset = Math.sin(Date.now() * 0.003 + i * 0.5) * 3;
                const particleOpacity = 0.5 + Math.sin(Date.now() * 0.005 + i) * 0.3;

                this.ctx.beginPath();
                this.ctx.arc(x, this.shield.y + yOffset, 2 + durationPercent * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particleOpacity})`;
                this.ctx.fill();
            }

            // Indicatore durata scudo - barra orizzontale sopra lo scudo
            const barWidth = 200;
            const barHeight = 8;
            const barX = this.canvas.width / 2 - barWidth / 2;
            const barY = this.shield.y - 30;

            // Sfondo barra
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

            // Barra durata
            const fillWidth = barWidth * durationPercent;
            const barColor = durationPercent > 0.3 ? '#00FF88' : durationPercent > 0.1 ? '#FFAA00' : '#FF4444';
            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(barX, barY, fillWidth, barHeight);

            // Testo durata
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`SCUDO: ${(this.shield.duration / 1000).toFixed(1)}s`, barX + barWidth / 2, barY - 8);

            this.ctx.restore();
        }

        // Draw bullets con dimensioni maggiorate
        for (let bullet of this.bullets) {
            // Glow energetico scalato
            this.ctx.save();
            const pulse = 0.7 + Math.sin(Date.now() * 0.01 + bullet.x + bullet.y) * 0.3;
            this.ctx.shadowColor = `rgba(255, 255, 100, ${pulse})`;
            this.ctx.shadowBlur = bullet.glowSize;

            // Scia luminosa scalata
            this.ctx.beginPath();
            this.ctx.moveTo(bullet.x, bullet.y);
            this.ctx.lineTo(bullet.x - bullet.vx * bullet.trailLength, bullet.y - bullet.vy * bullet.trailLength);
            this.ctx.strokeStyle = `rgba(255, 255, 100, 0.3)`;
            this.ctx.lineWidth = 3 * this.cannon.bulletSize;
            this.ctx.stroke();

            // Corpo del proiettile con gradiente scalato
            const grad = this.ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.size);
            grad.addColorStop(0, `rgba(255,255,200,${pulse})`);
            grad.addColorStop(0.5, '#FFC107');
            grad.addColorStop(1, '#FF9800');
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        }

        // Draw enemies
        for (let enemy of this.enemies) {
            if (enemy.type === 'normale') {
                // Design meccanico avanzato
                const pulseScale = 1 + Math.sin(enemy.phase) * 0.15;
                enemy.phase += enemy.pulseSpeed;

                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);
                this.ctx.rotate(enemy.anim * 0.02); // Rotazione lenta
                this.ctx.scale(pulseScale, pulseScale);

                // Strato base con gradiente
                const baseGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.width * 0.7);
                baseGradient.addColorStop(0, '#FF1744');
                baseGradient.addColorStop(0.6, '#D50000');
                baseGradient.addColorStop(1, '#B71C1C');

                // Effetto metallo con riflessi
                this.ctx.shadowColor = '#FF1744';
                this.ctx.shadowBlur = 20 + Math.sin(enemy.phase) * 8;

                // Forma ottagonale base
                this.ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    const radius = enemy.width * 0.7;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fillStyle = baseGradient;
                this.ctx.fill();

                // Bordo metallico
                this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Cerchio interno rotante
                this.ctx.save();
                this.ctx.rotate(-enemy.anim * 0.04); // Rotazione opposta
                const innerGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.width * 0.4);
                innerGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
                innerGradient.addColorStop(0.5, 'rgba(255,23,68,0.6)');
                innerGradient.addColorStop(1, 'rgba(183,28,28,0.4)');
                this.ctx.beginPath();
                this.ctx.arc(0, 0, enemy.width * 0.4, 0, Math.PI * 2);
                this.ctx.fillStyle = innerGradient;
                this.ctx.fill();

                // Pattern geometrico interno
                for (let i = 0; i < 4; i++) {
                    const angle = (enemy.anim * 0.05 + i * Math.PI / 2) % (Math.PI * 2);
                    const x = Math.cos(angle) * enemy.width * 0.25;
                    const y = Math.sin(angle) * enemy.width * 0.25;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    this.ctx.fill();
                }
                this.ctx.restore();

                // Anelli di energia rotanti
                enemy.energyRings.forEach((ring, index) => {
                    const ringRadius = enemy.width * ring.radius;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(255,${23 + index * 40},${68 + index * 40},${0.6 + enemy.powerLevel * 0.4})`;
                    this.ctx.lineWidth = 2 + enemy.powerLevel * 2;

                    for (let i = 0; i < 8; i++) {
                        const segmentAngle = (i * Math.PI / 4) + ring.angle;
                        const x = Math.cos(segmentAngle) * ringRadius;
                        const y = Math.sin(segmentAngle) * ringRadius;

                        if (i === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            const cp1x = Math.cos(segmentAngle - Math.PI / 8) * ringRadius * 1.1;
                            const cp1y = Math.sin(segmentAngle - Math.PI / 8) * ringRadius * 1.1;
                            const cp2x = Math.cos(segmentAngle - Math.PI / 16) * ringRadius * 0.9;
                            const cp2y = Math.sin(segmentAngle - Math.PI / 16) * ringRadius * 0.9;
                            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
                        }
                    }
                    this.ctx.closePath();
                    this.ctx.stroke();

                    // Particelle energetiche sugli anelli
                    for (let i = 0; i < 3; i++) {
                        const particleAngle = ring.angle + (i * Math.PI * 2 / 3);
                        const x = Math.cos(particleAngle) * ringRadius;
                        const y = Math.sin(particleAngle) * ringRadius;
                        const size = (1.5 + Math.sin(enemy.phase + i) * 0.5) * (1 + enemy.powerLevel);

                        this.ctx.beginPath();
                        this.ctx.arc(x, y, size, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 + enemy.powerLevel * 0.5)})`;
                        this.ctx.fill();
                    }
                });

                // Particelle energetiche
                for (let i = 0; i < 2; i++) {
                    const particleAngle = enemy.anim * 0.1 + i * Math.PI;
                    const distance = enemy.width * 0.3;
                    const x = Math.cos(particleAngle) * distance;
                    const y = Math.sin(particleAngle) * distance;
                    const size = 2 + Math.sin(enemy.phase + i) * 1;

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    this.ctx.fill();
                }

                this.ctx.restore();

            } else if (enemy.type === 'veloce') {
                this.ctx.save();

                // Aggiorna trail points
                enemy.trailPoints.unshift({ x: enemy.x, y: enemy.y });
                if (enemy.trailPoints.length > 10) enemy.trailPoints.pop();

                // Disegna scia avanzata
                let index = 0;
                for (let point of enemy.trailPoints) {
                    const alpha = 0.2 * (1 - index / enemy.trailPoints.length);
                    const width = enemy.width * (1 - index / enemy.trailPoints.length);

                    // Scia principale
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, width / 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(255,235,59,${alpha})`;
                    this.ctx.fill();

                    // Particelle energetiche
                    for (let i = 0; i < 2; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * width / 2;
                        this.ctx.beginPath();
                        this.ctx.arc(
                            point.x + Math.cos(angle) * distance,
                            point.y + Math.sin(angle) * distance,
                            1, 0, Math.PI * 2
                        );
                        this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                        this.ctx.fill();
                    }

                    index++;
                }

                // Corpo principale con effetto energia pulsante
                this.ctx.translate(enemy.x, enemy.y);
                this.ctx.shadowColor = '#FFF176';
                this.ctx.shadowBlur = 20 + Math.sin(enemy.anim * 0.2) * 5;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, enemy.width / 2, 0, Math.PI * 2);

                // Gradiente dinamico
                const radius = Math.max(1, enemy.width / 2); // Assicuriamoci che il raggio sia sempre positivo
                const gradient = this.ctx.createRadialGradient(
                    0, 0, 0,
                    0, 0, radius
                );
                const intensity = Math.max(0, Math.min(1, 0.5 + Math.sin(enemy.anim * 0.2) * 0.5));
                gradient.addColorStop(0, `rgba(255,255,255,${intensity})`);
                gradient.addColorStop(0.5, '#FFEB3B');
                gradient.addColorStop(1, '#FFC107');

                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                this.ctx.restore();

            } else if (enemy.type === 'zigzag') {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);

                // Rotazione fluida
                const rot = enemy.anim / 15 + enemy.zigzagPhase;
                this.ctx.rotate(rot);

                // Effetto prisma con transizione fluida di colori
                enemy.colorPhase = (enemy.colorPhase + 2) % 360;
                const gradient = this.ctx.createLinearGradient(
                    -enemy.width / 2, -enemy.height / 2,
                    enemy.width / 2, enemy.height / 2
                );
                gradient.addColorStop(0, `hsl(${enemy.colorPhase},80%,55%)`);
                gradient.addColorStop(0.5, `hsl(${(enemy.colorPhase + 120) % 360},80%,55%)`);
                gradient.addColorStop(1, `hsl(${(enemy.colorPhase + 240) % 360},80%,55%)`);

                // Forma principale con effetto cristallino
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.moveTo(-enemy.width / 2, -enemy.height / 2);
                this.ctx.lineTo(enemy.width / 2, -enemy.height / 2);
                this.ctx.lineTo(0, enemy.height / 2);
                this.ctx.closePath();
                this.ctx.fill();

                // Bordi luminosi
                this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // Particelle di energia
                for (let i = 0; i < 3; i++) {
                    const angle = (enemy.anim * 0.1 + i * Math.PI * 2 / 3) % (Math.PI * 2);
                    const radius = enemy.width * 0.3;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        2, 0, Math.PI * 2
                    );
                    this.ctx.fillStyle = 'white';
                    this.ctx.fill();
                }

                this.ctx.restore();

            } else if (enemy.type === 'boss') {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);

                // Rotazione base
                this.ctx.rotate(enemy.anim * enemy.rotationSpeed);

                // Scudo energetico
                if (enemy.shieldActive) {
                    enemy.shieldAngle += 0.03;
                    const shieldGradient = this.ctx.createRadialGradient(0, 0, enemy.width * 0.6, 0, 0, enemy.width * 0.8);
                    shieldGradient.addColorStop(0, 'rgba(33,150,243,0)');
                    shieldGradient.addColorStop(0.5, 'rgba(33,150,243,0.3)');
                    shieldGradient.addColorStop(1, 'rgba(33,150,243,0)');

                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, enemy.width * 0.8, 0, Math.PI * 2);
                    this.ctx.fillStyle = shieldGradient;
                    this.ctx.fill();

                    // Pattern dello scudo
                    for (let i = 0; i < 8; i++) {
                        const angle = enemy.shieldAngle + i * Math.PI / 4;
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, enemy.width * 0.7, angle, angle + Math.PI / 8);
                        this.ctx.strokeStyle = 'rgba(33,150,243,0.8)';
                        this.ctx.lineWidth = 3;
                        this.ctx.stroke();
                    }
                }

                // Corpo principale
                this.ctx.rotate(enemy.innerRotation);
                enemy.innerRotation += 0.02;

                // Corpo principale geometrico con più dettagli
                const segments = 8;
                const innerRadius = enemy.width * 0.25;
                const outerRadius = enemy.width * 0.5;
                const midRadius = (innerRadius + outerRadius) * 0.5;

                this.ctx.beginPath();
                for (let i = 0; i < segments; i++) {
                    const angle = (i * 2 * Math.PI / segments);
                    const nextAngle = ((i + 1) * 2 * Math.PI / segments);
                    const midAngle = (angle + nextAngle) * 0.5;

                    const innerX = Math.cos(angle) * innerRadius;
                    const innerY = Math.sin(angle) * innerRadius;
                    const outerX = Math.cos(midAngle) * (outerRadius + Math.sin(enemy.anim * 0.1) * 5);
                    const outerY = Math.sin(midAngle) * (outerRadius + Math.sin(enemy.anim * 0.1) * 5);
                    const nextInnerX = Math.cos(nextAngle) * innerRadius;
                    const nextInnerY = Math.sin(nextAngle) * innerRadius;

                    if (i === 0) this.ctx.moveTo(innerX, innerY);

                    // Usa curve di Bezier per forme più organiche
                    const cp1x = Math.cos(angle) * midRadius;
                    const cp1y = Math.sin(angle) * midRadius;
                    const cp2x = Math.cos(midAngle) * (midRadius + 10);
                    const cp2y = Math.sin(midAngle) * (midRadius + 10);

                    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, outerX, outerY);

                    const cp3x = Math.cos(midAngle) * (midRadius - 5);
                    const cp3y = Math.sin(midAngle) * (midRadius - 5);
                    const cp4x = Math.cos(nextAngle) * midRadius;
                    const cp4y = Math.sin(nextAngle) * midRadius;

                    this.ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, nextInnerX, nextInnerY);
                }

                // Gradiente principale potenziato
                const bossGradient = this.ctx.createRadialGradient(0, 0, innerRadius * 0.5, 0, 0, outerRadius);
                const powerFactor = enemy.health / enemy.maxHealth;
                const baseColor = {
                    r: 156 + (1 - powerFactor) * 50,
                    g: 39 + powerFactor * 100,
                    b: 176 - (1 - powerFactor) * 50
                };

                bossGradient.addColorStop(0, `rgb(${baseColor.r},${baseColor.g},${baseColor.b})`);
                bossGradient.addColorStop(0.6, `rgb(${baseColor.r * 0.8},${baseColor.g * 0.8},${baseColor.b * 0.8})`);
                bossGradient.addColorStop(1, `rgb(${baseColor.r * 0.6},${baseColor.g * 0.6},${baseColor.b * 0.6})`);

                this.ctx.fillStyle = bossGradient;
                this.ctx.fill();

                // Effetto energia pulsante
                this.ctx.globalAlpha = 0.3 + Math.sin(enemy.anim * 0.1) * 0.2;
                const energyGradient = this.ctx.createRadialGradient(0, 0, innerRadius * 0.7, 0, 0, outerRadius * 1.1);
                energyGradient.addColorStop(0, 'rgba(255,255,255,0.1)');
                energyGradient.addColorStop(0.5, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.2)`);
                energyGradient.addColorStop(1, 'rgba(255,255,255,0)');

                this.ctx.fillStyle = energyGradient;
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;

                // Sistema particellare avanzato
                for (let i = 0; i < 12; i++) {
                    const particleAngle = (enemy.anim * 0.02 + i * Math.PI / 6) % (Math.PI * 2);
                    const distanceFactor = 0.8 + Math.sin(enemy.anim * 0.1 + i) * 0.2;
                    const x = Math.cos(particleAngle) * (innerRadius * distanceFactor);
                    const y = Math.sin(particleAngle) * (innerRadius * distanceFactor);

                    // Particella principale
                    this.ctx.beginPath();
                    const particleSize = 2 + Math.sin(enemy.anim * 0.2 + i) * 1;
                    this.ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(255,255,255,${0.7 + Math.sin(enemy.anim * 0.1 + i) * 0.3})`;
                    this.ctx.fill();

                    // Scia energetica
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    const trailLength = 15 * distanceFactor;
                    const trailEndX = x - Math.cos(particleAngle) * trailLength;
                    const trailEndY = y - Math.sin(particleAngle) * trailLength;
                    const gradient = this.ctx.createLinearGradient(x, y, trailEndX, trailEndY);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
                    gradient.addColorStop(1, 'rgba(255,255,255,0)');
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 1;
                    this.ctx.lineTo(trailEndX, trailEndY);
                    this.ctx.stroke();
                }

                // Nucleo energetico potenziato
                this.ctx.beginPath();
                this.ctx.arc(0, 0, enemy.width * 0.2, 0, Math.PI * 2);
                const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.width * 0.2);
                const corePulse = 0.8 + Math.sin(enemy.anim * 0.15) * 0.2;
                coreGradient.addColorStop(0, `rgba(255,255,255,${corePulse})`);
                coreGradient.addColorStop(0.5, '#E1BEE7');
                coreGradient.addColorStop(1, '#9C27B0');
                this.ctx.fillStyle = coreGradient;
                this.ctx.fill();

                // Effetto glow
                this.ctx.shadowColor = '#9C27B0';
                this.ctx.shadowBlur = 20;

                this.ctx.restore();

            } else if (enemy.type === 'splitter') {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);

                // Effetto pulsante
                enemy.pulsePhase += 0.1;
                const pulseScale = 1 + Math.sin(enemy.pulsePhase) * 0.15;
                this.ctx.scale(pulseScale, pulseScale);

                // Effetto glow dinamico
                enemy.glowIntensity = 0.7 + Math.sin(enemy.pulsePhase) * 0.3;
                this.ctx.shadowColor = '#FF9800';
                this.ctx.shadowBlur = 20 * enemy.glowIntensity;

                // Corpo principale con pattern energetico
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.width / 2);
                gradient.addColorStop(0, '#FFCA28');
                gradient.addColorStop(0.6, '#FF9800');
                gradient.addColorStop(1, '#F57C00');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();

                // Forma ottagonale
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI / 4) + enemy.anim * 0.02;
                    const radius = enemy.width / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }

                this.ctx.closePath();
                this.ctx.fill();

                // Linee di energia interne
                for (let i = 0; i < 4; i++) {
                    const angle = enemy.anim * 0.03 + i * Math.PI / 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(
                        Math.cos(angle) * enemy.width / 2,
                        Math.sin(angle) * enemy.width / 2
                    );
                    this.ctx.strokeStyle = `rgba(255,255,255,${0.3 + Math.sin(enemy.pulsePhase) * 0.2})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }

                this.ctx.restore();
            }
            // Health bar
            const healthPercent = enemy.health / enemy.maxHealth;
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(enemy.x - 15, enemy.y - 20, 30, 4);
            this.ctx.fillStyle = 'green';
            this.ctx.fillRect(enemy.x - 15, enemy.y - 20, 30 * healthPercent, 4);
        }

        // Draw explosions with enhanced effects
        for (let explosion of this.explosions) {
            const progress = explosion.time / explosion.maxTime;

            // Onda d'urto
            const shockwaveProgress = Math.min(1, explosion.time / (explosion.maxTime * 0.6));
            const shockwaveRadius = explosion.shockwave.maxRadius * shockwaveProgress;
            const shockwaveAlpha = Math.max(0, 0.7 - shockwaveProgress);

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 200, 100, ${shockwaveAlpha})`;
            this.ctx.lineWidth = explosion.shockwave.width * (1 - shockwaveProgress);
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, shockwaveRadius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Distorsione spaziale
            const distortionRadius = shockwaveRadius * 1.2;
            this.ctx.globalAlpha = shockwaveAlpha * 0.3;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, distortionRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // Particelle dell'esplosione
            for (let particle of explosion.particles) {
                const particleX = explosion.x + Math.cos(particle.angle) * (particle.speed * explosion.time);
                const particleY = explosion.y + Math.sin(particle.angle) * (particle.speed * explosion.time);
                const particleAlpha = 1 - progress;

                this.ctx.globalAlpha = particleAlpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particleX, particleY, particle.size * (1 - progress), 0, Math.PI * 2);
                this.ctx.fill();

                // Scia energetica
                this.ctx.strokeStyle = particle.color;
                this.ctx.lineWidth = particle.size * 0.5 * (1 - progress);
                this.ctx.beginPath();
                this.ctx.moveTo(particleX, particleY);
                this.ctx.lineTo(
                    particleX - Math.cos(particle.angle) * (10 + particle.speed * 2),
                    particleY - Math.sin(particle.angle) * (10 + particle.speed * 2)
                );
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        // Draw enhanced particles with trails and glow
        for (let particle of this.particles) {
            const lifeProgress = particle.life / particle.maxLife;
            this.ctx.save();

            // Scia luminosa
            this.ctx.strokeStyle = particle.color;
            this.ctx.lineWidth = particle.size * 0.5 * lifeProgress;
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(
                particle.x - particle.vx * 3,
                particle.y - particle.vy * 3
            );
            this.ctx.stroke();

            // Particella principale con rotazione
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation);
            this.ctx.fillStyle = particle.color;

            // Effetto glow
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10 * lifeProgress;

            // Forma della particella
            this.ctx.beginPath();
            if (Math.random() < 0.5) {
                // Stella
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const radius = particle.size * (i % 2 === 0 ? 1 : 0.5);
                    if (i === 0) {
                        this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    } else {
                        this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    }
                }
            } else {
                // Rombo rotante
                this.ctx.moveTo(0, -particle.size);
                this.ctx.lineTo(particle.size, 0);
                this.ctx.lineTo(0, particle.size);
                this.ctx.lineTo(-particle.size, 0);
            }
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();

            // Aggiorna la rotazione per il prossimo frame
            particle.rotation += particle.rotationSpeed;
        }

        // Draw ultimate effects
        this.renderUltimateEffects();

        // Draw floating texts
        this.renderFloatingTexts();

        // Game Over screen
        if (this.showGameOver) {
            this.ctx.save();

            // Overlay semi-trasparente scuro
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Pannello centrale (più grande per contenere tutto)
            const panelW = 500;
            const panelH = 420; // Aumentato da 350 a 420
            const panelX = (this.canvas.width - panelW) / 2;
            const panelY = (this.canvas.height - panelH) / 2;

            // Background sfumato con effetto rosso
            const gameOverGradient = this.ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
            gameOverGradient.addColorStop(0, 'rgba(80, 20, 20, 0.9)');
            gameOverGradient.addColorStop(1, 'rgba(40, 10, 10, 0.9)');
            this.ctx.fillStyle = gameOverGradient;
            this.ctx.fillRect(panelX, panelY, panelW, panelH);

            // Bordo
            this.ctx.strokeStyle = '#FF4444';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(panelX, panelY, panelW, panelH);

            // Game Over text con effetto pulsante
            const pulseEffect = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
            this.ctx.font = 'bold 52px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 50, 50, ${pulseEffect})`;
            this.ctx.shadowColor = '#FF0000';
            this.ctx.shadowBlur = 15;
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, panelY + 80);
            this.ctx.shadowBlur = 0;

            // Statistiche finali
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(`Ondata raggiunta: ${this.wave}`, this.canvas.width / 2, panelY + 140);
            this.ctx.fillText(`Nemici eliminati: ${this.kills}`, this.canvas.width / 2, panelY + 180);

            // XP guadagnati
            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.fillText(`+ ${this.showGameOver.earnedXP} XP`, this.canvas.width / 2, panelY + 200);

            // Pulsante Gioca Ancora (spostato più in alto)
            const playAgainBtnW = 240;
            const playAgainBtnH = 60;
            const playAgainBtnX = panelX + (panelW - playAgainBtnW) / 2;
            const playAgainBtnY = panelY + 240; // Spostato da 250 a 240

            // Effetto hover sul pulsante
            const btnHover = this.isMouseOverRect(playAgainBtnX, playAgainBtnY, playAgainBtnW, playAgainBtnH);
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = btnHover ? 15 : 10;
            this.ctx.shadowOffsetY = 5;

            // Disegna il pulsante
            this.ctx.fillStyle = btnHover ? '#5CBF60' : '#4CAF50';
            this.ctx.fillRect(playAgainBtnX, playAgainBtnY, playAgainBtnW, playAgainBtnH);
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;

            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(playAgainBtnX, playAgainBtnY, playAgainBtnW, playAgainBtnH);

            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText('GIOCA ANCORA', this.canvas.width / 2, playAgainBtnY + 40);

            this.ctx.restore();
        }

        // Menu Progressi Permanenti
        if (this.showProgressMenu) {
            // Sfondo scuro
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Finestra principale
            const menuW = 500, menuH = 400;
            const menuX = (this.canvas.width - menuW) / 2;
            const menuY = (this.canvas.height - menuH) / 2;

            // Sfondo menu
            const menuGradient = this.ctx.createLinearGradient(menuX, menuY, menuX, menuY + menuH);
            menuGradient.addColorStop(0, 'rgba(30,30,45,0.95)');
            menuGradient.addColorStop(1, 'rgba(15,15,25,0.95)');
            this.ctx.fillStyle = menuGradient;
            this.ctx.fillRect(menuX, menuY, menuW, menuH);

            // Bordo
            this.ctx.strokeStyle = '#4CAF50';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(menuX, menuY, menuW, menuH);

            // Titolo
            this.ctx.font = 'bold 28px Arial';
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PROGRESSI PERMANENTI', menuX + menuW / 2, menuY + 40);

            // Bottone chiudi (X)
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = '#FF4444';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('✕', menuX + menuW - 20, menuY + 25);

            // XP disponibili
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`XP Disponibili: ${this.permanentProgress.experiencePoints}`, menuX + 20, menuY + 70);

            // Lista upgrade permanenti
            const upgradeTypes = [
                { key: 'bulletSize', name: 'Dimensione Proiettili', icon: '🔸' },
                { key: 'startingDamage', name: 'Danno Iniziale', icon: '⚔️' },
                { key: 'startingMoney', name: 'Soldi Iniziali', icon: '💰' },
                { key: 'startingHealth', name: 'Vita Iniziale', icon: '❤️' },
                { key: 'bulletSpeed', name: 'Velocità Proiettili', icon: '⚡' }
            ];

            for (let i = 0; i < upgradeTypes.length; i++) {
                const upgrade = upgradeTypes[i];
                const yPos = menuY + 100 + i * 60;
                const currentLevel = this.permanentProgress.permanentUpgrades[upgrade.key];
                const cost = this.getPermanentUpgradeCost(upgrade.key);
                const maxLevel = { bulletSize: 10, startingDamage: 15, startingMoney: 12, startingHealth: 8, bulletSpeed: 10 }[upgrade.key];
                const canAfford = this.permanentProgress.experiencePoints >= cost;
                const isMaxLevel = currentLevel >= maxLevel;

                // Sfondo della riga
                this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
                this.ctx.fillRect(menuX + 10, yPos - 20, menuW - 20, 50);

                // Icona e nome
                this.ctx.font = 'bold 18px Arial';
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`${upgrade.icon} ${upgrade.name}`, menuX + 20, yPos);

                // Livello attuale
                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillStyle = '#FFDD88';
                this.ctx.fillText(`Lv.${currentLevel}/${maxLevel}`, menuX + 20, yPos + 20);

                // Costo
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillStyle = isMaxLevel ? '#888888' : (canAfford ? '#00FF00' : '#FF4444');
                this.ctx.textAlign = 'right';
                this.ctx.fillText(isMaxLevel ? 'MAX' : `${cost} XP`, menuX + 340, yPos + 10);

                // Bottone acquista
                if (!isMaxLevel) {
                    const btnColor = canAfford ? '#4CAF50' : '#666666';
                    this.ctx.fillStyle = btnColor;
                    this.ctx.fillRect(menuX + 350, yPos - 20, 120, 40);
                    this.ctx.strokeStyle = '#FFFFFF';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(menuX + 350, yPos - 20, 120, 40);

                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('ACQUISTA', menuX + 410, yPos + 5);
                }
            }

            // Statistiche in fondo
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#AAAAAA';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Partite: ${this.permanentProgress.totalGames} | Nemici: ${this.permanentProgress.totalKills} | Ondate: ${this.permanentProgress.totalWaves}`,
                menuX + menuW / 2, menuY + menuH - 20);

            this.ctx.restore();
        }

        // Developer Panel
        if (this.showDeveloperPanel) {
            this.renderDeveloperPanel();
        }
    }

    renderDeveloperPanel() {
        // Sfondo scuro
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Finestra principale
        const panelW = 600, panelH = 700;
        const panelX = (this.canvas.width - panelW) / 2;
        const panelY = (this.canvas.height - panelH) / 2;

        // Sfondo pannello
        const panelGradient = this.ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        panelGradient.addColorStop(0, 'rgba(45,45,60,0.95)');
        panelGradient.addColorStop(1, 'rgba(25,25,35,0.95)');
        this.ctx.fillStyle = panelGradient;
        this.ctx.fillRect(panelX, panelY, panelW, panelH);

        // Bordo
        this.ctx.strokeStyle = '#FF6600';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Titolo
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#FF6600';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🛠️ DEVELOPER MODE', panelX + panelW / 2, panelY + 35);

        // Bottone chiudi (X)
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = '#FF4444';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✕', panelX + panelW - 20, panelY + 25);

        // Parametri del giocatore
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('PARAMETRI GIOCATORE', panelX + 20, panelY + 65);

        this.renderDeveloperSlider(panelX, panelY + 80, 'Vita', this.developerParams.playerHealth, 1, 1000);
        this.renderDeveloperSlider(panelX, panelY + 110, 'Soldi', this.developerParams.playerMoney, 0, 10000);
        this.renderDeveloperSlider(panelX, panelY + 140, 'Ondata', this.developerParams.currentWave, 1, 100);
        this.renderDeveloperSlider(panelX, panelY + 170, 'Spawn Rate', this.developerParams.enemySpawnRate, 100, 5000);
        this.renderDeveloperSlider(panelX, panelY + 200, 'Nemici/Ondata', this.developerParams.enemiesPerWave, 1, 50);

        // Parametri cannone
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.fillText('PARAMETRI CANNONE', panelX + 20, panelY + 235);

        this.renderDeveloperSlider(panelX, panelY + 250, 'Danno', this.developerParams.cannonDamage, 1, 500);
        this.renderDeveloperSlider(panelX, panelY + 280, 'Fire Rate', this.developerParams.cannonFireRate, 50, 2000);
        this.renderDeveloperSlider(panelX, panelY + 310, 'Portata', this.developerParams.cannonRange, 100, 1000);
        this.renderDeveloperSlider(panelX, panelY + 340, 'Dimensione Proiettili', this.developerParams.bulletSize, 0.5, 5.0);
        this.renderDeveloperSlider(panelX, panelY + 370, 'Velocità Proiettili', this.developerParams.bulletSpeed, 1, 20);
        this.renderDeveloperSlider(panelX, panelY + 400, 'Multi Shot', this.developerParams.multiShot, 1, 10);

        // Parametri XP e nemici
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.fillText('PARAMETRI AVANZATI', panelX + 20, panelY + 435);

        this.renderDeveloperSlider(panelX, panelY + 450, 'XP', this.developerParams.experiencePoints, 0, 10000);
        this.renderDeveloperSlider(panelX, panelY + 500, 'Vita Nemici x', this.developerParams.enemyHealthMultiplier, 0.1, 10.0);
        this.renderDeveloperSlider(panelX, panelY + 530, 'Velocità Nemici x', this.developerParams.enemySpeedMultiplier, 0.1, 5.0);

        // Toggle speciali
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.fillText('MODALITÀ SPECIALI', panelX + 20, panelY + 565);

        const toggleY = panelY + 580;
        this.renderDeveloperToggle(panelX + 20, toggleY, 'God Mode', this.developerParams.godMode);
        this.renderDeveloperToggle(panelX + 140, toggleY, 'Infinite Ammo', this.developerParams.infiniteAmmo);
        this.renderDeveloperToggle(panelX + 280, toggleY, 'One Hit Kill', this.developerParams.oneHitKill);
        this.renderDeveloperToggle(panelX + 400, toggleY, 'No Spawn', this.developerParams.noEnemySpawn);

        // Bottoni di controllo
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(panelX + 20, panelY + panelH - 50, 130, 30);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(panelX + 20, panelY + panelH - 50, 130, 30);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('APPLY CHANGES', panelX + 85, panelY + panelH - 30);

        this.ctx.fillStyle = '#FF6600';
        this.ctx.fillRect(panelX + 170, panelY + panelH - 50, 150, 30);
        this.ctx.strokeRect(panelX + 170, panelY + panelH - 50, 150, 30);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText('RESET TO DEFAULT', panelX + 245, panelY + panelH - 30);

        // Istruzioni
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Premi F1 per chiudere | Clicca sui slider per modificare i valori', panelX + panelW / 2, panelY + panelH - 10);

        this.ctx.restore();
    }

    renderDeveloperSlider(panelX, y, label, value, min, max) {
        // Label
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(label, panelX + 20, y + 15);

        // Valore
        this.ctx.textAlign = 'right';
        this.ctx.fillText(value.toFixed(1), panelX + 340, y + 15);

        // Slider track
        const sliderX = panelX + 350;
        const sliderWidth = 200;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(sliderX, y + 5, sliderWidth, 10);

        // Slider handle
        const percent = (value - min) / (max - min);
        const handleX = sliderX + percent * sliderWidth;
        this.ctx.fillStyle = '#FF6600';
        this.ctx.fillRect(handleX - 5, y, 10, 20);

        // Min/Max labels
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#999999';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(min.toString(), sliderX, y - 5);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(max.toString(), sliderX + sliderWidth, y - 5);
    }

    renderDeveloperToggle(x, y, label, isActive) {
        // Bottone toggle
        this.ctx.fillStyle = isActive ? '#4CAF50' : '#666666';
        this.ctx.fillRect(x, y, 100, 30);
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, 100, 30);

        // Label
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, x + 50, y + 20);
    }

    renderUltimateEffects() {
        if (!this.ultimateEffects.active) return;

        switch (this.ultimateEffects.type) {
            case 0: // Nuclear Storm
                this.renderNuclearStorm();
                break;
            case 1: // Time Freeze
                this.renderTimeFreeze();
                break;
            case 2: // Orbital Strike
                this.renderOrbitalStrike();
                break;
        }
    }

    renderNuclearStorm() {
        // Effetto schermo rosso
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Disegna missili nucleari
        for (let missile of this.ultimateEffects.particles) {
            this.ctx.save();

            // Scia del missile
            if (missile.trail.length > 1) {
                this.ctx.beginPath();
                for (let i = 0; i < missile.trail.length - 1; i++) {
                    const alpha = (1 - i / missile.trail.length) * 0.5;
                    this.ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
                    this.ctx.lineWidth = 8 * alpha;
                    if (i === 0) {
                        this.ctx.moveTo(missile.trail[i].x, missile.trail[i].y);
                    } else {
                        this.ctx.lineTo(missile.trail[i].x, missile.trail[i].y);
                    }
                }
                this.ctx.stroke();
            }

            // Missile
            this.ctx.translate(missile.x, missile.y);
            this.ctx.rotate(missile.rotation);

            const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, missile.size);
            grad.addColorStop(0, '#FFFF00');
            grad.addColorStop(0.5, '#FF4400');
            grad.addColorStop(1, '#880000');

            this.ctx.shadowColor = '#FF4400';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, missile.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    renderTimeFreeze() {
        // Effetto schermo blu
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#0066FF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Disegna laser
        for (let laser of this.ultimateEffects.lasers || []) {
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(0, 200, 255, ${laser.intensity})`;
            this.ctx.lineWidth = 5;
            this.ctx.shadowColor = '#00CCFF';
            this.ctx.shadowBlur = 15;

            this.ctx.beginPath();
            this.ctx.moveTo(laser.startX, laser.startY);
            this.ctx.lineTo(laser.endX, laser.endY);
            this.ctx.stroke();

            // Effetto impatto
            this.ctx.beginPath();
            this.ctx.arc(laser.endX, laser.endY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${laser.intensity})`;
            this.ctx.fill();

            this.ctx.restore();
        }
    }

    renderOrbitalStrike() {
        // Effetto schermo giallo
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Disegna zone di impatto
        for (let strike of this.ultimateEffects.strikes) {
            this.ctx.save();

            if (!strike.charged) {
                // Cerchio di targeting
                const chargePercent = 1 - (strike.chargeTime / 1000);
                this.ctx.strokeStyle = `rgba(255, 170, 0, ${0.8 + chargePercent * 0.2})`;
                this.ctx.lineWidth = 5;
                this.ctx.shadowColor = '#FFAA00';
                this.ctx.shadowBlur = 20;

                this.ctx.beginPath();
                this.ctx.arc(strike.x, strike.y, 50 * chargePercent, 0, Math.PI * 2);
                this.ctx.stroke();

                // Particelle di carica
                for (let particle of strike.particles) {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.life--;

                    if (particle.life > 0) {
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(255, 200, 0, ${particle.life / 30})`;
                        this.ctx.fill();
                    }
                }

                // Rimuovi particelle morte
                strike.particles = strike.particles.filter(p => p.life > 0);
            }

            this.ctx.restore();
        }
    }

    updateUI() {
        // Update upgrade buttons
        const upgradeTypes = ['damage', 'fireRate', 'range', 'explosive', 'heal', 'multiShot'];
        upgradeTypes.forEach(type => {
            let level = this.upgrades[type].level;
            const cost = this.getUpgradeCost(type);
            const canAfford = this.money >= cost;
            // Show max for range upgrade
            if (type === 'range') {
                document.getElementById(`${type}Level`).textContent = `${level} / 9`;
            } else {
                document.getElementById(`${type}Level`).textContent = level;
            }
            document.getElementById(`${type}Cost`).textContent = cost;
            const button = document.getElementById(`upgrade${type.charAt(0).toUpperCase() + type.slice(1)}`);
            button.disabled = !canAfford;
        });
    }


    setupAudio() {
        // Master gain per controllare il volume generale
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.audioContext.destination);
    }

    playShootSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Configura l'oscillatore
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);

        // Configura l'inviluppo del volume
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        // Connetti i nodi
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Avvia e ferma
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playExplosionSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();

        // Rumore bianco per l'esplosione
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        // Configura l'oscillatore
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.3);

        // Configura gli inviluppi
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        noiseGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        // Connetti i nodi
        oscillator.connect(gainNode);
        noise.connect(noiseGain);
        gainNode.connect(this.masterGain);
        noiseGain.connect(this.masterGain);

        // Avvia e ferma
        oscillator.start();
        noise.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
        noise.stop(this.audioContext.currentTime + 0.3);
    }

    playHitSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Configura l'oscillatore
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.05);

        // Configura l'inviluppo del volume
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        // Connetti i nodi
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Avvia e ferma
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }

    playNuclearStormSound() {
        // Suono epico per Nuclear Storm - rumble profondo + esplosioni
        const duration = 2.5;

        // Bass rumble profondo
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(30, this.audioContext.currentTime);
        bassOsc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + duration);
        bassGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Modulazione tremolo per effetto drammatico
        const tremolo = this.audioContext.createOscillator();
        const tremoloGain = this.audioContext.createGain();
        tremolo.type = 'sine';
        tremolo.frequency.setValueAtTime(8, this.audioContext.currentTime);
        tremoloGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        tremolo.connect(tremoloGain);
        tremoloGain.connect(bassGain.gain);

        // Oscillatore per esplosioni multiple
        const explosionOsc = this.audioContext.createOscillator();
        const explosionGain = this.audioContext.createGain();
        explosionOsc.type = 'square';
        explosionOsc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        explosionOsc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.3);
        explosionGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        explosionGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

        // Connetti tutto
        bassOsc.connect(bassGain);
        explosionOsc.connect(explosionGain);
        bassGain.connect(this.masterGain);
        explosionGain.connect(this.masterGain);

        // Avvia
        tremolo.start();
        bassOsc.start();
        explosionOsc.start();

        // Ferma
        tremolo.stop(this.audioContext.currentTime + duration);
        bassOsc.stop(this.audioContext.currentTime + duration);
        explosionOsc.stop(this.audioContext.currentTime + 0.8);
    }

    playTimeFreezeSound() {
        // Suono glaciale per Time Freeze - toni cristallini + eco
        const duration = 2.0;

        // Oscillatore principale cristallino
        const mainOsc = this.audioContext.createOscillator();
        const mainGain = this.audioContext.createGain();
        mainOsc.type = 'sine';
        mainOsc.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        mainOsc.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.5);
        mainOsc.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + duration);
        mainGain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        mainGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Modulazione di frequenza per effetto "freeze"
        const fmOsc = this.audioContext.createOscillator();
        const fmGain = this.audioContext.createGain();
        fmOsc.type = 'sine';
        fmOsc.frequency.setValueAtTime(5, this.audioContext.currentTime);
        fmGain.gain.setValueAtTime(200, this.audioContext.currentTime);
        fmGain.gain.exponentialRampToValueAtTime(50, this.audioContext.currentTime + duration);
        fmOsc.connect(fmGain);
        fmGain.connect(mainOsc.frequency);

        // Armoniche cristalline
        const harmonic1 = this.audioContext.createOscillator();
        const harmonic1Gain = this.audioContext.createGain();
        harmonic1.type = 'triangle';
        harmonic1.frequency.setValueAtTime(1500, this.audioContext.currentTime);
        harmonic1.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + duration);
        harmonic1Gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        harmonic1Gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        const harmonic2 = this.audioContext.createOscillator();
        const harmonic2Gain = this.audioContext.createGain();
        harmonic2.type = 'triangle';
        harmonic2.frequency.setValueAtTime(2500, this.audioContext.currentTime);
        harmonic2.frequency.exponentialRampToValueAtTime(5000, this.audioContext.currentTime + duration);
        harmonic2Gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        harmonic2Gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti tutto
        mainOsc.connect(mainGain);
        harmonic1.connect(harmonic1Gain);
        harmonic2.connect(harmonic2Gain);
        mainGain.connect(this.masterGain);
        harmonic1Gain.connect(this.masterGain);
        harmonic2Gain.connect(this.masterGain);

        // Avvia
        fmOsc.start();
        mainOsc.start();
        harmonic1.start();
        harmonic2.start();

        // Ferma
        fmOsc.stop(this.audioContext.currentTime + duration);
        mainOsc.stop(this.audioContext.currentTime + duration);
        harmonic1.stop(this.audioContext.currentTime + duration);
        harmonic2.stop(this.audioContext.currentTime + duration);
    }

    playOrbitalStrikeSound() {
        // Suono devastante per Orbital Strike - carica + impatto massiccio
        const chargeDuration = 1.0;
        const impactDuration = 1.5;

        // Fase di carica - crescendo drammatico
        const chargeOsc = this.audioContext.createOscillator();
        const chargeGain = this.audioContext.createGain();
        chargeOsc.type = 'sawtooth';
        chargeOsc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        chargeOsc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + chargeDuration);
        chargeGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        chargeGain.gain.exponentialRampToValueAtTime(0.4, this.audioContext.currentTime + chargeDuration);

        // Modulazione durante la carica
        const chargeMod = this.audioContext.createOscillator();
        const chargeModGain = this.audioContext.createGain();
        chargeMod.type = 'sine';
        chargeMod.frequency.setValueAtTime(20, this.audioContext.currentTime);
        chargeMod.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + chargeDuration);
        chargeModGain.gain.setValueAtTime(100, this.audioContext.currentTime);
        chargeMod.connect(chargeModGain);
        chargeModGain.connect(chargeOsc.frequency);

        // Impatto devastante
        const impactOsc = this.audioContext.createOscillator();
        const impactGain = this.audioContext.createGain();
        impactOsc.type = 'square';
        impactOsc.frequency.setValueAtTime(100, this.audioContext.currentTime + chargeDuration);
        impactOsc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + chargeDuration + impactDuration);
        impactGain.gain.setValueAtTime(0.5, this.audioContext.currentTime + chargeDuration);
        impactGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + chargeDuration + impactDuration);

        // Rumore per l'impatto
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noise.buffer = noiseBuffer;
        noiseGain.gain.setValueAtTime(0.3, this.audioContext.currentTime + chargeDuration);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + chargeDuration + 0.5);

        // Connetti tutto
        chargeOsc.connect(chargeGain);
        impactOsc.connect(impactGain);
        noise.connect(noiseGain);
        chargeGain.connect(this.masterGain);
        impactGain.connect(this.masterGain);
        noiseGain.connect(this.masterGain);

        // Avvia
        chargeMod.start();
        chargeOsc.start();
        impactOsc.start(this.audioContext.currentTime + chargeDuration);
        noise.start(this.audioContext.currentTime + chargeDuration);

        // Ferma
        chargeMod.stop(this.audioContext.currentTime + chargeDuration);
        chargeOsc.stop(this.audioContext.currentTime + chargeDuration);
        impactOsc.stop(this.audioContext.currentTime + chargeDuration + impactDuration);
        noise.stop(this.audioContext.currentTime + chargeDuration + 0.5);
    }

    playUltimateKillSound(ultimateType) {
        // Suoni specifici per eliminazioni delle ultimate
        switch (ultimateType) {
            case 0: // Nuclear Storm - esplosione devastante
                this.playNuclearKillSound();
                break;
            case 1: // Time Freeze - suono cristallino di disintegrazione
                this.playFreezeKillSound();
                break;
            case 2: // Orbital Strike - impatto energetico
                this.playStrikeKillSound();
                break;
        }
    }

    playNuclearKillSound() {
        // Suono di esplosione nucleare per eliminazione
        const duration = 0.5;

        // Esplosione base con frequenze basse
        const explosionOsc = this.audioContext.createOscillator();
        const explosionGain = this.audioContext.createGain();
        explosionOsc.type = 'sawtooth';
        explosionOsc.frequency.setValueAtTime(80, this.audioContext.currentTime);
        explosionOsc.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + duration);
        explosionGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        explosionGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Rumore di radiazioni
        const bufferSize = this.audioContext.sampleRate * duration;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        noise.buffer = noiseBuffer;
        noiseGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti
        explosionOsc.connect(explosionGain);
        noise.connect(noiseGain);
        explosionGain.connect(this.masterGain);
        noiseGain.connect(this.masterGain);

        // Avvia
        explosionOsc.start();
        noise.start();
        explosionOsc.stop(this.audioContext.currentTime + duration);
        noise.stop(this.audioContext.currentTime + duration);
    }

    playFreezeKillSound() {
        // Suono cristallino di disintegrazione per Time Freeze
        const duration = 0.4;

        // Tono cristallino acuto che scende
        const crystalOsc = this.audioContext.createOscillator();
        const crystalGain = this.audioContext.createGain();
        crystalOsc.type = 'sine';
        crystalOsc.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        crystalOsc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
        crystalGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        crystalGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Armonica cristallina
        const harmonic = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        harmonic.type = 'triangle';
        harmonic.frequency.setValueAtTime(3000, this.audioContext.currentTime);
        harmonic.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + duration);
        harmonicGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        harmonicGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Effetto "crack" del ghiaccio
        const crackOsc = this.audioContext.createOscillator();
        const crackGain = this.audioContext.createGain();
        crackOsc.type = 'square';
        crackOsc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        crackOsc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
        crackGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        crackGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        // Connetti
        crystalOsc.connect(crystalGain);
        harmonic.connect(harmonicGain);
        crackOsc.connect(crackGain);
        crystalGain.connect(this.masterGain);
        harmonicGain.connect(this.masterGain);
        crackGain.connect(this.masterGain);

        // Avvia
        crystalOsc.start();
        harmonic.start();
        crackOsc.start();
        crystalOsc.stop(this.audioContext.currentTime + duration);
        harmonic.stop(this.audioContext.currentTime + duration);
        crackOsc.stop(this.audioContext.currentTime + 0.1);
    }

    playStrikeKillSound() {
        // Suono di impatto energetico per Orbital Strike
        const duration = 0.6;

        // Impatto iniziale potente
        const impactOsc = this.audioContext.createOscillator();
        const impactGain = this.audioContext.createGain();
        impactOsc.type = 'square';
        impactOsc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        impactOsc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
        impactGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        impactGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        // Energia dispersa
        const energyOsc = this.audioContext.createOscillator();
        const energyGain = this.audioContext.createGain();
        energyOsc.type = 'sawtooth';
        energyOsc.frequency.setValueAtTime(300, this.audioContext.currentTime + 0.1);
        energyOsc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
        energyGain.gain.setValueAtTime(0.3, this.audioContext.currentTime + 0.1);
        energyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Modulazione per effetto "zap"
        const modOsc = this.audioContext.createOscillator();
        const modGain = this.audioContext.createGain();
        modOsc.type = 'sine';
        modOsc.frequency.setValueAtTime(30, this.audioContext.currentTime);
        modGain.gain.setValueAtTime(50, this.audioContext.currentTime);
        modOsc.connect(modGain);
        modGain.connect(energyOsc.frequency);

        // Connetti
        impactOsc.connect(impactGain);
        energyOsc.connect(energyGain);
        impactGain.connect(this.masterGain);
        energyGain.connect(this.masterGain);

        // Avvia
        modOsc.start();
        impactOsc.start();
        energyOsc.start(this.audioContext.currentTime + 0.1);
        modOsc.stop(this.audioContext.currentTime + duration);
        impactOsc.stop(this.audioContext.currentTime + 0.3);
        energyOsc.stop(this.audioContext.currentTime + duration);
    }

    playUpgradeSound(upgradeType) {
        // Suoni specifici per ogni tipo di upgrade
        switch (upgradeType) {
            case 'damage':
                this.playDamageUpgradeSound();
                break;
            case 'fireRate':
                this.playFireRateUpgradeSound();
                break;
            case 'range':
                this.playRangeUpgradeSound();
                break;
            case 'explosive':
                this.playExplosiveUpgradeSound();
                break;
            case 'heal':
                this.playHealUpgradeSound();
                break;
            case 'multiShot':
                this.playMultiShotUpgradeSound();
                break;
            default:
                this.playGenericUpgradeSound();
        }
    }

    playDamageUpgradeSound() {
        // Suono potente e aggressivo per il danno
        const duration = 0.6;

        // Oscillatore principale con crescendo
        const mainOsc = this.audioContext.createOscillator();
        const mainGain = this.audioContext.createGain();
        mainOsc.type = 'sawtooth';
        mainOsc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        mainOsc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.2);
        mainOsc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + duration);
        mainGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        mainGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Armonica potente
        const harmonic = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        harmonic.type = 'square';
        harmonic.frequency.setValueAtTime(300, this.audioContext.currentTime);
        harmonic.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.2);
        harmonic.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + duration);
        harmonicGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        harmonicGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti
        mainOsc.connect(mainGain);
        harmonic.connect(harmonicGain);
        mainGain.connect(this.masterGain);
        harmonicGain.connect(this.masterGain);

        // Avvia
        mainOsc.start();
        harmonic.start();
        mainOsc.stop(this.audioContext.currentTime + duration);
        harmonic.stop(this.audioContext.currentTime + duration);
    }

    playFireRateUpgradeSound() {
        // Suono veloce e ritmico per la cadenza di fuoco
        const duration = 0.5;

        // Sequenza di impulsi veloci
        for (let i = 0; i < 4; i++) {
            const delay = i * 0.08;
            const impulseOsc = this.audioContext.createOscillator();
            const impulseGain = this.audioContext.createGain();

            impulseOsc.type = 'triangle';
            impulseOsc.frequency.setValueAtTime(800 + i * 100, this.audioContext.currentTime + delay);
            impulseOsc.frequency.exponentialRampToValueAtTime(1200 + i * 100, this.audioContext.currentTime + delay + 0.05);
            impulseGain.gain.setValueAtTime(0.2, this.audioContext.currentTime + delay);
            impulseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.08);

            impulseOsc.connect(impulseGain);
            impulseGain.connect(this.masterGain);

            impulseOsc.start(this.audioContext.currentTime + delay);
            impulseOsc.stop(this.audioContext.currentTime + delay + 0.08);
        }
    }

    playRangeUpgradeSound() {
        // Suono espansivo per il raggio
        const duration = 0.7;

        // Sweep crescente per simulare espansione
        const sweepOsc = this.audioContext.createOscillator();
        const sweepGain = this.audioContext.createGain();
        sweepOsc.type = 'sine';
        sweepOsc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        sweepOsc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration);
        sweepGain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Riverbero con delay
        const delayOsc = this.audioContext.createOscillator();
        const delayGain = this.audioContext.createGain();
        delayOsc.type = 'sine';
        delayOsc.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.1);
        delayOsc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + duration);
        delayGain.gain.setValueAtTime(0.15, this.audioContext.currentTime + 0.1);
        delayGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti
        sweepOsc.connect(sweepGain);
        delayOsc.connect(delayGain);
        sweepGain.connect(this.masterGain);
        delayGain.connect(this.masterGain);

        // Avvia
        sweepOsc.start();
        delayOsc.start(this.audioContext.currentTime + 0.1);
        sweepOsc.stop(this.audioContext.currentTime + duration);
        delayOsc.stop(this.audioContext.currentTime + duration);
    }

    playExplosiveUpgradeSound() {
        // Suono esplosivo e drammatico
        const duration = 0.8;

        // Base esplosiva
        const explosiveOsc = this.audioContext.createOscillator();
        const explosiveGain = this.audioContext.createGain();
        explosiveOsc.type = 'sawtooth';
        explosiveOsc.frequency.setValueAtTime(80, this.audioContext.currentTime);
        explosiveOsc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.3);
        explosiveGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        explosiveGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Scintille acute
        const sparkleOsc = this.audioContext.createOscillator();
        const sparkleGain = this.audioContext.createGain();
        sparkleOsc.type = 'square';
        sparkleOsc.frequency.setValueAtTime(1500, this.audioContext.currentTime + 0.1);
        sparkleOsc.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + 0.3);
        sparkleOsc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + duration);
        sparkleGain.gain.setValueAtTime(0.2, this.audioContext.currentTime + 0.1);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti
        explosiveOsc.connect(explosiveGain);
        sparkleOsc.connect(sparkleGain);
        explosiveGain.connect(this.masterGain);
        sparkleGain.connect(this.masterGain);

        // Avvia
        explosiveOsc.start();
        sparkleOsc.start(this.audioContext.currentTime + 0.1);
        explosiveOsc.stop(this.audioContext.currentTime + duration);
        sparkleOsc.stop(this.audioContext.currentTime + duration);
    }

    playHealUpgradeSound() {
        // Suono curativo e rilassante
        const duration = 0.6;

        // Tono dolce ascendente
        const healOsc = this.audioContext.createOscillator();
        const healGain = this.audioContext.createGain();
        healOsc.type = 'sine';
        healOsc.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
        healOsc.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.2); // E5
        healOsc.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.4); // G5
        healGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        healGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Armonia dolce
        const harmonyOsc = this.audioContext.createOscillator();
        const harmonyGain = this.audioContext.createGain();
        harmonyOsc.type = 'triangle';
        harmonyOsc.frequency.setValueAtTime(392, this.audioContext.currentTime); // G4
        harmonyOsc.frequency.setValueAtTime(523, this.audioContext.currentTime + 0.2); // C5
        harmonyOsc.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.4); // E5
        harmonyGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        harmonyGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        // Connetti
        healOsc.connect(healGain);
        harmonyOsc.connect(harmonyGain);
        healGain.connect(this.masterGain);
        harmonyGain.connect(this.masterGain);

        // Avvia
        healOsc.start();
        harmonyOsc.start();
        healOsc.stop(this.audioContext.currentTime + duration);
        harmonyOsc.stop(this.audioContext.currentTime + duration);
    }

    playMultiShotUpgradeSound() {
        // Suono duplicato/moltiplicato
        const duration = 0.5;

        // Tre oscillatori in sequenza rapida per simulare multishot
        const frequencies = [600, 750, 900];
        frequencies.forEach((freq, index) => {
            const delay = index * 0.08;
            const shotOsc = this.audioContext.createOscillator();
            const shotGain = this.audioContext.createGain();

            shotOsc.type = 'triangle';
            shotOsc.frequency.setValueAtTime(freq, this.audioContext.currentTime + delay);
            shotOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioContext.currentTime + delay + 0.1);
            shotGain.gain.setValueAtTime(0.2, this.audioContext.currentTime + delay);
            shotGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.15);

            shotOsc.connect(shotGain);
            shotGain.connect(this.masterGain);

            shotOsc.start(this.audioContext.currentTime + delay);
            shotOsc.stop(this.audioContext.currentTime + delay + 0.15);
        });
    }

    playGenericUpgradeSound() {
        // Suono generico di upgrade positivo
        const duration = 0.4;

        const genericOsc = this.audioContext.createOscillator();
        const genericGain = this.audioContext.createGain();
        genericOsc.type = 'triangle';
        genericOsc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        genericOsc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + duration);
        genericGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        genericGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        genericOsc.connect(genericGain);
        genericGain.connect(this.masterGain);

        genericOsc.start();
        genericOsc.stop(this.audioContext.currentTime + duration);
    }

    playWaveCompleteSound() {
        // Suono di ricompensa per completamento ondata
        const duration = 1.2;

        // Melodia di vittoria ascendente
        const notes = [
            { freq: 523, time: 0.0 },  // C5
            { freq: 659, time: 0.2 },  // E5
            { freq: 784, time: 0.4 },  // G5
            { freq: 1047, time: 0.6 }  // C6
        ];

        notes.forEach((note, index) => {
            const noteOsc = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();

            noteOsc.type = 'triangle';
            noteOsc.frequency.setValueAtTime(note.freq, this.audioContext.currentTime + note.time);
            noteGain.gain.setValueAtTime(0.25, this.audioContext.currentTime + note.time);
            noteGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.time + 0.3);

            noteOsc.connect(noteGain);
            noteGain.connect(this.masterGain);

            noteOsc.start(this.audioContext.currentTime + note.time);
            noteOsc.stop(this.audioContext.currentTime + note.time + 0.3);
        });

        // Accordo finale trionfante
        const chordFreqs = [523, 659, 784]; // C maggiore
        chordFreqs.forEach((freq, index) => {
            const chordOsc = this.audioContext.createOscillator();
            const chordGain = this.audioContext.createGain();

            chordOsc.type = 'sine';
            chordOsc.frequency.setValueAtTime(freq, this.audioContext.currentTime + 0.8);
            chordGain.gain.setValueAtTime(0.15, this.audioContext.currentTime + 0.8);
            chordGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            chordOsc.connect(chordGain);
            chordGain.connect(this.masterGain);

            chordOsc.start(this.audioContext.currentTime + 0.8);
            chordOsc.stop(this.audioContext.currentTime + duration);
        });

        // Campane di celebrazione
        for (let i = 0; i < 3; i++) {
            const delay = 0.9 + i * 0.1;
            const bellOsc = this.audioContext.createOscillator();
            const bellGain = this.audioContext.createGain();

            bellOsc.type = 'sine';
            bellOsc.frequency.setValueAtTime(1047 + i * 200, this.audioContext.currentTime + delay);
            bellOsc.frequency.exponentialRampToValueAtTime(523 + i * 100, this.audioContext.currentTime + delay + 0.2);
            bellGain.gain.setValueAtTime(0.2, this.audioContext.currentTime + delay);
            bellGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + delay + 0.3);

            bellOsc.connect(bellGain);
            bellGain.connect(this.masterGain);

            bellOsc.start(this.audioContext.currentTime + delay);
            bellOsc.stop(this.audioContext.currentTime + delay + 0.3);
        }
    }

    resetGame() {
        // Reset core game stats con bonus permanenti
        this.money = 100 + (this.permanentProgress.permanentUpgrades.startingMoney * 50);
        this.kills = 0;
        this.waveKills = 0; // Reset contatore nemici ondata
        this.wave = 1;
        this.health = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);
        this.maxHealth = 200 + (this.permanentProgress.permanentUpgrades.startingHealth * 25);

        // Reset all game entities
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.particles = [];
        this.floatingTexts = [];

        // Reset wave management per difficoltà aggressiva
        this.enemiesSpawned = 0;
        this.enemiesPerWave = 8;
        this.spawnDelay = 1500;
        this.spawnTimer = Date.now(); // Reset timer to prevent immediate spawn after restart

        // Reset game state flags
        this.showGameOver = null;
        this.showWaveReward = null;
        this.showProgressMenu = false;

        // Reset cannon e relative stats con bonus permanenti
        this.cannon.damage = 20 + (this.permanentProgress.permanentUpgrades.startingDamage * 5);
        this.cannon.fireRate = 500;
        this.cannon.range = 300;
        this.cannon.explosiveLevel = 0;
        this.cannon.multiShot = 1;
        this.cannon.bulletSize = 1 + (this.permanentProgress.permanentUpgrades.bulletSize * 0.3);
        this.cannon.bulletSpeed = 8 + (this.permanentProgress.permanentUpgrades.bulletSpeed * 1);

        // Reset upgrades
        this.upgrades = {
            damage: { level: 1, baseCost: 50 },
            fireRate: { level: 1, baseCost: 75 },
            range: { level: 1, baseCost: 100 },
            explosive: { level: 0, baseCost: 200 },
            heal: { level: 0, baseCost: 1 },
            multiShot: { level: 1, baseCost: 100 }
        };

        // Reset ultimate abilities
        if (this.ultimates) {
            for (let ultimate of this.ultimates.types) {
                ultimate.cooldown = 0;
                ultimate.lastUsed = 0;
            }
        }

        // Reset ultimate effects
        this.ultimateEffects = {
            active: false,
            type: null,
            duration: 0,
            maxDuration: 0,
            particles: [],
            freezeTime: false
        };

        // Reset shield
        this.shield.active = false;
        this.shield.power = 0;
        this.shield.cooldown = 0;
        this.shield.lastUsed = 0;
        this.shield.duration = 0;
        this.shield.particles = [];

        // Update UI with new stats
        this.updateUI();
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});