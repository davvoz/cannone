class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setupAudio();
    }

    setupAudio() {
        try {
            // Create gain nodes for different types of sounds
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        } catch (e) {
            console.warn('Audio setup failed:', e);
        }
    }

    createOscillator(frequency, type = 'sine', duration = 0.1, gain = 0.1) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(gain, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }

    playShootSound() {
        this.createOscillator(800, 'square', 0.1, 0.05);
    }

    playExplosionSound() {
        this.createOscillator(200, 'sawtooth', 0.3, 0.1);
        setTimeout(() => this.createOscillator(100, 'sine', 0.5, 0.05), 50);
    }

    playHitSound() {
        this.createOscillator(600, 'triangle', 0.05, 0.03);
    }

    playNuclearStormSound() {
        this.createOscillator(150, 'sawtooth', 1.0, 0.15);
    }

    playTimeFreezeSound() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createOscillator(1200 - i * 100, 'sine', 0.3, 0.08);
            }, i * 100);
        }
    }

    playOrbitalStrikeSound() {
        this.createOscillator(50, 'sawtooth', 2.0, 0.2);
        setTimeout(() => this.createOscillator(2000, 'sine', 0.5, 0.1), 500);
    }

    playUltimateKillSound(ultimateType) {
        switch (ultimateType) {
            case 0:
                this.playNuclearKillSound();
                break;
            case 1:
                this.playFreezeKillSound();
                break;
            case 2:
                this.playStrikeKillSound();
                break;
        }
    }

    playNuclearKillSound() {
        this.createOscillator(300, 'sawtooth', 0.8, 0.12);
    }

    playFreezeKillSound() {
        this.createOscillator(1500, 'sine', 0.4, 0.08);
    }

    playStrikeKillSound() {
        this.createOscillator(2500, 'triangle', 0.3, 0.1);
    }

    playUpgradeSound(upgradeType) {
        switch (upgradeType) {
            case 'damage':
                this.playDamageUpgradeSound();
                break;
            case 'fireRate':
                this.playFireRateUpgradeSound();
                break;
            case 'range':
                this.playRangeUpgradeSound();
                break;
            case 'explosive':
                this.playExplosiveUpgradeSound();
                break;
            case 'heal':
                this.playHealUpgradeSound();
                break;
            case 'multiShot':
                this.playMultiShotUpgradeSound();
                break;
            default:
                this.playGenericUpgradeSound();
        }
    }

    playDamageUpgradeSound() {
        this.createOscillator(440, 'square', 0.3, 0.08);
        setTimeout(() => this.createOscillator(880, 'square', 0.2, 0.06), 100);
    }

    playFireRateUpgradeSound() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.createOscillator(660 + i * 110, 'triangle', 0.1, 0.05), i * 50);
        }
    }

    playRangeUpgradeSound() {
        this.createOscillator(330, 'sine', 0.4, 0.07);
        setTimeout(() => this.createOscillator(550, 'sine', 0.3, 0.05), 200);
    }

    playExplosiveUpgradeSound() {
        this.createOscillator(220, 'sawtooth', 0.6, 0.1);
    }

    playHealUpgradeSound() {
        this.createOscillator(523, 'sine', 0.3, 0.06);
        setTimeout(() => this.createOscillator(659, 'sine', 0.3, 0.06), 150);
        setTimeout(() => this.createOscillator(784, 'sine', 0.4, 0.08), 300);
    }

    playMultiShotUpgradeSound() {
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this.createOscillator(400 + i * 50, 'square', 0.15, 0.04), i * 30);
        }
    }

    playGenericUpgradeSound() {
        this.createOscillator(500, 'triangle', 0.2, 0.06);
    }

    playShieldActivationSound() {
        this.createOscillator(800, 'sine', 0.5, 0.1);
        setTimeout(() => this.createOscillator(1200, 'sine', 0.3, 0.08), 100);
    }

    playShieldImpactSound() {
        this.createOscillator(400, 'triangle', 0.2, 0.08);
    }

    playGameOverSound() {
        this.createOscillator(200, 'sawtooth', 2.0, 0.15);
        setTimeout(() => this.createOscillator(150, 'sine', 1.5, 0.1), 500);
    }
}