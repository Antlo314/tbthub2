/**
 * SACRED SANCTUM SPA LOGIC
 * Unified Services: Auth, Data, UI
 */

const ADMIN_EMAIL = 'admin@truthbtoldhub.com';

// Sound Effects (No Music)
let clickSound, wooshSound;

// --- 0. DIAGNOSTICS & ERROR HANDLING ---
function diagLog(msg, type = 'info') {
    const consoleEl = document.getElementById('diagnostic-console');
    const logEl = document.getElementById('diagnostic-log');
    if (!consoleEl || !logEl) return;

    consoleEl.classList.remove('hidden');
    const entry = document.createElement('div');
    entry.style.color = type === 'error' ? '#ff5555' : '#aaaaaa';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(entry);
    console.log(`DIAG: ${msg}`);
}

window.onerror = (msg, url, line) => {
    diagLog(`ERROR: ${msg} at ${line}`, 'error');
    const loader = document.getElementById('loader-overlay');
    if (loader && !loader.classList.contains('hidden-fade')) {
        loader.classList.add('hidden-fade'); // Force hide loader on error
        diagLog('Emergency Loader Dismissal triggered.');
    }
    return false;
};

window.onunhandledrejection = (event) => {
    diagLog(`REJECTION: ${event.reason}`, 'error');
};

// State
const state = {
    user: null,
    profile: null,
    isAdmin: false,
    view: 'loading', // loading, gate, sanctum, whispers, profile
    tier: 'Initiate'
};

// --- 1. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    diagLog('System Initializing...');

    // 1. Initial UI Setup (Synchronous)
    try {
        clickSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.3 });
        wooshSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.2 });
        lucide.createIcons();
    } catch (e) {
        diagLog('Sound/Icons Init Failed: ' + e.message, 'error');
    }

    // 2. Start Background (Async)
    initThreeJSEmbers();
    initResonanceSoundscape();

    // 3. HARD INITIALIZATION GUARD
    const initTimeout = setTimeout(() => {
        const loader = document.getElementById('loader-overlay');
        if (loader && !loader.classList.contains('hidden-fade')) {
            diagLog('WARNING: Init took too long. Forcing Gate admission.', 'error');
            loader.classList.add('hidden-fade');
            transitionTo('gate');
        }
    }, 5000);

    // 4. Supabase & Session (Async/Run)
    (async () => {
        try {
            const sbReady = await initSupabaseClient();
            if (sbReady) {
                diagLog('Supabase Connection Established.');
                await checkSession();
                loadActiveCycle(); // Initial cycle check
                initPremiumEffects(); // Start animations
                initZionVLog(); // Initialize log scrolling
                initPulseBackground(); // Start breathing background
            } else {
                diagLog('Supabase Offline. Demo Mode active.', 'error');
                transitionTo('gate');
            }
        } catch (err) {
            diagLog('Critical Init Flow Error: ' + err.message, 'error');
            transitionTo('gate');
        } finally {
            clearTimeout(initTimeout);
            diagLog('Initialization sequence complete.');
            // Final check: if still loading, force hide
            const loader = document.getElementById('loader-overlay');
            if (loader) {
                loader.classList.add('hidden-fade');
                loader.style.pointerEvents = 'none';
            }

            // 5. SPA STABILITY (Back Button Intercept)
            window.addEventListener('popstate', (e) => {
                if (state.view !== 'sanctum' && state.view !== 'gate') {
                    diagLog('POPSTATE: Redirecting to Sanctum Hub.');
                    transitionTo('sanctum', false); // Don't push state again
                }
            });
        }
    })();
});

function playSound(name) {
    try {
        if (name === 'click' && clickSound) clickSound.play();
        if (name === 'woosh' && wooshSound) wooshSound.play();
    } catch (e) {
        console.warn('Audio playback failed');
    }
}

// --- 2. SUPABASE SETUP ---

async function initSupabaseClient() {
    diagLog('Authenticating with Sanctum API...');

    // 1. Try Environment API
    try {
        const response = await fetch('/api/env');
        if (response.ok) {
            const env = await response.json();
            if (env.url && env.key && !env.demo) {
                if (window.supabase) {
                    window.sb = window.supabase.createClient(env.url, env.key);
                    diagLog('Connection: Environment API');
                    const urlDisplay = document.getElementById('display-project-url');
                    if (urlDisplay) urlDisplay.textContent = env.url;
                    return true;
                } else {
                    diagLog('Supabase SDK missing!', 'error');
                }
            }
        } else {
            diagLog(`API Response: ${response.status} - Falling back...`);
        }
    } catch (e) {
        diagLog('API Fetch failed - Falling back to local configuration...');
    }

    // 2. Local Fallback (Always reach this if API fails)
    try {
        const LOCAL_URL = 'https://fveosuladewjtqoqhdbl.supabase.co';
        const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU';

        if (window.supabase) {
            // Check if project changed from last session
            const lastUrl = localStorage.getItem('last_supabase_url');
            if (lastUrl && lastUrl !== LOCAL_URL) {
                diagLog('Project Shift Detected. Purging old session remnant...', 'warning');
                for (let key in localStorage) {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                }
                localStorage.removeItem('supabase.auth.token');
            }
            localStorage.setItem('last_supabase_url', LOCAL_URL);

            window.sb = window.supabase.createClient(LOCAL_URL, LOCAL_KEY);
            diagLog(`CONNECTED TO: ${LOCAL_URL}`, 'success');
            diagLog('IMPORTANT: Verify this URL matches your Supabase Dashboard!', 'info');

            const urlDisplay = document.getElementById('display-project-url');
            if (urlDisplay) urlDisplay.textContent = LOCAL_URL;

            return true;
        } else {
            diagLog('Supabase SDK not found in window.', 'error');
            return false;
        }
    } catch (err) {
        diagLog('Critical SDK Error: ' + err.message, 'error');
        return false;
    }
}

async function checkSession() {
    if (!window.sb) {
        transitionTo('gate');
        return;
    }

    const { data: { session } } = await window.sb.auth.getSession();
    if (session) {
        handleLoginSuccess(session.user);
    } else {
        transitionTo('gate');
    }
}

function toggleAuthFlip() {
    diagLog('Switching Auth Mode...');
    const card = document.getElementById('auth-card-inner');
    const front = document.querySelector('.auth-face-front');
    const back = document.querySelector('.auth-face-back');

    card.classList.toggle('is-flipped');

    // Manual fallback for broken 3D visibility
    if (card.classList.contains('is-flipped')) {
        if (front) front.style.opacity = '0';
        if (back) back.style.opacity = '1';
    } else {
        if (front) front.style.opacity = '1';
        if (back) back.style.opacity = '0';
    }

    playSound('woosh');
}

function clearSanctumSession() {
    diagLog('Wiping Local Session Storage...');
    for (let key in localStorage) {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
    }
    localStorage.removeItem('supabase.auth.token');
    diagLog('Session Wiped. Please refresh.', 'success');
    showToast('Session Purged. Refreshing...', 'info');
    setTimeout(() => location.reload(), 1000);
}

async function signIn() {
    diagLog('>>> Function Called: signIn()');
    diagLog('Attempting manual authentication...');
    const emailInput = document.getElementById('auth-email-in');
    const passInput = document.getElementById('auth-password-in');
    if (!emailInput || !passInput) {
        diagLog('Auth inputs missing from DOM', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) return showToast('Enter your credentials.', 'error');

    playSound('click');
    diagLog(`Attempting sign-in for: ${email}`);
    showToast('Authenticating...', 'info');

    diagLog('Authenticating...');

    try {
        diagLog('Sending request to Supabase...');
        if (!window.sb) {
            diagLog('Supabase not initialized. Cannot sign in.', 'error');
            return showToast('Connection failed. Please refresh.', 'error');
        }
        const { data, error } = await window.sb.auth.signInWithPassword({ email, password });

        if (error) {
            diagLog('Login Error: ' + error.message, 'error');
            showToast(error.message, 'error');
        } else {
            diagLog('Login successful for ' + email);
            await checkSession();
        }
    } catch (err) {
        diagLog('Critical Auth Error: ' + err.message, 'error');
        showToast('Login Failed: ' + err.message, 'error');
    }
}


async function changeUsername() {
    if (!state.user) return;

    const input = document.getElementById('new-username-input');
    const newName = input.value.trim();
    if (newName.length < 3) return showToast('Name too short.', 'error');

    // 1. Check Rate Limit
    const lastChanged = state.profile.username_last_changed ? new Date(state.profile.username_last_changed) : null;
    const now = new Date();

    if (lastChanged) {
        const diffTime = Math.abs(now - lastChanged);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
            return showToast(`Must wait ${30 - diffDays} more days to rename.`, 'error');
        }
    }

    // 2. Update
    if (!window.sb) return diagLog('Renaming failed: Connection offline.', 'error');
    const { error } = await window.sb
        .from('profiles')
        .update({
            username: newName,
            username_last_changed: now.toISOString()
        })
        .eq('id', state.user.id);

    if (error) {
        diagLog('Rename Error: ' + error.message, 'error');
        showToast(error.message, 'error');
    } else {
        showToast(`Identity shifted to "${newName}".`, 'success');
        state.profile.username = newName;
        state.profile.username_last_changed = now.toISOString();
        input.value = '';
        loadProfileStats(); // Refresh UI
        updateUI();
    }
}

function updateGlobalMarquee(val) {
    const inputId = 'admin-marquee-input';
    const input = document.getElementById(inputId);
    const msg = val || input?.value;

    if (!msg || msg.trim() === "") {
        return showToast('Broadcast transmission requires essence (text).', 'error');
    }

    // Update Header Broadcast
    const broadcastText = document.getElementById('broadcast-text');
    const broadcastContainer = document.getElementById('system-broadcast');

    if (broadcastText) broadcastText.textContent = msg;
    if (broadcastContainer) broadcastContainer.classList.remove('hidden');

    // Admin UI Feedback
    const transmitBtn = event.currentTarget;
    if (transmitBtn) {
        const originalText = transmitBtn.textContent;
        transmitBtn.textContent = 'TRANSMITTED';
        transmitBtn.classList.add('glow-emerald');

        setTimeout(() => {
            transmitBtn.textContent = originalText;
            transmitBtn.classList.remove('glow-emerald');
        }, 2000);
    }

    showToast('SOVEREIGN BROADCAST INITIATED', 'success');
}

async function signUp() {
    diagLog('>>> Function Called: signUp()');
    const email = document.getElementById('auth-email-up').value;
    const password = document.getElementById('auth-password-up').value;
    const username = document.getElementById('auth-username-up').value;

    if (!email || !password || !username) return showToast('Fill all fields.', 'error');

    playSound('click');
    showToast('Forging identity...', 'info');

    if (!window.sb) {
        diagLog('Sign up failed: Supabase not initialized.', 'error');
        return showToast('Registration failed. Check connection.', 'error');
    }

    const { data, error } = await window.sb.auth.signUp({
        email,
        password,
        options: {
            data: { username: username }
        }
    });

    if (error) {
        diagLog('Registration Error: ' + error.message, 'error');
        showToast(error.message, 'error');
    } else {
        diagLog('Soul registered successfully.');
        showToast('Activation sequence initiated. Check your email.', 'success');
        // If email confirmation is off, we might have a session already
        if (data.session) {
            handleLoginSuccess(data.user);
        } else {
            // Simply switch view back to login without pre-filling
            toggleAuthFlip();
        }
    }
}

async function signOut() {
    playSound('click');
    if (window.sb) {
        await window.sb.auth.signOut();
    }
    location.reload();
}

async function handleLoginSuccess(user) {
    if (!user) return transitionTo('gate');

    state.user = user;
    state.isAdmin = (user.email === ADMIN_EMAIL);

    try {
        // Fetch Profile
        if (window.sb) {
            const { data: profile, error: profileError } = await window.sb
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                diagLog('Profile Fetch Error: ' + profileError.message, 'error');
            }

            if (profile?.is_banned) {
                showToast('You have been banished from the Sanctum.', 'error');
                await window.sb.auth.signOut();
                return transitionTo('gate');
            }

            state.profile = profile || {};
        } else {
            diagLog('Demo Admission: Profile fetching skipped.');
            state.profile = { username: user.username || 'Soul' };
        }

        // Calculate Aura Tier
        state.tier = state.profile?.tier || 'Initiate';
        if (state.isAdmin) state.tier = 'Architect';

        // Update UI Elements
        // Update Admin-Only Elements
        document.querySelectorAll('.admin-only').forEach(el => {
            if (state.isAdmin) {
                // Show if admin, but respect md:flex if present
                if (el.classList.contains('md:flex')) el.classList.remove('hidden');
                else el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        const debugBtn = document.querySelector('button[onclick="toggleDebugMode()"]');
        if (debugBtn) {
            // Hide debug on mobile
            if (state.isAdmin && window.innerWidth > 768) debugBtn.classList.remove('hidden');
            else debugBtn.classList.add('hidden');
        }

        // Admin Chamber View accessibility
        const chamberView = document.getElementById('view-chamber');
        if (chamberView) {
            // Architects can access this section
            if (state.isAdmin) diagLog('Admin Access Granted: Chamber Unlocked.');
            else chamberView.classList.add('hidden');
        }

        // Aura Update
        updateAuraParticles();
        // Trigger Awakening Sequence ONLY when a brand-new profile was just created
        if (window._isNewProfile) {
            window._isNewProfile = false;
            showAwakeningSequence();
        }
        // Transition to the main sanctum view
        transitionTo('sanctum');

        if (window.sb) {
            subscribeToPulse();
            checkVotingStatus(); // Load existing user vote
            initSovereignLogic(); // Apply sovereign protocol overrides
        }
    } catch (err) {
        diagLog('Critical Success Handler Error: ' + err.message, 'error');
        showToast('System synchronization failed.', 'error');
        transitionTo('gate');
    } finally {
        const loader = document.getElementById('loader-overlay');
        if (loader) loader.classList.add('hidden-fade');
    }
}

// --- 4. DATA & COMMUNITY ---

// Voting State
let votingActive = false;
let userVotes = new Set(); // Track what user voted for locally

async function checkVotingStatus() {
    // Rely on loadActiveCycle for global state
    await loadActiveCycle();

    // 2. Load User's existing votes
    if (state.user && window.sb) {
        const { data: votes } = await window.sb
            .from('votes')
            .select('sanctuary_id')
            .eq('user_id', state.user.id);

        if (votes && votes.length > 0) {
            userVotes = new Set(votes.map(v => v.sanctuary_id));
        } else {
            userVotes.clear();
        }
    }

    updateVotingUI();
}

function updateVotingUI() {
    // Toggle Vote Buttons visibility based on global setting
    const btns = document.querySelectorAll('.vote-btn-container');
    btns.forEach(btn => {
        if (votingActive) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });

    // Update specific card states (if already voted)
    document.querySelectorAll('.sanctuary-card').forEach(card => {
        const id = card.getAttribute('onclick')?.match(/'([^']+)'/)[1];
        const btn = card.querySelector('.vote-btn');

        if (userVotes.has(id)) {
            card.classList.add('border-orange-500');
            if (btn) {
                btn.textContent = 'VOTED';
                btn.classList.add('bg-orange-600', 'text-black');
                btn.classList.remove('btn-ghost');
                btn.disabled = true;
            }
        }
    });

    // Show Pulse/Status Message
    const pulseStatus = document.getElementById('pulse-status');
    if (pulseStatus) {
        pulseStatus.textContent = votingActive ? "THE PULSE IS ALIVE" : "THE PULSE IS DORMANT";
        pulseStatus.className = votingActive ? "text-orange-500 animate-pulse tracking-widest text-xs" : "text-gray-600 tracking-widest text-xs";
    }
}

async function castVote(sanctuaryId) {
    if (!state.user) return showToast('You must be a soul to vote.', 'error');
    if (!votingActive) return showToast('The Pulse is currently dormant.', 'info');
    if (userVotes.has(sanctuaryId)) return showToast('You are already aligned with this sanctuary.', 'info');

    playSound('click');

    // Use RPC for definitive safe voting — bypasses all client-side WHERE clause restrictions
    const { error } = await window.sb.rpc('cast_vote', { target_sanctuary_id: sanctuaryId });

    if (error) {
        console.error('Vote Error:', error);
        showToast(error.message, 'error');
    } else {
        userVotes.clear(); // Ensure only one local vote
        userVotes.add(sanctuaryId);
        updateVotingUI();
        showToast('Your soul has aligned with the void.', 'success');
        loadLivePulse();
        loadVoteCounts(); // Refresh live counters

        // Increment votes_cast in the database (not just locally)
        if (state.user) {
            await window.sb
                .from('profiles')
                .update({ votes_cast: (state.profile?.votes_cast || 0) + 1 })
                .eq('id', state.user.id);
            if (state.profile) state.profile.votes_cast = (state.profile.votes_cast || 0) + 1;
            // Refresh the profile votes display
            const votesDisp = document.getElementById('profile-votes');
            if (votesDisp) votesDisp.textContent = state.profile.votes_cast;
        }
    }
}

// Load and display live vote counts from the database
async function loadVoteCounts() {
    if (!window.sb) return;
    const { data: counts } = await window.sb
        .from('view_vote_counts')
        .select('sanctuary_id, count');

    if (!counts) return;

    // Build a map for quick lookup
    const countMap = {};
    counts.forEach(row => { countMap[row.sanctuary_id] = parseInt(row.count) || 0; });

    // Find the leader
    const maxCount = Math.max(0, ...Object.values(countMap));

    // Update each counter element
    document.querySelectorAll('.vote-count[data-sanctuary]').forEach(el => {
        const id = el.getAttribute('data-sanctuary');
        const count = countMap[id] || 0;
        el.textContent = count;

        // Highlight the leader in gold
        if (count > 0 && count === maxCount) {
            el.classList.remove('text-orange-500');
            el.classList.add('text-yellow-400');
            // Add a subtle crown indicator
            el.textContent = `${count} ★`;
        } else {
            el.classList.remove('text-yellow-400');
            el.classList.add('text-orange-500');
        }
    });
}

// --- CYCLE MANAGEMENT ---
let cycleTimerInterval = null;

async function loadActiveCycle() {
    // Attempt 1: Standard underscore naming
    let { data: cycle, error } = await window.sb
        .from('vote_cycles')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

    // Fallback: If column doesn't exist, try space naming (seen in some project versions)
    if (error && error.message.includes('column') && error.message.includes('is_active')) {
        console.warn("Detected missing 'is_active' column, trying fallback...");
        const { data: fallbackData, error: fallbackError } = await window.sb
            .from('vote_cycles')
            .select('*')
            .eq('is active', true)
            .maybeSingle();

        cycle = fallbackData;
        error = fallbackError;
    }

    if (cycle) {
        votingActive = true;
        document.getElementById('active-cycle-container').classList.remove('hidden');
        startCountdown(cycle.ends_at);
        updateVotingUI();
        loadVoteCounts(); // Populate live counters from DB
    } else {
        votingActive = false;
        document.getElementById('active-cycle-container').classList.add('hidden');
        if (error && !error.message.includes('JSON object')) {
            console.error("Cycle load error:", error);
        }
        updateVotingUI();
    }
}

function startCountdown(endTime) {
    if (cycleTimerInterval) clearInterval(cycleTimerInterval);

    const target = new Date(endTime).getTime();

    cycleTimerInterval = setInterval(() => {
        const now = new Date().getTime();
        const dist = target - now;

        if (dist < 0) {
            clearInterval(cycleTimerInterval);
            document.getElementById('active-cycle-timer').textContent = "00:00:00";
            loadActiveCycle(); // Refresh state
            return;
        }

        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);

        document.getElementById('active-cycle-timer').textContent =
            `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

async function startVoteCycle(hours) {
    const label = document.getElementById('cycle-label-in').value || 'New Cycle';
    const { data, error } = await window.sb.rpc('start_new_cycle', {
        duration_hours: hours,
        cycle_label: label
    });

    if (error) {
        showToast('Failed to start cycle: ' + error.message, 'error');
    } else {
        showToast(`Cycle "${label}" initiated for ${hours}h.`, 'success');
        loadActiveCycle();
    }
}

async function endVoteCycle() {
    // Switching to RPC for definitive "no WHERE clause" safety
    const { error } = await window.sb.rpc('terminate_active_cycle');

    if (error) showToast(error.message, 'error');
    else {
        showToast('Current cycle terminated.', 'info');
        loadActiveCycle();
        loadLivePulse(); // Wipe meters
    }
}

async function loadLivePulse() {
    // 1. Reset all bars before updating (Ensures wipe-clean on termination)
    document.querySelectorAll('.progress-bar').forEach(bar => bar.style.width = '0%');

    // 2. Fetch aggregated counts (requires the view view_vote_counts)
    const { data: counts, error } = await window.sb
        .from('view_vote_counts')
        .select('*');

    if (counts) {
        counts.forEach(row => {
            const card = document.querySelector(`div[onclick="castVote('${row.sanctuary_id}')"]`);
            if (card) {
                const progress = card.querySelector('.progress-bar');
                if (progress) {
                    // Logic to scale progress bar width
                    progress.style.width = Math.min(row.count * 10, 100) + '%';
                }
            }
        });
    }
}

// --- 4. DATA & COMMUNITY ---
let replyingTo = null; // Suggestion ID
let parentReplyId = null; // Nested Reply ID

async function loadSuggestions() {
    const feed = document.getElementById('whispers-feed');
    if (!feed) return;

    // Fetch suggestions with profile data
    const { data: suggestions, error } = await window.sb
        .from('suggestions')
        .select(`
            *,
            profiles:user_id (username, avatar_url),
            replies (*, profiles:user_id (username, avatar_url))
        `)
        .order('created_at', { ascending: true });

    if (error) return console.error('Whisper sync failed:', error);

    feed.innerHTML = '';

    suggestions.forEach(whisper => {
        const isLiked = state.user && whisper.likes?.includes(state.user.id);
        const avatar = whisper.profiles?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${whisper.user_id}`;
        const name = whisper.profiles?.username || 'Soul';
        const time = getHexTimestamp();
        const tier = whisper.profiles?.earned_tier || 'Ember';

        const auraClass = tier === 'Architect' ? 'border-l-4 border-amber-500 bg-amber-900/10 shadow-[0_0_15px_rgba(234,88,12,0.1)]' :
            tier === 'Primordial' ? 'border-l-4 border-yellow-500 bg-yellow-900/10' : '';

        const card = document.createElement('div');
        card.className = `message-bubble rounded-2xl p-4 opacity-0 whisper-mono ${auraClass} mb-4`;
        card.innerHTML = `
            <div class="flex gap-4">
                <img src="${avatar}" class="w-10 h-10 rounded-full border border-white/10 ring-2 ring-orange-500/20">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                            ${name}
                            ${tier === 'Architect' ? '<i data-lucide="shield-check" class="w-3 h-3 text-amber-500"></i>' : ''}
                        </span>
                        <span class="text-[9px] text-orange-500 font-mono font-bold">${time}</span>
                    </div>
                    <p class="text-sm text-gray-300 leading-relaxed">${whisper.content}</p>
                    
                    <div class="flex items-center gap-6 mt-4">
                        <button onclick="likeWhisper('${whisper.id}')" 
                            class="flex items-center gap-2 text-[10px] ${isLiked ? 'text-orange-500' : 'text-gray-500'} hover:text-orange-400 transition-colors">
                            <i data-lucide="heart" class="w-4 h-4 ${isLiked ? 'fill-current heart-pop' : ''}"></i>
                            <span>${whisper.likes?.length || 0}</span>
                        </button>
                        <button onclick="tipEssence(this, '${whisper.id}')"
                            class="flex items-center gap-2 text-[10px] text-gray-500 hover:text-orange-500 transition-colors group/tip">
                            <i data-lucide="zap" class="w-4 h-4 group-hover/tip:animate-pulse"></i>
                            <span>Tip Essence</span>
                        </button>
                        <button onclick="setReply('${whisper.id}', '${name}')" 
                            class="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white transition-colors">
                            <i data-lucide="message-square" class="w-4 h-4"></i>
                            <span>Reply</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="replies-${whisper.id}" class="mt-4 ml-14 space-y-4">
                ${renderReplies(whisper.replies || [])}
            </div>
        `;
        feed.appendChild(card);
    });

    // CASCADE ANIMATION
    gsap.to('.message-bubble', {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'transform'
    });

    if (window.lucide) lucide.createIcons();

    const scrollArea = document.getElementById('whispers-scroll-area');
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
}

function subscribeToWhispers() {
    if (state.whispersSubscribed) return;

    window.sb.channel('public:suggestions-hub')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => loadSuggestions())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, () => loadSuggestions())
        .subscribe();

    state.whispersSubscribed = true;
}

async function postWhisper() {
    if (!state.user) return showToast('You must be identified.', 'error');
    const input = document.getElementById('whisper-input');
    const content = input.value.trim();
    if (!content) return;

    showToast('Transmitting...', 'info');

    if (replyingTo) {
        // Post as Reply
        const { error } = await window.sb.from('replies').insert([{
            suggestion_id: replyingTo,
            parent_reply_id: parentReplyId, // Nested support
            user_id: state.user.id,
            content: content
        }]);
        if (error) showToast('Reply failed: ' + error.message, 'error');
        else cancelReply();
    } else {
        // Post as Suggestion
        const { error } = await window.sb.from('suggestions').insert([{
            user_id: state.user.id,
            content: content
        }]);
        if (error) showToast('Whisper blocked: ' + error.message, 'error');
    }

    input.value = '';
    loadSuggestions();
}

// --- 5. MUTUAL AID OPERATING SYSTEM (NEW) ---

function initPulseBackground() {
    const aura = document.querySelector('.pulse-aura');
    if (!aura) return;

    // Breathing effect synced with timer feel (slow/steady)
    gsap.to(aura, {
        opacity: 0.1,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });
}

function initZionVLog() {
    const logEntries = [
        ">> ZION_V CORE: OPERATIONAL",
        ">> SCANNING_PIRACY: ACTIVE",
        ">> TREASURY_ESCROW: SECURE",
        ">> CONSENSUS_ENGINE: STANDBY",
        ">> LUMEN_NETWORK: SYNCING",
        ">> ANONYMITY_PROTOCOL: ENABLED"
    ];

    const logContent = document.getElementById('log-content');
    if (!logContent) return;

    let index = 0;
    setInterval(() => {
        const entry = document.createElement('div');
        entry.className = 'log-entry mb-1 opacity-0';
        entry.textContent = logEntries[index % logEntries.length];
        logContent.prepend(entry);

        gsap.to(entry, { opacity: 1, duration: 0.5 });

        if (logContent.children.length > 8) {
            logContent.lastElementChild.remove();
        }
        index++;
    }, 3000);
}

function toggleLumenWallet() {
    const peek = document.getElementById('lumen-balance-peek');
    if (!peek) return;

    if (peek.classList.contains('hidden')) {
        peek.classList.remove('hidden');
        gsap.from(peek, { x: 10, opacity: 0, duration: 0.3 });
    } else {
        transitionTo('profile');
    }
}

function openTreasury() {
    diagLog('Opening Treasury Dashboard...');
    const treasuryView = document.getElementById('view-treasury');
    if (!treasuryView) return;

    treasuryView.style.display = 'flex';
    gsap.to(treasuryView, {
        y: '0%',
        duration: 0.8,
        ease: "expo.out",
        onComplete: () => {
            playSound('woosh');
            lucide.createIcons();
        }
    });
}

function closeTreasury() {
    const treasuryView = document.getElementById('view-treasury');
    if (!treasuryView) return;

    gsap.to(treasuryView, {
        y: '100%',
        duration: 0.6,
        ease: "expo.in",
        onComplete: () => {
            treasuryView.style.display = 'none';
        }
    });
}

function showContributionModal() {
    showToast('Initializing Secure Contribution Portal...', 'info');
    // Mock opening stripe/crypto modal
    setTimeout(() => {
        window.open('https://buy.stripe.com/PLACEHOLDER', '_blank');
    }, 1000);
}

function initSovereignLogic() {
    // 1. Admin Shield Restoration
    const shield = document.querySelector('i[data-lucide="shield"]')?.parentElement;
    if (shield) {
        shield.onclick = () => {
            if (state.user?.email === 'user@void' || state.isAdmin) {
                transitionTo('chamber');
            } else {
                lockedSectorAccess();
            }
        };
    }

    // 2. Chamber Card Sync
    if (state.user?.email === 'user@void' || state.isAdmin) {
        document.getElementById('chamber-seal')?.classList.add('hidden');
    }
}

function lockedSectorAccess() {
    playSound('error');
    const target = event.currentTarget;
    target.classList.add('shake-animation');
    setTimeout(() => target.classList.remove('shake-animation'), 500);
    showToast('CONSENSUS NOT REACHED. ACCESS DENIED BY ARCHITECT.', 'error');
}

function chamberAccess() {
    if (state.user?.email === 'user@void' || state.isAdmin) {
        transitionTo('chamber');
    } else {
        lockedSectorAccess();
    }
}

function getHexTimestamp() {
    const now = new Date();
    const hexH = now.getHours().toString(16).toUpperCase().padStart(2, '0');
    const hexM = now.getMinutes().toString(16).toUpperCase().padStart(2, '0');
    return `0x${hexH}:${hexM}`;
}

// Override Broadcast to update marquee in real-time
async function broadcastAnnouncement() {
    const input = document.getElementById('broadcast-input');
    const msg = input.value.trim();
    if (!msg) return;

    diagLog('Broadcasting system announcement...');

    // Update local UI
    const ticker = document.getElementById('broadcast-text');
    if (ticker) {
        ticker.textContent = msg;
        document.getElementById('system-broadcast').classList.remove('hidden');
    }

    // Persist to DB if possible (using existing suggestions table for demo or dedicated broadcast rpc)
    showToast('SYSTEM BROADCAST: SENT', 'success');
}

async function likeWhisper(id) {
    if (!state.user) return showToast('You must be within the Sanctum to record your will.', 'info');

    // Optimistic UI
    const whisper = suggestionsData.find(s => s.id === id); // Need to define suggestionsData globally or refetch
    // For now, simple interaction
    const { data } = await window.sb.from('suggestions').select('likes').eq('id', id).single();
    let likes = data?.likes || [];

    if (likes.includes(state.user.id)) {
        likes = likes.filter(uid => uid !== state.user.id);
    } else {
        likes.push(state.user.id);
    }

    await window.sb.from('suggestions').update({ likes }).eq('id', id);
    loadSuggestions();
}

function setReply(id, name, replyId = null) {
    replyingTo = id;
    parentReplyId = replyId;
    const context = document.getElementById('reply-context');
    const userSpan = document.getElementById('reply-to-user');
    context.classList.remove('hidden');
    userSpan.textContent = name;
    document.getElementById('whisper-input').focus();
}

function cancelReply() {
    replyingTo = null;
    parentReplyId = null;
    document.getElementById('reply-context').classList.add('hidden');
}

function renderReplies(replies, parentId = null, depth = 0) {
    const filtered = replies.filter(r => r.parent_reply_id === parentId);
    if (filtered.length === 0) return '';

    return filtered.map(reply => `
        <div class="relative pl-6 ${depth > 0 ? 'mt-2' : ''}">
            <div class="reply-line" style="left: -12px; height: ${depth > 0 ? '100%' : '24px'}"></div>
            <div class="flex flex-col gap-1">
                <p class="text-[11px] text-gray-400">
                    <span class="text-white font-bold mr-2 cursor-pointer hover:text-orange-500" 
                        onclick="setReply('${reply.suggestion_id}', '${reply.profiles?.username}', '${reply.id}')">
                        ${reply.profiles?.username || 'Soul'}
                    </span> 
                    ${reply.content}
                </p>
                <!-- Recursive Nesting -->
                ${renderReplies(replies, reply.id, depth + 1)}
            </div>
        </div>
    `).join('');
}

function formatTime(date) {
    const elapsed = new Date() - new Date(date);
    if (elapsed < 60000) return 'Just now';
    if (elapsed < 3600000) return Math.floor(elapsed / 60000) + 'm ago';
    if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + 'h ago';
    return new Date(date).toLocaleDateString();
}

// --- THE AWAKENING SEQUENCE (ONBOARDING) ---

function showAwakeningSequence() {
    const sequence = document.getElementById('initiation-ritual');
    if (sequence) {
        sequence.classList.remove('hidden');
        gsap.fromTo('#initiation-ritual .glass-panel',
            { opacity: 0, scale: 0.9, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "power4.out" }
        );
        nextInitStep(1);
    }
}

function nextInitStep(step) {
    // 1. Hide current steps
    const steps = document.querySelectorAll('.init-step');
    steps.forEach(el => el.classList.add('hidden'));

    // 2. Clear previous highlights
    document.querySelectorAll('.tour-focus').forEach(el => el.classList.remove('tour-focus'));
    document.querySelectorAll('.tour-dim-active').forEach(el => el.classList.remove('tour-dim-active'));

    // 3. Show target step with high-end animation
    const target = document.getElementById(`init-step-${step}`);
    if (target) {
        target.classList.remove('hidden');

        // Staggered entry for children
        gsap.fromTo(target.children,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
        );

        // 4. Interactive Highlights
        if (step === 2) {
            // Highlight Voting Grid
            const grid = document.getElementById('tour-voting-grid');
            if (grid) {
                grid.classList.add('tour-focus');
                gsap.fromTo(grid, { scale: 1 }, { scale: 1.02, duration: 0.4, yoyo: true, repeat: 1 });
            }
            document.querySelectorAll('.tour-dim').forEach(el => {
                if (!el.contains(grid)) el.classList.add('tour-dim-active');
            });
        }

        if (step === 3) {
            // Highlight Whispers
            const whispersBtn = window.innerWidth > 768 ?
                document.getElementById('tour-whispers-btn') :
                document.getElementById('tour-whispers-mobile');

            if (whispersBtn) {
                whispersBtn.classList.add('tour-focus');
                gsap.fromTo(whispersBtn, { scale: 1 }, { scale: 1.1, duration: 0.4, yoyo: true, repeat: 1 });
            }
            document.querySelectorAll('.tour-dim').forEach(el => el.classList.add('tour-dim-active'));
        }

        if (step === 4) {
            // Highlight Profile in Header
            const profileBtn = window.innerWidth > 768 ?
                document.getElementById('tour-profile-btn') :
                document.getElementById('tour-profile-mobile');

            if (profileBtn) {
                profileBtn.classList.add('tour-focus');
                gsap.fromTo(profileBtn, { scale: 1 }, { scale: 1.1, duration: 0.4, yoyo: true, repeat: 1 });
            }
            document.querySelectorAll('.tour-dim').forEach(el => el.classList.add('tour-dim-active'));
        }
    }
}

async function finishAwakening() {
    // Clear all highlights
    document.querySelectorAll('.tour-focus').forEach(el => el.classList.remove('tour-focus'));
    document.querySelectorAll('.tour-dim-active').forEach(el => el.classList.remove('tour-dim-active'));

    const sequence = document.getElementById('initiation-ritual');
    if (sequence) {
        gsap.to('#initiation-ritual .glass-panel', {
            opacity: 0, scale: 0.9, y: 20, duration: 0.5,
            onComplete: () => sequence.classList.add('hidden')
        });
    }

    // Mark onboarding as complete in the database — never show again
    if (state.user) {
        await window.sb
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', state.user.id);
    }

    // Show the "Know Yourself" arrow after intro
    const guidance = document.getElementById('soul-guidance');
    if (guidance) {
        guidance.classList.remove('hidden');
        gsap.fromTo(guidance, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
        setTimeout(() => {
            gsap.to(guidance, { opacity: 0, duration: 0.5, onComplete: () => guidance.classList.add('hidden') });
        }, 8000);
    }
}

// --- BROADCAST SYSTEM ---

async function broadcastAnnouncement() {
    if (!state.user || state.user.email !== ADMIN_EMAIL) return;
    const input = document.getElementById('broadcast-input');
    const content = input.value.trim();
    if (!content) return showToast('Speak your mind.', 'info');

    showToast('Projecting voice...', 'info');

    const { error } = await window.sb.from('system_announcements').insert([{
        content: content,
        author_id: state.user.id
    }]);

    if (error) showToast('Broadcast failed: ' + error.message, 'error');
    else {
        showToast('The Word has been spoken.', 'success');
        input.value = '';
        loadAnnouncements();
    }
}

async function loadAnnouncements() {
    const { data, error } = await window.sb
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

    const ticker = document.getElementById('system-broadcast');
    const text = document.getElementById('broadcast-text');

    if (data && data.length > 0) {
        if (ticker) ticker.classList.remove('hidden');
        if (text) text.textContent = data[0].content;
    } else {
        if (ticker) ticker.classList.add('hidden');
    }
}

async function loadProfileStats() {
    if (!state.user) return;

    // 1. Get Profile Data with Rank
    let { data: profile, error } = await window.sb
        .from('profiles')
        .select('*')
        .eq('id', state.user.id)
        .single();

    // Fetch Rank separately from the view
    const { data: rankData } = await window.sb
        .from('view_member_ranks')
        .select('join_rank')
        .eq('id', state.user.id)
        .single();

    // NEW: Fetch Soul Power and Tier
    const { data: powerData } = await window.sb
        .from('view_soul_power')
        .select('soul_power, earned_tier')
        .eq('id', state.user.id)
        .single();

    // If no profile exists (new user), create one and flag for Awakening
    let isNewProfile = false;
    if (error && error.code === 'PGRST116') {
        isNewProfile = true;
        window._isNewProfile = true; // Signal the success handler to show Awakening
        const { data: newProfile } = await window.sb
            .from('profiles')
            .insert([{
                id: state.user.id,
                email: state.user.email,
                username: state.user.username || state.user.email.split('@')[0],
                avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${state.user.id}&backgroundColor=transparent`
            }])
            .select()
            .single();
        profile = newProfile;
    }

    if (profile) {
        state.profile = profile;
        state.tier = powerData?.earned_tier || 'Ember'; // Global state sync

        const displayName = state.user.username || profile.username || profile.email?.split('@')[0] || 'Soul';

        // Profile View DOM
        const emailDisp = document.getElementById('profile-email-display');
        if (emailDisp) emailDisp.textContent = displayName;

        const userDisp = document.getElementById('user-display');
        if (userDisp) userDisp.textContent = displayName;

        const idDisp = document.getElementById('profile-id-display');
        if (idDisp) idDisp.textContent = profile.id;

        const votesDisp = document.getElementById('profile-votes');
        if (votesDisp) votesDisp.textContent = profile.votes_cast || 0;

        const powerDisp = document.getElementById('profile-soul-power');
        if (powerDisp) {
            powerDisp.textContent = state.tier === 'Architect' ? '∞' : (powerData?.soul_power || 0);
        }

        const rankDisp = document.getElementById('profile-rank');
        if (rankDisp) rankDisp.textContent = '#' + (rankData?.join_rank || '---');

        const joinDisp = document.getElementById('profile-join-date');
        if (joinDisp) joinDisp.textContent = new Date(profile.created_at).toLocaleDateString();

        // Tier Badge (Dynamic)
        const tier = state.tier;
        const tierBadge = document.getElementById('profile-tier-badge');
        if (tierBadge) {
            tierBadge.textContent = tier;
            tierBadge.className = `inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] border uppercase ${getTierColor(tier)}`;
        }

        // Sync Header (redundant safety)
        updateUI();
        applySoulSignatures();
        applyTierShader(state.tier);
        animateSoulRing(powerData?.soul_power || 0);

        // Avatar
        const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${state.user.id}&backgroundColor=transparent`;
        const avatarImg = document.getElementById('profile-avatar');
        if (avatarImg) {
            avatarImg.src = avatarUrl;
        }
    }
}

async function toggleSanctumProtocol() {
    state.protocolSecured = !state.protocolSecured;
    const btn = document.getElementById('protocol-lock-btn');
    const knob = document.getElementById('protocol-lock-knob');

    if (state.protocolSecured) {
        btn.classList.add('bg-orange-600/20', 'border-orange-500/50');
        knob.style.transform = 'translateX(2rem)';
        document.body.classList.add('protocol-secured-aura');
        showToast('PROTOCOL SECURED: Sanctum Lockdown Initiated.', 'warning');
    } else {
        btn.classList.remove('bg-orange-600/20', 'border-orange-500/50');
        knob.style.transform = 'translateX(0)';
        document.body.classList.remove('protocol-secured-aura');
        showToast('PROTOCOL RELEASED: Volatile Access Restored.', 'info');
    }
}

// THEATER MODE (CINEMATIC UPGRADE)
function renderCineworks() {
    diagLog('Initializing TBT Cineworks...');

    // Background 60s Zoom Loop
    const bg = document.getElementById('cineworks-bg');
    if (bg) {
        gsap.to(bg, {
            scale: 1.1,
            duration: 60,
            repeat: -1,
            yoyo: true,
            ease: 'linear'
        });
    }

    // Fade & Lift for cards
    gsap.from('.film-card', {
        opacity: 0,
        y: 100,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power3.out'
    });
}

function openTheater(filmId) {
    const overlay = document.getElementById('theater-overlay');
    const meta = document.getElementById('theater-meta');
    const flare = document.getElementById('theater-lens-flare');

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    // GSAP Cinematic Intro
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.8 });
    gsap.fromTo('.anamorphic-frame',
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.2 }
    );

    // Amber Light Burst
    gsap.fromTo(flare,
        { opacity: 0, scale: 0.5 },
        { opacity: 0.4, scale: 1.5, x: '20%', duration: 3, ease: 'sine.inOut' }
    );

    // Meta Entrance
    gsap.to(meta, { opacity: 1, y: 0, duration: 1, delay: 0.6, ease: 'back.out(1.7)' });
}

function closeTheater() {
    const overlay = document.getElementById('theater-overlay');
    const meta = document.getElementById('theater-meta');

    gsap.to(overlay, {
        opacity: 0, duration: 0.6, onComplete: () => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            // Reset states
            gsap.set(meta, { opacity: 0, y: 32 });
        }
    });
}

async function uploadAvatar(file) {
    if (!file) return;
    if (!state.user) return showToast('Identity required.', 'error');

    showToast('Uploading essence...', 'info');

    const fileExt = file.name.split('.').pop();
    const fileName = `${state.user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await window.sb.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) {
        showToast('Upload failed: ' + uploadError.message, 'error');
        return;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = window.sb.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // 3. Update Profile
    const { error: updateError } = await window.sb
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', state.user.id);

    if (updateError) {
        showToast('Profile sync failed.', 'error');
    } else {
        showToast('Essence captured.', 'success');
        loadProfileStats(); // Refresh
    }
}

function getTierColor(tier) {
    if (tier === 'Ascended') return 'bg-purple-900/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
    if (tier === 'Primordial') return 'bg-yellow-900/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
    if (tier === 'Architect') return 'bg-red-900/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    return 'bg-orange-500/10 text-orange-500 border-orange-500/30'; // Ember
}

async function changeUsername() {
    const input = document.getElementById('new-username-input');
    const newName = input.value.trim();
    if (!newName) return showToast('Enter a name.', 'info');
    if (newName.length < 3) return showToast('Name too short.', 'info');

    showToast('Rebranding soul...', 'info');

    const { error } = await window.sb
        .from('profiles')
        .update({ username: newName })
        .eq('id', state.user.id);

    if (error) {
        showToast('Sync failed: ' + error.message, 'error');
    } else {
        showToast('You are now known as: ' + newName, 'success');
        input.value = '';
        loadProfileStats(); // Refresh UI
    }
}

async function changePassword() {
    const oldPass = document.getElementById('old-cipher-in').value;
    const newPass = document.getElementById('new-cipher-in').value;

    if (!oldPass || !newPass) return showToast('Enter both ciphers.', 'info');
    if (newPass.length < 6) return showToast('New cipher too weak.', 'info');

    showToast('Verifying old cipher...', 'info');

    // 1. Re-authenticate to verify old password (Supabase Auth simple way)
    const { error: authError } = await window.sb.auth.signInWithPassword({
        email: state.user.email,
        password: oldPass
    });

    if (authError) {
        return showToast('Old cipher incorrect.', 'error');
    }

    // 2. Update to new password
    showToast('Applying new cipher...', 'info');
    const { error: updateError } = await window.sb.auth.updateUser({
        password: newPass
    });

    if (updateError) {
        showToast('Cipher shift failed: ' + updateError.message, 'error');
    } else {
        showToast('Cipher successfully shifted.', 'success');
        document.getElementById('old-cipher-in').value = '';
        document.getElementById('new-cipher-in').value = '';
    }
}

// --- 11. ADMIN CONTROLS 2.0 ---
let adminPanelOpen = false;

function toggleAdminPanel() {
    const panel = document.getElementById('admin-panel');
    adminPanelOpen = !adminPanelOpen;

    if (adminPanelOpen) {
        panel.classList.remove('translate-y-full');
        playSound('click');
        refreshAdminPulseUI();
    } else {
        panel.classList.add('translate-y-full');
        playSound('woosh');
    }
}

function adminLog(msg, type = 'info') {
    const log = document.getElementById('admin-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = type === 'error' ? 'text-red-500' : 'text-green-500/60';
    entry.textContent = `> ${msg}`;
    log.prepend(entry);
}

async function toggleVotingState() {
    const newState = !votingActive;

    const { error } = await window.sb
        .from('app_settings')
        .update({ value: newState })
        .eq('key', 'voting_active');

    if (error) {
        showToast(error.message, 'error');
        adminLog(`Pulse Failed: ${error.message}`, 'error');
    } else {
        votingActive = newState;
        updateVotingUI();
        refreshAdminPulseUI();
        adminLog(`Pulse State -> ${newState ? 'ALIVE' : 'DORMANT'}`);
    }
}

function refreshAdminPulseUI() {
    const stateText = document.getElementById('admin-pulse-state');
    const toggleBtn = document.getElementById('pulse-toggle-master');

    if (votingActive) {
        stateText.textContent = 'ALIVE';
        stateText.className = 'text-xs font-bold text-orange-500 uppercase';
        toggleBtn.textContent = 'STOP PULSE';
        toggleBtn.className = 'w-full py-3 bg-zinc-800 border border-orange-500 text-orange-500 rounded-lg text-xs font-bold transition-all hover:bg-zinc-700';
    } else {
        stateText.textContent = 'DORMANT';
        stateText.className = 'text-xs font-bold text-red-500 uppercase';
        toggleBtn.textContent = 'START PULSE';
        toggleBtn.className = 'w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg';
    }
}

async function banUser() {
    const input = document.getElementById('ban-input');
    const target = input.value.trim();
    if (!target) return showToast('Identify the soul to banish.', 'error');

    adminLog(`Attempting Banishment: ${target}...`);

    // Try by ID first, then Email
    const { data: profile, error: fetchError } = await window.sb
        .from('profiles')
        .select('id, username')
        .or(`id.eq.${target},email.eq.${target}`)
        .single();

    if (fetchError || !profile) {
        adminLog(`Soul not found: ${target}`, 'error');
        return showToast('Soul not found in the records.', 'error');
    }

    const { error } = await window.sb
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', profile.id);

    if (error) {
        adminLog(`Banishment Failed: ${error.message}`, 'error');
        showToast(error.message, 'error');
    } else {
        adminLog(`Banishment Successful: ${profile.username || profile.id}`);
        showToast(`"${profile.username || 'Soul'}" has been cast into the void.`, 'success');
        input.value = '';
    }
}

async function resetAllVotes() {
    if (!state.user || state.user.email !== ADMIN_EMAIL) return;

    if (!confirm('WARNING: This will purge ALL votes from the database. This action cannot be undone.')) return;

    // Use RPC for safe bulk delete
    const { error } = await window.sb.rpc('purge_all_votes');

    if (error) {
        showToast('Purge Failed: ' + error.message, 'error');
    } else {
        showToast('All votes have been returned to the void.', 'success');
        userVotes.clear();
        loadLivePulse(); // Refresh & Wipe UI
        updateVotingUI();
        if (state.profile) state.profile.votes_cast = 0;
    }
}

async function clearWhispers() {
    if (!state.user || state.user.email !== ADMIN_EMAIL) return;
    if (!confirm('WARNING: This will erase ALL Whispers from the Collective. This cannot be undone.')) return;

    const { error } = await window.sb.rpc('clear_whispers');
    if (error) {
        showToast('Purge Failed: ' + error.message, 'error');
    } else {
        showToast('The Collective has been silenced. A new era begins.', 'success');
        loadSuggestions(); // Refresh the whispers feed
    }
}

// ============================================================
// GOD-MODE ADMIN FUNCTIONS (Module A, B, C, D)
// ============================================================

// MODULE A: Update Global Header Marquee
function updateGlobalMarquee() {
    if (!state.isAdmin) return;
    const input = document.getElementById('global-comms-input');
    const msg = input?.value?.trim();
    if (!msg) return showToast('Enter a message first.', 'info');

    // Update the header ticker
    const ticker = document.getElementById('broadcast-text');
    const broadcastEl = document.getElementById('system-broadcast');
    if (ticker) ticker.textContent = msg;
    if (broadcastEl) broadcastEl.classList.remove('hidden');

    // Update preview in Module A
    const preview = document.getElementById('current-marquee-preview');
    if (preview) preview.textContent = msg;

    // Persist to system_announcements if DB is alive
    if (window.sb) {
        window.sb.from('system_announcements').insert([{
            content: msg,
            author_id: state.user.id
        }]).then(({ error }) => {
            if (error) console.warn('Announcement persist failed:', error.message);
        });
    }

    input.value = '';
    showToast('GLOBAL COMMS: TRANSMITTED', 'success');
}

// MODULE B: Load all users into Guillotine table
let guillotineData = [];

async function adminListUsers() {
    if (!state.isAdmin || !window.sb) return;

    const tbody = document.getElementById('guillotine-table');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-[10px] text-gray-600 font-mono">Loading souls...</td></tr>`;

    const { data: profiles, error } = await window.sb
        .from('profiles')
        .select('id, username, email, tier, is_banned, soul_power')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-[10px] text-red-500 font-mono">Error: ${error.message}</td></tr>`;
        return;
    }

    guillotineData = profiles || [];
    renderGuillotineTable(guillotineData);
}

function renderGuillotineTable(profiles) {
    const tbody = document.getElementById('guillotine-table');
    if (!tbody) return;

    if (!profiles || profiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-[10px] text-gray-600 font-mono">No souls found</td></tr>`;
        return;
    }

    tbody.innerHTML = profiles.map(p => {
        const tierColor = p.tier === 'Architect' ? 'text-red-400' : p.tier === 'Primordial' ? 'text-yellow-400' : p.tier === 'Ascended' ? 'text-purple-400' : 'text-orange-400';
        const bannedBadge = p.is_banned ? '<span class="text-[8px] text-red-500 font-bold ml-1">BANNED</span>' : '';
        return `
            <tr class="group" data-id="${p.id}" data-username="${p.username || ''}" data-email="${p.email || ''}">
                <td>${p.username || 'Unknown'}${bannedBadge}</td>
                <td class="text-gray-600">${p.email || '—'}</td>
                <td class="${tierColor}">${p.tier || 'Ember'}</td>
                <td>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button onclick="adminSuspendUser('${p.id}', ${p.is_banned})"
                            class="px-2 py-1 rounded text-[8px] font-bold uppercase ${p.is_banned ? 'bg-green-900/20 border border-green-600/40 text-green-500 hover:bg-green-700/30' : 'bg-orange-900/20 border border-orange-600/40 text-orange-400 hover:bg-orange-700/30'} transition-all">
                            ${p.is_banned ? 'Restore' : 'Suspend'}
                        </button>
                        <div class="flex items-center gap-1">
                            <input type="number" id="sp-input-${p.id}" min="0" step="10"
                                class="w-16 bg-black/60 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white outline-none"
                                placeholder="SP" value="${p.soul_power || 0}">
                            <button onclick="adminGrantSoulPower('${p.id}')"
                                class="px-2 py-1 rounded text-[8px] font-bold uppercase bg-purple-900/20 border border-purple-600/40 text-purple-400 hover:bg-purple-700/30 transition-all">
                                ↑ Grant
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function filterGuillotineTable(query) {
    if (!query) return renderGuillotineTable(guillotineData);
    const q = query.toLowerCase();
    const filtered = guillotineData.filter(p =>
        (p.username || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
    );
    renderGuillotineTable(filtered);
}

async function adminSuspendUser(userId, currentlyBanned) {
    if (!state.isAdmin || !window.sb) return;
    const newState = !currentlyBanned;
    const { error } = await window.sb.from('profiles').update({ is_banned: newState }).eq('id', userId);
    if (error) {
        showToast('Action failed: ' + error.message, 'error');
    } else {
        showToast(newState ? 'Account suspended.' : 'Account restored.', newState ? 'error' : 'success');
        adminListUsers();
    }
}

async function adminGrantSoulPower(userId) {
    if (!state.isAdmin || !window.sb) return;
    const input = document.getElementById(`sp-input-${userId}`);
    const amount = parseInt(input?.value);
    if (isNaN(amount) || amount < 0) return showToast('Enter a valid Soul Power amount.', 'error');

    const { error } = await window.sb.from('profiles').update({ soul_power: amount }).eq('id', userId);
    if (error) {
        showToast('Grant failed: ' + error.message, 'error');
    } else {
        showToast(`Soul Power set to ${amount}.`, 'success');
        // Update local data
        const profile = guillotineData.find(p => p.id === userId);
        if (profile) profile.soul_power = amount;
    }
}

// MODULE C: Treasury Override
function adminOverrideTreasury() {
    if (!state.isAdmin) return;
    const input = document.getElementById('treasury-override-input');
    const raw = parseFloat(input?.value);
    if (isNaN(raw) || raw < 0) return showToast('Enter a valid dollar amount.', 'error');

    const formatted = raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Update all treasury balance displays
    document.querySelectorAll('.treasury-balance-display').forEach(el => {
        el.textContent = '$' + formatted;
    });
    // Also update the main h1 in The Pool dashboard
    const poolH1 = document.querySelector('#view-treasury h1');
    if (poolH1) poolH1.textContent = '$' + formatted;
    // And the card in the sanctum grid
    const cardBalance = document.querySelector('.sanctuary-card .text-orange-500.font-bold.font-mono');
    if (cardBalance) cardBalance.textContent = '$' + formatted;
    // Update admin panel preview
    const adminDisplay = document.getElementById('current-treasury-display');
    if (adminDisplay) adminDisplay.textContent = '$' + formatted;

    input.value = '';
    showToast(`Treasury overridden to $${formatted}`, 'success');
}

// Emergency Freeze toggle
window.poolFrozen = false;

function adminTogglePoolFreeze() {
    if (!state.isAdmin) return;
    window.poolFrozen = !window.poolFrozen;

    const btn = document.getElementById('freeze-toggle-btn');
    const knob = document.getElementById('freeze-knob');
    const statusText = document.getElementById('freeze-status-text');

    if (window.poolFrozen) {
        if (btn) { btn.style.background = '#dc2626'; btn.style.borderColor = 'rgba(239,68,68,0.5)'; }
        if (knob) knob.style.transform = 'translateX(28px)';
        if (statusText) { statusText.textContent = 'FROZEN'; statusText.className = 'text-[9px] font-mono text-red-500 mt-0.5'; }
        showToast('⚠ EMERGENCY FREEZE ACTIVE — Aid requests disabled.', 'error');
    } else {
        if (btn) { btn.style.background = '#16a34a'; btn.style.borderColor = 'rgba(34,197,94,0.5)'; }
        if (knob) knob.style.transform = 'translateX(0)';
        if (statusText) { statusText.textContent = 'OPERATIONAL'; statusText.className = 'text-[9px] font-mono text-green-500 mt-0.5'; }
        showToast('Pool activity restored.', 'success');
    }
}

// MODULE D: Broadcast to Whispers chatroom
function adminBroadcastToWhispers() {
    if (!state.isAdmin) return;
    const input = document.getElementById('whispers-broadcast-input');
    const msg = input?.value?.trim();
    if (!msg) return showToast('Write your broadcast first.', 'info');

    // Show pinned card in whispers
    const card = document.getElementById('architect-broadcast-card');
    const text = document.getElementById('architect-broadcast-text');
    if (card && text) {
        text.textContent = msg;
        card.classList.remove('hidden');
        gsap.fromTo(card, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    }

    input.value = '';
    showToast('ARCHITECT BROADCAST: PINNED TO WHISPERS', 'success');
}

function clearArchitectBroadcast() {
    const card = document.getElementById('architect-broadcast-card');
    if (card) {
        gsap.to(card, { opacity: 0, y: -10, duration: 0.3, onComplete: () => card.classList.add('hidden') });
    }
    showToast('Broadcast cleared.', 'info');
}

// Init admin panel when chamber is entered
function initAdminPanel() {
    if (!state.isAdmin) return;
    // Auto-load users on chamber entry
    adminListUsers();
}

// ============================================================
// POOL — AID REQUEST TERMINAL
// ============================================================

window.aidRequests = [];
window.confidentialityOn = false;

function openAidRequestModal() {
    if (window.poolFrozen) {
        return showToast('⚠ POOL FROZEN: Aid requests are temporarily disabled by the Architect.', 'error');
    }
    if (!state.user) {
        return showToast('You must be identified to submit a request.', 'error');
    }
    const modal = document.getElementById('aid-request-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    gsap.fromTo(modal.querySelector('.glass-panel'),
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power3.out' }
    );
}

function closeAidRequestModal() {
    const modal = document.getElementById('aid-request-modal');
    if (!modal) return;
    gsap.to(modal.querySelector('.glass-panel'), {
        opacity: 0, scale: 0.95, y: 20, duration: 0.25,
        onComplete: () => modal.classList.add('hidden')
    });
    // Reset form
    if (document.getElementById('aid-amount-input')) document.getElementById('aid-amount-input').value = '';
    if (document.getElementById('aid-purpose-input')) document.getElementById('aid-purpose-input').value = '';
    if (window.confidentialityOn) toggleConfidentiality(); // Reset toggle
}

function toggleConfidentiality() {
    window.confidentialityOn = !window.confidentialityOn;
    const btn = document.getElementById('confidentiality-toggle');
    const knob = document.getElementById('conf-knob');
    const label = document.getElementById('conf-status-label');

    if (window.confidentialityOn) {
        if (btn) { btn.style.background = '#ea580c'; btn.style.borderColor = 'rgba(234,88,12,0.5)'; }
        if (knob) { knob.style.transform = 'translateX(24px)'; knob.style.background = 'white'; }
        if (label) { label.textContent = 'Identity: ENCRYPTED'; label.className = 'text-[9px] text-orange-500 font-mono -mt-3 text-right'; }
    } else {
        if (btn) { btn.style.background = '#3f3f46'; btn.style.borderColor = 'rgba(255,255,255,0.1)'; }
        if (knob) { knob.style.transform = 'translateX(0)'; knob.style.background = '#9ca3af'; }
        if (label) { label.textContent = 'Identity: VISIBLE'; label.className = 'text-[9px] text-gray-600 font-mono -mt-3 text-right'; }
    }
}

async function submitAidRequest() {
    if (window.poolFrozen) return showToast('THE POOL IS FROZEN. Petitions are currently suspended.', 'error');

    const amount = document.getElementById('aid-amount').value;
    const purpose = document.getElementById('aid-purpose').value;
    const isConfidential = window.confidentialityOn;
    const auraEnabled = document.getElementById('aura-toggle')?.checked || false;

    if (!amount || !purpose || purpose.length < 10) {
        return showToast('Please provide a valid amount and detailed purpose (min 10 chars).', 'info');
    }

    const newRequest = {
        id: 'REQ-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        user: isConfidential ? '🔐 Encrypted Member' : (state.profile?.username || 'Soul'),
        amount: parseFloat(amount).toLocaleString(),
        purpose: purpose,
        status: 'Pending',
        consensus: 0,
        aura: auraEnabled, // PHASE 2 Aura
        timestamp: new Date().toISOString()
    };

    window.aidRequests.unshift(newRequest);
    renderAidRequests();
    closeAidRequestModal();
    showToast('Your petition has been cast into the void.', 'success');
}

function renderAidRequests() {
    const container = document.getElementById('aid-requests-ledger');
    if (!container) return;

    // Seed initial demo data if empty
    if (window.aidRequests.length === 0) {
        window.aidRequests = [
            { id: 'REQ-XZ492', user: '🔐 Encrypted Member', amount: '1,200', purpose: 'Emergency Shelter Support', status: 'Under Review', consensus: 42, aura: false },
            { id: 'REQ-AL901', user: 'Luminous_Soul', amount: '450', purpose: 'Resource Acquisition for Sector 7', status: 'Funded', consensus: 100, aura: true }
        ];
    }

    container.innerHTML = window.aidRequests.map(req => {
        const statusColor = req.status === 'Funded' ? 'text-green-500' : req.status === 'Under Review' ? 'text-blue-400' : 'text-orange-500';
        const auraClass = req.aura ? 'petition-aura' : '';
        const glowLevel = Math.floor(req.consensus / 2); // 0 to 50 scale for shadows

        return `
            <div class="glass p-5 rounded-2xl border border-white/5 space-y-4 transition-all hover:bg-white/5 ${auraClass}">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <i data-lucide="file-text" class="w-4 h-4 text-orange-500"></i>
                        </div>
                        <div>
                            <p class="text-[9px] text-gray-500 font-mono uppercase tracking-widest">${req.id}</p>
                            <p class="text-xs font-bold text-white">${req.user}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold text-orange-500 font-mono">$${req.amount}</p>
                        <p class="text-[8px] font-bold font-mono tracking-widest ${statusColor} uppercase">${req.status}</p>
                    </div>
                </div>
                
                <p class="text-[11px] text-gray-400 leading-relaxed font-mono italic">"${req.purpose}"</p>
                
                <div class="space-y-2 pt-2 border-t border-white/5">
                    <div class="flex justify-between text-[9px] font-mono">
                        <span class="text-gray-500 uppercase tracking-tighter">Community Consensus</span>
                        <span class="text-white font-bold">${req.consensus}%</span>
                    </div>
                    <div class="h-1 lg:h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div class="consensus-bar-glow h-full transition-all duration-1000" 
                             style="width: ${req.consensus}%; --glow: ${glowLevel};"></div>
                    </div>
                    <div class="flex justify-between items-center pt-1">
                        <div class="flex gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                            <span class="text-[8px] text-gray-600 font-mono uppercase">Live Tallying</span>
                        </div>
                        <button onclick="alignWithPetition('${req.id}')" 
                                class="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-md text-[8px] font-bold text-orange-400 uppercase tracking-widest hover:bg-orange-500 hover:text-black transition-all">
                            Align
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Re-init icons
    if (window.lucide) window.lucide.createIcons();
}

async function alignWithPetition(reqId) {
    if (!state.user) return showToast('Only recognized souls can align.', 'error');
    const sp = state.profile?.soul_power || 0;
    if (sp <= 0) return showToast('You lack the Soul Power to impact the consensus.', 'error');

    const req = window.aidRequests.find(r => r.id === reqId);
    if (!req || req.status === 'Funded') return;

    req.consensus = Math.min(req.consensus + 5, 100);
    if (req.consensus === 100) req.status = 'Funded';

    renderAidRequests();
    playSound('click');
    showToast('Your will has been recorded in the ledger.', 'success');
}

// --- OMEGA LEDGER & TREASURY ANIMATION ---
function initOmegaLedger() {
    const feed = document.getElementById('omega-ledger-feed');
    if (!feed) return;

    const types = ['DEPOSIT', 'DISBURSE', 'GRANT', 'OFFERING'];
    const sources = ['Stripe', 'Venmo', 'CashApp', 'Vault', 'Sanctum'];

    function addTx() {
        const type = types[Math.floor(Math.random() * types.length)];
        const src = sources[Math.floor(Math.random() * sources.length)];
        const amount = (Math.random() * 500 + 10).toFixed(2);
        const hash = '0x' + Math.random().toString(16).substr(2, 8).toUpperCase();
        const isPositive = type === 'DEPOSIT' || type === 'OFFERING';

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-1 border-b border-white/5 opacity-0';
        div.innerHTML = `
            <span class="text-gray-500">[${hash}]</span>
            <span class="${isPositive ? 'text-green-500' : 'text-red-500'} font-bold">
                ${isPositive ? '+' : '-'}$${amount}
            </span>
            <span class="text-gray-400 opacity-60">${type} via ${src}</span>
        `;

        feed.prepend(div);
        gsap.to(div, { opacity: 1, duration: 0.5 });

        if (feed.children.length > 20) feed.lastElementChild.remove();
    }

    // Initial batch
    for (let i = 0; i < 8; i++) addTx();

    // Continuous random tx
    if (window._ledgerInterval) clearInterval(window._ledgerInterval);
    window._ledgerInterval = setInterval(addTx, 4000);
}

function animateTreasuryBalance() {
    const target = document.getElementById('treasury-amount');
    if (!target) return;

    const finalVal = 12450.00;
    const obj = { val: 0 };

    gsap.to(obj, {
        val: finalVal,
        duration: 2.5,
        ease: 'power4.out',
        onUpdate: () => {
            target.textContent = `$${obj.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    });
}

function updateUI() {
    let displayName = state.profile?.username || state.user?.username || state.user?.email || 'Guest';
    if (displayName.includes('@')) displayName = displayName.split('@')[0];

    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.textContent = displayName;

    const userBadgeHeader = document.getElementById('user-tier-badge-header');
    if (userBadgeHeader) {
        userBadgeHeader.textContent = state.tier || 'INITIATE';
        userBadgeHeader.className = `text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getTierHeaderStyles(state.tier)}`;
    }
}


function getTierHeaderStyles(tier) {
    if (tier === 'Ascended') return 'bg-purple-900/20 text-purple-400 border-purple-500/40';
    if (tier === 'Primordial') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/40';
    if (tier === 'Architect') return 'bg-red-600/20 text-red-500 border-red-500/40';
    return 'bg-white/10 text-orange-300 border-orange-500/30'; // Ember
}

function transitionTo(viewName, useHistory = true) {
    // Hide Loader
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('hidden-fade');

    // SPA Internal State History push
    if (viewName !== 'gate' && viewName !== 'loading') {
        history.pushState({ view: viewName }, '', '');
    }

    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Show Target View
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');

        if (viewName === 'sanctum') {
            loadAnnouncements();
        }
        if (viewName === 'treasury') {
            animateTreasuryBalance();
            initOmegaLedger();
        }
        if (viewName === 'profile') {
            loadProfileStats();
        }
        if (viewName === 'cineworks') {
            renderCineworks();
        }
        if (viewName === 'whispers') {
            loadSuggestions();
            subscribeToWhispers();
        }

        // Update Nav
        document.querySelectorAll('.nav-item').forEach(b => {
            const isActive = b.getAttribute('onclick')?.includes(`'${viewName}'`);
            if (isActive) {
                b.classList.add('active', 'text-white');
                b.classList.remove('text-gray-500');
            } else {
                b.classList.remove('active', 'text-white');
                b.classList.add('text-gray-500');
            }
        });

        // Admin Nav Visibility
        const chamberNav = document.getElementById('chamber-nav-btn');
        const mobileChamber = document.getElementById('mobile-nav-chamber');
        if (state.isAdmin) {
            if (chamberNav) chamberNav.classList.remove('hidden');
            if (mobileChamber) mobileChamber.classList.remove('hidden');
        }
    }
    state.view = viewName;
}

function animateSanctum() {
    gsap.fromTo('.sanctuary-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.7)' });
}

function updateAuraParticles() {
    const container = document.getElementById('ember-container');
    if (!container) return;
    container.innerHTML = '';

    let colorClass = 'aura-ember';
    let count = 20;

    if (state.tier === 'Ascended') { colorClass = 'aura-silver'; count = 30; }
    if (state.tier === 'Primordial') { colorClass = 'aura-gold'; count = 50; }
    if (state.tier === 'Architect') { colorClass = 'aura-opal'; count = 40; }

    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = `floating-ember ${colorClass}`;
        div.style.left = Math.random() * 100 + '%';
        div.style.top = Math.random() * 100 + '%';
        div.style.position = 'absolute';
        div.style.width = (Math.random() * 4 + 2) + 'px';
        div.style.height = div.style.width;
        div.style.borderRadius = '50%';
        div.style.opacity = Math.random() * 0.5 + 0.1;
        div.style.animation = `float ${Math.random() * 10 + 5}s infinite ease-in-out`;
        container.appendChild(div);
    }
}

// --- 6. VOTING & ADMIN ---


function subscribeToPulse() {
    if (!window.sb) return;
    window.sb.channel('public:votes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, payload => {
            const feed = document.getElementById('pulse-feed');
            if (!feed) return;
            const item = document.createElement('div');
            item.className = 'text-xs text-orange-400 font-mono mb-1 animate-pulse-ember';
            item.textContent = `> A soul ignited ${payload.new.sanctuary_id}`;
            feed.prepend(item);
        })
        .subscribe();
}

// Mock Init for particles (simple version)
function initThreeJSEmbers() {
    updateAuraParticles();
}

// Toasts
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full glass text-sm font-semibold z-[60] transition-all duration-300 ${type === 'error' ? 'text-red-400 border-red-900' : 'text-orange-400'}`;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
}

// --- 7. UTILITIES & DEBUG ---

function initAdminPanel() {
    console.log('Initializing Admin Panel...');
    const status = document.getElementById('admin-status-indicator');
    if (status) status.classList.add('text-green-500', 'animate-pulse');
}

function toggleDebugMode() {
    // HARD LOCK TO ADMIN
    if (!state.user || state.user.id !== 'admin-id') { // email check or similar
        // Check isAdmin state instead
        if (!state.isAdmin) {
            showToast('Authority required.', 'error');
            return;
        }
    }

    console.log('--- ARCHITECT DEBUG STATE ---');
    console.log('User:', state.user);
    console.log('Profile:', state.profile);
    console.log('Is Admin:', state.isAdmin);

    showToast(`Architect Session: v3.0.0 | Tier: ${state.tier}`, 'info');
}

// --- PREMIUM UI EFFECTS ---

function initPremiumEffects() {
    // 1. The Living Void (Atmospheric Glow)
    gsap.to('.void-glow', {
        x: 'random(-100, 100)',
        y: 'random(-100, 100)',
        scale: 'random(0.8, 1.2)',
        duration: 'random(15, 25)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    // 2. Interactive Card Tilt
    document.querySelectorAll('.sanctuary-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            gsap.to(card, {
                rotateX: rotateX,
                rotateY: rotateY,
                duration: 0.5,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
        });
    });
}

function playSound(type) {
    if (type === 'click' && window.clickSound) window.clickSound.play();
    if (type === 'woosh' && window.wooshSound) window.wooshSound.play();
}

// Window Global Expose for Debugging in Console
window.debugState = () => state;

// --- PREMIUM FEATURES ---

// 1. VOID FRACTAL: Generative canvas background that pulses with community energy
function initVoidFractal() {
    const canvas = document.getElementById('void-fractal-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let voteEnergy = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawFractal() {
        frame++;
        const userVotesCount = window.userVotes ? window.userVotes.size : 0;
        voteEnergy = Math.min(userVotesCount * 0.3, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const branches = 6 + Math.floor(voteEnergy * 4);
        const depth = 4;

        function drawBranch(x, y, angle, length, d) {
            if (d === 0 || length < 2) return;
            const x2 = x + Math.cos(angle) * length;
            const y2 = y + Math.sin(angle) * length;
            const alpha = (d / depth) * 0.15;
            const hue = 20 + (frame * 0.1 + d * 30) % 60;
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            ctx.lineWidth = d * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            const spread = (Math.PI / branches) + voteEnergy * 0.3;
            drawBranch(x2, y2, angle - spread, length * 0.65, d - 1);
            drawBranch(x2, y2, angle + spread, length * 0.65, d - 1);
        }

        for (let i = 0; i < branches; i++) {
            const angle = (i / branches) * Math.PI * 2 + frame * 0.002;
            const len = 60 + voteEnergy * 40;
            drawBranch(cx, cy, angle, len, depth);
        }
        requestAnimationFrame(drawFractal);
    }
    drawFractal();
}

// 2. RESONANCE SOUNDSCAPE: Generative ambient drone using Web Audio API
function initResonanceSoundscape() {
    let audioCtx = null;
    let isPlaying = false;
    let gainNode = null;

    function startSoundscape() {
        if (isPlaying) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 3);
        gainNode.connect(audioCtx.destination);

        const frequencies = [55, 82.5, 110, 165, 220];
        frequencies.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const oscGain = audioCtx.createGain();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(freq * 1.003, audioCtx.currentTime + 8);
            oscGain.gain.setValueAtTime(0.15 / frequencies.length, audioCtx.currentTime);
            osc.connect(oscGain);
            oscGain.connect(gainNode);
            osc.start();
        });
        isPlaying = true;
    }

    const startOnce = () => {
        startSoundscape();
        document.removeEventListener('click', startOnce);
        document.removeEventListener('touchstart', startOnce);
    };
    document.addEventListener('click', startOnce);
    document.addEventListener('touchstart', startOnce);

    window.toggleSoundscape = () => {
        if (!gainNode) return;
        const target = gainNode.gain.value > 0.01 ? 0 : 0.04;
        gainNode.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 1.5);
    };
}

// 3. SOUL SIGNATURES: Apply tier-specific CSS animations
function applySoulSignatures() {
    const tier = state.tier;
    const nameEls = document.querySelectorAll('.soul-signature-target');
    nameEls.forEach(el => {
        el.classList.remove('sig-ascended', 'sig-primordial', 'sig-architect');
        if (tier === 'Ascended') el.classList.add('sig-ascended');
        if (tier === 'Primordial') el.classList.add('sig-primordial');
        if (tier === 'Architect') el.classList.add('sig-architect');
    });
}

// ============================================================
// PHASE 2 — JS FUNCTIONS
// ============================================================

// --- MODULE A: PULSE RATE SELECTOR ---
window.currentPulseRate = 'normal';

function setPulseRate(rate) {
    window.currentPulseRate = rate;
    const ticker = document.getElementById('broadcast-text');
    if (!ticker) return;

    ticker.classList.remove('marquee-pulse-low', 'marquee-pulse-normal', 'marquee-pulse-emergency');
    ticker.classList.add(`marquee-pulse-${rate}`);

    ['low', 'normal', 'emergency'].forEach(r => {
        const btn = document.getElementById(`pulse-rate-${r}`);
        if (!btn) return;
        if (r === rate) {
            btn.classList.add('ring-2', 'ring-offset-1', 'ring-offset-black');
            if (r === 'low') btn.classList.add('ring-green-500');
            if (r === 'normal') btn.classList.add('ring-orange-500');
            if (r === 'emergency') btn.classList.add('ring-red-500');
        } else {
            btn.classList.remove('ring-2', 'ring-offset-1', 'ring-offset-black', 'ring-green-500', 'ring-orange-500', 'ring-red-500');
        }
    });

    const labels = { low: 'LOW — STANDBY', normal: 'NORMAL — OPERATIONAL', emergency: 'EMERGENCY — DISPATCH' };
    showToast(`Pulse Rate: ${labels[rate]}`, rate === 'emergency' ? 'error' : 'success');
}

// --- MODULE B: GUILLOTINE ---
function renderGuillotineTable(profiles) {
    const tbody = document.getElementById('guillotine-table');
    if (!tbody) return;

    if (!profiles || profiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-[10px] text-gray-600 font-mono">No souls found</td></tr>`;
        return;
    }

    tbody.innerHTML = profiles.map(p => {
        const tierColor = p.earned_tier === 'Architect' ? 'text-red-400' : p.earned_tier === 'Primordial' ? 'text-yellow-400' : p.earned_tier === 'Ascended' ? 'text-purple-400' : 'text-orange-400';
        const bannedBadge = p.is_banned ? '<span class="text-[8px] text-red-500 font-bold ml-1">BANNED</span>' : '';
        const sp = p.soul_power || 0;
        return `
            <tr class="group" data-id="${p.id}">
                <td class="px-4 py-3 font-mono text-[10px] text-gray-300">
                    <div class="flex flex-col">
                        <span>${p.username || 'Unknown'}${bannedBadge}</span>
                        <span class="text-[8px] text-gray-600">${p.id.substring(0, 8)}...</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-[9px] text-gray-600 font-mono">${p.email || '—'}</td>
                <td class="px-4 py-3 text-[9px] ${tierColor} font-mono uppercase">${p.earned_tier || 'Ember'}</td>
                <td class="px-4 py-3">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <input type="range" min="0" max="1000" step="10" value="${sp}"
                                oninput="document.getElementById('sp-val-${p.id}').textContent = this.value; debouncedGrantSP('${p.id}', this.value)"
                                class="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500">
                            <span id="sp-val-${p.id}" class="text-[9px] text-orange-400 font-mono w-8 text-right">${sp}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button onclick="adminSuspendUser('${p.id}', ${p.is_banned})"
                                class="px-2 py-0.5 rounded text-[8px] font-bold uppercase ${p.is_banned ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}">
                                ${p.is_banned ? 'Restore' : 'Banish'}
                            </button>
                            <button onclick="adminForceReAwaken('${p.id}', '${p.username || 'Soul'}')"
                                class="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                ✦ Re-Awaken
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// Debounce helper
const _spDebounceTimers = {};
function debouncedGrantSP(userId, value) {
    clearTimeout(_spDebounceTimers[userId]);
    _spDebounceTimers[userId] = setTimeout(() => adminGrantSoulPower(userId, parseInt(value)), 600);
}

// Override adminGrantSoulPower to accept value directly
async function adminGrantSoulPower(userId, amount) {
    if (!state.isAdmin || !window.sb) return;
    const { error } = await window.sb.from('profiles').update({ soul_power: amount }).eq('id', userId);
    if (error) showToast('Update failed: ' + error.message, 'error');
}

// Force Re-Awaken a specific user (shows onboarding ritual locally)
function adminForceReAwaken(userId, username) {
    if (!state.isAdmin || !window.sb) return;
    window.sb.from('profiles').update({ force_reawaken: true }).eq('id', userId).then(({ error }) => {
        if (error) return showToast('Ritual failed: ' + error.message, 'error');
        showToast(`Protocol: Re-Awakening triggered for ${username}`, 'success');
    });
}

// --- MODULE C: POOL FREEZE WITH FROST OVERLAY ---
function adminTogglePoolFreeze() {
    window.poolFrozen = !window.poolFrozen;

    const btn = document.getElementById('freeze-toggle-btn');
    const knob = document.getElementById('freeze-knob');
    const statusText = document.getElementById('freeze-status-text');
    const frostOverlay = document.getElementById('pool-frost-overlay');

    if (window.poolFrozen) {
        if (btn) btn.classList.add('bg-red-600');
        if (knob) knob.style.transform = 'translateX(28px)';
        if (statusText) statusText.textContent = 'FROZEN';

        // Show frost overlay
        if (frostOverlay) {
            frostOverlay.classList.remove('hidden');
            gsap.to(frostOverlay, { opacity: 1, duration: 0.8 });
        }
        showToast('EMERGENCY FREEZE ACTIVE', 'error');
    } else {
        if (btn) btn.classList.remove('bg-red-600');
        if (knob) knob.style.transform = 'translateX(0)';
        if (statusText) statusText.textContent = 'OPERATIONAL';

        // Hide frost overlay
        if (frostOverlay) {
            gsap.to(frostOverlay, { opacity: 0, duration: 0.5, onComplete: () => frostOverlay.classList.add('hidden') });
        }
        showToast('Operations Restored', 'success');
    }
}

// --- MODULE D: CRT STATIC EFFECT BEFORE BROADCAST ---
function playStaticEffect(callback) {
    const overlay = document.getElementById('static-overlay');
    const canvas = document.getElementById('static-canvas');
    if (!overlay || !canvas) return callback();

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    overlay.classList.remove('hidden');
    gsap.to(overlay, { opacity: 1, duration: 0.1 });

    // Draw CRT noise on canvas
    const noiseLoop = setInterval(() => {
        const id = ctx.createImageData(canvas.width, canvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = Math.random() > 0.5 ? 255 : 0;
            d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 120;
        }
        ctx.putImageData(id, 0, 0);
    }, 50);

    // Kill after 1.5 seconds
    setTimeout(() => {
        clearInterval(noiseLoop);
        gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => { overlay.classList.add('hidden'); callback(); } });
    }, 1500);
}

// Override adminBroadcastToWhispers to trigger static first
function adminBroadcastToWhispers() {
    const input = document.getElementById('whispers-broadcast-input');
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';

    // Play static effect, THEN reveal broadcast
    playStaticEffect(() => {
        const card = document.getElementById('architect-broadcast-card');
        const text = document.getElementById('architect-broadcast-text');
        if (card && text) {
            text.textContent = msg;
            card.classList.remove('hidden');
            gsap.fromTo(card, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 });
        }
    });
}

// --- MODULE E: THE CATALYST COUNTDOWN ---
let catalystInterval = null;

function igniteCatalyst() {
    const duration = parseInt(document.getElementById('catalyst-duration')?.value) || 10;
    const labelData = document.getElementById('catalyst-label')?.value || 'A CATALYST IS APPROACHING';
    const hud = document.getElementById('catalyst-hud');
    const timerEl = document.getElementById('catalyst-timer');
    const labelEl = document.getElementById('catalyst-label-display');

    if (!hud) return;
    hud.classList.remove('hidden');
    if (labelEl) labelEl.textContent = labelData;

    const endTime = Date.now() + duration * 60000;
    if (catalystInterval) clearInterval(catalystInterval);

    catalystInterval = setInterval(() => {
        const diff = endTime - Date.now();
        if (diff <= 0) {
            clearInterval(catalystInterval);
            if (timerEl) timerEl.textContent = "NOW";
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (timerEl) timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);

    gsap.fromTo(hud, { y: -100 }, { y: 0, duration: 0.8, ease: 'power4.out' });
    showToast('THE CATALYST HAS BEEN IGNITED', 'error');
}

function dismissCatalyst() {
    const hud = document.getElementById('catalyst-hud');
    if (hud) gsap.to(hud, { y: -100, duration: 0.5, onComplete: () => hud.classList.add('hidden') });
    if (catalystInterval) clearInterval(catalystInterval);
}

// --- PROFILE: TIER SHADER + SOUL RING ANIMATION ---
function applyTierShader(tier) {
    const card = document.getElementById('profile-holofoil-card');
    if (!card) return;

    card.classList.remove('tier-shader-initiate', 'tier-shader-ascended', 'tier-shader-primordial', 'tier-shader-architect');

    const map = {
        'Ascended': 'tier-shader-ascended',
        'Primordial': 'tier-shader-primordial',
        'Architect': 'tier-shader-architect'
    };

    card.classList.add(map[tier] || 'tier-shader-initiate');
}

function animateSoulRing(sp) {
    const ring = document.getElementById('soul-ring');
    if (!ring) return;

    const cap = { 'Ember': 100, 'Initiate': 100, 'Ascended': 500, 'Primordial': 1000, 'Architect': 5000 }[state.tier] || 100;
    const pct = Math.min(sp / cap, 1);
    const offset = 188.5 * (1 - pct);
    gsap.to(ring, { attr: { 'stroke-dashoffset': offset }, duration: 2, ease: 'power2.out' });
    const colors = { 'Ascended': '#a855f7', 'Primordial': '#eab308', 'Architect': '#ffffff' };
    ring.setAttribute('stroke', colors[state.tier] || '#ea580c');
}

function toggleSovereignMode() {
    const frame = document.querySelector('.anamorphic-frame');
    if (!frame) return;

    if (!document.fullscreenElement) {
        frame.requestFullscreen().catch(err => {
            showToast('Sovereign Mode denied.', 'error');
        });
        showToast('SOVEREIGN MODE ENGAGED', 'success');
    } else {
        document.exitFullscreen();
        showToast('SOVEREIGN MODE RELEASED', 'info');
    }
}
