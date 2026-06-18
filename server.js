const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'nexus_apostas_cyber_secret';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Helper to check authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES (REAL & SIMULATED)
// ----------------------------------------------------

// GET: Check authentication status
app.get('/api/user/me', async (req, res) => {
  if (req.session.user) {
    const user = await db.getUserById(req.session.user.id);
    if (user) {
      req.session.user = user;
    }
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

// POST: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  return res.json({ success: true });
});

// GET: Discord Login Redirect
app.get('/auth/discord', (req, res) => {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    // If credentials are empty, redirect to simulated login immediately
    const redirectUrl = `/auth/mock?username=AndreAlves` + Math.floor(100 + Math.random() * 900);
    return res.redirect(redirectUrl);
  }

  // Real OAuth2 flow
  const host = req.get('host');
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const redirectUri = `${proto}://${host}/auth/discord/callback`;
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
  
  return res.redirect(discordAuthUrl);
});

// GET: Discord Callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_auth_code');

  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;
  const host = req.get('host');
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const redirectUri = `${proto}://${host}/auth/discord/callback`;

  try {
    // Exchange token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!tokenResponse.ok) throw new Error('Falha na troca de código do Discord');
    const tokenData = await tokenResponse.json();
    
    // Get profile
    const profileResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileResponse.ok) throw new Error('Falha ao ler perfil do Discord');
    const userData = await profileResponse.json();

    const discordId = userData.id;
    const username = userData.global_name || userData.username;
    const avatar = userData.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`;

    // Try sync roles using bot token if available
    let roles = [];
    if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID) {
      try {
        const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
        });
        if (guildResponse.ok) {
          const memberData = await guildResponse.json();
          roles = memberData.roles || [];
        }
      } catch (err) {
        console.error('Erro ao ler cargos reais do Discord:', err.message);
      }
    }

    let user = await db.getUserByDiscordId(discordId);
    if (!user) {
      user = await db.createUser({
        discord_id: discordId,
        username,
        avatar,
        balance: 0 // Start with 0 Euros
      });
    } else {
      user = await db.updateUser(user.id, { username, avatar });
    }

    // Add roles if found
    if (roles.length > 0) {
      const dbRoles = [];
      if (roles.includes(process.env.ROLE_SOCIO)) dbRoles.push('Sócio Nexus');
      if (roles.includes(process.env.ROLE_ELITE)) dbRoles.push('Apostador de Elite');
      if (roles.includes(process.env.ROLE_HIGH_ROLLER)) dbRoles.push('Nexus High-Roller');
      await db.updateUser(user.id, { roles: dbRoles });
    }

    req.session.user = user;
    return res.redirect('/?login=success');
  } catch (error) {
    console.error('Erro no OAuth Discord:', error);
    return res.redirect('/?error=oauth_failed');
  }
});

// GET: Mock Login route for easy sandbox testing
app.get('/auth/mock', async (req, res) => {
  const username = req.query.username || 'NexusPlayer';
  const cleanUsername = username.replace(/[^a-zA-Z0-9_\s]/g, '').slice(0, 15);
  const mockDiscordId = 'mock_discord_' + Math.floor(1000000000 + Math.random() * 9000000000);
  
  let user = await db.getUserByDiscordId(mockDiscordId);
  if (!user) {
    user = await db.createUser({
      discord_id: mockDiscordId,
      username: cleanUsername,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${cleanUsername}`,
      balance: 0, // Start with 0 Euros
      xp: 0,
      level: 1,
      roles: [],
      coupons: []
    });
  }

  req.session.user = user;
  return res.redirect('/?login=success');
});

// ----------------------------------------------------
// VIRTUAL CURRENCY SYNC & DAILY REWARDS API
// ----------------------------------------------------

// POST: Sincronizar saldo com atividade do Discord
app.post('/api/user/sync', requireAuth, async (req, res) => {
  const user = await db.getUserById(req.session.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

  // Rate-limiting/Cooldown logic for sync: 3 days (259,200,000 ms)
  const now = new Date();
  const lastSync = user.last_sync ? new Date(user.last_sync) : null;
  const cooldownMs = 3 * 24 * 60 * 60 * 1000;

  if (lastSync && (now - lastSync) < cooldownMs) {
    const diffMs = cooldownMs - (now - lastSync);
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    return res.status(429).json({ error: `Aguarde ${days}d ${hours}h ${minutes}m para sincronizar novamente com o Discord.` });
  }

  // Simulate obtaining Euros from Discord activity - fixed to exactly 2 €
  const earnedCoins = 2;
  const updatedBalance = user.balance + earnedCoins;
  
  await db.updateUser(user.id, {
    balance: updatedBalance,
    last_sync: now.toISOString()
  });

  await db.createTransaction(user.id, 'discord_sync', earnedCoins, `Sincronização de atividade no Discord: +${earnedCoins} €`);

  return res.json({
    success: true,
    earned: earnedCoins,
    balance: updatedBalance,
    nextSync: new Date(now.getTime() + cooldownMs).toISOString()
  });
});

// POST: Resgatar recompensa diária (Daily Rewards)
app.post('/api/user/daily', requireAuth, async (req, res) => {
  const user = await db.getUserById(req.session.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

  const now = new Date();
  const lastDaily = user.last_daily_claim ? new Date(user.last_daily_claim) : null;
  const dailyCooldown = 24 * 60 * 60 * 1000; // 24 hours in production

  if (lastDaily && (now - lastDaily) < dailyCooldown) {
    const diffMs = dailyCooldown - (now - lastDaily);
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
    return res.status(429).json({ error: `Aguarde ${hours}h ${minutes}m ${seconds}s para reivindicar a sua recompensa diária novamente.` });
  }

  const rewardAmount = 1; // 1 Euro daily
  const updatedBalance = user.balance + rewardAmount;

  await db.updateUser(user.id, {
    balance: updatedBalance,
    last_daily_claim: now.toISOString()
  });

  await db.createTransaction(user.id, 'daily_reward', rewardAmount, `Recompensa diária coletada: +${rewardAmount} €`);

  return res.json({
    success: true,
    claimed: rewardAmount,
    balance: updatedBalance,
    nextDaily: new Date(now.getTime() + dailyCooldown).toISOString()
  });
});

// POST: Resgatar cupão
app.post('/api/user/redeem-coupon', requireAuth, async (req, res) => {
  const { coupon } = req.body;
  if (!coupon) return res.status(400).json({ error: 'Código de cupão em falta.' });

  const user = await db.getUserById(req.session.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

  const cleanCoupon = coupon.trim().toLowerCase();
  if (cleanCoupon !== 'nexus') {
    return res.status(400).json({ error: 'Cupão inválido!' });
  }

  // Ensure coupons array exists
  const coupons = user.coupons || [];
  if (coupons.includes('nexus')) {
    return res.status(400).json({ error: 'Já resgataste este cupão!' });
  }

  // Redeem
  const updatedBalance = user.balance + 20;
  coupons.push('nexus');

  await db.updateUser(user.id, {
    balance: updatedBalance,
    coupons: coupons
  });

  await db.createTransaction(user.id, 'coupon_redeem', 20, 'Resgate de cupão Nexus: +20 €');

  return res.json({
    success: true,
    balance: updatedBalance,
    message: 'Cupão Nexus resgatado com sucesso! +20 € adicionados ao teu saldo.'
  });
});

// ----------------------------------------------------
// SPORTS & BETTING API
// ----------------------------------------------------

// GET: List all matches
app.get('/api/matches', async (req, res) => {
  const matches = await db.getMatches();
  return res.json(matches);
});

// GET: User bet history
app.get('/api/bets', requireAuth, async (req, res) => {
  const bets = await db.getBetsByUserId(req.session.user.id);
  return res.json(bets);
});

// POST: Place a bet
app.post('/api/bets/place', requireAuth, async (req, res) => {
  const { matchId, betType, selectionName, odd, amount, scorerId, scorerName, scorerTeamId, scorerTeam } = req.body;

  if (!matchId || !betType || !selectionName || !odd || !amount) {
    return res.status(400).json({ error: 'Faltam dados obrigatórios para a aposta' });
  }

  const intAmount = parseInt(amount);
  if (isNaN(intAmount) || intAmount <= 0) {
    return res.status(400).json({ error: 'Quantia de aposta inválida' });
  }

  try {
    const match = await db.getMatchById(matchId);
    if (!match) return res.status(404).json({ error: 'Jogo não encontrado' });
    if (match.status === 'finished') {
      return res.status(400).json({ error: 'Não é possível apostar num jogo terminado' });
    }

    const potential_win = intAmount * parseFloat(odd);
    
    const newBet = await db.createBet({
      user_id: req.session.user.id,
      match_id: matchId,
      type: betType,
      selectionName,
      odd,
      amount: intAmount,
      potential_win,
      scorerId,
      scorerName,
      scorerTeamId,
      scorerTeam
    });

    return res.json({ success: true, bet: newBet });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// ----------------------------------------------------
// REWARDS STORE API
// ----------------------------------------------------

// GET: Store Items
app.get('/api/rewards', async (req, res) => {
  const items = await db.getRewards();
  return res.json(items);
});

// POST: Redeem item
app.post('/api/rewards/redeem', requireAuth, async (req, res) => {
  const { rewardId } = req.body;
  if (!rewardId) return res.status(400).json({ error: 'Falta ID da recompensa' });

  const user = await db.getUserById(req.session.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });

  const reward = await db.getRewardById(rewardId);
  if (!reward) return res.status(404).json({ error: 'Recompensa não encontrada' });

  if (user.balance < reward.cost) {
    return res.status(400).json({ error: 'Saldo virtual insuficiente' });
  }

  // Deduct balance
  user.balance -= reward.cost;
  
  // Assign role or reward items
  let roleAssigned = '';
  if (reward.type === 'role') {
    let roleFriendly = '';
    if (reward.role_id === 'ROLE_SOCIO') roleFriendly = 'Sócio Nexus';
    if (reward.role_id === 'ROLE_ELITE') roleFriendly = 'Apostador de Elite';
    if (reward.role_id === 'ROLE_HIGH_ROLLER') roleFriendly = 'Nexus High-Roller';

    if (user.roles.includes(roleFriendly)) {
      return res.status(400).json({ error: `Já possui este cargo: ${roleFriendly}` });
    }
    user.roles.push(roleFriendly);
    roleAssigned = roleFriendly;
  }

  await db.updateUser(user.id, {
    balance: user.balance,
    roles: user.roles
  });

  await db.createTransaction(user.id, 'redeem_reward', -reward.cost, `Resgate de recompensa: ${reward.name}`);

  // Simulating Discord Bot action and performing real API call if credentials exist
  const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;
  if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && reward.role_id && user.discord_id && !user.discord_id.startsWith('mock_')) {
    const roleId = process.env[reward.role_id];
    if (roleId) {
      try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${user.discord_id}/roles/${roleId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Erro API Discord: ${response.status} ${response.statusText}`);
        }
        console.log(`[DISCORD BOT] Cargo ${roleId} atribuído com sucesso a ${user.username} (${user.discord_id})`);
      } catch (err) {
        console.error('Falha ao atribuir cargo real no Discord:', err.message);
      }
    }
  } else {
    console.log(`[DISCORD BOT SIMULATION] Added role ${reward.role_id} to user ${user.username} (${user.discord_id})`);
  }

  return res.json({
    success: true,
    balance: user.balance,
    roles: user.roles,
    message: reward.type === 'role' 
      ? `Sucesso! O cargo "${roleAssigned}" foi adicionado à tua conta no Discord.`
      : `Sucesso! Resgatou: ${reward.name}`
  });
});

// GET: User transactions
app.get('/api/transactions', requireAuth, async (req, res) => {
  const txs = await db.getTransactionsByUserId(req.session.user.id);
  return res.json(txs);
});

// ----------------------------------------------------
// DYNAMIC LIVE MATCH SIMULATOR ENGINE
// ----------------------------------------------------
function startLiveSimulator() {
  setInterval(async () => {
    const matches = await db.getMatches();
    const liveMatches = matches.filter(m => m.status === 'live' && !m.id.startsWith('real_') && !m.id.startsWith('espn_'));

    for (const match of liveMatches) {
      // 1. Tick minute (advance by 3 mins per tick to speed up play)
      let nextMin = match.minute + 3;
      let scoreHome = match.score_home;
      let scoreAway = match.score_away;
      let status = 'live';

      // 2. Goal probability (approx. 4% chance of goal for either team in a 3-min tick)
      const r = Math.random();
      if (r < 0.04) {
        if (Math.random() < 0.55) {
          // Home goal (slightly weighted)
          scoreHome += 1;
          console.log(`[SIMULATOR] GOL! ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team} (${nextMin}')`);
        } else {
          scoreAway += 1;
          console.log(`[SIMULATOR] GOL! ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team} (${nextMin}')`);
        }
      }

      // 3. Game finished condition
      if (nextMin >= 90) {
        nextMin = 90;
        status = 'finished';
        console.log(`[SIMULATOR] Jogo Terminado: ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team}`);
      }

      // 4. Update live odds dynamically
      const timeRemainingFactor = (90 - nextMin) / 90;
      let odds = { ...match.odds };

      if (status === 'live') {
        const goalDiff = scoreHome - scoreAway;
        if (goalDiff > 0) {
          // Home is leading
          odds.win_home = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / goalDiff).toFixed(2));
          odds.win_away = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 2.5).toFixed(2));
          odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 1.5).toFixed(2));
        } else if (goalDiff < 0) {
          // Away is leading
          odds.win_away = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / Math.abs(goalDiff)).toFixed(2));
          odds.win_home = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 2.5).toFixed(2));
          odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 1.5).toFixed(2));
        } else {
          // Draw state
          odds.win_home = parseFloat((1.8 + timeRemainingFactor * 1.2).toFixed(2));
          odds.win_away = parseFloat((2.5 + timeRemainingFactor * 1.5).toFixed(2));
          odds.draw = parseFloat(Math.max(1.10, 1.4 + timeRemainingFactor * 2.0).toFixed(2));
        }

        // Adjust Over/Under 2.5 odds
        const totalGoals = scoreHome + scoreAway;
        if (totalGoals >= 3) {
          odds.over_2_5 = 1.01;
          odds.under_2_5 = 50.00;
        } else {
          if (totalGoals === 2) {
            odds.over_2_5 = parseFloat((1.2 + timeRemainingFactor * 0.8).toFixed(2));
            odds.under_2_5 = parseFloat((2.5 - timeRemainingFactor * 1.0).toFixed(2));
          } else if (totalGoals === 1) {
            odds.over_2_5 = parseFloat((1.7 + timeRemainingFactor * 1.3).toFixed(2));
            odds.under_2_5 = parseFloat((1.6 - timeRemainingFactor * 0.4).toFixed(2));
          } else {
            odds.over_2_5 = parseFloat((2.5 + timeRemainingFactor * 2.5).toFixed(2));
            odds.under_2_5 = parseFloat((1.3 + timeRemainingFactor * 0.4).toFixed(2));
          }
        }
      }

      await db.updateMatch(match.id, {
        minute: nextMin,
        score_home: scoreHome,
        score_away: scoreAway,
        status: status,
        odds: odds
      });

      // 5. If finished, settle all pending bets for this match!
      if (status === 'finished') {
        const bets = await db.getBetsByMatchId(match.id);
        const pendingBets = bets.filter(b => b.status === 'pending');

        for (const bet of pendingBets) {
          if (bet.type === 'scorer') continue;

          let betResult = 'lost';

          if (bet.type === '1' && scoreHome > scoreAway) betResult = 'won';
          else if (bet.type === 'X' && scoreHome === scoreAway) betResult = 'won';
          else if (bet.type === '2' && scoreHome < scoreAway) betResult = 'won';
          else if (bet.type === 'over' && (scoreHome + scoreAway) > 2.5) betResult = 'won';
          else if (bet.type === 'under' && (scoreHome + scoreAway) < 2.5) betResult = 'won';
          else if (bet.type === 'double_1X' && (scoreHome >= scoreAway)) betResult = 'won';
          else if (bet.type === 'double_12' && (scoreHome !== scoreAway)) betResult = 'won';
          else if (bet.type === 'double_X2' && (scoreHome <= scoreAway)) betResult = 'won';

          await db.settleBet(bet.id, betResult);
        }

        // Automatic scheduling logic: if a match finishes, start a new one after 15 seconds!
        // To keep the live panel active, rotate teams for a continuous experience
        setTimeout(async () => {
          const rotationTeams = [
            { name: 'Espanha', flag: 'ES' },
            { name: 'Itália', flag: 'IT' },
            { name: 'Alemanha', flag: 'DE' },
            { name: 'Brasil', flag: 'BR' },
            { name: 'Bélgica', flag: 'BE' },
            { name: 'Uruguai', flag: 'UY' },
            { name: 'Japão', flag: 'JP' },
            { name: 'Marrocos', flag: 'MA' }
          ];

          const t1 = rotationTeams[Math.floor(Math.random() * rotationTeams.length)];
          let t2 = rotationTeams[Math.floor(Math.random() * rotationTeams.length)];
          while (t2.name === t1.name) {
            t2 = rotationTeams[Math.floor(Math.random() * rotationTeams.length)];
          }

          const newLiveId = 'live_' + Date.now();
          const baseOdds = {
            win_home: parseFloat((1.5 + Math.random() * 2).toFixed(2)),
            draw: parseFloat((2.8 + Math.random() * 1.5).toFixed(2)),
            win_away: parseFloat((1.8 + Math.random() * 3).toFixed(2)),
            over_2_5: parseFloat((1.6 + Math.random() * 0.8).toFixed(2)),
            under_2_5: parseFloat((1.5 + Math.random() * 0.8).toFixed(2))
          };

          const newMatch = {
            id: newLiveId,
            home_team: t1.name,
            away_team: t2.name,
            home_logo: `https://flagsapi.com/${t1.flag}/flat/64.png`,
            away_logo: `https://flagsapi.com/${t2.flag}/flat/64.png`,
            status: 'live',
            minute: 1,
            score_home: 0,
            score_away: 0,
            competition: 'Campeonato do Mundo - Grupo M',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0].slice(0, 5),
            odds: baseOdds
          };

          await db.createMatch(newMatch);
          console.log(`[SIMULATOR] Novo Jogo Ao Vivo Agendado: ${t1.name} vs. ${t2.name}`);
        }, 15000);
      }
    }
  }, 5000);
}

// ----------------------------------------------------
// DYNAMIC LIVE ODDS CALCULATION HELPER
// ----------------------------------------------------
function calculateLiveOdds(scoreHome, scoreAway, minute, baseOdds) {
  const timeRemainingFactor = Math.max(0, (90 - minute) / 90);
  let odds = { ...baseOdds };

  const goalDiff = scoreHome - scoreAway;
  if (goalDiff > 0) {
    // Home is leading
    odds.win_home = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / goalDiff).toFixed(2));
    odds.win_away = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 2.5).toFixed(2));
    odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 1.5).toFixed(2));
  } else if (goalDiff < 0) {
    // Away is leading
    odds.win_away = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / Math.abs(goalDiff)).toFixed(2));
    odds.win_home = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 2.5).toFixed(2));
    odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 1.5).toFixed(2));
  } else {
    // Draw state
    odds.win_home = parseFloat((1.8 + timeRemainingFactor * 1.2).toFixed(2));
    odds.win_away = parseFloat((2.5 + timeRemainingFactor * 1.5).toFixed(2));
    odds.draw = parseFloat(Math.max(1.10, 1.4 + timeRemainingFactor * 2.0).toFixed(2));
  }

  // Adjust Over/Under 2.5 odds
  const totalGoals = scoreHome + scoreAway;
  if (totalGoals >= 3) {
    odds.over_2_5 = 1.01;
    odds.under_2_5 = 50.00;
  } else {
    if (totalGoals === 2) {
      odds.over_2_5 = parseFloat((1.2 + timeRemainingFactor * 0.8).toFixed(2));
      odds.under_2_5 = parseFloat((2.5 - timeRemainingFactor * 1.0).toFixed(2));
    } else if (totalGoals === 1) {
      odds.over_2_5 = parseFloat((1.7 + timeRemainingFactor * 1.3).toFixed(2));
      odds.under_2_5 = parseFloat((1.6 - timeRemainingFactor * 0.4).toFixed(2));
    } else {
      odds.over_2_5 = parseFloat((2.5 + timeRemainingFactor * 2.5).toFixed(2));
      odds.under_2_5 = parseFloat((1.3 + timeRemainingFactor * 0.4).toFixed(2));
    }
  }
  return odds;
}

// ----------------------------------------------------
// REAL-WORLD MATCHES API SYNCHRONIZATION ENGINE (ESPN)
// ----------------------------------------------------
async function syncESPNMatches() {
  console.log('[ESPN API] A sincronizar partidas reais...');
  
  const leagues = [
    { id: 'fifa.world', name: 'FIFA World Cup' }
  ];

  const today = new Date();
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const startStr = formatDate(today);
  const future = new Date(today.getTime());
  future.setDate(today.getDate() + 14);
  const endStr = formatDate(future);
  const dateRange = `${startStr}-${endStr}`;

  let matchesCount = 0;

  for (const lg of leagues) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.id}/scoreboard?dates=${dateRange}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[ESPN API] Falha ao obter dados para a liga ${lg.name}: Status ${response.status}`);
        continue;
      }

      const json = await response.json();
      const events = json.events || [];
      const competitionName = json.leagues && json.leagues[0] ? json.leagues[0].name : lg.name;

      for (const event of events) {
        const matchId = 'espn_' + event.id;
        const comp = event.competitions && event.competitions[0];
        if (!comp) continue;

        const homeCompetitor = comp.competitors.find(c => c.homeAway === 'home');
        const awayCompetitor = comp.competitors.find(c => c.homeAway === 'away');
        if (!homeCompetitor || !awayCompetitor) continue;

        const homeTeam = homeCompetitor.team.displayName;
        const awayTeam = awayCompetitor.team.displayName;
        const homeLogo = homeCompetitor.team.logo || 'https://flagsapi.com/US/flat/64.png';
        const awayLogo = awayCompetitor.team.logo || 'https://flagsapi.com/US/flat/64.png';

        // Status mapping: state 'in' -> live; state 'post' -> finished; others -> scheduled
        let status = 'scheduled';
        const state = event.status.type.state;
        if (state === 'in') {
          status = 'live';
        } else if (state === 'post') {
          status = 'finished';
        }

        const scoreHome = parseInt(homeCompetitor.score) || 0;
        const scoreAway = parseInt(awayCompetitor.score) || 0;
        const minute = event.status.clock ? Math.floor(event.status.clock / 60) : (status === 'live' ? 45 : 0);

        const existing = await db.getMatchById(matchId);

        // Keep existing odds or generate baseline realistic odds
        let baseOdds = existing ? existing.baseOdds || existing.odds : null;
        if (!baseOdds) {
          // Generate pre-match base odds
          const homeStrength = 1.2 + Math.random() * 2;
          const awayStrength = 1.2 + Math.random() * 3;
          baseOdds = {
            win_home: parseFloat(Math.max(1.10, homeStrength).toFixed(2)),
            draw: parseFloat((2.8 + Math.random() * 1.5).toFixed(2)),
            win_away: parseFloat(Math.max(1.20, awayStrength).toFixed(2)),
            over_2_5: parseFloat((1.5 + Math.random() * 0.9).toFixed(2)),
            under_2_5: parseFloat((1.4 + Math.random() * 0.9).toFixed(2))
          };
        }

        // Recalculate live odds if live, or keep base odds if scheduled
        let odds = { ...baseOdds };
        if (status === 'live') {
          odds = calculateLiveOdds(scoreHome, scoreAway, minute, baseOdds);
        }

        const matchObj = {
          id: matchId,
          home_team: homeTeam,
          away_team: awayTeam,
          home_logo: homeLogo,
          away_logo: awayLogo,
          status: status,
          minute: minute,
          score_home: scoreHome,
          score_away: scoreAway,
          competition: competitionName,
          date: event.date.split('T')[0],
          time: event.date.split('T')[1].slice(0, 5),
          baseOdds: baseOdds, // preserve starting odds
          odds: odds
        };

        if (existing) {
          await db.updateMatch(matchId, {
            minute: matchObj.minute,
            score_home: matchObj.score_home,
            score_away: matchObj.score_away,
            status: matchObj.status,
            odds: matchObj.odds
          });
        } else {
          await db.createMatch(matchObj);
        }

        matchesCount++;

        // If finished, settle pending bets
        if (status === 'finished' && (!existing || existing.status !== 'finished')) {
          const bets = await db.getBetsByMatchId(matchId);
          const pendingBets = bets.filter(b => b.status === 'pending');

          for (const bet of pendingBets) {
            if (bet.type === 'scorer') continue;

            let betResult = 'lost';
            if (bet.type === '1' && scoreHome > scoreAway) betResult = 'won';
            else if (bet.type === 'X' && scoreHome === scoreAway) betResult = 'won';
            else if (bet.type === '2' && scoreHome < scoreAway) betResult = 'won';
            else if (bet.type === 'over' && (scoreHome + scoreAway) > 2.5) betResult = 'won';
            else if (bet.type === 'under' && (scoreHome + scoreAway) < 2.5) betResult = 'won';

            await db.settleBet(bet.id, betResult);
          }
        }
      }
    } catch (err) {
      console.error(`[ESPN API] Erro ao sincronizar liga ${lg.name}:`, err.message);
    }
    
    // Brief delay to prevent API request spamming
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`[ESPN API] Sincronização concluída. ${matchesCount} partidas reais processadas.`);
}

// Start Simulator
startLiveSimulator();

// Start ESPN Matches Sync (Runs immediately and then every 60s)
syncESPNMatches();
setInterval(syncESPNMatches, 60000);

// Start Web Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  NEXUS APOSTAS SERVER RUNNING ON PORT ${PORT}`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
