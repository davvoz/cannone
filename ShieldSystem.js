class ShieldSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.shield = {
            active: false,
            cooldown: 0,
            maxCooldown: 8000, // 8 seconds of cooldown
            lastUsed: 0,
            duration: 0,
            maxDuration: 3000, // 3 seconds of duration base
            particles: [],
            y: gameEngine.canvas.height - 150, // Posizione Y della linea dello scudo
            width: gameEngine.canvas.width, // Larghezza dello scudo (intero schermo)
            height: 5, // Spessore della linea dello scudo
            color: "#22AAFF" // Colore base dello scudo
        };
    }

    update() {
        const now = Date.now();

        // Update shield cooldown
        if (this.shield.cooldown > 0) {
            this.shield.cooldown = Math.max(0, this.shield.maxCooldown - (now - this.shield.lastUsed));
        }

        // Update shield duration
        if (this.shield.active) {
            this.shield.duration -= 16; // Circa 60fps
            if (this.shield.duration <= 0) {
                this.deactivateShield(now);
            }
            this.updateShieldParticles();
        }

        // Check shield collisions
        this.checkShieldCollisions();
    }

    activateShield() {
        const now = Date.now();
        
        if (this.shield.cooldown > 0 || this.shield.active) return;

        this.shield.active = true;
        this.shield.duration = this.shield.maxDuration + (this.gameEngine.wave * 200); // Durata aumenta con le onde
        this.createShieldParticles();
        this.gameEngine.audioManager.playShieldActivationSound();
    }

    deactivateShield(now) {
        this.shield.active = false;
        this.shield.particles = [];
        this.shield.lastUsed = now;
        this.shield.cooldown = this.shield.maxCooldown;
    }

    createShieldParticles() {
        this.shield.particles = [];
        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const radius = 80 + Math.random() * 40;
            
            const particle = {
                x: this.gameEngine.weaponSystem.cannon.x,
                y: this.gameEngine.weaponSystem.cannon.y,
                angle: angle,
                radius: radius,
                rotationSpeed: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 3,
                phase: Math.random() * Math.PI * 2
            };
            
            this.shield.particles.push(particle);
        }
    }

    updateShieldParticles() {
        for (let particle of this.shield.particles) {
            // Aggiorna fase di pulsazione
            particle.phase += 0.05;

            // Calcola raggio pulsante
            const pulseRadius = particle.radius * (1 + Math.sin(particle.phase) * 0.1);

            // Rotazione graduale delle particelle
            particle.angle += particle.rotationSpeed;

            // Aggiorna posizione
            particle.x = this.gameEngine.weaponSystem.cannon.x + Math.cos(particle.angle) * pulseRadius;
            particle.y = this.gameEngine.weaponSystem.cannon.y + Math.sin(particle.angle) * pulseRadius;
        }
    }

    checkShieldCollisions() {
        if (!this.shield.active) return;

        for (let i = this.gameEngine.enemySystem.enemies.length - 1; i >= 0; i--) {
            const enemy = this.gameEngine.enemySystem.enemies[i];
            
            if (this.gameEngine.collisionSystem.checkShieldCollision(enemy)) {
                // Enemy hits shield
                this.handleShieldImpact(enemy, i);
            }
        }
    }

    handleShieldImpact(enemy, enemyIndex) {
        // Calculate damage absorption based on wave progression
        const absorbedDamage = Math.min(enemy.health, 20 + this.gameEngine.wave * 3);
        
        // Create impact effects
        this.gameEngine.effectsSystem.createParticles(enemy.x, this.shield.y);
        this.gameEngine.effectsSystem.createFloatingText(enemy.x, this.shield.y, `-${absorbedDamage}`, 'damage');
        this.gameEngine.audioManager.playShieldImpactSound();

        // Damage or destroy enemy
        enemy.health -= absorbedDamage;
        if (enemy.health <= 0) {
            this.gameEngine.enemySystem.killEnemy(enemyIndex);
        }

        // Reduce shield duration slightly
        this.shield.duration -= 100;
    }

    render(ctx) {
        if (!this.shield.active) return;

        // Render shield line
        this.renderShieldLine(ctx);
        
        // Render shield particles
        this.renderShieldParticles(ctx);
    }

    renderShieldLine(ctx) {
        const gradient = ctx.createLinearGradient(0, this.shield.y, 0, this.shield.y + this.shield.height);
        gradient.addColorStop(0, 'rgba(34, 170, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(34, 170, 255, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.shield.y, this.shield.width, this.shield.height);
        
        // Shield glow effect
        ctx.shadowColor = this.shield.color;
        ctx.shadowBlur = 20;
        ctx.fillRect(0, this.shield.y, this.shield.width, this.shield.height);
        ctx.shadowBlur = 0;
    }

    renderShieldParticles(ctx) {
        for (let particle of this.shield.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34, 170, 255, ${0.6 + Math.sin(particle.phase) * 0.3})`;
            ctx.fill();
            
            // Particle glow
            ctx.shadowColor = this.shield.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    renderShieldUI(ctx) {
        // Shield cooldown indicator
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Shield (E):`, 30, 120);

        // Cooldown bar
        const barWidth = 150;
        const barHeight = 10;
        const barX = 130;
        const barY = 110;
        
        ctx.fillStyle = '#444444';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        if (this.shield.active) {
            const durationPercent = this.shield.duration / (this.shield.maxDuration + (this.gameEngine.wave * 200));
            ctx.fillStyle = '#22AAFF';
            ctx.fillRect(barX, barY, barWidth * durationPercent, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText('ACTIVE', barX + barWidth + 10, barY + 8);
        } else if (this.shield.cooldown > 0) {
            const cooldownPercent = 1 - (this.shield.cooldown / this.shield.maxCooldown);
            ctx.fillStyle = '#666666';
            ctx.fillRect(barX, barY, barWidth * cooldownPercent, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText(`${Math.ceil(this.shield.cooldown / 1000)}s`, barX + barWidth + 10, barY + 8);
        } else {
            ctx.fillStyle = '#22AAFF';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.fillText('READY', barX + barWidth + 10, barY + 8);
        }
        
        ctx.restore();
    }
}