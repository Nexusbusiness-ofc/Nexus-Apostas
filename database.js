const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

// Initial schema/defaults
let data = {
  users: [],
  bets: [],
  matches: [],
  transactions: [],
  rewards: [
    { id: 'role_socio', name: 'Cargo: Sócio Nexus', description: 'Atribui o cargo de Sócio Nexus no servidor Discord da comunidade.', cost: 50, type: 'role', role_id: 'ROLE_SOCIO', icon: 'shield-check' },
    { id: 'role_elite', name: 'Cargo: Apostador de Elite', description: 'Atribui o prestigiado cargo de Apostador de Elite no Discord.', cost: 100, type: 'role', role_id: 'ROLE_ELITE', icon: 'award' },
    { id: 'role_high_roller', name: 'Cargo: Nexus High-Roller', description: 'Para os maiores apostadores da comunidade. Cargo exclusivo.', cost: 250, type: 'role', role_id: 'ROLE_HIGH_ROLLER', icon: 'gem' },
    { id: 'vip_access', name: 'Acesso VIP Mensal', description: 'Entrada no canal privado de Tips e Prognósticos do Staff Nexus.', cost: 30, type: 'vip', role_id: null, icon: 'lock-open' }
  ]
};

// Default matches to prepopulate (empty to load real games in online mode)
const defaultMatches = [];

// Load from disk if file exists
if (fs.existsSync(dbPath)) {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    if (raw.trim()) {
      data = JSON.parse(raw);
    }
  } catch (error) {
    console.error('Falha ao ler db.json, reiniciando:', error.message);
  }
}

// Check if matches list is empty or needs resetting, and set defaults
if (!data.matches || data.matches.length === 0) {
  data.matches = defaultMatches;
  save();
}

function save() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erro ao guardar db.json:', error.message);
  }
}

const db = {
  // --- USERS ---
  async getUserById(id) {
    return data.users.find(u => u.id === id) || null;
  },

  async getUserByDiscordId(discordId) {
    return data.users.find(u => u.discord_id === discordId) || null;
  },

  async createUser({ discord_id, username, avatar, balance = 0, xp = 0, level = 1, roles = [], coupons = [] }) {
    const nextId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      discord_id,
      username,
      avatar: avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
      balance,
      wins: 0,
      losses: 0,
      xp,
      level,
      roles,
      coupons,
      last_daily_claim: null,
      last_sync: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    
    // Create initial transaction
    await this.createTransaction(nextId, 'initial_balance', balance, 'Saldo inicial de Euros');
    
    save();
    return newUser;
  },

  async updateUser(id, updates) {
    const idx = data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...updates };
      save();
      return data.users[idx];
    }
    return null;
  },

  async getAllUsers() {
    return [...data.users];
  },

  // --- MATCHES ---
  async getMatches() {
    return [...data.matches];
  },

  async getMatchById(id) {
    return data.matches.find(m => m.id === id) || null;
  },

  async updateMatch(id, updates) {
    const idx = data.matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      data.matches[idx] = { ...data.matches[idx], ...updates };
      save();
      return data.matches[idx];
    }
    return null;
  },

  async createMatch(matchObj) {
    data.matches.push(matchObj);
    // Limit total matches to keep it clean
    if (data.matches.length > 150) {
      data.matches.shift();
    }
    save();
    return matchObj;
  },

  // --- BETS ---
  async getBetsByUserId(userId) {
    return data.bets.filter(b => b.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getBetsByMatchId(matchId) {
    return data.bets.filter(b => b.match_id === matchId);
  },

  async createBet({ user_id, match_id, type, selectionName, odd, amount, potential_win }) {
    const nextId = data.bets.length > 0 ? Math.max(...data.bets.map(b => b.id)) + 1 : 1;
    const newBet = {
      id: nextId,
      user_id,
      match_id,
      type,
      selectionName,
      odd: parseFloat(odd),
      amount: parseInt(amount),
      potential_win: parseFloat(potential_win),
      status: 'pending',
      created_at: new Date().toISOString(),
      settled_at: null
    };

    // Deduct balance
    const user = await this.getUserById(user_id);
    if (!user || user.balance < amount) {
      throw new Error('Saldo insuficiente para realizar a aposta');
    }

    user.balance -= amount;
    user.xp += Math.floor(amount * 0.1); // 10% of bet amount as XP
    user.level = Math.floor(user.xp / 100) + 1; // 100 XP per level
    
    data.bets.push(newBet);
    
    // Log transaction
    await this.createTransaction(user_id, 'bet_placed', -amount, `Aposta realizada no jogo ${newBet.selectionName} (Odd: ${odd})`);
    
    save();
    return newBet;
  },

  async settleBet(betId, status) {
    const bet = data.bets.find(b => b.id === betId);
    if (!bet || bet.status !== 'pending') return null;

    bet.status = status;
    bet.settled_at = new Date().toISOString();

    const user = await this.getUserById(bet.user_id);
    if (user) {
      if (status === 'won') {
        user.balance += Math.floor(bet.potential_win);
        user.wins += 1;
        user.xp += Math.floor(bet.potential_win * 0.05) + 20; // Extra XP for winning
        user.level = Math.floor(user.xp / 100) + 1;
        
        await this.createTransaction(user.id, 'bet_win', Math.floor(bet.potential_win), `Ganhos da aposta #${bet.id} no jogo ID ${bet.match_id}`);
      } else {
        user.losses += 1;
        user.xp += 5; // small consolation XP
        user.level = Math.floor(user.xp / 100) + 1;
      }
    }

    save();
    return bet;
  },

  // --- TRANSACTIONS ---
  async getTransactionsByUserId(userId) {
    return data.transactions.filter(t => t.user_id === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async createTransaction(user_id, type, amount, description) {
    const nextId = data.transactions.length > 0 ? Math.max(...data.transactions.map(t => t.id)) + 1 : 1;
    const newTx = {
      id: nextId,
      user_id,
      type, // 'bet_placed', 'bet_win', 'daily_reward', 'discord_sync', 'redeem_reward'
      amount,
      description,
      timestamp: new Date().toISOString()
    };
    data.transactions.push(newTx);
    save();
    return newTx;
  },

  // --- REWARDS ---
  async getRewards() {
    return [...data.rewards];
  },

  async getRewardById(id) {
    return data.rewards.find(r => r.id === id) || null;
  }
};

module.exports = db;
