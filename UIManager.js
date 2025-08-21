class UIManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    updateUI() {
        // Update upgrade buttons
        const upgradeTypes = ['damage', 'fireRate', 'range', 'explosive', 'heal', 'multiShot'];
        upgradeTypes.forEach(type => {
            let level = this.gameEngine.upgradeSystem.upgrades[type].level;
            const cost = this.gameEngine.upgradeSystem.getUpgradeCost(type);
            const canAfford = this.gameEngine.money >= cost;
            
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

    updateProgressUI() {
        // Implemented in the render function
    }

    renderProgressMenu(ctx) {
        if (!this.gameEngine.showProgressMenu) return;

        const menuX = this.gameEngine.canvas.width / 2 - 250;
        const menuY = 50;
        const menuW = 500;
        const menuH = 450;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(menuX, menuY, menuW, menuH);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.strokeRect(menuX, menuY, menuW, menuH);

        // Title
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Progressi Permanenti', menuX + menuW / 2, menuY + 40);

        // Stats
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`XP: ${this.gameEngine.permanentProgress.experiencePoints}`, menuX + 20, menuY + 80);
        ctx.fillText(`Uccisioni Totali: ${this.gameEngine.permanentProgress.totalKills}`, menuX + 260, menuY + 80);

        // Upgrades
        const upgradeTypes = ['bulletSize', 'startingDamage', 'startingMoney', 'startingHealth', 'bulletSpeed'];
        const upgradeNames = ['Dimensione Proiettili', 'Danno Iniziale', 'Soldi Iniziali', 'Vita Iniziale', 'Velocità Proiettili'];
        const upgradeCosts = [100, 150, 200, 300, 250];

        for (let i = 0; i < upgradeTypes.length; i++) {
            const type = upgradeTypes[i];
            const level = this.gameEngine.permanentProgress.permanentUpgrades[type];
            const cost = upgradeCosts[i] * (level + 1);
            const yPos = menuY + 100 + i * 60;

            // Upgrade box
            ctx.fillStyle = 'rgba(68, 68, 68, 0.8)';
            ctx.fillRect(menuX + 20, yPos - 30, menuW - 40, 50);

            // Upgrade text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px Arial';
            ctx.fillText(`${upgradeNames[i]} (Lv.${level})`, menuX + 30, yPos - 5);

            // Cost and button
            ctx.fillText(`Costo: ${cost} XP`, menuX + 30, yPos + 15);

            const canAfford = this.gameEngine.permanentProgress.experiencePoints >= cost;
            ctx.fillStyle = canAfford ? '#4CAF50' : '#666666';
            ctx.fillRect(menuX + 350, yPos - 20, 120, 40);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(canAfford ? 'ACQUISTA' : 'NON DISPONIBILE', menuX + 410, yPos + 5);
        }

        // Instructions
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Premi P per chiudere', menuX + menuW / 2, menuY + menuH - 20);

        ctx.restore();
    }

    renderDeveloperPanel(ctx) {
        if (!this.gameEngine.showDeveloperPanel) return;

        const panelX = this.gameEngine.canvas.width - 320;
        const panelY = 10;
        const panelW = 300;
        const panelH = 400;

        ctx.save();

        // Panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#FF6600';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Title
        ctx.fillStyle = '#FF6600';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Developer Panel', panelX + panelW / 2, panelY + 25);

        // Sliders and values
        let yOffset = 50;
        this.renderDeveloperSlider(ctx, panelX, panelY + yOffset, 'Enemy Speed', this.gameEngine.devParams.enemySpeed, 0.5, 5);
        yOffset += 40;
        this.renderDeveloperSlider(ctx, panelX, panelY + yOffset, 'Spawn Rate', this.gameEngine.devParams.spawnRate, 0.5, 3);
        yOffset += 40;
        this.renderDeveloperSlider(ctx, panelX, panelY + yOffset, 'Enemy Health', this.gameEngine.devParams.enemyHealthMultiplier, 0.1, 3);
        yOffset += 40;
        this.renderDeveloperSlider(ctx, panelX, panelY + yOffset, 'Player Damage', this.gameEngine.devParams.playerDamageMultiplier, 0.5, 5);
        yOffset += 40;
        this.renderDeveloperSlider(ctx, panelX, panelY + yOffset, 'Money Multiplier', this.gameEngine.devParams.moneyMultiplier, 0.5, 5);

        // Toggles
        yOffset += 60;
        this.renderDeveloperToggle(ctx, panelX + 20, panelY + yOffset, 'God Mode', this.gameEngine.devParams.godMode);
        yOffset += 30;
        this.renderDeveloperToggle(ctx, panelX + 20, panelY + yOffset, 'Infinite Money', this.gameEngine.devParams.infiniteMoney);
        yOffset += 30;
        this.renderDeveloperToggle(ctx, panelX + 20, panelY + yOffset, 'No Cooldowns', this.gameEngine.devParams.noCooldowns);

        // Instructions
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Premi F1 per chiudere | Clicca sui slider per modificare i valori', panelX + panelW / 2, panelY + panelH - 10);

        ctx.restore();
    }

    renderDeveloperSlider(ctx, panelX, y, label, value, min, max) {
        const sliderW = 200;
        const sliderH = 10;
        const sliderX = panelX + 80;

        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, panelX + 10, y + 5);

        // Slider background
        ctx.fillStyle = '#444444';
        ctx.fillRect(sliderX, y - 5, sliderW, sliderH);

        // Slider fill
        const fillWidth = ((value - min) / (max - min)) * sliderW;
        ctx.fillStyle = '#FF6600';
        ctx.fillRect(sliderX, y - 5, fillWidth, sliderH);

        // Value text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(2), panelX + 280, y + 5);
    }

    renderDeveloperToggle(ctx, x, y, label, isActive) {
        // Toggle box
        ctx.fillStyle = isActive ? '#4CAF50' : '#666666';
        ctx.fillRect(x, y - 8, 16, 16);

        // Checkmark
        if (isActive) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 3, y);
            ctx.lineTo(x + 6, y + 3);
            ctx.lineTo(x + 13, y - 4);
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 25, y + 5);
    }
}