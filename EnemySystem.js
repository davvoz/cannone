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
        // Spawn enemies from the top of the screen
        let x, y;
        
        // Random x position across the screen width, avoiding the edges
        x = Math.random() * (this.gameEngine.canvas.width - 100) + 50;
        // Spawn above the screen
        y = -30;

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
            // Animation properties for beautiful effects
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            scale: 1,
            pulseTimer: Math.random() * Math.PI * 2,
            horizontalOffset: 0,
            baseX: x
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
        // Update animation timers
        enemy.angle += enemy.rotationSpeed;
        enemy.pulseTimer += 0.05;
        enemy.scale = 1 + Math.sin(enemy.pulseTimer) * 0.1;

        switch (enemy.type) {
            case 'normal':
                // Simple downward movement
                enemy.y += enemy.speed;
                break;
            case 'fast':
                // Fast downward movement with slight horizontal drift
                enemy.y += enemy.speed;
                enemy.horizontalOffset = Math.sin(enemy.y * 0.01) * 10;
                enemy.x = enemy.baseX + enemy.horizontalOffset;
                break;
            case 'boss':
                // Slow but imposing downward movement with pulsing
                enemy.y += enemy.speed;
                enemy.scale = 1 + Math.sin(enemy.pulseTimer) * 0.2;
                break;
            case 'zigzag':
                // Downward movement with horizontal zigzag pattern
                enemy.y += enemy.speed;
                enemy.zigzagTimer += 0.15;
                enemy.horizontalOffset = Math.sin(enemy.zigzagTimer) * 50;
                enemy.x = enemy.baseX + enemy.horizontalOffset;
                break;
            case 'splitter':
                // Downward movement with spinning animation
                enemy.y += enemy.speed;
                enemy.angle += 0.08;
                enemy.horizontalOffset = Math.cos(enemy.y * 0.02) * 15;
                enemy.x = enemy.baseX + enemy.horizontalOffset;
                break;
        }
    }

    checkEnemyBounds(enemy, index) {
        // Remove enemies that go off the bottom of the screen
        if (enemy.y > this.gameEngine.canvas.height + 50) {
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
                // Animation properties for beautiful effects
                rotationSpeed: (Math.random() - 0.5) * 0.15,
                scale: 1,
                pulseTimer: Math.random() * Math.PI * 2,
                horizontalOffset: 0,
                baseX: enemy.x + Math.cos(angle) * 20
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
        
        // Apply scaling animation
        ctx.scale(enemy.scale, enemy.scale);
        
        // Apply rotation for certain types
        if (enemy.type === 'splitter' || enemy.type === 'fast') {
            ctx.rotate(enemy.angle);
        }

        // Enhanced enemy body rendering based on type
        ctx.beginPath();
        
        switch (enemy.type) {
            case 'normal':
                // Simple circle
                ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
                break;
            case 'fast':
                // Triangle shape for speed
                ctx.moveTo(0, -enemy.size);
                ctx.lineTo(-enemy.size * 0.8, enemy.size * 0.8);
                ctx.lineTo(enemy.size * 0.8, enemy.size * 0.8);
                ctx.closePath();
                break;
            case 'boss':
                // Larger hexagon for boss
                const sides = 6;
                const step = (Math.PI * 2) / sides;
                ctx.moveTo(enemy.size * Math.cos(0), enemy.size * Math.sin(0));
                for (let i = 1; i <= sides; i++) {
                    ctx.lineTo(enemy.size * Math.cos(step * i), enemy.size * Math.sin(step * i));
                }
                ctx.closePath();
                break;
            case 'zigzag':
                // Diamond shape
                ctx.moveTo(0, -enemy.size);
                ctx.lineTo(enemy.size, 0);
                ctx.lineTo(0, enemy.size);
                ctx.lineTo(-enemy.size, 0);
                ctx.closePath();
                break;
            case 'splitter':
                // Star shape
                const spikes = 5;
                const outerRadius = enemy.size;
                const innerRadius = enemy.size * 0.5;
                const stepAngle = Math.PI / spikes;
                ctx.moveTo(outerRadius, 0);
                for (let i = 0; i < spikes * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = i * stepAngle;
                    ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
                }
                ctx.closePath();
                break;
        }
        
        // Add glow effect for certain types
        if (enemy.type === 'boss' || enemy.type === 'splitter') {
            ctx.shadowColor = enemy.color;
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        ctx.fillStyle = enemy.color;
        ctx.fill();
        
        // Add outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Health bar (drawn without transformations)
        const barWidth = enemy.size * 2;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 15, barWidth, barHeight);
        
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 15, barWidth * healthPercent, barHeight);
    }
}