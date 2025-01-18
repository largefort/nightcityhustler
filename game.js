class Game {
  constructor() {
    this.money = 0;
    this.clickPower = 1;
    this.passiveIncome = 0;
    this.lastUpdate = Date.now();
    
    // Initialize skills
    this.skills = {
      bodyLevel: 1,
      reflexesLevel: 1,
      technicalLevel: 1,
      intelligenceLevel: 1,
      coolLevel: 1
    };

    this.skillCosts = {
      base: 50,
      multiplier: 1.8
    };

    // Define base upgrades configuration
    this.upgradeConfigs = [
      {
        id: 'street_cred',
        name: 'Street Cred',
        description: 'Increase click power by 1',
        baseCost: 10,
        multiplier: 1.5,
        applyEffect: (game) => { game.clickPower += 1; }
      },
      {
        id: 'data_mining',
        name: 'Data Mining Rig',
        description: 'Generate 1 €$ per second',
        baseCost: 25,
        multiplier: 1.8,
        applyEffect: (game) => { game.passiveIncome += 1; }
      },
      {
        id: 'netrunner',
        name: 'Netrunner Contact',
        description: 'Generate 5 €$ per second',
        baseCost: 100,
        multiplier: 2,
        applyEffect: (game) => { game.passiveIncome += 5; }
      }
    ];

    // Initialize upgrades with counts
    this.upgrades = this.upgradeConfigs.map(config => ({
      ...config,
      count: 0,
      lastAffordable: false
    }));

    // Initialize achievements system
    this.achievements = this.initializeAchievements();
    this.unlockedAchievements = new Set();

    this.loadGame();
    this.initializeUI();
    this.startGameLoop();
    this.setupAutosave();
    this.checkAchievements(); // Initial achievement check
  }

  initializeAchievements() {
    const createAchievementTiers = (baseTitle, criterion, thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `${baseTitle.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
        title: `${baseTitle} ${index + 1}`,
        description: criterion.replace('{X}', threshold.toLocaleString()),
        condition: () => criterion.includes('Click') ? 
          (this.clickPower >= threshold) : 
          (criterion.includes('Passive') ? 
            (this.passiveIncome >= threshold) : 
            (this.money >= threshold))
      }));
    };

    const createUpgradeAchievements = (upgradeId, name, thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `${upgradeId}_${index + 1}`,
        title: `${name} Master ${index + 1}`,
        description: `Own ${threshold} ${name} upgrades`,
        condition: () => this.upgrades.find(u => u.id === upgradeId)?.count >= threshold
      }));
    };

    const createSkillAchievements = (skillName, thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `${skillName.toLowerCase()}_${index + 1}`,
        title: `${skillName} Expert ${index + 1}`,
        description: `Reach ${skillName} level ${threshold}`,
        condition: () => this.skills[`${skillName.toLowerCase()}Level`] >= threshold
      }));
    };

    return [
      // Money achievements (100 tiers)
      ...createAchievementTiers('Money Maker', 'Accumulate €$ {X}', 
        Array.from({length: 100}, (_, i) => Math.floor(100 * Math.pow(1.5, i)))),
      
      // Click power achievements (100 tiers)
      ...createAchievementTiers('Click Master', 'Reach {X} click power', 
        Array.from({length: 100}, (_, i) => Math.floor(10 * Math.pow(1.4, i)))),
      
      // Passive income achievements (100 tiers)
      ...createAchievementTiers('Passive Master', 'Reach {X} passive income per second', 
        Array.from({length: 100}, (_, i) => Math.floor(5 * Math.pow(1.45, i)))),
      
      // Upgrade-specific achievements (40 tiers each, 120 total)
      ...createUpgradeAchievements('street_cred', 'Street Cred', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      ...createUpgradeAchievements('data_mining', 'Data Mining', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      ...createUpgradeAchievements('netrunner', 'Netrunner', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      
      // Skill achievements (20 tiers each, 100 total)
      ...createSkillAchievements('Body', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Reflexes', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Technical', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Intelligence', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Cool', Array.from({length: 20}, (_, i) => i + 1))
    ];
  }

  checkAchievements() {
    let newUnlocks = false;
    this.achievements.forEach(achievement => {
      if (!this.unlockedAchievements.has(achievement.id) && achievement.condition()) {
        this.unlockedAchievements.add(achievement.id);
        this.showAchievementNotification(achievement);
        newUnlocks = true;
      }
    });
    if (newUnlocks) {
      this.renderAchievements();
    }
  }

  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <h3>Achievement Unlocked!</h3>
      <p>${achievement.title}</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }

  initializeUI() {
    this.moneyDisplay = document.getElementById('money');
    this.clickPowerDisplay = document.getElementById('click-power');
    this.passiveIncomeDisplay = document.getElementById('passive-income');
    this.upgradeList = document.getElementById('upgrade-list');
    this.hustleBtn = document.getElementById('hustle-btn');
    this.skillsList = document.getElementById('skills-list');
    this.achievementsList = document.getElementById('achievements-list');
    this.hustleBtn.addEventListener('click', () => this.click());
    this.renderUpgrades();
    this.renderSkills();
    this.updateDisplay();
    this.renderAchievements();
  }

  calculateSkillCost(currentLevel) {
    return Math.floor(this.skillCosts.base * Math.pow(this.skillCosts.multiplier, currentLevel - 1));
  }

  upgradeSkill(skillName) {
    const currentLevel = this.skills[skillName];
    const cost = this.calculateSkillCost(currentLevel);
    
    if (this.money >= cost) {
      this.money -= cost;
      this.skills[skillName]++;
      
      // Apply skill effects
      switch(skillName) {
        case 'bodyLevel':
          this.clickPower += 0.5;
          break;
        case 'reflexesLevel':
          this.passiveIncome += 0.2;
          break;
        case 'technicalLevel':
          this.clickPower += 0.3;
          this.passiveIncome += 0.1;
          break;
        case 'intelligenceLevel':
          this.passiveIncome += 0.3;
          break;
        case 'coolLevel':
          this.clickPower += 0.2;
          this.passiveIncome += 0.2;
          break;
      }
      
      this.updateDisplay();
      this.renderSkills();
    }
  }

  renderSkills() {
    const skillsData = {
      bodyLevel: { name: 'Body', description: 'Increases click power by 0.5' },
      reflexesLevel: { name: 'Reflexes', description: 'Increases passive income by 0.2' },
      technicalLevel: { name: 'Technical', description: 'Increases click power by 0.3 and passive income by 0.1' },
      intelligenceLevel: { name: 'Intelligence', description: 'Increases passive income by 0.3' },
      coolLevel: { name: 'Cool', description: 'Increases click power by 0.2 and passive income by 0.2' }
    };

    this.skillsList.innerHTML = '';
    Object.entries(this.skills).forEach(([skillKey, level]) => {
      const cost = this.calculateSkillCost(level);
      const element = document.createElement('div');
      element.className = `skill-item ${this.money >= cost ? '' : 'disabled'}`;
      element.innerHTML = `
        <h3>${skillsData[skillKey].name} (Level ${level})</h3>
        <p>${skillsData[skillKey].description}</p>
        <p>Cost: €$ ${this.formatNumber(cost)}</p>
      `;
      
      if (this.money >= cost) {
        element.addEventListener('click', () => this.upgradeSkill(skillKey));
      }
      
      this.skillsList.appendChild(element);
    });
  }

  saveGame() {
    const saveData = {
      money: this.money,
      clickPower: this.clickPower,
      passiveIncome: this.passiveIncome,
      upgrades: this.upgrades.map(upgrade => ({
        id: upgrade.id,
        count: upgrade.count,
        lastAffordable: upgrade.lastAffordable
      })),
      skills: this.skills,
      lastUpdate: this.lastUpdate,
      unlockedAchievements: Array.from(this.unlockedAchievements)
    };
    localStorage.setItem('nightCityHustlerSave', JSON.stringify(saveData));
    this.showSaveNotification();
  }

  loadGame() {
    const savedGame = localStorage.getItem('nightCityHustlerSave');
    if (savedGame) {
      const saveData = JSON.parse(savedGame);
      this.money = saveData.money;
      this.clickPower = saveData.clickPower;
      this.passiveIncome = saveData.passiveIncome;
      this.skills = saveData.skills;
      this.lastUpdate = saveData.lastUpdate;

      // Restore upgrades with their counts while maintaining the original configs
      if (saveData.upgrades) {
        this.upgrades = this.upgradeConfigs.map(config => {
          const savedUpgrade = saveData.upgrades.find(u => u.id === config.id);
          return {
            ...config,
            count: savedUpgrade ? savedUpgrade.count : 0,
            lastAffordable: savedUpgrade ? savedUpgrade.lastAffordable : false
          };
        });
      }

      // Calculate offline progress
      const now = Date.now();
      const offlineTime = (now - this.lastUpdate) / 1000;
      if (offlineTime > 0) {
        this.money += this.passiveIncome * offlineTime;
        this.lastUpdate = now;
      }
      this.unlockedAchievements = new Set(saveData.unlockedAchievements || []);
    }
  }

  setupAutosave() {
    setInterval(() => this.saveGame(), 30000); // Autosave every 30 seconds
  }

  formatNumber(num) {
    return num.toLocaleString('en-US');
  }

  click() {
    this.money += this.clickPower;
    this.updateDisplay();
    this.createFloatingText(this.hustleBtn, `+${this.formatNumber(this.clickPower)} €$`);
  }

  createFloatingText(element, text) {
    const floating = document.createElement('div');
    floating.className = 'floating-text';
    floating.textContent = text;
    
    const rect = element.getBoundingClientRect();
    floating.style.left = `${rect.left + rect.width / 2}px`;
    floating.style.top = `${rect.top}px`;
    
    document.body.appendChild(floating);
    
    setTimeout(() => floating.remove(), 1000);
  }

  calculateUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.count));
  }

  purchaseUpgrade(upgrade) {
    const cost = this.calculateUpgradeCost(upgrade);
    if (this.money >= cost) {
      this.money -= cost;
      upgrade.count++;
      upgrade.applyEffect(this);
      this.updateDisplay();
      this.renderUpgrades();
    }
  }

  renderUpgrades() {
    this.upgradeList.innerHTML = '';
    this.upgrades.forEach(upgrade => {
      const cost = this.calculateUpgradeCost(upgrade);
      const element = document.createElement('div');
      element.className = `upgrade-item ${this.money >= cost ? '' : 'disabled'}`;
      element.innerHTML = `
        <h3>${upgrade.name} (${upgrade.count})</h3>
        <p>${upgrade.description}</p>
        <p>Cost: €$ ${this.formatNumber(cost)}</p>
      `;
      
      // Only add click listener if player can afford the upgrade
      if (this.money >= cost) {
        element.addEventListener('click', () => {
          this.purchaseUpgrade(upgrade);
        });
      }
      
      this.upgradeList.appendChild(element);
    });
  }

  updateDisplay() {
    this.moneyDisplay.textContent = this.formatNumber(Math.floor(this.money));
    this.clickPowerDisplay.textContent = this.formatNumber(this.clickPower);
    this.passiveIncomeDisplay.textContent = this.formatNumber(this.passiveIncome);
    
    // Check if any upgrade's affordability has changed before re-rendering
    const shouldRerender = this.upgrades.some(upgrade => {
      const cost = this.calculateUpgradeCost(upgrade);
      const wasAffordable = upgrade.lastAffordable;
      const isAffordable = this.money >= cost;
      upgrade.lastAffordable = isAffordable;
      return wasAffordable !== isAffordable;
    });

    if (shouldRerender) {
      this.renderUpgrades();
    }
    this.checkAchievements();
  }

  renderAchievements() {
    if (!this.achievementsList) return;
    
    this.achievementsList.innerHTML = '';
    
    // Create achievement categories
    const categories = {
      'Money': this.achievements.filter(a => a.id.startsWith('money')),
      'Click Power': this.achievements.filter(a => a.id.startsWith('click')),
      'Passive Income': this.achievements.filter(a => a.id.startsWith('passive')),
      'Upgrades': this.achievements.filter(a => 
        ['street_cred', 'data_mining', 'netrunner'].some(prefix => a.id.startsWith(prefix))),
      'Skills': this.achievements.filter(a => 
        ['body', 'reflexes', 'technical', 'intelligence', 'cool'].some(prefix => a.id.startsWith(prefix)))
    };

    Object.entries(categories).forEach(([categoryName, categoryAchievements]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'achievement-category';
      categoryDiv.innerHTML = `<h3>${categoryName}</h3>`;

      const achievementsGrid = document.createElement('div');
      achievementsGrid.className = 'achievements-grid';

      categoryAchievements.forEach(achievement => {
        const isUnlocked = this.unlockedAchievements.has(achievement.id);
        const achievementDiv = document.createElement('div');
        achievementDiv.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementDiv.innerHTML = `
          <h4>${isUnlocked ? achievement.title : '???'}</h4>
          <p>${isUnlocked ? achievement.description : 'Achievement locked'}</p>
        `;
        achievementsGrid.appendChild(achievementDiv);
      });

      categoryDiv.appendChild(achievementsGrid);
      this.achievementsList.appendChild(categoryDiv);
    });

    // Update achievement stats
    const statsDiv = document.createElement('div');
    statsDiv.className = 'achievements-stats';
    statsDiv.innerHTML = `
      <p>Achievements Unlocked: ${this.unlockedAchievements.size}/${this.achievements.length} 
      (${((this.unlockedAchievements.size / this.achievements.length) * 100).toFixed(1)}%)</p>
    `;
    this.achievementsList.prepend(statsDiv);
  }

  startGameLoop() {
    setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastUpdate) / 1000;
      this.money += this.passiveIncome * elapsed;
      this.lastUpdate = now;
      this.updateDisplay();
    }, 100);
  }

  showSaveNotification() {
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = 'Game saved!';
    document.body.appendChild(notification);
    
    // Remove the notification after animation completes
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
}

const game = new Game();