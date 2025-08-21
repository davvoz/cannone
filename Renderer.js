class Renderer {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.ctx = gameEngine.ctx;
        this.canvas = gameEngine.canvas;
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render background
        this.renderBackground();
        
        // Render game objects in order
        this.gameEngine.effectsSystem.render(this.ctx);
        this.gameEngine.enemySystem.render(this.ctx);
        this.gameEngine.weaponSystem.render(this.ctx);
        this.gameEngine.shieldSystem.render(this.ctx);
        this.gameEngine.ultimateSystem.render(this.ctx);
        
        // Render UI elements
        this.renderGameUI();
        
        // Render overlays
        this.renderOverlays();
    }

    renderBackground() {
        // Gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0f3460');
        gradient.addColorStop(1, '#16537e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderGameUI() {
        this.ctx.save();
        
        // Game stats
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`💰 ${this.gameEngine.money}`, 30, 30);
        this.ctx.fillText(`❤️ ${this.gameEngine.health}/${this.gameEngine.maxHealth}`, 30, 60);
        this.ctx.fillText(`🌊 Wave ${this.gameEngine.wave}`, 30, 90);
        this.ctx.fillText(`💀 ${this.gameEngine.kills} kills`, 200, 30);
        
        // Shield UI
        this.gameEngine.shieldSystem.renderShieldUI(this.ctx);
        
        // Ultimate UI
        this.gameEngine.ultimateSystem.renderUltimateUI(this.ctx);

        // Developer mode indicators
        if (this.gameEngine.developerMode) {
            this.renderDeveloperModeUI();
        }

        this.ctx.restore();
    }

    renderDeveloperModeUI() {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#FFAA00';
        this.ctx.fillText(`Dev Mode Aktiv`, 30, 150);
        this.ctx.fillText(`God Mode: ${this.gameEngine.devParams.godMode ? 'ON' : 'OFF'}`, 30, 165);
        this.ctx.fillText(`F1 per pannello controlli`, 30, 180);
    }

    renderOverlays() {
        // Progress menu
        this.gameEngine.uiManager.renderProgressMenu(this.ctx);
        
        // Developer panel
        this.gameEngine.uiManager.renderDeveloperPanel(this.ctx);
        
        // Intro popup
        this.renderIntroPopup();
        
        // Game over screen
        if (this.gameEngine.gameOver) {
            this.renderGameOverScreen();
        }
    }

    renderIntroPopup() {
        if (this.gameEngine.showIntroPopup.timer <= 0) return;

        this.gameEngine.showIntroPopup.timer--;
        const alpha = Math.min(1, this.gameEngine.showIntroPopup.timer / 120);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const popupX = this.canvas.width / 2 - 200;
        const popupY = 100;
        const popupW = 400;
        const popupH = 200;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(popupX, popupY, popupW, popupH);
        this.ctx.strokeStyle = '#4CAF50';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(popupX, popupY, popupW, popupH);

        // Title
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Space Defense Cannon', popupX + popupW / 2, popupY + 40);

        // Instructions
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Difendi la base dai nemici!', popupX + popupW / 2, popupY + 80);
        this.ctx.fillText('E = Scudo | 1,2,3 = Ultimate | P = Progressi', popupX + popupW / 2, popupY + 110);
        this.ctx.fillText('F1 = Developer Mode', popupX + popupW / 2, popupY + 140);

        this.ctx.restore();
    }

    renderGameOverScreen() {
        this.ctx.save();
        
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Game Over text
        this.ctx.fillStyle = '#FF4444';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        // Stats
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Wave raggiunta: ${this.gameEngine.wave}`, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText(`Nemici uccisi: ${this.gameEngine.kills}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.fillText(`XP guadagnati: ${Math.floor(this.gameEngine.kills * 2 + this.gameEngine.wave * 10)}`, this.canvas.width / 2, this.canvas.height / 2 + 60);

        // Restart instruction
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Clicca per ricominciare', this.canvas.width / 2, this.canvas.height / 2 + 120);

        this.ctx.restore();
    }

    renderHealthBar() {
        const barWidth = 200;
        const barHeight = 20;
        const barX = 30;
        const barY = 70;
        
        // Background
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health fill
        const healthPercent = this.gameEngine.health / this.gameEngine.maxHealth;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : 
                           healthPercent > 0.25 ? '#FF9800' : '#FF4444';
        this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}