class InputManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.mousePosition = { x: 0, y: 0 };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse tracking
        this.gameEngine.canvas.addEventListener('mousemove', (e) => {
            const rect = this.gameEngine.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
            this.gameEngine.mousePosition = this.mousePosition;
        });

        // Mouse click handling
        this.gameEngine.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
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