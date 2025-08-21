class EffectsSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.explosions = [];
        this.particles = [];
        this.floatingTexts = [];
        this.stars = [];
        this.initStars();
    }

    update() {
        this.updateExplosions();
        this.updateParticles();
        this.updateFloatingTexts();
        this.updateStars();
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life--;
            explosion.radius += 2;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.y -= text.speed;
            text.life--;
            text.alpha = text.life / text.maxLife;
            
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    updateStars() {
        for (let star of this.stars) {
            star.y += star.speed;
            if (star.y > this.gameEngine.canvas.height) {
                star.y = -5;
                star.x = Math.random() * this.gameEngine.canvas.width;
            }
        }
    }

    createExplosion(x, y) {
        const explosion = {
            x: x,
            y: y,
            radius: 5,
            life: 30,
            maxLife: 30
        };
        this.explosions.push(explosion);
    }

    createParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            const speed = 2 + Math.random() * 3;
            
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.random() * 20,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)` // Orange to yellow
            };
            
            this.particles.push(particle);
        }
    }

    createFloatingText(x, y, text, type) {
        const colors = {
            money: '#4CAF50',
            damage: '#FF5722',
            heal: '#2196F3',
            bonus: '#FF9800'
        };

        const floatingText = {
            x: x,
            y: y,
            text: text,
            color: colors[type] || '#FFFFFF',
            life: 60,
            maxLife: 60,
            speed: 1,
            alpha: 1
        };

        this.floatingTexts.push(floatingText);
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.gameEngine.canvas.width,
                y: Math.random() * this.gameEngine.canvas.height,
                size: Math.random() * 2,
                speed: 0.5 + Math.random() * 1.5,
                brightness: 0.3 + Math.random() * 0.7
            });
        }
    }

    render(ctx) {
        this.renderStars(ctx);
        this.renderExplosions(ctx);
        this.renderParticles(ctx);
        this.renderFloatingTexts(ctx);
    }

    renderStars(ctx) {
        for (let star of this.stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.fill();
        }
    }

    renderExplosions(ctx) {
        for (let explosion of this.explosions) {
            const alpha = explosion.life / explosion.maxLife;
            
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            
            const gradient = ctx.createRadialGradient(
                explosion.x, explosion.y, 0,
                explosion.x, explosion.y, explosion.radius
            );
            gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    renderParticles(ctx) {
        for (let particle of this.particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        }
    }

    renderFloatingTexts(ctx) {
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        for (let text of this.floatingTexts) {
            ctx.fillStyle = text.color;
            ctx.globalAlpha = text.alpha;
            ctx.fillText(text.text, text.x, text.y);
        }
        
        ctx.restore();
    }

    createMegaExplosion(x, y, ultimateType = -1) {
        // Create a large explosion with unique effects for different ultimate types
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 / 50) * i;
            const speed = 3 + Math.random() * 5;
            
            let color;
            switch (ultimateType) {
                case 0: // Nuclear Storm
                    color = `hsl(${Math.random() * 60}, 100%, 50%)`; // Red to yellow
                    break;
                case 1: // Time Freeze
                    color = `hsl(${180 + Math.random() * 60}, 100%, 50%)`; // Blue to cyan
                    break;
                case 2: // Orbital Strike
                    color = `hsl(${30 + Math.random() * 60}, 100%, 50%)`; // Orange to yellow
                    break;
                default:
                    color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            }
            
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40 + Math.random() * 30,
                size: 3 + Math.random() * 5,
                color: color
            };
            
            this.particles.push(particle);
        }

        // Create large explosion
        const explosion = {
            x: x,
            y: y,
            radius: 10,
            life: 60,
            maxLife: 60
        };
        this.explosions.push(explosion);
    }
}