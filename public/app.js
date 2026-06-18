/* ==========================================================================
   NEXUS APOSTAS - FRONTEND APPLICATION LOGIC (DUAL ONLINE/OFFLINE MODE)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const DISCORD_CLIENT_ID = '1504934174878994482';
  const DISCORD_STATE_KEY = 'nexus_discord_oauth_state';
  const ROSTER_CACHE_KEY = 'nexus_espn_roster_cache';

  // --- APPLICATION STATE ---
  let state = {
    user: null,
    matches: [],
    bets: [],
    rewards: [],
    activeSelection: null, // { matchId, betType, selectionName, odd, homeTeam, awayTeam }
    knownBets: {}, // betId -> status (to detect new wins)
    activeScreen: 'sportsbook',
    openScorerMatchId: null,
    openLineupMatchId: null,
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

    // 1. Detect environment synchronously
    const isGitHubPages = window.location.hostname.endsWith('github.io');
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol || isGitHubPages) {
      state.isLocalMode = true;
    } else {
      state.isLocalMode = false;
    }

    // Bind event listeners synchronously first to avoid race conditions
    setupEventListeners();

    // Handle hash callback if present (Discord Client-side OAuth)
    await handleDiscordCallbackHash();

    // Initialize environment mode
    if (state.isLocalMode) {
      initOfflineMode();
    } else {
      // Test server connection
      try {
        const res = await fetch('/api/user/me');
        if (!res.ok) throw new Error('Não responde');
        
        checkAuthStatus();
        
        // Start polling online matches
        fetchMatches();
        setInterval(fetchMatches, 3000);
      } catch (err) {
        state.isLocalMode = true;
        initOfflineMode();
      }
    }

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

    // Add Discord Configuration link under the login button in Local Mode
    const loginButtons = document.querySelector('.login-buttons');
    if (loginButtons && !document.getElementById('discord-config-link')) {
      const configLink = document.createElement('a');
      configLink.id = 'discord-config-link';
      configLink.href = '#';
      configLink.className = 'login-config-link';
      configLink.style.display = 'block';
      configLink.style.textAlign = 'center';
      configLink.style.fontSize = '0.8rem';
      configLink.style.marginTop = '10px';
      configLink.style.color = 'var(--text-gray)';
      configLink.style.textDecoration = 'underline';
      configLink.textContent = 'Configurar App Discord (GitHub Pages)';
      configLink.addEventListener('click', (e) => {
        e.preventDefault();
        showDiscordClientIdModal();
      });
      loginButtons.appendChild(configLink);
    }

    // Initialize LocalStorage structures if missing
    if (!localStorage.getItem('nexus_user')) {
      localStorage.setItem('nexus_user', 'null');
    }
    if (!localStorage.getItem('nexus_matches')) {
      localStorage.setItem('nexus_matches', JSON.stringify([]));
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

    // Render matches immediately from cache
    renderMatches();

    // Fetch real-world matches from ESPN via CORS proxy immediately
    fetchMatchesOffline().then(realMatches => {
      if (realMatches) {
        state.matches = realMatches;
        renderMatches();
      }
    }).catch(e => {
      console.warn('Falha ao obter partidas reais do ESPN no arranque offline:', e.message);
    });

    // Poll real-world ESPN matches frequently so live goals/status follow the real feed.
    setInterval(async () => {
      try {
        const realMatches = await fetchMatchesOffline();
        if (realMatches) {
          detectGoalUpdates(state.matches, realMatches);
          detectOddsVariation(state.matches, realMatches);
          state.matches = realMatches;
          renderMatches();
          updateSlipOddsLive();
        }
      } catch (e) {
        console.warn('Falha ao atualizar partidas reais do ESPN offline:', e.message);
      }
    }, 15000);
  }

  // --- CLIENT-SIDE DISCORD OAUTH (IMPLICIT GRANT) HELPERS ---
  async function handleDiscordCallbackHash() {
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      window.history.replaceState(null, null, getStaticRedirectUri());
      showToast('O Discord recusou o login. Tenta novamente.', 'error');
      return;
    }

    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1)); // strip '#'
      const accessToken = params.get('access_token');
      const expectedState = localStorage.getItem(DISCORD_STATE_KEY);
      const returnedState = params.get('state');
      localStorage.removeItem(DISCORD_STATE_KEY);

      if (!expectedState || returnedState !== expectedState) {
        window.history.replaceState(null, null, getStaticRedirectUri());
        showToast('Nao foi possivel validar o retorno do Discord. Tenta novamente.', 'error');
        return;
      }
      
      if (accessToken) {
        try {
          showToast('A obter dados do Discord...', 'info');
          
          const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Falha ao obter perfil do Discord');
          }
          
          const userData = await response.json();
          
          const discordId = userData.id;
          const username = userData.global_name || userData.username;
          const avatar = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discriminator || '0') % 5}.png`;

          // Load current local user or initialize
          let localUser = JSON.parse(localStorage.getItem('nexus_user'));
          if (!localUser || localUser.discord_id !== discordId) {
            localUser = {
              id: 'local_' + discordId,
              discord_id: discordId,
              username,
              avatar,
              balance: 0, // start with 0 €
              xp: 0,
              level: 1,
              roles: [],
              coupons: [],
              wins: 0,
              losses: 0,
              last_daily_claim: null,
              last_sync: null
            };
            localStorage.setItem('nexus_user', JSON.stringify(localUser));
            createLocalTransaction('initial_balance', 0, 'Saldo inicial de Euros');
          } else {
            // Update profile
            localUser.username = username;
            localUser.avatar = avatar;
            localStorage.setItem('nexus_user', JSON.stringify(localUser));
          }
          
          state.user = localUser;
          
          // Clear hash in url
          window.history.replaceState(null, null, getStaticRedirectUri());
          showToast('Login com Discord efetuado com sucesso!', 'success');
        } catch (err) {
          console.error('Erro ao processar callback do Discord:', err);
          showToast('Falha no login com o Discord.', 'error');
        }
      }
    }
  }

  function getStaticRedirectUri() {
    const pathname = window.location.pathname.replace(/\/index\.html$/i, '/');
    return `${window.location.origin}${pathname}`;
  }

  function createOAuthState() {
    const randomValues = new Uint32Array(4);
    window.crypto?.getRandomValues?.(randomValues);
    const randomPart = Array.from(randomValues, value => value.toString(16)).join('');
    return `${Date.now().toString(36)}-${randomPart || Math.random().toString(36).slice(2)}`;
  }

  function showDiscordClientIdModal() {
    if (document.getElementById('discord-config-modal')) return;

    const currentOrigin = getStaticRedirectUri();
    
    const modal = document.createElement('div');
    modal.id = 'discord-config-modal';
    modal.className = 'win-modal-overlay';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    modal.style.padding = '20px';
    
    modal.innerHTML = `
      <div class="win-modal-card" style="max-width: 500px; text-align: left; background: #1a1a24; border: 1px solid var(--betclic-red); padding: 25px; border-radius: 8px; box-shadow: 0 0 30px rgba(230,0,0,0.25); color: #fff; width: 100%;">
        <h3 style="color: var(--betclic-red); font-size: 1.5rem; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-weight:700;">
          <i data-lucide="settings"></i> Configuração Discord (Static Host)
        </h3>
        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-gray); margin-bottom: 15px;">
          Para ativar a autenticação do Discord no GitHub Pages, precisas de usar a tua própria aplicação Discord no <strong>Discord Developer Portal</strong>.
        </p>
        
        <div style="background: rgba(0,0,0,0.3); border-left: 3px solid var(--betclic-red); padding: 10px 15px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 20px; color: var(--text-gray);">
          <strong style="display:block; margin-bottom:5px; color:#fff;">Passo a Passo:</strong>
          <ol style="margin-left: 15px; display: flex; flex-direction: column; gap: 5px; padding-left: 0;">
            <li>Cria uma aplicação em <a href="https://discord.com/developers/applications" target="_blank" style="color: var(--betclic-red); text-decoration: underline;">discord.com/developers/applications</a>.</li>
            <li>No menu <strong>OAuth2</strong>, clica em <strong>Add Redirect</strong> e insere:<br>
                <code style="background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 3px; display: inline-block; margin-top: 3px; color: #fff; word-break: break-all;">${currentOrigin}</code>
            </li>
            <li>Cria o redirect e clica em <strong>Save Changes</strong> no fundo.</li>
            <li>Copia o teu <strong>Client ID</strong> (no menu <i>OAuth2</i>) e insere-o abaixo:</li>
          </ol>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display:block; font-size:0.8rem; text-transform:uppercase; margin-bottom: 8px; color: var(--text-gray); font-weight:700;">Client ID do Discord:</label>
          <input type="text" id="discord-client-id-input" class="stake-input" placeholder="Ex: 123456789012345678" style="width: 100%; text-align: center; font-weight: 700; background: #0f0f15; border: 1px solid #333; color:#fff; padding: 10px; border-radius:4px;">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button class="btn btn-outline" id="close-discord-config-btn" style="flex: 1; border: 1px solid #444; background: transparent; color:#fff; cursor:pointer; padding:10px; border-radius:4px;">Cancelar</button>
          <button class="btn btn-gold" id="save-discord-config-btn" style="flex: 1; border: none; background: var(--betclic-red); color:#fff; cursor:pointer; padding:10px; border-radius:4px; font-weight:700;">Guardar & Entrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    initIcons();

    document.getElementById('close-discord-config-btn').addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('save-discord-config-btn').addEventListener('click', () => {
      const clientId = document.getElementById('discord-client-id-input').value.trim();
      if (!clientId || !/^\d{17,19}$/.test(clientId)) {
        showToast('Client ID do Discord inválido! Deve conter apenas entre 17 a 19 dígitos.', 'error');
        return;
      }

      localStorage.setItem('discord_client_id', clientId);
      modal.remove();
      redirectToDiscordOAuth(clientId);
    });
  }

  function redirectToDiscordOAuth(clientId) {
    const currentOrigin = getStaticRedirectUri();
    const stateValue = createOAuthState();
    localStorage.setItem(DISCORD_STATE_KEY, stateValue);
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(currentOrigin)}&response_type=token&scope=identify&state=${encodeURIComponent(stateValue)}&prompt=consent`;
    window.location.href = discordAuthUrl;
  }

  // --- CLIENT-SIDE ESPN SCOREBOARD FETCHING (CORS PROXY) HELPERS ---
  async function fetchMatchesOffline() {
    const url = getWorldCupScoreboardUrl();
    
    // Attempt 0: direct ESPN request. Some browsers allow it; if not, proxies below are used.
    return await fetchJsonWithCorsFallback(url, processESPNScoreboard);
  }

  async function fetchJsonWithCorsFallback(url, mapper = (json) => json) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const json = await response.json();
        return await mapper(json);
      }
    } catch (e) {
      console.warn('Pedido direto ESPN falhou, a tentar proxies CORS...');
    }
    
    // Attempt 1: corsproxy.io
    try {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (response.ok) {
        const json = await response.json();
        return await mapper(json);
      }
    } catch (e) {
      console.warn('corsproxy.io falhou, a tentar allorigins...');
    }

    // Attempt 2: allorigins.win
    try {
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const json = await response.json();
        return await mapper(json);
      }
    } catch (e) {
      console.warn('allorigins.win falhou.');
    }
    
    throw new Error('Todos os pedidos Ã ESPN falharam.');
  }

  function getWorldCupScoreboardUrl() {
    const today = new Date();
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - 2);
    const end = new Date(today);
    end.setUTCDate(today.getUTCDate() + 45);

    const formatDate = (date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const range = `${formatDate(start)}-${formatDate(end)}`;
    return `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${range}&limit=500&_=${Date.now()}`;
  }

  async function processESPNScoreboard(json) {
    const events = json.events || [];
    const competitionName = json.leagues && json.leagues[0] ? json.leagues[0].name : 'FIFA World Cup';
    
    let localMatches = JSON.parse(localStorage.getItem('nexus_matches') || '[]');
    let updatedMatches = [];
    
    events.forEach(event => {
      const matchId = 'espn_' + event.id;
      const comp = event.competitions && event.competitions[0];
      if (!comp) return;

      const homeCompetitor = comp.competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = comp.competitors.find(c => c.homeAway === 'away');
      if (!homeCompetitor || !awayCompetitor) return;

      const homeTeam = homeCompetitor.team.displayName;
      const awayTeam = awayCompetitor.team.displayName;
      const homeTeamId = homeCompetitor.team.id;
      const awayTeamId = awayCompetitor.team.id;
      const homeLogo = homeCompetitor.team.logo || 'https://flagsapi.com/US/flat/64.png';
      const awayLogo = awayCompetitor.team.logo || 'https://flagsapi.com/US/flat/64.png';

      let status = 'scheduled';
      const state = event.status.type.state;
      if (state === 'in') {
        status = 'live';
      } else if (state === 'post') {
        status = 'finished';
      }

      const scoreHome = parseInt(homeCompetitor.score) || 0;
      const scoreAway = parseInt(awayCompetitor.score) || 0;
      const minute = getESPNMatchMinute(event.status, status);

      const existing = localMatches.find(m => m.id === matchId);
      const existingScorers = existing?.goal_scorers || [];
      const goalScorers = scoreHome + scoreAway > 0 ? existingScorers : [];
      let baseOdds = existing ? existing.baseOdds || existing.odds : null;
      if (!baseOdds) {
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

      let odds = { ...baseOdds };
      if (status === 'live') {
        odds = calculateLiveOddsLocal(scoreHome, scoreAway, minute, baseOdds);
      }

      const matchObj = {
        id: matchId,
        espn_event_id: event.id,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_logo: homeLogo,
        away_logo: awayLogo,
        status: status,
        status_detail: event.status?.type?.shortDetail || event.status?.type?.detail || '',
        minute: minute,
        score_home: scoreHome,
        score_away: scoreAway,
        competition: competitionName,
        date: event.date.split('T')[0],
        time: event.date.split('T')[1].slice(0, 5),
        baseOdds: baseOdds,
        odds: odds,
        goal_scorers: goalScorers,
        scorer_markets: existing?.scorer_markets || {
          home: buildFallbackScorerMarkets(homeTeamId, homeTeam),
          away: buildFallbackScorerMarkets(awayTeamId, awayTeam)
        }
      };

      updatedMatches.push(matchObj);
    });

    await enrichMatchesWithScorers(updatedMatches);

    updatedMatches.forEach(match => {
      settleLocalBetsForMatch(match.id, match.score_home, match.score_away, match.goal_scorers || [], match.status);
    });

    localStorage.setItem('nexus_matches', JSON.stringify(updatedMatches));
    return updatedMatches;
  }

  function getESPNMatchMinute(status, mappedStatus) {
    if (mappedStatus === 'scheduled') return 0;
    if (mappedStatus === 'finished') return 90;

    const displayClock = status?.displayClock || '';
    const displayMinute = parseInt(displayClock.replace(/[^\d]/g, ''), 10);
    if (!Number.isNaN(displayMinute) && displayMinute > 0) {
      return Math.min(120, displayMinute);
    }

    const clock = Number(status?.clock);
    if (Number.isFinite(clock) && clock > 0) {
      return Math.min(120, Math.floor(clock / 60));
    }

    return 45;
  }

  async function enrichMatchesWithScorers(matches) {
    const teamIds = [...new Set(matches.flatMap(match => [match.home_team_id, match.away_team_id]).filter(Boolean))];
    const rosterEntries = await Promise.all(teamIds.map(async teamId => [teamId, await fetchTeamScorerOptions(teamId)]));
    const rosterByTeam = Object.fromEntries(rosterEntries);

    matches.forEach(match => {
      const homeOptions = rosterByTeam[match.home_team_id] || match.scorer_markets?.home || [];
      const awayOptions = rosterByTeam[match.away_team_id] || match.scorer_markets?.away || [];
      match.scorer_markets = {
        home: homeOptions.slice(0, 6),
        away: awayOptions.slice(0, 6)
      };
    });

    const matchesNeedingGoals = matches.filter(match => {
      const totalGoals = Number(match.score_home || 0) + Number(match.score_away || 0);
      return totalGoals > 0 && match.espn_event_id;
    });

    await Promise.all(matchesNeedingGoals.map(async match => {
      const scorers = await fetchMatchGoalScorers(match.espn_event_id);
      if (scorers.length) {
        match.goal_scorers = scorers;
      }
    }));
  }

  async function fetchTeamScorerOptions(teamId) {
    const cache = JSON.parse(localStorage.getItem(ROSTER_CACHE_KEY) || '{}');
    const cached = cache[teamId];
    const oneDay = 24 * 60 * 60 * 1000;
    if (cached && Date.now() - cached.fetchedAt < oneDay) {
      return cached.players;
    }

    try {
      const json = await fetchJsonWithCorsFallback(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${teamId}/roster`);
      const players = (json.athletes || [])
        .filter(player => !isGoalkeeper(player))
        .map(player => ({
          id: String(player.id),
          name: player.displayName || player.fullName,
          shortName: getPlayerDisplayName(player.displayName || player.fullName || player.shortName),
          position: player.position?.abbreviation || player.position?.name || '',
          odd: getScorerOdd(player.position?.abbreviation || player.position?.name || '')
        }))
        .filter(player => player.name)
        .sort((a, b) => getPositionPriority(a.position) - getPositionPriority(b.position));

      cache[teamId] = { fetchedAt: Date.now(), players };
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(cache));
      return players;
    } catch (error) {
      console.warn(`Falha ao obter plantel ESPN da equipa ${teamId}:`, error.message);
      return [];
    }
  }

  async function fetchMatchGoalScorers(eventId) {
    try {
      const json = await fetchJsonWithCorsFallback(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}&_=${Date.now()}`);
      return (json.keyEvents || [])
        .filter(event => event.scoringPlay || /goal/i.test(event.type?.text || ''))
        .map(event => {
          const name = extractScorerName(event.text || '');
          if (!name) return null;
          return {
            name,
            normalizedName: normalizeName(name),
            teamId: event.team?.id ? String(event.team.id) : '',
            teamName: event.team?.displayName || '',
            minute: event.clock?.displayValue || ''
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.warn(`Falha ao obter marcadores reais ESPN do jogo ${eventId}:`, error.message);
      return [];
    }
  }

  async function fetchMatchLineups(eventId) {
    try {
      const json = await fetchJsonWithCorsFallback(`https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}&_=${Date.now()}`);
      const lineups = { home: [], away: [], available: false };

      (json.rosters || []).forEach(teamRoster => {
        const side = teamRoster.homeAway === 'away' ? 'away' : 'home';
        const starters = (teamRoster.roster || [])
          .filter(item => item.starter)
          .sort((a, b) => Number(a.formationPlace || 99) - Number(b.formationPlace || 99))
          .map(item => ({
            id: String(item.athlete?.id || ''),
            name: item.athlete?.displayName || item.athlete?.fullName || '',
            shortName: getPlayerDisplayName(item.athlete?.displayName || item.athlete?.fullName || ''),
            position: item.position?.abbreviation || item.position?.displayName || '',
            number: item.jersey || item.athlete?.jersey || ''
          }))
          .filter(player => player.name);

        lineups[side] = starters;
      });

      lineups.available = lineups.home.length > 0 || lineups.away.length > 0;
      return lineups;
    } catch (error) {
      console.warn(`Falha ao obter onze inicial ESPN do jogo ${eventId}:`, error.message);
      return { home: [], away: [], available: false };
    }
  }

  function extractScorerName(text) {
    const match = text.match(/Goal!\s.*?\.\s([^(.]+?)\s\(/i);
    return match ? match[1].trim() : '';
  }

  function buildFallbackScorerMarkets(teamId, teamName) {
    return [
      { id: `${teamId}-player-1`, name: `${teamName} - Avancado`, shortName: 'Avancado', position: 'F', odd: 4.5 },
      { id: `${teamId}-player-2`, name: `${teamName} - Medio`, shortName: 'Medio', position: 'M', odd: 6.5 }
    ];
  }

  function isGoalkeeper(player) {
    const abbreviation = String(player.position?.abbreviation || '').toUpperCase();
    const name = String(player.position?.name || '').toLowerCase();
    return abbreviation === 'G' || abbreviation === 'GK' || name.includes('goalkeeper') || name.includes('keeper');
  }

  function getPositionPriority(position) {
    const value = String(position).toUpperCase();
    if (value.includes('F') || value.includes('FORWARD') || value.includes('ATTACKER')) return 0;
    if (value.includes('M') || value.includes('MID')) return 1;
    if (value.includes('D') || value.includes('DEF')) return 2;
    return 3;
  }

  function getScorerOdd(position) {
    const priority = getPositionPriority(position);
    if (priority === 0) return 4.25;
    if (priority === 1) return 6.5;
    if (priority === 2) return 10.0;
    return 8.0;
  }

  function getPlayerDisplayName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  function normalizeName(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/gi, '')
      .toLowerCase()
      .trim();
  }

  function namesMatch(a, b) {
    const first = normalizeName(a);
    const second = normalizeName(b);
    return first === second || first.includes(second) || second.includes(first);
  }

  function jsString(value) {
    return JSON.stringify(String(value || ''));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function calculateLiveOddsLocal(scoreHome, scoreAway, minute, baseOdds) {
    const timeRemainingFactor = Math.max(0, (90 - minute) / 90);
    let odds = { ...baseOdds };

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
    return odds;
  }

  function settleLocalBetsForMatch(matchId, scoreHome, scoreAway, goalScorers = [], matchStatus = 'scheduled') {
    let localBets = JSON.parse(localStorage.getItem('nexus_bets') || '[]');
    let localUser = JSON.parse(localStorage.getItem('nexus_user'));
    let localTxs = JSON.parse(localStorage.getItem('nexus_transactions') || '[]');
    let userChanged = false;

    const matchBets = localBets.filter(b => b.match_id === matchId && b.status === 'pending');
    matchBets.forEach(bet => {
      let isSettled = matchStatus === 'finished';
      let isWin = false;

      if (bet.type === '1' && matchStatus === 'finished') isWin = scoreHome > scoreAway;
      else if (bet.type === 'X' && matchStatus === 'finished') isWin = scoreHome === scoreAway;
      else if (bet.type === '2' && matchStatus === 'finished') isWin = scoreHome < scoreAway;
      else if (bet.type === 'scorer') {
        const scored = goalScorers.some(scorer =>
          namesMatch(scorer.name, bet.scorerName) &&
          (!bet.scorerTeamId || String(scorer.teamId) === String(bet.scorerTeamId))
        );
        isWin = scored;
        isSettled = scored || matchStatus === 'finished';
      }

      if (!isSettled) return;

      const idx = localBets.findIndex(b => b.id === bet.id);
      if (idx !== -1) {
        localBets[idx].status = isWin ? 'won' : 'lost';
        localBets[idx].settled_at = new Date().toISOString();
      }

      if (isWin && localUser) {
        userChanged = true;
        localUser.balance += Math.floor(bet.potential_win);
        localUser.wins += 1;
        localUser.xp += Math.floor(bet.potential_win * 0.05) + 20;
        localUser.level = Math.floor(localUser.xp / 100) + 1;

        localTxs.unshift({
          id: localTxs.length + 1,
          user_id: localUser.id,
          type: 'bet_win',
          amount: Math.floor(bet.potential_win),
          description: `Ganhos da aposta #${bet.id} (Real-World Match)`,
          timestamp: new Date().toISOString()
        });
      } else if (!isWin && localUser) {
        userChanged = true;
        localUser.losses += 1;
        localUser.xp += 5;
        localUser.level = Math.floor(localUser.xp / 100) + 1;
      }
    });

    if (userChanged && localUser) {
      localStorage.setItem('nexus_user', JSON.stringify(localUser));
      localStorage.setItem('nexus_transactions', JSON.stringify(localTxs));
      state.user = localUser;
      updateHeaderUI();
      if (state.activeScreen === 'stats') renderProfilePage(localTxs);
    }

    localStorage.setItem('nexus_bets', JSON.stringify(localBets));
    state.bets = localBets;
    detectNewWins(localBets);
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

    // Discord link click (implicit grant flow for static mode)
    document.getElementById('login-discord-link').addEventListener('click', (e) => {
      e.preventDefault();
      if (state.isLocalMode) {
        const clientId = localStorage.getItem('discord_client_id') || DISCORD_CLIENT_ID;
        if (clientId) {
          redirectToDiscordOAuth(clientId);
        } else {
          showDiscordClientIdModal();
        }
      } else {
        window.location.href = '/auth/discord';
      }
    });

    document.addEventListener('click', (event) => {
      const oddButton = event.target.closest('.odd-btn[data-bet-match]');
      if (oddButton) {
        event.preventDefault();
        event.stopPropagation();
        selectBet(
          oddButton.dataset.betMatch,
          oddButton.dataset.betType,
          oddButton.dataset.betName,
          Number(oddButton.dataset.betOdd)
        );
        return;
      }

      const lineupButton = event.target.closest('.lineup-toggle-btn');
      if (lineupButton) {
        event.preventDefault();
        event.stopPropagation();
        toggleLineupPanel(lineupButton.dataset.lineupMatch);
        return;
      }

      const scorerButton = event.target.closest('.scorer-btn');
      if (scorerButton) {
        event.preventDefault();
        event.stopPropagation();
        selectScorerBet(
          scorerButton.dataset.matchId,
          scorerButton.dataset.scorerId,
          scorerButton.dataset.playerName,
          scorerButton.dataset.playerLabel || scorerButton.dataset.playerName,
          scorerButton.dataset.teamName,
          scorerButton.dataset.teamId,
          Number(scorerButton.dataset.odd)
        );
        return;
      }

      const matchCard = event.target.closest('[data-scorer-toggle]');
      if (!matchCard || event.target.closest('button, a, input, select, textarea')) return;

      const matchId = matchCard.dataset.scorerToggle;
      state.openScorerMatchId = state.openScorerMatchId === matchId ? null : matchId;
      if (state.openScorerMatchId !== matchId) {
        state.openLineupMatchId = null;
      } else if (state.openLineupMatchId && state.openLineupMatchId !== matchId) {
        state.openLineupMatchId = null;
      }
      renderMatches();
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

    const mobileSlipBackdrop = document.getElementById('mobile-slip-backdrop');
    if (mobileSlipBackdrop) {
      mobileSlipBackdrop.addEventListener('click', closeMobileBetSlip);
    }

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
          <div class="match-card ${state.openScorerMatchId === m.id ? 'scorers-open' : ''}" data-scorer-toggle="${m.id}">
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
              <button class="odd-btn ${isHomeSelected ? 'active' : ''}" id="btn-odd-${m.id}-win_home" data-bet-match="${escapeHtml(m.id)}" data-bet-type="1" data-bet-name="${escapeHtml(m.home_team)}" data-bet-odd="${m.odds.win_home}">
                <span class="odd-label">1</span>
                <span class="odd-val">${m.odds.win_home.toFixed(2)}</span>
              </button>
              <button class="odd-btn ${isDrawSelected ? 'active' : ''}" id="btn-odd-${m.id}-draw" data-bet-match="${escapeHtml(m.id)}" data-bet-type="X" data-bet-name="Empate" data-bet-odd="${m.odds.draw}">
                <span class="odd-label">X</span>
                <span class="odd-val">${m.odds.draw.toFixed(2)}</span>
              </button>
              <button class="odd-btn ${isAwaySelected ? 'active' : ''}" id="btn-odd-${m.id}-win_away" data-bet-match="${escapeHtml(m.id)}" data-bet-type="2" data-bet-name="${escapeHtml(m.away_team)}" data-bet-odd="${m.odds.win_away}">
                <span class="odd-label">2</span>
                <span class="odd-val">${m.odds.win_away.toFixed(2)}</span>
              </button>
            </div>
            ${renderScorerMarket(m)}
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
            <div class="list-match-row ${state.openScorerMatchId === m.id ? 'scorers-open' : ''}" data-scorer-toggle="${m.id}">
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
                <button class="odd-btn ${isHomeSelected ? 'active' : ''}" id="btn-odd-${m.id}-win_home" data-bet-match="${escapeHtml(m.id)}" data-bet-type="1" data-bet-name="${escapeHtml(m.home_team)}" data-bet-odd="${m.odds.win_home}">
                  <span class="odd-label">1</span>
                  <span class="odd-val">${m.odds.win_home.toFixed(2)}</span>
                </button>
                <button class="odd-btn ${isDrawSelected ? 'active' : ''}" id="btn-odd-${m.id}-draw" data-bet-match="${escapeHtml(m.id)}" data-bet-type="X" data-bet-name="Empate" data-bet-odd="${m.odds.draw}">
                  <span class="odd-label">X</span>
                  <span class="odd-val">${m.odds.draw.toFixed(2)}</span>
                </button>
                <button class="odd-btn ${isAwaySelected ? 'active' : ''}" id="btn-odd-${m.id}-win_away" data-bet-match="${escapeHtml(m.id)}" data-bet-type="2" data-bet-name="${escapeHtml(m.away_team)}" data-bet-odd="${m.odds.win_away}">
                  <span class="odd-label">2</span>
                  <span class="odd-val">${m.odds.win_away.toFixed(2)}</span>
                </button>
              </div>
              ${renderScorerMarket(m)}
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

  function renderScorerMarket(match) {
    const homePlayers = match.scorer_markets?.home || [];
    const awayPlayers = match.scorer_markets?.away || [];
    if (!homePlayers.length && !awayPlayers.length) return '';

    const renderPlayerButton = (player, teamName, teamId) => {
      const isSelected =
        state.activeSelection &&
        state.activeSelection.matchId === match.id &&
        state.activeSelection.betType === 'scorer' &&
        state.activeSelection.scorerId === player.id;

      return `
        <button class="scorer-btn ${isSelected ? 'active' : ''}" type="button"
          data-match-id="${escapeHtml(match.id)}"
          data-scorer-id="${escapeHtml(player.id)}"
          data-player-name="${escapeHtml(player.name)}"
          data-player-label="${escapeHtml(player.shortName || player.name)}"
          data-team-name="${escapeHtml(teamName)}"
          data-team-id="${escapeHtml(teamId)}"
          data-odd="${Number(player.odd).toFixed(2)}">
          <span class="scorer-name">${player.shortName || player.name}</span>
          <span class="scorer-odd">${Number(player.odd).toFixed(2)}</span>
        </button>
      `;
    };

    return `
      <div class="scorer-market">
        <div class="match-hidden-actions">
          <button class="lineup-toggle-btn" type="button" data-lineup-match="${escapeHtml(match.id)}">
            <i data-lucide="list-start"></i>
            <span>Onze inicial</span>
          </button>
        </div>
        ${renderLineupPanel(match)}
        <div class="market-title">
          <i data-lucide="target"></i>
          <span>Marcador em qualquer momento</span>
        </div>
        <div class="scorer-columns">
          <div class="scorer-team">
            <span class="scorer-team-name">${match.home_team}</span>
            <div class="scorer-list">
              ${homePlayers.map(player => renderPlayerButton(player, match.home_team, match.home_team_id)).join('')}
            </div>
          </div>
          <div class="scorer-team">
            <span class="scorer-team-name">${match.away_team}</span>
            <div class="scorer-list">
              ${awayPlayers.map(player => renderPlayerButton(player, match.away_team, match.away_team_id)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderLineupPanel(match) {
    if (state.openLineupMatchId !== match.id) return '';

    const lineups = match.lineups || { home: [], away: [], available: false };
    if (!lineups.available) {
      return `
        <div class="lineup-panel">
          <div class="lineup-empty">Onze inicial ainda nao divulgado pela ESPN.</div>
        </div>
      `;
    }

    const renderTeamLineup = (teamName, players) => `
      <div class="lineup-team">
        <span class="lineup-team-title">${teamName}</span>
        <div class="lineup-list">
          ${players.slice(0, 11).map((player, index) => `
            <div class="lineup-player">
              <span class="lineup-index">${index + 1}</span>
              <span class="lineup-name">${player.shortName || player.name}</span>
              <span class="lineup-position">${player.position || '-'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    return `
      <div class="lineup-panel">
        ${renderTeamLineup(match.home_team, lineups.home)}
        ${renderTeamLineup(match.away_team, lineups.away)}
      </div>
    `;
  }

  window.selectBet = function(matchId, betType, selectionName, odd, extra = {}) {
    if (!state.user) {
      showToast('Liga a tua conta Discord para começar a apostar!', 'info');
      return;
    }

    const match = state.matches.find(m => m.id === matchId);
    if (!match) return;

    // Toggle off if clicking the same active selection
    if (state.activeSelection && 
        state.activeSelection.matchId === matchId && 
        state.activeSelection.betType === betType &&
        state.activeSelection.selectionName === selectionName) {
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
      awayTeam: match.away_team,
      ...extra
    };

    renderBetSlip();
    renderMatches();
    
    // Auto-scroll to Bet Slip on small screens
    if (window.innerWidth <= 1080) {
      openMobileBetSlip();
      showToast(`Adicionado ao Boletim: ${selectionName} @ ${odd.toFixed(2)}`, 'info');
    }
  };

  function openMobileBetSlip() {
    if (window.innerWidth > 1080) return;
    document.getElementById('bet-slip')?.classList.add('mobile-open');
    document.getElementById('mobile-slip-backdrop')?.classList.add('active');
    document.body.classList.add('mobile-slip-active');
  }

  function closeMobileBetSlip() {
    document.getElementById('bet-slip')?.classList.remove('mobile-open');
    document.getElementById('mobile-slip-backdrop')?.classList.remove('active');
    document.body.classList.remove('mobile-slip-active');
  }

  window.selectScorerBet = function(matchId, scorerId, playerName, playerLabel, teamName, teamId, odd) {
    const displayName = playerLabel || getPlayerDisplayName(playerName);
    selectBet(matchId, 'scorer', displayName, Number(odd), {
      scorerId,
      scorerName: playerName,
      scorerLabel: displayName,
      scorerTeam: teamName,
      scorerTeamId: teamId,
      marketLabel: `Marcador: ${displayName}`
    });
  };

  async function toggleLineupPanel(matchId) {
    if (state.openLineupMatchId === matchId) {
      state.openLineupMatchId = null;
      renderMatches();
      return;
    }

    const match = state.matches.find(item => item.id === matchId);
    if (!match) return;

    state.openScorerMatchId = matchId;
    state.openLineupMatchId = matchId;

    if (!match.lineups && match.espn_event_id) {
      showToast('A obter onze inicial...', 'info');
      match.lineups = await fetchMatchLineups(match.espn_event_id);
      const storedMatches = JSON.parse(localStorage.getItem('nexus_matches') || '[]');
      const storedMatch = storedMatches.find(item => item.id === match.id);
      if (storedMatch) {
        storedMatch.lineups = match.lineups;
        localStorage.setItem('nexus_matches', JSON.stringify(storedMatches));
      }
    }

    renderMatches();
  }

  window.clearSelection = function() {
    state.activeSelection = null;
    renderBetSlip();
    renderMatches();
    closeMobileBetSlip();
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

    const marketLabel = state.activeSelection.marketLabel || `Resultado: ${state.activeSelection.selectionName}`;
    const teamHint = state.activeSelection.betType === 'scorer' ? `<div class="sel-market-hint">${state.activeSelection.scorerTeam}</div>` : '';

    slipContainer.innerHTML = `
      <div class="selection-card">
        <button class="btn-remove-selection" onclick="clearSelection()">
          <i data-lucide="x"></i>
        </button>
        <div class="sel-match-title">${state.activeSelection.homeTeam} vs ${state.activeSelection.awayTeam}</div>
        ${teamHint}
        <div class="sel-bet-row">
          <span class="sel-name">Resultado Fictício: ${state.activeSelection.selectionName}</span>
          <span class="sel-odd">${state.activeSelection.odd.toFixed(2)}</span>
        </div>
      </div>
    `;

    slipContainer.querySelector('.sel-name').textContent = marketLabel;
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
    else if (state.activeSelection.betType === 'scorer') {
      const players = [...(match.scorer_markets?.home || []), ...(match.scorer_markets?.away || [])];
      const player = players.find(item => item.id === state.activeSelection.scorerId);
      if (player) freshOdd = Number(player.odd);
    }

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
        scorerId: state.activeSelection.scorerId || null,
        scorerName: state.activeSelection.scorerName || null,
        scorerTeamId: state.activeSelection.scorerTeamId || null,
        scorerTeam: state.activeSelection.scorerTeam || null,
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
      closeMobileBetSlip();

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
            amount: stake,
            scorerId: state.activeSelection.scorerId || null,
            scorerName: state.activeSelection.scorerName || null,
            scorerTeamId: state.activeSelection.scorerTeamId || null,
            scorerTeam: state.activeSelection.scorerTeam || null
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showToast('Aposta fictícia colocada com sucesso!', 'success');
        state.activeSelection = null;
        stakeInput.value = '';
        closeMobileBetSlip();
        
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

      const liveMatches = localMatches.filter(m => m.status === 'live' && !m.id.startsWith('espn_'));
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
