class UltimateSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
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

        this.ultimateEffects = {
            active: false,
            type: null,
            duration: 0,
            maxDuration: 0,
            particles: [],
            freezeTime: false
        };
    }

    update() {
        this.updateCooldowns();
        this.updateUltimateEffects();
    }

    updateCooldowns() {
        const now = Date.now();
        
        // Update cooldowns for all ultimates
        for (let ultimate of this.ultimates.types) {
            if (ultimate.cooldown > 0) {
                ultimate.cooldown = Math.max(0, ultimate.maxCooldown - (now - ultimate.lastUsed));
            }
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

    triggerUltimate(index) {
        const now = Date.now();
        const ultimate = this.ultimates.types[index];

        // Apply developer mode no cooldowns
        const effectiveCooldown = this.gameEngine.devParams.noCooldowns ? 0 : ultimate.cooldown;

        // Check if this ultimate is in cooldown or if there's already an ultimate active
        if (effectiveCooldown > 0 || this.ultimateEffects.active) return;

        // Activate the cooldown for this ultimate
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

    activateNuclearStorm() {
        this.ultimateEffects.duration = 5000; // 5 seconds
        this.ultimateEffects.maxDuration = 5000;
        this.gameEngine.audioManager.playNuclearStormSound();
        
        // Create initial nuclear missiles
        for (let i = 0; i < 8; i++) {
            setTimeout(() => this.createNuclearMissile(), i * 200);
        }
    }

    activateTimeFreeze() {
        this.ultimateEffects.duration = 4000; // 4 seconds
        this.ultimateEffects.maxDuration = 4000;
        this.ultimateEffects.freezeTime = true;
        this.gameEngine.audioManager.playTimeFreezeSound();
        
        // Create freeze effects
        this.createTimeFreezeEffects();
    }

    activateOrbitalStrike() {
        this.ultimateEffects.duration = 6000; // 6 seconds
        this.ultimateEffects.maxDuration = 6000;
        this.gameEngine.audioManager.playOrbitalStrikeSound();
        
        // Create orbital strikes
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.createOrbitalStrike(), i * 800);
        }
    }

    createNuclearMissile() {
        const missile = {
            x: Math.random() * this.gameEngine.canvas.width,
            y: -50,
            vx: (Math.random() - 0.5) * 2,
            vy: 3 + Math.random() * 2,
            size: 8,
            rotation: 0,
            life: 200,
            trail: []
        };
        this.ultimateEffects.particles.push(missile);
    }

    createTimeFreezeEffects() {
        // Create laser effects targeting all enemies
        for (let enemy of this.gameEngine.enemySystem.enemies) {
            const laser = {
                x: this.gameEngine.weaponSystem.cannon.x,
                y: this.gameEngine.weaponSystem.cannon.y,
                targetX: enemy.x,
                targetY: enemy.y,
                intensity: 0.8,
                life: 240,
                enemyId: enemy
            };
            this.ultimateEffects.particles.push(laser);
        }
    }

    createOrbitalStrike() {
        const x = Math.random() * this.gameEngine.canvas.width;
        const strike = {
            x: x,
            y: -100,
            targetX: x,
            targetY: Math.random() * (this.gameEngine.canvas.height - 200) + 100,
            phase: 'charging',
            chargeTime: 60,
            radius: 80,
            particles: []
        };

        // Create charging particles
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            const particle = {
                x: strike.targetX + Math.cos(angle) * 60,
                y: strike.targetY + Math.sin(angle) * 60,
                vx: Math.cos(angle) * -2,
                vy: Math.sin(angle) * -2,
                size: 2,
                life: 30
            };
            strike.particles.push(particle);
        }

        this.ultimateEffects.particles.push(strike);
    }

    updateNuclearStorm() {
        // Update nuclear missiles
        for (let i = this.ultimateEffects.particles.length - 1; i >= 0; i--) {
            const missile = this.ultimateEffects.particles[i];
            missile.x += missile.vx;
            missile.y += missile.vy;
            missile.rotation += 0.1;
            missile.life--;

            // Add trail
            missile.trail.unshift({ x: missile.x, y: missile.y });
            if (missile.trail.length > 10) missile.trail.pop();

            // Check impact or off screen
            if (missile.y > this.gameEngine.canvas.height || missile.life <= 0) {
                this.gameEngine.effectsSystem.createMegaExplosion(missile.x, missile.y, 0); // Nuclear Storm
                this.ultimateEffects.particles.splice(i, 1);
            }
        }
    }

    updateTimeFreeze() {
        // Update laser effects
        for (let i = this.ultimateEffects.particles.length - 1; i >= 0; i--) {
            const laser = this.ultimateEffects.particles[i];
            laser.life--;
            laser.intensity = Math.sin(laser.life * 0.1) * 0.5 + 0.5;

            if (laser.life <= 0) {
                this.ultimateEffects.particles.splice(i, 1);
            }
        }
    }

    updateOrbitalStrike() {
        // Update orbital strikes
        for (let i = this.ultimateEffects.particles.length - 1; i >= 0; i--) {
            const strike = this.ultimateEffects.particles[i];

            if (strike.phase === 'charging') {
                strike.chargeTime--;
                
                // Update charging particles
                for (let particle of strike.particles) {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.life--;
                }

                // Remove dead particles
                strike.particles = strike.particles.filter(p => p.life > 0);

                if (strike.chargeTime <= 0) {
                    strike.phase = 'impact';
                    this.gameEngine.effectsSystem.createMegaExplosion(strike.targetX, strike.targetY, 2);
                    this.ultimateEffects.particles.splice(i, 1);
                }
            }
        }
    }

    render(ctx) {
        if (!this.ultimateEffects.active) return;

        switch (this.ultimateEffects.type) {
            case 0: // Nuclear Storm
                this.renderNuclearStorm(ctx);
                break;
            case 1: // Time Freeze
                this.renderTimeFreeze(ctx);
                break;
            case 2: // Orbital Strike
                this.renderOrbitalStrike(ctx);
                break;
        }
    }

    renderNuclearStorm(ctx) {
        for (let missile of this.ultimateEffects.particles) {
            ctx.save();

            // Trail
            if (missile.trail.length > 1) {
                ctx.strokeStyle = 'rgba(255, 100, 0, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < missile.trail.length; i++) {
                    if (i === 0) {
                        ctx.moveTo(missile.trail[i].x, missile.trail[i].y);
                    } else {
                        ctx.lineTo(missile.trail[i].x, missile.trail[i].y);
                    }
                }
                ctx.stroke();
            }

            // Missile
            ctx.translate(missile.x, missile.y);
            ctx.rotate(missile.rotation);

            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, missile.size);
            grad.addColorStop(0, '#FFFF00');
            grad.addColorStop(0.5, '#FF4400');
            grad.addColorStop(1, '#880000');

            ctx.shadowColor = '#FF4400';
            ctx.shadowBlur = 20;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, missile.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    renderTimeFreeze(ctx) {
        // Screen tint
        ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
        ctx.fillRect(0, 0, this.gameEngine.canvas.width, this.gameEngine.canvas.height);

        // Laser effects
        for (let laser of this.ultimateEffects.particles) {
            ctx.save();
            ctx.strokeStyle = `rgba(100, 150, 255, ${laser.intensity})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#64AAFF';
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(laser.x, laser.y);
            ctx.lineTo(laser.targetX, laser.targetY);
            ctx.stroke();

            // Laser impact
            ctx.beginPath();
            ctx.arc(laser.targetX, laser.targetY, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${laser.intensity})`;
            ctx.fill();

            ctx.restore();
        }
    }

    renderOrbitalStrike(ctx) {
        for (let strike of this.ultimateEffects.particles) {
            if (strike.phase === 'charging') {
                // Charging particles
                for (let particle of strike.particles) {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 200, 0, ${particle.life / 30})`;
                    ctx.fill();
                }

                // Target indicator
                ctx.save();
                ctx.strokeStyle = '#FFAA44';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(strike.targetX, strike.targetY, strike.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    renderUltimateUI(ctx) {
        // Ultimate UI - multiple with own cooldowns
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Ultimate:`, 30, 185);

        // Draw each ultimate with its own bar
        let yOffset = 195;
        for (let i = 0; i < this.ultimates.types.length; i++) {
            const ultimate = this.ultimates.types[i];
            const cooldownPercent = this.gameEngine.devParams.noCooldowns ? 1 : 
                (1 - (ultimate.cooldown / ultimate.maxCooldown));

            // Ultimate name with key
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = ultimate.color;
            ctx.fillText(`${ultimate.key}. ${ultimate.name}`, 30, yOffset);

            // Cooldown bar
            const barWidth = 120;
            const barHeight = 8;
            const barX = 200;
            
            ctx.fillStyle = '#444444';
            ctx.fillRect(barX, yOffset - 10, barWidth, barHeight);
            
            ctx.fillStyle = cooldownPercent >= 1 ? ultimate.color : '#666666';
            ctx.fillRect(barX, yOffset - 10, barWidth * cooldownPercent, barHeight);

            // Status text
            ctx.font = '10px Arial';
            ctx.fillStyle = '#FFFFFF';
            if (cooldownPercent >= 1) {
                ctx.fillText('READY', barX + barWidth + 5, yOffset - 3);
            } else {
                const remainingTime = Math.ceil(ultimate.cooldown / 1000);
                ctx.fillText(`${remainingTime}s`, barX + barWidth + 5, yOffset - 3);
            }

            yOffset += 20;
        }
    }
}