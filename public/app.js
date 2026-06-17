/* ==========================================================================
   NEXUS APOSTAS - FRONTEND APPLICATION LOGIC (DUAL ONLINE/OFFLINE MODE)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  let state = {
    user: null,
    matches: [],
    bets: [],
    rewards: [],
    activeSelection: null, // { matchId, betType, selectionName, odd, homeTeam, awayTeam }
    knownBets: {}, // betId -> status (to detect new wins)
    activeScreen: 'sportsbook',
    isLocalMode: false // True if server is offline or running on file:// protocol
  };

  // Default World Cup 2026 matches for Offline Mode
  const defaultMatches = [
    {
      id: 'wc_j16_1',
      home_team: 'França',
      away_team: 'Senegal',
      home_logo: 'https://flagsapi.com/FR/flat/64.png',
      away_logo: 'https://flagsapi.com/SN/flat/64.png',
      status: 'finished',
      minute: 90,
      score_home: 2,
      score_away: 1,
      competition: 'Campeonato do Mundo - Grupo I',
      date: '2026-06-16',
      time: '18:00',
      odds: { win_home: 1.45, draw: 4.20, win_away: 6.50, over_2_5: 1.80, under_2_5: 1.95 }
    },
    {
      id: 'wc_j16_2',
      home_team: 'Iraque',
      away_team: 'Noruega',
      home_logo: 'https://flagsapi.com/IQ/flat/64.png',
      away_logo: 'https://flagsapi.com/NO/flat/64.png',
      status: 'finished',
      minute: 90,
      score_home: 0,
      score_away: 2,
      competition: 'Campeonato do Mundo - Grupo I',
      date: '2026-06-16',
      time: '21:00',
      odds: { win_home: 5.50, draw: 3.80, win_away: 1.62, over_2_5: 1.90, under_2_5: 1.80 }
    },
    {
      id: 'wc_j16_3',
      home_team: 'Argentina',
      away_team: 'Argélia',
      home_logo: 'https://flagsapi.com/AR/flat/64.png',
      away_logo: 'https://flagsapi.com/DZ/flat/64.png',
      status: 'finished',
      minute: 90,
      score_home: 3,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo J',
      date: '2026-06-16',
      time: '18:00',
      odds: { win_home: 1.22, draw: 5.80, win_away: 12.00, over_2_5: 1.65, under_2_5: 2.10 }
    },
    {
      id: 'wc_j17_1',
      home_team: 'Portugal',
      away_team: 'RD Congo',
      home_logo: 'https://flagsapi.com/PT/flat/64.png',
      away_logo: 'https://flagsapi.com/CD/flat/64.png',
      status: 'live',
      minute: 34,
      score_home: 1,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo K',
      date: '2026-06-17',
      time: '12:00',
      odds: { win_home: 1.20, draw: 5.50, win_away: 15.00, over_2_5: 1.60, under_2_5: 2.20 }
    },
    {
      id: 'wc_j17_2',
      home_team: 'Inglaterra',
      away_team: 'Croácia',
      home_logo: 'https://flagsapi.com/GB/flat/64.png',
      away_logo: 'https://flagsapi.com/HR/flat/64.png',
      status: 'live',
      minute: 12,
      score_home: 0,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo L',
      date: '2026-06-17',
      time: '12:15',
      odds: { win_home: 1.95, draw: 3.20, win_away: 3.90, over_2_5: 2.10, under_2_5: 1.65 }
    },
    {
      id: 'wc_j17_3',
      home_team: 'Gana',
      away_team: 'Panamá',
      home_logo: 'https://flagsapi.com/GH/flat/64.png',
      away_logo: 'https://flagsapi.com/PA/flat/64.png',
      status: 'scheduled',
      minute: 0,
      score_home: 0,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo L',
      date: '2026-06-17',
      time: '18:00',
      odds: { win_home: 2.15, draw: 3.10, win_away: 3.40, over_2_5: 2.25, under_2_5: 1.57 }
    },
    {
      id: 'wc_j17_4',
      home_team: 'Usbequistão',
      away_team: 'Colômbia',
      home_logo: 'https://flagsapi.com/UZ/flat/64.png',
      away_logo: 'https://flagsapi.com/CO/flat/64.png',
      status: 'scheduled',
      minute: 0,
      score_home: 0,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo K',
      date: '2026-06-17',
      time: '21:00',
      odds: { win_home: 4.80, draw: 3.60, win_away: 1.70, over_2_5: 1.95, under_2_5: 1.75 }
    },
    {
      id: 'wc_j18_4',
      home_team: 'México',
      away_team: 'Coreia do Sul',
      home_logo: 'https://flagsapi.com/MX/flat/64.png',
      away_logo: 'https://flagsapi.com/KR/flat/64.png',
      status: 'scheduled',
      minute: 0,
      score_home: 0,
      score_away: 0,
      competition: 'Campeonato do Mundo - Grupo H',
      date: '2026-06-18',
      time: '21:00',
      odds: { win_home: 2.00, draw: 3.25, win_away: 3.65, over_2_5: 2.10, under_2_5: 1.65 }
    }
  ];

  const defaultRewards = [
    { id: 'role_socio', name: 'Cargo: Sócio Nexus', description: 'Atribui o cargo de Sócio Nexus no servidor Discord da comunidade.', cost: 2500, type: 'role', role_id: 'ROLE_SOCIO', icon: 'shield-check' },
    { id: 'role_elite', name: 'Cargo: Apostador de Elite', description: 'Atribui o prestigiado cargo de Apostador de Elite no Discord.', cost: 5000, type: 'role', role_id: 'ROLE_ELITE', icon: 'award' },
    { id: 'role_high_roller', name: 'Cargo: Nexus High-Roller', description: 'Para os maiores apostadores da comunidade. Cargo exclusivo.', cost: 10000, type: 'role', role_id: 'ROLE_HIGH_ROLLER', icon: 'gem' },
    { id: 'vip_access', name: 'Acesso VIP Mensal', description: 'Entrada no canal privado de Tips e Prognósticos do Staff Nexus.', cost: 1500, type: 'vip', role_id: null, icon: 'lock-open' }
  ];

  function initIcons() {
    if (typeof lucide !== 'undefined') {
      try {
        lucide.createIcons();
      } catch (e) {
        console.warn('Erro ao iniciar ícones:', e);
      }
    }
  }

  // --- INITIALIZATION ---
  init();

  async function init() {
    initIcons();

    // 1. Detect environment
    if (window.location.protocol === 'file:') {
      state.isLocalMode = true;
      initOfflineMode();
    } else {
      // Test server connection
      try {
        const res = await fetch('/api/user/me');
        if (!res.ok) throw new Error('Não responde');
        
        state.isLocalMode = false;
        checkAuthStatus();
        
        // Start polling online matches
        fetchMatches();
        setInterval(fetchMatches, 3000);
      } catch (err) {
        state.isLocalMode = true;
        initOfflineMode();
      }
    }

    // Bind event listeners
    setupEventListeners();

    // Initialize mousemove parallax for login overlay
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) {
      loginOverlay.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * -0.015;
        const moveY = (e.clientY - window.innerHeight / 2) * -0.015;
        loginOverlay.style.backgroundPosition = `calc(50% + ${moveX}px) calc(50% + ${moveY}px)`;
      });
    }

    // Initialize scroll parallax for promo banner inside content area
    const contentArea = document.querySelector('.content-area');
    const promoBanner = document.querySelector('.promo-banner');
    if (contentArea && promoBanner) {
      contentArea.addEventListener('scroll', () => {
        const scrollTop = contentArea.scrollTop;
        promoBanner.style.backgroundPosition = `50% ${scrollTop * 0.45}px`;
      });
    }

    // 2. Check query params for notification toasts (login success/error)
    checkQueryParams();
  }

  function checkQueryParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('login')) {
      if (params.get('login') === 'success') {
        showToast('Entraste com a tua conta Discord com sucesso!', 'success');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.has('error')) {
      if (params.get('error') === 'oauth_failed') {
        showToast('Falha na autenticação com o Discord. Tenta novamente.', 'error');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // --- OFFLINE / STANDALONE MODE SETUP ---
  function initOfflineMode() {
    console.log('[NEXUS APOSTAS] A correr em Modo Local/Offline (LocalStorage)');
    showToast('A correr em Modo Local Offline (Sem Servidor)', 'info');

    // Initialize LocalStorage structures if missing
    if (!localStorage.getItem('nexus_user')) {
      localStorage.setItem('nexus_user', 'null');
    }
    if (!localStorage.getItem('nexus_matches')) {
      localStorage.setItem('nexus_matches', JSON.stringify(defaultMatches));
    }
    if (!localStorage.getItem('nexus_bets')) {
      localStorage.setItem('nexus_bets', JSON.stringify([]));
    }
    if (!localStorage.getItem('nexus_transactions')) {
      localStorage.setItem('nexus_transactions', JSON.stringify([]));
    }

    // Load state from local storage
    const localUser = JSON.parse(localStorage.getItem('nexus_user'));
    state.matches = JSON.parse(localStorage.getItem('nexus_matches'));
    state.bets = JSON.parse(localStorage.getItem('nexus_bets'));
    state.rewards = defaultRewards;

    if (localUser) {
      state.user = localUser;
      document.getElementById('login-overlay').classList.add('hidden');
      document.getElementById('app-container').classList.remove('hidden');
      updateHeaderUI();
      initCooldownTimers();
      
      // Load baseline for bets win detection
      state.bets.forEach(b => {
        state.knownBets[b.id] = b.status;
      });
    } else {
      state.user = null;
      document.getElementById('login-overlay').classList.remove('hidden');
      document.getElementById('app-container').classList.add('hidden');
    }

    // Render matches immediately
    renderMatches();

    // Run client-side Live Simulator
    startLocalSimulator();
  }

  // --- EVENTS & SCREEN NAVIGATION ---
  function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = link.getAttribute('data-screen');
        switchScreen(screen);

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        document.getElementById('sidebar').classList.remove('active');
      });
    });

    // Mobile Sidebar Toggle
    document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('active');
    });

    // Mock Login Button inside Login Card
    document.getElementById('login-mock-btn').addEventListener('click', () => {
      if (state.isLocalMode) {
        // Offline Login
        const mockUser = {
          id: 'mock_local',
          discord_id: 'mock_discord_local_1337',
          username: 'André Alves (Offline)',
          avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=AndreAlves`,
          balance: 0,
          xp: 0,
          level: 1,
          roles: [],
          coupons: [],
          wins: 0,
          losses: 0,
          last_daily_claim: null,
          last_sync: null
        };
        localStorage.setItem('nexus_user', JSON.stringify(mockUser));
        state.user = mockUser;
        
        // Log transaction
        createLocalTransaction('initial_balance', 0, 'Saldo inicial de Euros');

        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        updateHeaderUI();
        initCooldownTimers();
        showToast('Login de testes efetuado localmente!', 'success');
        
        // Baseline bets
        state.bets = JSON.parse(localStorage.getItem('nexus_bets') || '[]');
        state.bets.forEach(b => {
          state.knownBets[b.id] = b.status;
        });
      } else {
        // Online Redirect
        window.location.href = '/auth/mock?username=AndreAlves';
      }
    });

    // Discord link click (warn if offline)
    document.getElementById('login-discord-link').addEventListener('click', (e) => {
      if (state.isLocalMode) {
        e.preventDefault();
        showToast('Integração real necessita que corra o Servidor Node! Use "Simular Conta Discord" offline.', 'error');
      }
    });

    // Daily Claim Button
    document.getElementById('claim-daily-btn').addEventListener('click', claimDailyReward);
    
    // Sync Balance Button
    document.getElementById('sync-discord-btn').addEventListener('click', syncDiscordBalance);

    // Redeem Coupon Button
    const couponBtn = document.getElementById('redeem-coupon-btn');
    if (couponBtn) {
      couponBtn.addEventListener('click', redeemCoupon);
    }

    // Header coins area shortcut to sync screen
    document.getElementById('user-coins-btn').addEventListener('click', () => {
      switchScreen('discord-sync');
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-screen') === 'discord-sync') l.classList.add('active');
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Bet slip stake input keyups
    const stakeInput = document.getElementById('bet-stake-input');
    stakeInput.addEventListener('input', updatePotentialWin);

    // Max Bet click
    document.getElementById('slip-max-bet').addEventListener('click', () => {
      if (!state.user) return;
      stakeInput.value = state.user.balance;
      updatePotentialWin();
    });

    // Place Bet Button
    document.getElementById('place-bet-btn').addEventListener('click', placeBet);

    // Close Win Celebration Modal
    document.getElementById('close-win-modal-btn').addEventListener('click', () => {
      document.getElementById('win-modal').classList.add('hidden');
    });

    // Scroll to live games button from banner
    document.querySelector('.scroll-to-live').addEventListener('click', () => {
      document.getElementById('live-section').scrollIntoView({ behavior: 'smooth' });
    });

    // Bets filter tabs
    document.querySelectorAll('#bets-filter-tabs .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#bets-filter-tabs .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderBetsList(btn.getAttribute('data-filter'));
      });
    });
  }

  function switchScreen(screenId) {
    state.activeScreen = screenId;
    document.querySelectorAll('.dashboard-screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }

    // Load data
    if (screenId === 'bets') {
      if (state.isLocalMode) {
        state.bets = JSON.parse(localStorage.getItem('nexus_bets') || '[]');
        renderBetsList('all');
      } else {
        fetchBetsHistory();
      }
    } else if (screenId === 'store') {
      if (state.isLocalMode) {
        renderStore();
      } else {
        fetchStoreRewards();
      }
    } else if (screenId === 'stats') {
      if (state.isLocalMode) {
        renderProfilePage(JSON.parse(localStorage.getItem('nexus_transactions') || '[]'));
      } else {
        fetchProfileStats();
      }
    }
  }

  // --- API CALLS & OFFLINE SIMULATION ---

  // 1. Check Auth Status (Online mode)
  async function checkAuthStatus() {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();
      
      if (data.loggedIn) {
        state.user = data.user;
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        updateHeaderUI();
        initCooldownTimers();
        fetchBetsHistory(true);
      } else {
        state.user = null;
        document.getElementById('login-overlay').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
      }
    } catch (err) {
      console.warn('Erro ao ler login online, ativando fallback local.');
    }
  }

  function updateHeaderUI() {
    if (!state.user) return;
    document.getElementById('header-balance').textContent = `${state.user.balance.toLocaleString()} €`;
    document.getElementById('header-username').textContent = state.user.username;
    document.getElementById('header-level').textContent = `Nível ${state.user.level}`;
    document.getElementById('header-avatar').src = state.user.avatar;
  }

  async function logout() {
    if (state.isLocalMode) {
      localStorage.setItem('nexus_user', 'null');
      state.user = null;
      window.location.reload();
    } else {
      try {
        const res = await fetch('/api/logout', { method: 'POST' });
        if (res.ok) {
          state.user = null;
          window.location.reload();
        }
      } catch (e) {
        showToast('Erro ao sair da conta', 'error');
      }
    }
  }

  // 2. Fetch matches
  async function fetchMatches() {
    if (state.isLocalMode) return; // Managed by Local Simulator

    try {
      const response = await fetch('/api/matches');
      const newMatches = await response.json();
      
      detectGoalUpdates(state.matches, newMatches);
      detectOddsVariation(state.matches, newMatches);

      state.matches = newMatches;
      renderMatches();
      
      const liveCount = state.matches.filter(m => m.status === 'live').length;
      const liveBadge = document.getElementById('live-count-badge');
      liveBadge.textContent = liveCount;
      if (liveCount > 0) liveBadge.classList.remove('hidden');
      else liveBadge.classList.add('hidden');

      updateSlipOddsLive();
    } catch (err) {
      console.warn('Erro na ligação das matches:', err.message);
    }
  }

  // 3. Goal notifications
  function detectGoalUpdates(oldMatches, newMatches) {
    if (oldMatches.length === 0) return;

    newMatches.forEach(newM => {
      const oldM = oldMatches.find(o => o.id === newM.id);
      if (oldM && newM.status === 'live') {
        const homeGoal = newM.score_home > oldM.score_home;
        const awayGoal = newM.score_away > oldM.score_away;

        if (homeGoal || awayGoal) {
          const scorer = homeGoal ? newM.home_team : newM.away_team;
          showToast(`⚽ GOLO! ${scorer} marca! Novo resultado: ${newM.home_team} ${newM.score_home} - ${newM.score_away} ${newM.away_team} (${newM.minute}')`, 'info');
        }
      }
    });
  }

  // 4. Odds Variation Blinker
  let oddBlinkRegistry = {};
  function detectOddsVariation(oldMatches, newMatches) {
    if (oldMatches.length === 0) return;

    newMatches.forEach(newM => {
      const oldM = oldMatches.find(o => o.id === newM.id);
      if (oldM && newM.status === 'live') {
        compareAndBlink(newM.id, 'win_home', oldM.odds.win_home, newM.odds.win_home);
        compareAndBlink(newM.id, 'draw', oldM.odds.draw, newM.odds.draw);
        compareAndBlink(newM.id, 'win_away', oldM.odds.win_away, newM.odds.win_away);
      }
    });
  }

  function compareAndBlink(matchId, type, oldOdd, newOdd) {
    if (oldOdd === newOdd) return;

    const btnId = `btn-odd-${matchId}-${type}`;
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const directionClass = newOdd > oldOdd ? 'odd-up' : 'odd-down';
    
    btn.classList.remove('odd-up', 'odd-down');
    void btn.offsetWidth; // reflow
    btn.classList.add(directionClass);

    if (oddBlinkRegistry[btnId]) clearTimeout(oddBlinkRegistry[btnId]);
    oddBlinkRegistry[btnId] = setTimeout(() => {
      btn.classList.remove('odd-up', 'odd-down');
    }, 1500);
  }

  // 5. Render Matches
  function renderMatches() {
    const liveContainer = document.getElementById('live-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');

    const liveMatches = state.matches.filter(m => m.status === 'live');
    const upcomingMatches = state.matches.filter(m => m.status === 'scheduled');

    // Sort upcoming matches chronologically (earliest first)
    upcomingMatches.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });

    // Group upcoming matches by competition
    const groups = {};
    upcomingMatches.forEach(m => {
      if (!groups[m.competition]) {
        groups[m.competition] = [];
      }
      groups[m.competition].push(m);
    });

    // Preserve first-seen competition order (which matches chronological order of their games)
    const competitionOrder = [];
    upcomingMatches.forEach(m => {
      if (!competitionOrder.includes(m.competition)) {
        competitionOrder.push(m.competition);
      }
    });

    // Live Render
    if (liveMatches.length === 0) {
      liveContainer.innerHTML = `
        <div class="no-data-msg">
          <i data-lucide="radio" style="margin-bottom:8px; width:24px; height:24px;"></i>
          <p>Sem jogos ao vivo de momento.</p>
        </div>
      `;
      initIcons();
    } else {
      liveContainer.innerHTML = liveMatches.map(m => {
        const isHomeSelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === '1';
        const isDrawSelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === 'X';
        const isAwaySelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === '2';

        return `
          <div class="match-card">
            <div class="match-meta-row">
              <span class="competition-name">${m.competition}</span>
              <span class="match-time-live">
                <span class="live-dot"></span> AO VIVO - ${m.minute}'
              </span>
            </div>

            <div class="match-teams-score">
              <div class="team-row">
                <div class="team-info">
                  <img src="${m.home_logo}" alt="${m.home_team}" class="flag-icon" onerror="this.src='https://flagsapi.com/US/flat/64.png'">
                  <span class="team-name">${m.home_team}</span>
                </div>
                <span class="score-display">${m.score_home}</span>
              </div>
              <div class="team-row">
                <div class="team-info">
                  <img src="${m.away_logo}" alt="${m.away_team}" class="flag-icon" onerror="this.src='https://flagsapi.com/US/flat/64.png'">
                  <span class="team-name">${m.away_team}</span>
                </div>
                <span class="score-display">${m.score_away}</span>
              </div>
            </div>

            <div class="odds-box">
              <button class="odd-btn ${isHomeSelected ? 'active' : ''}" id="btn-odd-${m.id}-win_home" onclick="selectBet('${m.id}', '1', '${m.home_team}', ${m.odds.win_home})">
                <span class="odd-label">1</span>
                <span class="odd-val">${m.odds.win_home.toFixed(2)}</span>
              </button>
              <button class="odd-btn ${isDrawSelected ? 'active' : ''}" id="btn-odd-${m.id}-draw" onclick="selectBet('${m.id}', 'X', 'Empate', ${m.odds.draw})">
                <span class="odd-label">X</span>
                <span class="odd-val">${m.odds.draw.toFixed(2)}</span>
              </button>
              <button class="odd-btn ${isAwaySelected ? 'active' : ''}" id="btn-odd-${m.id}-win_away" onclick="selectBet('${m.id}', '2', '${m.away_team}', ${m.odds.win_away})">
                <span class="odd-label">2</span>
                <span class="odd-val">${m.odds.win_away.toFixed(2)}</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Upcoming Render (Grouped by Competition)
    if (upcomingMatches.length === 0) {
      upcomingContainer.innerHTML = `<div class="no-data-msg">Sem jogos planeados brevemente.</div>`;
    } else {
      upcomingContainer.innerHTML = competitionOrder.map(compName => {
        const compMatches = groups[compName];
        
        const matchesHtml = compMatches.map(m => {
          const isHomeSelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === '1';
          const isDrawSelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === 'X';
          const isAwaySelected = state.activeSelection && state.activeSelection.matchId === m.id && state.activeSelection.betType === '2';

          const formatMatchTime = (dStr, tStr) => {
            const matchDate = new Date(`${dStr}T${tStr}:00Z`); // Parse as UTC
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);

            const isSameDay = (d1, d2) => 
              d1.getFullYear() === d2.getFullYear() && 
              d1.getMonth() === d2.getMonth() && 
              d1.getDate() === d2.getDate();

            const timeFormatted = matchDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

            if (isSameDay(matchDate, today)) {
              return `Hoje às ${timeFormatted}`;
            } else if (isSameDay(matchDate, tomorrow)) {
              return `Amanhã às ${timeFormatted}`;
            } else {
              const dateFormatted = matchDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
              return `${dateFormatted} às ${timeFormatted}`;
            }
          };

          const formattedDateTime = formatMatchTime(m.date, m.time);

          return `
            <div class="list-match-row">
              <div class="match-info-column">
                <span class="time-val">${formattedDateTime}</span>
              </div>

              <div class="match-teams-column">
                <div class="list-team-item team-home">
                  <span class="team-name">${m.home_team}</span>
                  <img src="${m.home_logo}" alt="${m.home_team}" class="flag-icon" onerror="this.src='https://flagsapi.com/US/flat/64.png'">
                </div>
                <span class="versus-lbl">VS</span>
                <div class="list-team-item team-away">
                  <img src="${m.away_logo}" alt="${m.away_team}" class="flag-icon" onerror="this.src='https://flagsapi.com/US/flat/64.png'">
                  <span class="team-name">${m.away_team}</span>
                </div>
              </div>

              <div class="odds-box">
                <button class="odd-btn ${isHomeSelected ? 'active' : ''}" id="btn-odd-${m.id}-win_home" onclick="selectBet('${m.id}', '1', '${m.home_team}', ${m.odds.win_home})">
                  <span class="odd-label">1</span>
                  <span class="odd-val">${m.odds.win_home.toFixed(2)}</span>
                </button>
                <button class="odd-btn ${isDrawSelected ? 'active' : ''}" id="btn-odd-${m.id}-draw" onclick="selectBet('${m.id}', 'X', 'Empate', ${m.odds.draw})">
                  <span class="odd-label">X</span>
                  <span class="odd-val">${m.odds.draw.toFixed(2)}</span>
                </button>
                <button class="odd-btn ${isAwaySelected ? 'active' : ''}" id="btn-odd-${m.id}-win_away" onclick="selectBet('${m.id}', '2', '${m.away_team}', ${m.odds.win_away})">
                  <span class="odd-label">2</span>
                  <span class="odd-val">${m.odds.win_away.toFixed(2)}</span>
                </button>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="competition-group">
            <div class="competition-group-header">
              <i data-lucide="award" class="comp-header-icon"></i>
              <span class="comp-header-title">${compName}</span>
            </div>
            <div class="competition-group-matches">
              ${matchesHtml}
            </div>
          </div>
        `;
      }).join('');
      
      initIcons();
    }
  }

  window.selectBet = function(matchId, betType, selectionName, odd) {
    if (!state.user) {
      showToast('Liga a tua conta Discord para começar a apostar!', 'info');
      return;
    }

    const match = state.matches.find(m => m.id === matchId);
    if (!match) return;

    // Toggle off if clicking the same active selection
    if (state.activeSelection && 
        state.activeSelection.matchId === matchId && 
        state.activeSelection.betType === betType) {
      state.activeSelection = null;
      renderBetSlip();
      renderMatches();
      return;
    }

    state.activeSelection = {
      matchId,
      betType,
      selectionName,
      odd,
      homeTeam: match.home_team,
      awayTeam: match.away_team
    };

    renderBetSlip();
    renderMatches();
    
    // Auto-scroll to Bet Slip on small screens
    if (window.innerWidth <= 1080) {
      showToast(`Adicionado ao Boletim: ${selectionName} @ ${odd.toFixed(2)}`, 'info');
    }
  };

  window.clearSelection = function() {
    state.activeSelection = null;
    renderBetSlip();
    renderMatches();
  };

  // 6. Bet Slip Calculations
  function renderBetSlip() {
    const slipEmpty = document.getElementById('slip-empty-state');
    const slipContainer = document.getElementById('slip-selections-container');
    const slipFooter = document.getElementById('slip-footer-panel');
    const slipCount = document.getElementById('slip-count');

    if (!state.activeSelection) {
      slipEmpty.classList.remove('hidden');
      slipContainer.innerHTML = '';
      slipFooter.classList.add('hidden');
      slipCount.textContent = '0';
      return;
    }

    slipCount.textContent = '1';
    slipEmpty.classList.add('hidden');
    slipFooter.classList.remove('hidden');

    slipContainer.innerHTML = `
      <div class="selection-card">
        <button class="btn-remove-selection" onclick="clearSelection()">
          <i data-lucide="x"></i>
        </button>
        <div class="sel-match-title">${state.activeSelection.homeTeam} vs ${state.activeSelection.awayTeam}</div>
        <div class="sel-bet-row">
          <span class="sel-name">Resultado Fictício: ${state.activeSelection.selectionName}</span>
          <span class="sel-odd">${state.activeSelection.odd.toFixed(2)}</span>
        </div>
      </div>
    `;

    initIcons();
    updatePotentialWin();
  }

  function updateSlipOddsLive() {
    if (!state.activeSelection) return;
    const match = state.matches.find(m => m.id === state.activeSelection.matchId);
    if (!match) return;

    let freshOdd = state.activeSelection.odd;
    if (state.activeSelection.betType === '1') freshOdd = match.odds.win_home;
    else if (state.activeSelection.betType === 'X') freshOdd = match.odds.draw;
    else if (state.activeSelection.betType === '2') freshOdd = match.odds.win_away;

    if (freshOdd !== state.activeSelection.odd) {
      state.activeSelection.odd = freshOdd;
      const oddBadge = document.querySelector('.sel-odd');
      if (oddBadge) oddBadge.textContent = freshOdd.toFixed(2);
      updatePotentialWin();
    }
  }

  function updatePotentialWin() {
    if (!state.activeSelection) return;
    const stakeInput = document.getElementById('bet-stake-input');
    const stake = parseFloat(stakeInput.value) || 0;
    const totalOdd = state.activeSelection.odd;
    
    document.getElementById('slip-odd-total').textContent = totalOdd.toFixed(2);
    
    const possibleWin = Math.floor(stake * totalOdd);
    document.getElementById('slip-potential-win').textContent = `${possibleWin.toLocaleString()} €`;
  }

  // 7. Place Bet (Handles Local and Online)
  async function placeBet() {
    if (!state.activeSelection) return;
    const stakeInput = document.getElementById('bet-stake-input');
    const stake = parseInt(stakeInput.value);

    if (isNaN(stake) || stake <= 0) {
      showToast('Insere um valor de aposta válido!', 'error');
      return;
    }

    if (stake < 1) {
      showToast('A aposta mínima é de 1 €!', 'error');
      return;
    }

    if (stake > state.user.balance) {
      showToast('Saldo virtual de Euros insuficiente!', 'error');
      return;
    }

    if (state.isLocalMode) {
      // Local Storage place bet logic
      state.user.balance -= stake;
      state.user.xp += Math.floor(stake * 0.1);
      state.user.level = Math.floor(state.user.xp / 100) + 1;
      
      const newBet = {
        id: state.bets.length > 0 ? Math.max(...state.bets.map(b => b.id)) + 1 : 1,
        user_id: state.user.id,
        match_id: state.activeSelection.matchId,
        type: state.activeSelection.betType,
        selectionName: `${state.activeSelection.homeTeam} vs ${state.activeSelection.awayTeam} - ${state.activeSelection.selectionName}`,
        odd: state.activeSelection.odd,
        amount: stake,
        potential_win: stake * state.activeSelection.odd,
        status: 'pending',
        created_at: new Date().toISOString(),
        settled_at: null
      };

      state.bets.unshift(newBet);
      state.knownBets[newBet.id] = 'pending';

      localStorage.setItem('nexus_user', JSON.stringify(state.user));
      localStorage.setItem('nexus_bets', JSON.stringify(state.bets));

      createLocalTransaction('bet_placed', -stake, `Aposta fictícia colocada: ${newBet.selectionName} (Odd: ${newBet.odd.toFixed(2)})`);

      showToast('Aposta fictícia colocada offline!', 'success');
      state.activeSelection = null;
      stakeInput.value = '';

      updateHeaderUI();
      renderBetSlip();
      renderMatches();
    } else {
      // Online mode place bet API call
      const placeBtn = document.getElementById('place-bet-btn');
      placeBtn.disabled = true;
      placeBtn.textContent = 'A processar...';

      try {
        const res = await fetch('/api/bets/place', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: state.activeSelection.matchId,
            betType: state.activeSelection.betType,
            selectionName: `${state.activeSelection.homeTeam} vs ${state.activeSelection.awayTeam} - ${state.activeSelection.selectionName}`,
            odd: state.activeSelection.odd,
            amount: stake
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast('Aposta fictícia colocada com sucesso!', 'success');
        state.activeSelection = null;
        stakeInput.value = '';
        
        checkAuthStatus();
        renderBetSlip();
        renderMatches();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        placeBtn.disabled = false;
        placeBtn.textContent = 'Submeter Aposta Fictícia';
      }
    }
  }

  // 8. Bet History
  async function fetchBetsHistory(isInitial = false) {
    try {
      const response = await fetch('/api/bets');
      const bets = await response.json();
      
      if (!isInitial && state.bets.length > 0) {
        detectNewWins(bets);
      }

      state.bets = bets;
      bets.forEach(b => {
        state.knownBets[b.id] = b.status;
      });

      if (state.activeScreen === 'bets') {
        renderBetsList(document.querySelector('#bets-filter-tabs .filter-btn.active').getAttribute('data-filter'));
      }
    } catch (err) {
      console.warn('Falha ao obter histórico de apostas:', err.message);
    }
  }

  function detectNewWins(newBetsList) {
    newBetsList.forEach(bet => {
      const prevStatus = state.knownBets[bet.id];
      if ((!prevStatus || prevStatus === 'pending') && bet.status === 'won') {
        launchWinCelebration(bet);
      }
    });
  }

  function launchWinCelebration(bet) {
    document.getElementById('win-modal-match').textContent = bet.selectionName.split(' - ')[0] || 'Campeonato do Mundo';
    document.getElementById('win-modal-selection').textContent = `Seleção: ${bet.selectionName.split(' - ')[1] || ''} (Odd: ${bet.odd.toFixed(2)})`;
    document.getElementById('win-modal-amount').textContent = `+${Math.floor(bet.potential_win).toLocaleString()} €`;
    document.getElementById('win-modal').classList.remove('hidden');

    showToast(`🎉 APOSTA GANHA! Recebeste ${Math.floor(bet.potential_win).toLocaleString()} €`, 'success');
    if (state.isLocalMode) {
      updateHeaderUI();
    } else {
      checkAuthStatus();
    }
  }

  function renderBetsList(filter = 'all') {
    const container = document.getElementById('bets-history-container');
    let list = state.bets;

    if (filter !== 'all') {
      list = state.bets.filter(b => b.status === filter);
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="no-data-msg">Nenhuma aposta com o estado "${filter}" encontrada.</div>`;
      return;
    }

    container.innerHTML = list.map(b => {
      let statusClass = `status-${b.status}`;
      let statusLabel = 'Pendente';
      if (b.status === 'won') statusLabel = 'Ganhou';
      if (b.status === 'lost') statusLabel = 'Perdeu';

      const matchName = b.selectionName.split(' - ')[0] || 'Jogo de Futebol';
      const selection = b.selectionName.split(' - ')[1] || b.selectionName;

      return `
        <div class="bet-card">
          <div class="bet-card-match">
            <span class="bet-match-teams">${matchName}</span>
            <span class="bet-date">${new Date(b.created_at).toLocaleString()}</span>
          </div>

          <div class="bet-card-selection">
            <span class="bet-sel-name">${selection}</span>
            <span class="bet-sel-type">Odd: ${b.odd.toFixed(2)}</span>
          </div>

          <div class="bet-card-stake">
            <span class="bet-stake-title">Aposta</span>
            <span class="bet-stake-val">${b.amount} €</span>
          </div>

          <div class="bet-card-payout">
            <span class="bet-payout-title">${b.status === 'won' ? 'Retorno' : 'Potencial'}</span>
            <span class="bet-payout-val">${Math.floor(b.potential_win)} €</span>
          </div>

          <div class="status-badge ${statusClass}">
            ${statusLabel}
          </div>
        </div>
      `;
    }).join('');
  }

  // 9. Store Rewards
  async function fetchStoreRewards() {
    try {
      const response = await fetch('/api/rewards');
      state.rewards = await response.json();
      renderStore();
    } catch (err) {
      console.warn('Erro ao obter loja online');
    }
  }

  function renderStore() {
    const container = document.getElementById('store-items-container');
    if (state.rewards.length === 0) {
      container.innerHTML = `<div class="no-data-msg">Loja de recompensas vazia de momento.</div>`;
      return;
    }

    container.innerHTML = state.rewards.map(item => {
      const alreadyHasRole = state.user && state.user.roles.includes(item.name.replace('Cargo: ', ''));
      const canAfford = state.user && state.user.balance >= item.cost;
      
      let btnText = 'Resgatar Recompensa';
      let btnClass = 'btn-gold';
      if (alreadyHasRole) {
        btnText = 'Já Possui';
        btnClass = 'btn-outline';
      }

      return `
        <div class="store-card">
          <div class="store-card-decor"></div>
          <div class="store-item-main">
            <div class="store-item-icon-wrapper">
              <i data-lucide="${item.icon}"></i>
            </div>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>

          <div class="store-item-footer">
            <div class="store-item-price">
              <i data-lucide="coins" class="store-price-icon"></i>
              <span>${item.cost.toLocaleString()} €</span>
            </div>
            <button class="btn btn-sm ${btnClass} btn-full" 
                    onclick="redeemReward('${item.id}')" 
                    ${alreadyHasRole || !canAfford ? 'disabled' : ''}>
              ${btnText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    initIcons();
  }

  window.redeemReward = async function(rewardId) {
    if (!state.user) return;
    const item = state.rewards.find(r => r.id === rewardId);
    if (!item) return;

    if (state.user.balance < item.cost) {
      showToast('Saldo virtual de Euros insuficiente!', 'error');
      return;
    }

    if (state.isLocalMode) {
      let roleFriendly = item.name.replace('Cargo: ', '');
      if (state.user.roles.includes(roleFriendly)) {
        showToast('Já possui este cargo!', 'error');
        return;
      }

      state.user.balance -= item.cost;
      state.user.roles.push(roleFriendly);

      localStorage.setItem('nexus_user', JSON.stringify(state.user));
      createLocalTransaction('redeem_reward', -item.cost, `Resgate local: ${item.name}`);

      showToast(`Sucesso! Cargo "${roleFriendly}" simulado no Discord.`, 'success');
      updateHeaderUI();
      renderStore();
    } else {
      try {
        const res = await fetch('/api/rewards/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rewardId })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);

        showToast(data.message, 'success');
        checkAuthStatus();
        fetchStoreRewards();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // 10. Daily Rewards & Cooldown timers
  let activeIntervals = {
    daily: null,
    sync: null
  };

  function formatRemainingTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  function initCooldownTimers() {
    if (!state.user) return;
    
    const now = Date.now();
    
    // Daily Cooldown Check (24 hours)
    if (state.user.last_daily_claim) {
      const lastDaily = new Date(state.user.last_daily_claim).getTime();
      const dailyCooldown = 24 * 60 * 60 * 1000;
      const elapsed = now - lastDaily;
      if (elapsed < dailyCooldown) {
        const remainingSecs = Math.ceil((dailyCooldown - elapsed) / 1000);
        startCooldown('daily', remainingSecs);
      }
    }
    
    // Sync Cooldown Check (3 days)
    if (state.user.last_sync) {
      const lastSync = new Date(state.user.last_sync).getTime();
      const syncCooldown = 3 * 24 * 60 * 60 * 1000;
      const elapsed = now - lastSync;
      if (elapsed < syncCooldown) {
        const remainingSecs = Math.ceil((syncCooldown - elapsed) / 1000);
        startCooldown('sync', remainingSecs);
      }
    }
  }

  async function claimDailyReward() {
    const claimBtn = document.getElementById('claim-daily-btn');
    claimBtn.disabled = true;

    if (state.isLocalMode) {
      // Local Claim (24h cooldown)
      const now = Date.now();
      const lastDaily = state.user.last_daily_claim;
      const cooldownMs = 24 * 60 * 60 * 1000; // 24h

      if (lastDaily && (now - lastDaily) < cooldownMs) {
        const diffMs = cooldownMs - (now - lastDaily);
        const hours = Math.floor(diffMs / (60 * 60 * 1000));
        const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
        showToast(`Aguarde ${hours}h ${minutes}m ${seconds}s para resgatar novamente localmente.`, 'error');
        claimBtn.disabled = false;
        return;
      }

      state.user.balance += 1; // 1 Euro
      state.user.last_daily_claim = now;

      localStorage.setItem('nexus_user', JSON.stringify(state.user));
      createLocalTransaction('daily_reward', 1, 'Coleta local de Recompensa Diária');

      showToast('🎁 Recebeste +1 € localmente!', 'success');
      updateHeaderUI();
      startCooldown('daily', 24 * 60 * 60);
      claimBtn.disabled = false;
    } else {
      // Online Claim
      try {
        const res = await fetch('/api/user/daily', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast(`🎁 Recompensa diária resgatada: +${data.claimed} €!`, 'success');
        checkAuthStatus();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        claimBtn.disabled = false;
      }
    }
  }

  async function syncDiscordBalance() {
    const syncBtn = document.getElementById('sync-discord-btn');
    syncBtn.disabled = true;

    if (state.isLocalMode) {
      // Local sync simulation (3 days cooldown)
      const now = Date.now();
      const lastSync = state.user.last_sync;
      const cooldownMs = 3 * 24 * 60 * 60 * 1000; // 3 days

      if (lastSync && (now - lastSync) < cooldownMs) {
        const diffMs = cooldownMs - (now - lastSync);
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        showToast(`Aguarde ${days}d ${hours}h ${minutes}m para sincronizar offline.`, 'error');
        syncBtn.disabled = false;
        return;
      }

      const earned = 2; // exactly 2 €
      state.user.balance += earned;
      state.user.last_sync = now;

      localStorage.setItem('nexus_user', JSON.stringify(state.user));
      createLocalTransaction('discord_sync', earned, `Sincronização de atividade offline: +${earned} €`);

      showToast(`⚡ Sincronizado! Euros de atividade no Discord: +${earned} €!`, 'success');
      updateHeaderUI();
      startCooldown('sync', 3 * 24 * 60 * 60);
      syncBtn.disabled = false;
    } else {
      // Online sync
      try {
        const res = await fetch('/api/user/sync', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast(`⚡ Sincronização bem-sucedida: +${data.earned} €!`, 'success');
        checkAuthStatus();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        syncBtn.disabled = false;
      }
    }
  }

  function startCooldown(type, durationSecs) {
    const btn = document.getElementById(type === 'daily' ? 'claim-daily-btn' : 'sync-discord-btn');
    const timerSpan = document.getElementById(type === 'daily' ? 'daily-timer' : 'sync-timer');

    if (activeIntervals[type]) {
      clearInterval(activeIntervals[type]);
    }

    btn.classList.add('hidden');
    timerSpan.classList.remove('hidden');

    let remaining = durationSecs;
    timerSpan.textContent = `Aguarde ${formatRemainingTime(remaining)}...`;

    activeIntervals[type] = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(activeIntervals[type]);
        activeIntervals[type] = null;
        btn.classList.remove('hidden');
        timerSpan.classList.add('hidden');
      } else {
        timerSpan.textContent = `Aguarde ${formatRemainingTime(remaining)}...`;
      }
    }, 1000);
  }

  // 11. Profile Stats & Transactions
  async function fetchProfileStats() {
    try {
      const userRes = await fetch('/api/user/me');
      const userData = await userRes.json();
      if (userData.loggedIn) {
        state.user = userData.user;
        updateHeaderUI();
      }

      const betsRes = await fetch('/api/bets');
      state.bets = await betsRes.json();

      const txRes = await fetch('/api/transactions');
      const txs = await txRes.json();

      renderProfilePage(txs);
    } catch (err) {
      console.warn('Erro ao carregar perfil online');
    }
  }

  function renderProfilePage(txs) {
    if (!state.user) return;

    document.getElementById('stats-avatar').src = state.user.avatar;
    document.getElementById('stats-username').textContent = state.user.username;
    document.getElementById('stats-lvl-num').textContent = state.user.level;
    document.getElementById('stats-next-lvl').textContent = `Próximo Nível: Lvl ${state.user.level + 1}`;
    
    const xpPercent = state.user.xp % 100;
    document.getElementById('stats-xp-value').textContent = xpPercent;
    document.getElementById('stats-xp-fill').style.width = `${xpPercent}%`;

    const badgeContainer = document.getElementById('stats-badges-container');
    let badgeHtml = '<span class="profile-badge badge-member">Membro Discord</span>';
    state.user.roles.forEach(r => {
      let bClass = 'badge-socio';
      if (r === 'Apostador de Elite') bClass = 'badge-elite';
      if (r === 'Nexus High-Roller') bClass = 'badge-hr';
      badgeHtml += `<span class="profile-badge ${bClass}">${r}</span>`;
    });
    badgeContainer.innerHTML = badgeHtml;

    const totalBets = state.bets.length;
    const wins = state.user.wins || 0;
    const losses = state.user.losses || 0;
    const winrate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

    document.getElementById('stats-balance-val').textContent = `${state.user.balance.toLocaleString()} €`;
    document.getElementById('stats-wins-val').textContent = wins;
    document.getElementById('stats-losses-val').textContent = losses;
    document.getElementById('stats-winrate-val').textContent = `${winrate}%`;

    const txContainer = document.getElementById('profile-tx-container');
    if (txs.length === 0) {
      txContainer.innerHTML = `<div class="no-data-msg">Nenhuma transação registada de momento.</div>`;
      return;
    }

    txContainer.innerHTML = txs.map(t => {
      const isPositive = t.amount > 0;
      const amountText = isPositive ? `+${t.amount}` : `${t.amount}`;
      const signClass = isPositive ? 'tx-plus' : 'tx-minus';

      return `
        <div class="tx-row">
          <div class="tx-info">
            <span class="tx-description">${t.description}</span>
            <span class="tx-date">${new Date(t.timestamp).toLocaleString()}</span>
          </div>
          <span class="tx-amount ${signClass}">${amountText} €</span>
        </div>
      `;
    }).join('');
  }

  // --- OFFLINE / LOCAL MATCH SIMULATOR ENGINE ---
  function startLocalSimulator() {
    setInterval(() => {
      if (!state.isLocalMode) return;

      let localMatches = JSON.parse(localStorage.getItem('nexus_matches') || '[]');
      let localBets = JSON.parse(localStorage.getItem('nexus_bets') || '[]');
      let localUser = JSON.parse(localStorage.getItem('nexus_user'));
      let localTxs = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');

      const liveMatches = localMatches.filter(m => m.status === 'live');
      let matchesChanged = false;
      let userChanged = false;

      liveMatches.forEach(match => {
        matchesChanged = true;
        let nextMin = match.minute + 3;
        let scoreHome = match.score_home;
        let scoreAway = match.score_away;
        let status = 'live';

        // Goal check
        if (Math.random() < 0.04) {
          if (Math.random() < 0.55) {
            scoreHome += 1;
            showToast(`⚽ GOLO! ${match.home_team} marca! Resultado: ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team} (${nextMin}')`, 'info');
          } else {
            scoreAway += 1;
            showToast(`⚽ GOLO! ${match.away_team} marca! Resultado: ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team} (${nextMin}')`, 'info');
          }
        }

        // Game over check
        if (nextMin >= 90) {
          nextMin = 90;
          status = 'finished';
          showToast(`🏁 Fim do Jogo: ${match.home_team} ${scoreHome} - ${scoreAway} ${match.away_team}`, 'info');
        }

        // Dynamic Odds
        const timeRemainingFactor = (90 - nextMin) / 90;
        let odds = { ...match.odds };

        if (status === 'live') {
          const goalDiff = scoreHome - scoreAway;
          if (goalDiff > 0) {
            odds.win_home = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / goalDiff).toFixed(2));
            odds.win_away = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 2.5).toFixed(2));
            odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * goalDiff * 1.5).toFixed(2));
          } else if (goalDiff < 0) {
            odds.win_away = parseFloat(Math.max(1.02, 1.1 + (timeRemainingFactor * 0.5) / Math.abs(goalDiff)).toFixed(2));
            odds.win_home = parseFloat(Math.min(50.00, 3.0 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 2.5).toFixed(2));
            odds.draw = parseFloat(Math.min(15.00, 2.2 + (1 / (timeRemainingFactor + 0.01)) * Math.abs(goalDiff) * 1.5).toFixed(2));
          } else {
            odds.win_home = parseFloat((1.8 + timeRemainingFactor * 1.2).toFixed(2));
            odds.win_away = parseFloat((2.5 + timeRemainingFactor * 1.5).toFixed(2));
            odds.draw = parseFloat(Math.max(1.10, 1.4 + timeRemainingFactor * 2.0).toFixed(2));
          }
        }

        // Apply
        match.minute = nextMin;
        match.score_home = scoreHome;
        match.score_away = scoreAway;
        match.status = status;
        match.odds = odds;

        // Settle local bets if finished
        if (status === 'finished') {
          const matchBets = localBets.filter(b => b.match_id === match.id && b.status === 'pending');
          
          matchBets.forEach(bet => {
            let isWin = false;
            if (bet.type === '1' && scoreHome > scoreAway) isWin = true;
            else if (bet.type === 'X' && scoreHome === scoreAway) isWin = true;
            else if (bet.type === '2' && scoreHome < scoreAway) isWin = true;

            const idx = localBets.findIndex(b => b.id === bet.id);
            if (idx !== -1) {
              localBets[idx].status = isWin ? 'won' : 'lost';
              localBets[idx].settled_at = new Date().toISOString();
            }

            // Update user balance if won
            if (isWin && localUser) {
              userChanged = true;
              localUser.balance += Math.floor(bet.potential_win);
              localUser.wins += 1;
              localUser.xp += Math.floor(bet.potential_win * 0.05) + 20;
              localUser.level = Math.floor(localUser.xp / 100) + 1;

              // Log positive transaction
              localTxs.unshift({
                id: localTxs.length + 1,
                user_id: localUser.id,
                type: 'bet_win',
                amount: Math.floor(bet.potential_win),
                description: `Ganhos da aposta #${bet.id} (Offline)`,
                timestamp: new Date().toISOString()
              });
            } else if (!isWin && localUser) {
              userChanged = true;
              localUser.losses += 1;
              localUser.xp += 5;
              localUser.level = Math.floor(localUser.xp / 100) + 1;
            }
          });

          // Schedule a new live game in 15 seconds to replace this finished one
          setTimeout(() => {
            if (!state.isLocalMode) return;
            const offlineMatches = JSON.parse(localStorage.getItem('nexus_matches') || '[]');
            const tList = [
              { name: 'Espanha', flag: 'ES' },
              { name: 'Itália', flag: 'IT' },
              { name: 'Alemanha', flag: 'DE' },
              { name: 'Brasil', flag: 'BR' },
              { name: 'Bélgica', flag: 'BE' },
              { name: 'Uruguai', flag: 'UY' },
              { name: 'Japão', flag: 'JP' },
              { name: 'Marrocos', flag: 'MA' }
            ];
            const t1 = tList[Math.floor(Math.random() * tList.length)];
            let t2 = tList[Math.floor(Math.random() * tList.length)];
            while (t2.name === t1.name) {
              t2 = tList[Math.floor(Math.random() * tList.length)];
            }

            const newM = {
              id: 'local_live_' + Date.now(),
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
              odds: {
                win_home: parseFloat((1.5 + Math.random() * 2).toFixed(2)),
                draw: parseFloat((2.8 + Math.random() * 1.5).toFixed(2)),
                win_away: parseFloat((1.8 + Math.random() * 3).toFixed(2))
              }
            };
            offlineMatches.push(newM);
            if (offlineMatches.length > 20) offlineMatches.shift();
            localStorage.setItem('nexus_matches', JSON.stringify(offlineMatches));
            console.log(`[SIMULATOR OFFLINE] Novo jogo live iniciado: ${t1.name} vs. ${t2.name}`);
          }, 15000);
        }
      });

      // Save states
      if (matchesChanged) {
        localStorage.setItem('nexus_matches', JSON.stringify(localMatches));
        localStorage.setItem('nexus_bets', JSON.stringify(localBets));
        state.matches = localMatches;
        
        // Detect new wins in state.bets list to show celebration modal offline!
        detectNewWins(localBets);
        state.bets = localBets;
        
        // Rebuild knownBets index
        localBets.forEach(b => {
          state.knownBets[b.id] = b.status;
        });

        renderMatches();
        updateSlipOddsLive();
        
        // Re-render bet lists or profile pages if active
        if (state.activeScreen === 'bets') renderBetsList('all');
      }

      if (userChanged && localUser) {
        localStorage.setItem('nexus_user', JSON.stringify(localUser));
        localStorage.setItem('nexus_transactions', JSON.stringify(localTxs));
        state.user = localUser;
        updateHeaderUI();
        if (state.activeScreen === 'stats') renderProfilePage(localTxs);
      }

    }, 5000);
  }

  // Helper to append a local transaction
  function createLocalTransaction(type, amount, description) {
    const txs = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');
    const newTx = {
      id: txs.length + 1,
      user_id: state.user ? state.user.id : 'anonymous',
      type,
      amount,
      description,
      timestamp: new Date().toISOString()
    };
    txs.unshift(newTx);
    localStorage.setItem('nexus_transactions', JSON.stringify(txs));
  }

  // --- FLOATING TOAST NOTIFICATION HELPERS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close-btn" title="Fechar">
        <i data-lucide="x"></i>
      </button>
    `;

    container.appendChild(toast);
    initIcons();

    // Close button event listener for instant dismiss
    const closeBtn = toast.querySelector('.toast-close-btn');
    let autoRemoveTimeout;

    const dismissToast = (speed = 400) => {
      if (autoRemoveTimeout) clearTimeout(autoRemoveTimeout);
      toast.style.animation = 'none';
      // force reflow
      void toast.offsetHeight;
      toast.style.transition = `opacity ${speed}ms ease, transform ${speed}ms ease`;
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        toast.remove();
      }, speed);
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissToast(200);
      });
    }

    // Robust fade out and removal
    autoRemoveTimeout = setTimeout(() => {
      dismissToast(400);
    }, 4500);
  }

  // --- REDEEM COUPON FUNCTION ---
  async function redeemCoupon() {
    const couponInput = document.getElementById('coupon-input');
    if (!couponInput) return;
    const couponCode = couponInput.value.trim();
    if (!couponCode) {
      showToast('Por favor, introduz um código de cupão.', 'error');
      return;
    }

    if (state.isLocalMode) {
      const localUser = JSON.parse(localStorage.getItem('nexus_user'));
      if (!localUser) {
        showToast('Utilizador não encontrado no modo offline.', 'error');
        return;
      }

      const cleanCoupon = couponCode.toLowerCase();
      if (cleanCoupon !== 'nexus') {
        showToast('Cupão inválido!', 'error');
        return;
      }

      const coupons = localUser.coupons || [];
      if (coupons.includes('nexus')) {
        showToast('Já resgataste este cupão!', 'error');
        return;
      }

      localUser.balance += 20;
      if (!localUser.coupons) localUser.coupons = [];
      localUser.coupons.push('nexus');
      
      localStorage.setItem('nexus_user', JSON.stringify(localUser));
      state.user = localUser;
      
      createLocalTransaction('coupon_redeem', 20, 'Resgate de cupão Nexus: +20 €');
      updateHeaderUI();
      showToast('Cupão Nexus resgatado com sucesso! +20 € adicionados ao teu saldo.', 'success');
      couponInput.value = '';
      
      fetchProfileStats();
    } else {
      try {
        const res = await fetch('/api/user/redeem-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coupon: couponCode })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao resgatar cupão.');
        }

        state.user.balance = data.balance;
        updateHeaderUI();
        showToast(data.message, 'success');
        couponInput.value = '';

        fetchProfileStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  }

});
