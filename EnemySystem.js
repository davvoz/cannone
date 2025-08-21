class EnemySystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.enemies = [];
        this.enemiesSpawned = 0;
        this.enemiesPerWave = 10;
        this.lastSpawn = 0;
        this.spawnDelay = 1000; // milliseconds
    }

    update() {
        this.spawnEnemies();
        this.updateEnemies();
    }

    spawnEnemies() {
        const now = Date.now();
        
        // Check if we should spawn more enemies
        if (this.enemiesSpawned < this.enemiesPerWave && now - this.lastSpawn > this.spawnDelay) {
            this.spawnEnemy();
            this.enemiesSpawned++;
            this.lastSpawn = now;
        }
    }

    spawnEnemy() {
        const spawnSide = Math.random() < 0.5 ? 'left' : 'right';
        let x, y;
        
        if (spawnSide === 'left') {
            x = -30;
            y = Math.random() * (this.gameEngine.canvas.height - 200) + 50;
        } else {
            x = this.gameEngine.canvas.width + 30;
            y = Math.random() * (this.gameEngine.canvas.height - 200) + 50;
        }

        const enemy = this.createEnemy(x, y);
        this.enemies.push(enemy);
    }

    createEnemy(x, y) {
        const enemyTypes = ['normal', 'fast', 'zigzag', 'boss', 'splitter'];
        const type = this.selectEnemyType(enemyTypes);
        
        const baseHealth = 30 + this.gameEngine.wave * 5;
        const baseSpeed = 1 + this.gameEngine.wave * 0.1;
        const baseReward = 10 + this.gameEngine.wave * 2;

        let enemy = {
            x: x,
            y: y,
            type: type,
            health: baseHealth * this.gameEngine.devParams.enemyHealthMultiplier,
            maxHealth: baseHealth * this.gameEngine.devParams.enemyHealthMultiplier,
            speed: baseSpeed * this.gameEngine.devParams.enemySpeed,
            reward: Math.floor(baseReward * this.gameEngine.devParams.moneyMultiplier),
            size: 15,
            color: '#FF5722',
            angle: 0,
            zigzagTimer: 0,
            direction: x < 0 ? 1 : -1
        };

        // Apply type-specific properties
        this.applyEnemyTypeProperties(enemy, type);
        
        return enemy;
    }

    selectEnemyType(enemyTypes) {
        const wave = this.gameEngine.wave;
        let weights = [1, 0, 0, 0, 0]; // Start with only normal enemies
        
        if (wave >= 3) weights[1] = 0.3; // Fast enemies
        if (wave >= 5) weights[2] = 0.2; // Zigzag enemies
        if (wave >= 7) weights[3] = 0.1; // Boss enemies
        if (wave >= 10) weights[4] = 0.15; // Splitter enemies
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return enemyTypes[i];
            }
        }
        
        return enemyTypes[0]; // Default to normal
    }

    applyEnemyTypeProperties(enemy, type) {
        switch (type) {
            case 'fast':
                enemy.speed *= 2;
                enemy.health *= 0.7;
                enemy.reward *= 1.2;
                enemy.color = '#FFC107';
                enemy.size = 12;
                break;
            case 'zigzag':
                enemy.speed *= 1.5;
                enemy.health *= 1.2;
                enemy.reward *= 1.5;
                enemy.color = '#9C27B0';
                break;
            case 'boss':
                enemy.speed *= 0.6;
                enemy.health *= 3;
                enemy.reward *= 3;
                enemy.color = '#F44336';
                enemy.size = 25;
                break;
            case 'splitter':
                enemy.health *= 1.5;
                enemy.reward *= 2;
                enemy.color = '#00BCD4';
                enemy.size = 18;
                break;
        }
    }

    updateEnemies() {
        // Don't update enemies if time is frozen
        if (this.gameEngine.ultimateSystem.ultimateEffects.freezeTime) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            this.updateEnemyMovement(enemy);
            this.checkEnemyBounds(enemy, i);
        }
    }

    updateEnemyMovement(enemy) {
        switch (enemy.type) {
            case 'normal':
            case 'fast':
            case 'boss':
                enemy.x += enemy.speed * enemy.direction;
                break;
            case 'zigzag':
                enemy.x += enemy.speed * enemy.direction;
                enemy.zigzagTimer += 0.1;
                enemy.y += Math.sin(enemy.zigzagTimer) * 2;
                break;
            case 'splitter':
                enemy.x += enemy.speed * enemy.direction;
                enemy.angle += 0.05;
                break;
        }
    }

    checkEnemyBounds(enemy, index) {
        // Remove enemies that go off screen
        if (enemy.x < -50 || enemy.x > this.gameEngine.canvas.width + 50) {
            this.enemies.splice(index, 1);
            // Take damage for letting enemy escape
            if (!this.gameEngine.devParams.godMode) {
                this.gameEngine.health -= 10;
            }
        }
    }

    killEnemy(index) {
        const enemy = this.enemies[index];
        
        // Add money
        this.gameEngine.money += enemy.reward;
        this.gameEngine.kills++;
        this.gameEngine.permanentProgress.totalKills++;
        this.gameEngine.permanentProgress.experiencePoints += Math.floor(enemy.reward / 2);

        // Handle splitter enemies
        if (enemy.type === 'splitter') {
            this.createSplitterParts(enemy);
        }

        // Create explosion and particles
        this.gameEngine.effectsSystem.createExplosion(enemy.x, enemy.y);
        this.gameEngine.effectsSystem.createParticles(enemy.x, enemy.y);
        this.gameEngine.effectsSystem.createFloatingText(enemy.x, enemy.y, `+${enemy.reward}💰`, 'money');
        
        this.gameEngine.audioManager.playExplosionSound();

        // Remove enemy
        this.enemies.splice(index, 1);
    }

    createSplitterParts(enemy) {
        // Create 2-3 smaller enemies when splitter dies
        const parts = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < parts; i++) {
            const angle = (Math.PI * 2 / parts) * i;
            const part = {
                x: enemy.x + Math.cos(angle) * 20,
                y: enemy.y + Math.sin(angle) * 20,
                type: 'normal',
                health: enemy.maxHealth * 0.3,
                maxHealth: enemy.maxHealth * 0.3,
                speed: enemy.speed * 1.5,
                reward: Math.floor(enemy.reward * 0.3),
                size: 8,
                color: '#00ACC1',
                angle: 0,
                zigzagTimer: 0,
                direction: enemy.direction
            };
            this.enemies.push(part);
        }
    }

    resetForNewWave() {
        this.enemiesSpawned = 0;
        this.enemiesPerWave = Math.min(20, 10 + this.gameEngine.wave * 2);
        this.spawnDelay = Math.max(300, 1000 - this.gameEngine.wave * 30);
    }

    render(ctx) {
        for (let enemy of this.enemies) {
            this.renderEnemy(ctx, enemy);
        }
    }

    renderEnemy(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        if (enemy.type === 'splitter') {
            ctx.rotate(enemy.angle);
        }

        // Enemy body
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        
        // Health bar
        const barWidth = enemy.size * 2;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(-barWidth / 2, -enemy.size - 10, barWidth, barHeight);
        
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(-barWidth / 2, -enemy.size - 10, barWidth * healthPercent, barHeight);

        ctx.restore();
    }
}