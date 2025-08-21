class WeaponSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.bullets = [];
        
        // Cannon properties with bonus from permanent upgrades
        this.cannon = {
            x: gameEngine.canvas.width / 2,
            y: gameEngine.canvas.height - 50,
            damage: 20 + (gameEngine.permanentProgress.permanentUpgrades.startingDamage * 5),
            fireRate: 500, // milliseconds
            range: 300,
            explosiveLevel: 0,
            lastShot: 0,
            rotation: 0, // angolo di rotazione in radianti
            multiShot: 1, // numero di colpi sparati in una volta
            bulletSize: 1 + (gameEngine.permanentProgress.permanentUpgrades.bulletSize * 0.3),
            bulletSpeed: 8 + (gameEngine.permanentProgress.permanentUpgrades.bulletSpeed * 1)
        };
    }

    update() {
        this.updateBullets();
        this.autoShoot();
    }

    updateBullets() {
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Remove bullets that are off screen
            if (bullet.y < 0 || bullet.x < 0 || bullet.x > this.gameEngine.canvas.width) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Check collisions with enemies
            for (let j = this.gameEngine.enemySystem.enemies.length - 1; j >= 0; j--) {
                const enemy = this.gameEngine.enemySystem.enemies[j];
                if (this.gameEngine.collisionSystem.checkCollision(bullet, enemy)) {
                    this.handleBulletHit(bullet, enemy, i, j);
                    break;
                }
            }
        }
    }

    handleBulletHit(bullet, enemy, bulletIndex, enemyIndex) {
        // Apply damage
        let damage = this.cannon.damage;
        if (this.gameEngine.devParams.playerDamageMultiplier !== 1) {
            damage *= this.gameEngine.devParams.playerDamageMultiplier;
        }
        
        enemy.health -= damage;
        
        // Create hit effect
        this.gameEngine.effectsSystem.createParticles(bullet.x, bullet.y);
        this.gameEngine.audioManager.playHitSound();

        // Create explosion if explosive upgrade is active
        if (this.cannon.explosiveLevel > 0) {
            this.gameEngine.effectsSystem.createExplosion(bullet.x, bullet.y);
            this.handleExplosiveDamage(bullet.x, bullet.y);
        }

        // Remove bullet
        this.bullets.splice(bulletIndex, 1);

        // Check if enemy is killed
        if (enemy.health <= 0) {
            this.gameEngine.enemySystem.killEnemy(enemyIndex);
        }
    }

    handleExplosiveDamage(x, y) {
        const explosionRadius = 50 + this.cannon.explosiveLevel * 20;
        const explosionDamage = this.cannon.damage * 0.7;

        for (let enemy of this.gameEngine.enemySystem.enemies) {
            const distance = Math.sqrt((enemy.x - x) ** 2 + (enemy.y - y) ** 2);
            if (distance <= explosionRadius) {
                enemy.health -= explosionDamage;
            }
        }
    }

    autoShoot() {
        const now = Date.now();
        
        // Check if we can shoot
        if (now - this.cannon.lastShot < this.cannon.fireRate) return;
        
        // Find nearest enemy in range
        const target = this.findNearestTarget();
        if (!target) return;

        // Calculate angle to target
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        this.cannon.rotation = Math.atan2(dy, dx);

        // Shoot
        this.shoot(target);
        this.cannon.lastShot = now;
        this.gameEngine.audioManager.playShootSound();
    }

    findNearestTarget() {
        let nearestTarget = null;
        let nearestDistance = this.cannon.range;

        for (let enemy of this.gameEngine.enemySystem.enemies) {
            const distance = Math.sqrt(
                (enemy.x - this.cannon.x) ** 2 + 
                (enemy.y - this.cannon.y) ** 2
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTarget = enemy;
            }
        }

        return nearestTarget;
    }

    shoot(target) {
        const dx = target.x - this.cannon.x;
        const dy = target.y - this.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Create multiple bullets for multishot
        for (let i = 0; i < this.cannon.multiShot; i++) {
            let angle = Math.atan2(dy, dx);
            
            // Add spread for multishot
            if (this.cannon.multiShot > 1) {
                const spreadAngle = 0.3; // radians
                const angleOffset = (i - (this.cannon.multiShot - 1) / 2) * (spreadAngle / this.cannon.multiShot);
                angle += angleOffset;
            }
            
            const bullet = {
                x: this.cannon.x,
                y: this.cannon.y,
                vx: Math.cos(angle) * this.cannon.bulletSpeed,
                vy: Math.sin(angle) * this.cannon.bulletSpeed,
                size: 3 * this.cannon.bulletSize,
                damage: this.cannon.damage
            };
            
            this.bullets.push(bullet);
        }
    }

    render(ctx) {
        this.renderCannon(ctx);
        this.renderBullets(ctx);
    }

    renderCannon(ctx) {
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        ctx.rotate(this.cannon.rotation);
        
        // Cannon body
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(-15, -8, 30, 16);
        
        // Cannon barrel
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(0, -4, 40, 8);
        
        ctx.restore();
        
        // Range indicator (if in developer mode)
        if (this.gameEngine.showDeveloperPanel) {
            ctx.beginPath();
            ctx.arc(this.cannon.x, this.cannon.y, this.cannon.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    renderBullets(ctx) {
        for (let bullet of this.bullets) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fillStyle = '#FFEB3B';
            ctx.fill();
            
            // Bullet glow effect
            ctx.shadowColor = '#FFEB3B';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}