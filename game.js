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
        condition: () => {
          if (criterion.includes('Click')) {
            return this.clickPower >= threshold;
          } else if (criterion.includes('Passive')) {
            return this.passiveIncome >= threshold;
          } else if (criterion.includes('Earn total of')) {
            return this.money >= threshold;
          } else if (criterion.includes('Reach clicks per second')) {
            return this.clickPower >= threshold;
          } else {
            return this.money >= threshold;
          }
        }
      }));
    };

    const createUpgradeAchievements = (upgradeId, name, thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `${upgradeId}_${index + 1}`,
        title: `${name} Master ${index + 1}`,
        description: `Own ${threshold} ${name} upgrades`,
        condition: () => {
          const upgrade = this.upgrades.find(u => u.id === upgradeId);
          return upgrade ? upgrade.count >= threshold : false;
        }
      }));
    };

    const createSkillAchievements = (skillName, thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `${skillName.toLowerCase()}_${index + 1}`,
        title: `${skillName} Expert ${index + 1}`,
        description: `Reach ${skillName} level ${threshold}`,
        condition: () => {
          const skillKey = `${skillName.toLowerCase()}Level`;
          return this.skills[skillKey] >= threshold;
        }
      }));
    };

    const createMultiSkillAchievements = (thresholds) => {
      return thresholds.map((threshold, index) => ({
        id: `all_skills_${index + 1}`,
        title: `Night City Legend ${index + 1}`,
        description: `Reach level ${threshold} in all skills`,
        condition: () => {
          return Object.values(this.skills).every(level => level >= threshold);
        }
      }));
    };

    const createComboAchievements = () => {
      const combinations = [
        { skills: ['bodyLevel', 'reflexesLevel'], name: 'Solo', levels: Array.from({length: 50}, (_, i) => i + 1) },
        { skills: ['intelligenceLevel', 'technicalLevel'], name: 'Netrunner', levels: Array.from({length: 50}, (_, i) => i + 1) },
        { skills: ['coolLevel', 'intelligenceLevel'], name: 'Fixer', levels: Array.from({length: 50}, (_, i) => i + 1) },
        { skills: ['bodyLevel', 'technicalLevel'], name: 'Tech', levels: Array.from({length: 50}, (_, i) => i + 1) }
      ];

      return combinations.flatMap(combo => 
        combo.levels.map((level, index) => ({
          id: `${combo.name.toLowerCase()}_combo_${index + 1}`,
          title: `${combo.name} ${index + 1}`,
          description: `Reach level ${level} in both ${combo.skills.map(s => s.replace('Level', '')).join(' and ')}`,
          condition: () => combo.skills.every(skill => this.skills[skill] >= level)
        }))
      );
    };

    return [
      // Original achievements (500)
      ...createAchievementTiers('Money Maker', 'Accumulate €$ {X}', 
        Array.from({length: 100}, (_, i) => Math.floor(100 * Math.pow(1.5, i)))),
      ...createAchievementTiers('Click Master', 'Reach {X} click power', 
        Array.from({length: 100}, (_, i) => Math.floor(10 * Math.pow(1.4, i)))),
      ...createAchievementTiers('Passive Master', 'Reach {X} passive income per second', 
        Array.from({length: 100}, (_, i) => Math.floor(5 * Math.pow(1.45, i)))),
      ...createUpgradeAchievements('street_cred', 'Street Cred', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      ...createUpgradeAchievements('data_mining', 'Data Mining', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      ...createUpgradeAchievements('netrunner', 'Netrunner', 
        Array.from({length: 40}, (_, i) => (i + 1) * 5)),
      ...createSkillAchievements('Body', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Reflexes', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Technical', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Intelligence', Array.from({length: 20}, (_, i) => i + 1)),
      ...createSkillAchievements('Cool', Array.from({length: 20}, (_, i) => i + 1)),

      // New achievements (500)
      ...createAchievementTiers('Eddie King', 'Earn total of €$ {X}', 
        Array.from({length: 100}, (_, i) => Math.floor(1000 * Math.pow(1.6, i)))),
      ...createAchievementTiers('Speed Demon', 'Reach {X} clicks per second', 
        Array.from({length: 100}, (_, i) => Math.floor(20 * Math.pow(1.3, i)))),
      ...createMultiSkillAchievements(Array.from({length: 100}, (_, i) => i + 1)),
      ...createComboAchievements(),
      // Extended skill achievements (100 more)
      ...createSkillAchievements('Body', Array.from({length: 20}, (_, i) => i + 21)),
      ...createSkillAchievements('Reflexes', Array.from({length: 20}, (_, i) => i + 21)),
      ...createSkillAchievements('Technical', Array.from({length: 20}, (_, i) => i + 21)),
      ...createSkillAchievements('Intelligence', Array.from({length: 20}, (_, i) => i + 21)),
      ...createSkillAchievements('Cool', Array.from({length: 20}, (_, i) => i + 21))
    ];
  }

  checkAchievements() {
    let newUnlocks = false;
    this.achievements.forEach(achievement => {
      try {
        if (!this.unlockedAchievements.has(achievement.id) && achievement.condition()) {
          this.unlockedAchievements.add(achievement.id);
          this.showAchievementNotification(achievement);
          newUnlocks = true;
        }
      } catch (error) {
        console.error(`Error checking achievement ${achievement.id}:`, error);
      }
    });
    
    if (newUnlocks) {
      this.saveGame(); // Save immediately when new achievements are unlocked
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
      try {
        const saveData = JSON.parse(savedGame);
        this.money = saveData.money || 0;
        this.clickPower = saveData.clickPower || 1;
        this.passiveIncome = saveData.passiveIncome || 0;
        this.skills = saveData.skills || this.skills;
        this.lastUpdate = saveData.lastUpdate || Date.now();
        
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

        // Restore achievements
        this.unlockedAchievements = new Set(saveData.unlockedAchievements || []);

      } catch (error) {
        console.error('Error loading save:', error);
        // If there's an error loading the save, start fresh
        this.money = 0;
        this.clickPower = 1;
        this.passiveIncome = 0;
        this.lastUpdate = Date.now();
        this.unlockedAchievements = new Set();
      }
    }
    
    // Perform an initial achievement check after loading
    this.checkAchievements();
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
    
    // Random direction offset
    const xOffset = (Math.random() - 0.5) * 100; // Random X between -50 and 50
    const yOffset = (Math.random() - 0.5) * 50; // Random Y between -25 and 25
    
    floating.style.setProperty('--x-offset', `${xOffset}px`);
    floating.style.setProperty('--y-offset', `${yOffset}px`);
    floating.style.left = `${rect.left + rect.width / 2}px`;
    floating.style.top = `${rect.top + rect.height / 2}px`;
    
    // Add animation
    floating.style.animation = 'float-away 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
    
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
    
    // Only check achievements every second instead of every update
    if (!this._lastAchievementCheck || Date.now() - this._lastAchievementCheck >= 1000) {
      this.checkAchievements();
      this._lastAchievementCheck = Date.now();
    }
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
        ['body', 'reflexes', 'technical', 'intelligence', 'cool'].some(prefix => a.id.startsWith(prefix))),
      'Eddie King': this.achievements.filter(a => a.id.startsWith('eddie_king')),
      'Speed Demon': this.achievements.filter(a => a.id.startsWith('speed_demon')),
      'Night City Legend': this.achievements.filter(a => a.id.startsWith('all_skills')),
      'Combos': this.achievements.filter(a => a.id.includes('combo'))
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
