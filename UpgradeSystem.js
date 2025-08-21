class UpgradeSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.upgrades = {
            damage: { level: 1, baseCost: 50 },
            fireRate: { level: 1, baseCost: 75 },
            range: { level: 1, baseCost: 100 },
            explosive: { level: 0, baseCost: 200 },
            heal: { level: 0, baseCost: 1 },
            multiShot: { level: 1, baseCost: 100 }
        };
    }

    buyUpgrade(type) {
        const cost = this.getUpgradeCost(type);
        
        if (this.gameEngine.money >= cost) {
            this.gameEngine.money -= cost;
            this.upgrades[type].level++;
            
            this.applyUpgrade(type);
            this.gameEngine.audioManager.playUpgradeSound(type);
            this.gameEngine.uiManager.updateUI();
        }
    }

    applyUpgrade(type) {
        switch (type) {
            case 'damage':
                this.gameEngine.weaponSystem.cannon.damage = 20 + (this.upgrades.damage.level - 1) * 15 + 
                    (this.gameEngine.permanentProgress.permanentUpgrades.startingDamage * 5);
                break;
            case 'fireRate':
                this.gameEngine.weaponSystem.cannon.fireRate = Math.max(100, 500 - (this.upgrades.fireRate.level - 1) * 40);
                break;
            case 'range':
                this.gameEngine.weaponSystem.cannon.range = Math.min(600, 300 + (this.upgrades.range.level - 1) * 35);
                break;
            case 'explosive':
                this.gameEngine.weaponSystem.cannon.explosiveLevel = this.upgrades.explosive.level;
                break;
            case 'heal':
                this.gameEngine.health = Math.min(this.gameEngine.maxHealth, this.gameEngine.health + 20);
                break;
            case 'multiShot':
                this.gameEngine.weaponSystem.cannon.multiShot = this.upgrades.multiShot.level;
                break;
        }
    }

    getUpgradeCost(type) {
        const upgrade = this.upgrades[type];
        if (type === 'heal') {
            return Math.ceil(upgrade.baseCost * Math.pow(1.5, upgrade.level));
        }
        return Math.ceil(upgrade.baseCost * Math.pow(1.4, upgrade.level - 1));
    }

    buyPermanentUpgrade(type) {
        const costs = {
            bulletSize: 100,
            startingDamage: 150,
            startingMoney: 200,
            startingHealth: 300,
            bulletSpeed: 250
        };

        const level = this.gameEngine.permanentProgress.permanentUpgrades[type];
        const cost = costs[type] * (level + 1);

        if (this.gameEngine.permanentProgress.experiencePoints >= cost) {
            this.gameEngine.permanentProgress.experiencePoints -= cost;
            this.gameEngine.permanentProgress.permanentUpgrades[type]++;
            this.gameEngine.saveProgress();
            this.gameEngine.audioManager.playUpgradeSound('permanent');
        }
    }
}