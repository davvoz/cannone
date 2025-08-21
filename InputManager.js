class InputManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.mousePosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragTarget = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse tracking
        this.gameEngine.canvas.addEventListener('mousemove', (e) => {
            const rect = this.gameEngine.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
            this.gameEngine.mousePosition = this.mousePosition;
            
            // Handle dragging
            if (this.isDragging && this.dragTarget) {
                this.handleSliderDrag(this.mousePosition.x, this.mousePosition.y);
            }
        });

        // Mouse click handling
        this.gameEngine.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });

        // Mouse drag handling for sliders
        this.gameEngine.canvas.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });
        
        this.gameEngine.canvas.addEventListener('mouseup', (e) => {
            this.isDragging = false;
            this.dragTarget = null;
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Upgrade button event listeners
        this.setupUpgradeButtons();
    }

    setupUpgradeButtons() {
        const upgradeTypes = ['damage', 'fireRate', 'range', 'explosive', 'heal', 'multiShot'];
        
        upgradeTypes.forEach(type => {
            const button = document.getElementById(`upgrade${type.charAt(0).toUpperCase() + type.slice(1)}`);
            if (button) {
                button.addEventListener('click', () => {
                    this.gameEngine.upgradeSystem.buyUpgrade(type);
                });
            }
        });

        // Music button
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.gameEngine.toggleMusic();
            });
        }
    }

    handleClick(e) {
        const rect = this.gameEngine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Handle progress menu clicks
        if (this.gameEngine.showProgressMenu) {
            this.gameEngine.handleProgressMenuClick(x, y);
            return;
        }

        // Handle developer panel clicks
        if (this.gameEngine.showDeveloperPanel) {
            this.gameEngine.handleDeveloperPanelClick(x, y);
            return;
        }
    }

    handleMouseDown(e) {
        const rect = this.gameEngine.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on a developer panel slider
        if (this.gameEngine.showDeveloperPanel) {
            const panelX = this.gameEngine.canvas.width - 320;
            const panelY = 10;
            
            const sliders = [
                { y: panelY + 50, param: 'enemySpeed', min: 0.5, max: 5 },
                { y: panelY + 90, param: 'spawnRate', min: 0.5, max: 3 },
                { y: panelY + 130, param: 'enemyHealthMultiplier', min: 0.1, max: 3 },
                { y: panelY + 170, param: 'playerDamageMultiplier', min: 0.5, max: 5 },
                { y: panelY + 210, param: 'moneyMultiplier', min: 0.5, max: 5 }
            ];

            for (let slider of sliders) {
                const sliderX = panelX + 80;
                const sliderW = 200;
                const sliderH = 10;
                
                if (x >= sliderX && x <= sliderX + sliderW && 
                    y >= slider.y - 5 && y <= slider.y + 5) {
                    this.isDragging = true;
                    this.dragTarget = slider;
                    this.handleSliderDrag(x, y);
                    e.preventDefault();
                    return;
                }
            }
        }
    }

    handleSliderDrag(mx, my) {
        if (!this.dragTarget) return;
        
        const panelX = this.gameEngine.canvas.width - 320;
        const sliderX = panelX + 80;
        const sliderW = 200;
        
        // Calculate new value based on mouse position
        const clickRatio = Math.max(0, Math.min(1, (mx - sliderX) / sliderW));
        const newValue = this.dragTarget.min + (clickRatio * (this.dragTarget.max - this.dragTarget.min));
        this.gameEngine.devParams[this.dragTarget.param] = newValue;
    }

    handleKeyDown(e) {
        // Ultimate abilities
        if (e.code === 'Digit1') {
            e.preventDefault();
            this.gameEngine.ultimateSystem.triggerUltimate(0); // Nuclear Storm
        }
        if (e.code === 'Digit2') {
            e.preventDefault();
            this.gameEngine.ultimateSystem.triggerUltimate(1); // Time Freeze
        }
        if (e.code === 'Digit3') {
            e.preventDefault();
            this.gameEngine.ultimateSystem.triggerUltimate(2); // Orbital Strike
        }

        // Shield control
        if (e.code === 'KeyE') {
            e.preventDefault();
            this.gameEngine.shieldSystem.activateShield();
        }

        // Toggle progress menu
        if (e.code === 'KeyP') {
            e.preventDefault();
            this.gameEngine.showProgressMenu = !this.gameEngine.showProgressMenu;
        }

        // Toggle developer panel
        if (e.code === 'F1') {
            e.preventDefault();
            this.gameEngine.developerMode = !this.gameEngine.developerMode;
            this.gameEngine.showDeveloperPanel = this.gameEngine.developerMode;
            if (this.gameEngine.developerMode) {
                this.gameEngine.updateDeveloperParams();
            }
        }
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
}