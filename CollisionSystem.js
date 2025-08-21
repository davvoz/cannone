class CollisionSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    checkCollision(bullet, enemy) {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < bullet.size + enemy.size;
    }

    checkShieldCollision(enemy) {
        // Check if enemy hits the shield line
        return this.gameEngine.shieldSystem.shield.active && 
               enemy.y + enemy.size >= this.gameEngine.shieldSystem.shield.y &&
               enemy.y - enemy.size <= this.gameEngine.shieldSystem.shield.y + this.gameEngine.shieldSystem.shield.height;
    }

    checkCannonCollision(enemy) {
        // Check if enemy hits the cannon
        const dx = enemy.x - this.gameEngine.weaponSystem.cannon.x;
        const dy = enemy.y - this.gameEngine.weaponSystem.cannon.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < enemy.size + 20; // 20 is approximately cannon size
    }

    checkUltimateEffectCollisions() {
        if (!this.gameEngine.ultimateSystem.ultimateEffects.active) return;

        const effects = this.gameEngine.ultimateSystem.ultimateEffects;
        
        switch (effects.type) {
            case 0: // Nuclear Storm
                this.checkNuclearStormCollisions();
                break;
            case 1: // Time Freeze
                this.checkTimeFreezeCollisions();
                break;
            case 2: // Orbital Strike
                this.checkOrbitalStrikeCollisions();
                break;
        }
    }

    checkNuclearStormCollisions() {
        const missiles = this.gameEngine.ultimateSystem.ultimateEffects.particles;
        
        for (let missile of missiles) {
            for (let i = this.gameEngine.enemySystem.enemies.length - 1; i >= 0; i--) {
                const enemy = this.gameEngine.enemySystem.enemies[i];
                const dx = missile.x - enemy.x;
                const dy = missile.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < missile.size + enemy.size) {
                    enemy.health -= 100; // High damage from nuclear missiles
                    if (enemy.health <= 0) {
                        this.gameEngine.audioManager.playUltimateKillSound(0);
                        this.gameEngine.enemySystem.killEnemy(i);
                    }
                }
            }
        }
    }

    checkTimeFreezeCollisions() {
        // Time freeze deals continuous damage to all enemies
        for (let i = this.gameEngine.enemySystem.enemies.length - 1; i >= 0; i--) {
            const enemy = this.gameEngine.enemySystem.enemies[i];
            enemy.health -= 2; // Continuous damage
            
            if (enemy.health <= 0) {
                this.gameEngine.audioManager.playUltimateKillSound(1);
                this.gameEngine.enemySystem.killEnemy(i);
            }
        }
    }

    checkOrbitalStrikeCollisions() {
        const strikes = this.gameEngine.ultimateSystem.ultimateEffects.particles;
        
        for (let strike of strikes) {
            if (strike.phase === 'impact') {
                // Check collision with all enemies in strike radius
                for (let i = this.gameEngine.enemySystem.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.gameEngine.enemySystem.enemies[i];
                    const dx = strike.x - enemy.x;
                    const dy = strike.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < strike.radius) {
                        enemy.health -= 80; // High damage from orbital strike
                        if (enemy.health <= 0) {
                            this.gameEngine.audioManager.playUltimateKillSound(2);
                            this.gameEngine.enemySystem.killEnemy(i);
                        }
                    }
                }
            }
        }
    }
}