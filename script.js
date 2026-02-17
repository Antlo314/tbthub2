/**
 * SACRED SANCTUM SPA LOGIC
 * Unified Services: Auth, Data, UI
 */

const ADMIN_EMAIL = 'admin@truthbtoldhub.com';

// Sound Effects (No Music)
let clickSound, wooshSound;

// State
const state = {
    user: null,
    profile: null,
    isAdmin: false,
    view: 'loading', // loading, gate, sanctum
    sanctuaries: [
        { id: 'stage', name: 'The Stage', icon: 'mic', desc: 'Music, podcasts, and audio content.' },
        { id: 'circle', name: 'The Circle', icon: 'message-circle', desc: 'Live discussions and connection.' },
        { id: 'pool', name: 'The Pool', icon: 'droplets', desc: 'Community funding and mutual aid.' },
        { id: 'gallery', name: 'The Gallery', icon: 'image', desc: 'Visual arts, film, and photography.' },
        { id: 'library', name: 'The Library', icon: 'book-open', desc: 'Knowledge, writings, and history.' },
        { id: 'temple', name: 'The Temple', icon: 'landmark', desc: 'Spiritual teachings and dialogue.' },
        { id: 'council', name: 'The Council', icon: 'handshake', desc: 'Governance, projects, and events.' },
        { id: 'archive', name: 'The Archive', icon: 'scroll', desc: 'Records of our shared legacy.' }
    ]
};

// --- 1. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Init Sounds
    clickSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.3 }); // Soft click
    wooshSound = new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.2 }); // Air woosh

    lucide.createIcons();
    initThreeJSEmbers(); // Start background

    // Init Supabase (Non-blocking)
    const sbReady = await initSupabaseClient();
    if (!sbReady) {
        console.warn('Supabase offline. Using Demo Mode.');
    }

    // Check Session (Allow 1s for "Sacred Seal" to animation)
    setTimeout(() => {
        checkSession();
    }, 1000);
});

// --- 2. SUPABASE SETUP ---

async function initSupabaseClient() {
    // Try manual first (Localhost fix)
    const MANUAL_URL = 'https://fveosuladewjtqoqhdbl.supabase.co';
    const MANUAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU';

    if (window.supabase) {
        try {
            window.sb = window.supabase.createClient(MANUAL_URL, MANUAL_KEY);
            return true;
        } catch (e) {
            console.error('Supabase init error:', e);
            return false;
        }
    }
    return false;
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

// --- 3. AUTH SERVICE ---

async function signIn(email, password) {
    playSound('click');
    const { error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
        showToast(error.message, 'error');
    } else {
        checkSession(); // Will trigger handleLoginSuccess
    }
}

async function signUp(email, password) {
    playSound('click');
    const { error } = await window.sb.auth.signUp({ email, password });
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Account created. Welcome to the Void.', 'success');
        checkSession();
    }
}

async function signOut() {
    playSound('click');
    await window.sb.auth.signOut();
    location.reload(); // Cleanest way to reset state
}

async function handleLoginSuccess(user) {
    state.user = user;
    state.isAdmin = (user.email === ADMIN_EMAIL);

    // Fetch Profile for Tier
    const { data: profile } = await window.sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    state.profile = profile;

    // Determine Tier (Mock calculation if view missing)
    calculateTier(profile);

    updateUI();
    transitionTo('sanctum');
    subscribeToPulse();
}

function calculateTier(profile) {
    if (!profile) return;
    // Real logic would query the view, for now we simulate locally based on date
    const date = new Date(profile.created_at);
    // Placeholder logic
    state.tier = 'Initiate';
    if (state.isAdmin) state.tier = 'The Architect';
}

// --- 4. NAVIGATION & UI ---

function updateUI() {
    // Header
    const email = state.user?.email || 'Guest';
    const tier = state.tier || 'Initiate';

    document.getElementById('user-display').textContent = email;
    document.getElementById('user-tier-badge').textContent = tier;
    document.getElementById('user-tier-badge').className = `text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 uppercase tracking-wider border tier-badge-${tier.toLowerCase().replace(' ', '-')}`;

    // Admin Panel Visibility
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        if (state.isAdmin) {
            adminPanel.classList.remove('hidden');
        } else {
            adminPanel.classList.add('hidden');
        }
    }
}

function transitionTo(viewName) {
    // Hide Loader
    const loader = document.getElementById('loader-overlay');
    if (loader) loader.classList.add('hidden-fade');

    // Hide all Views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Show Target
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');

        // GSAP Animations based on view
        if (viewName === 'gate') animateGate();
        if (viewName === 'sanctum') {
            animateSanctum();
            updateUI(); // Ensure UI is fresh
        }
    }
    state.view = viewName;
}

function playSound(type) {
    if (type === 'click' && clickSound) clickSound.play();
    if (type === 'woosh' && wooshSound) wooshSound.play();
}

// --- 5. ANIMATIONS (GSAP) ---

function animateGate() {
    gsap.fromTo('#gate-content',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }
    );
}

function animateSanctum() {
    gsap.fromTo('.sanctuary-card',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(1.7)' }
    );
}

// --- 6. ADMIN & VOTING ---

// Admin: Search User
async function searchUser() {
    if (!state.isAdmin) return;
    const query = document.getElementById('admin-user-search').value;
    const resultDiv = document.getElementById('admin-user-result');

    if (!query) {
        resultDiv.textContent = 'Enter an email...';
        return;
    }

    resultDiv.textContent = 'Searching database...';

    // Mock search since we don't have a direct 'users' list API access in client usually
    // unless we use a specific rpc or edge function.
    // For demo/prototype, we'll try to fetch from 'profiles'
    const { data, error } = await window.sb
        .from('profiles')
        .select('*')
        .ilike('email', `%${query}%`)
        .limit(5);

    if (error) {
        resultDiv.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
    } else if (data && data.length > 0) {
        resultDiv.innerHTML = data.map(u =>
            `<div class="flex justify-between border-b border-white/10 pb-1 mb-1">
                <span>${u.email}</span>
                <button onclick="exileUser('${u.id}')" class="text-red-500 hover:text-red-400 uppercase text-[10px]">Exile</button>
            </div>`
        ).join('');
    } else {
        resultDiv.textContent = 'No souls found.';
    }
}

// Admin: Exile Process
async function exileUser(userId) {
    if (!confirm('Are you sure you want to banish this soul?')) return;

    // In a real app, this would call an Edge Function to delete from Auth
    // Here we just flag them in profile or delete the profile row
    const { error } = await window.sb
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        showToast('Exile failed: ' + error.message, 'error');
    } else {
        showToast('Soul banished to the void.', 'success');
        document.getElementById('admin-user-result').innerHTML = '';
    }
}

// Admin: Broadcast
function broadcastMessage() {
    const msg = prompt('Enter system notice:');
    if (msg) {
        // Mock broadcast -> just shows local toast for now
        showToast(`[SYSTEM]: ${msg}`, 'info');
    }
}

// Admin: Reset
async function resetVotes() {
    if (!confirm('WARNING: Extinguish all flames? This cannot be undone.')) return;

    // RLS policy usually prevents this unless there's a specific function
    const { error } = await window.sb
        .from('votes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to match all

    if (error) {
        showToast('Extinguish failed (Check RLS): ' + error.message, 'error');
    } else {
        showToast('The flames have been reset.', 'success');
    }
}

async function castVote(sanctuaryId) {
    playSound('woosh');
    if (navigator.vibrate) navigator.vibrate(50); // Haptic

    const { error } = await window.sb
        .from('votes')
        .insert([{ user_id: state.user.id, sanctuary_id: sanctuaryId }]);

    if (error) {
        showToast('Vote failed: ' + error.message, 'error');
    } else {
        showToast(`Vote cast for ${getSanctuaryName(sanctuaryId)}`, 'success');
        animateVoteSuccess(sanctuaryId);
    }
}

function getSanctuaryName(id) {
    return state.sanctuaries.find(s => s.id === id)?.name || id;
}

function subscribeToPulse() {
    // Listen for ALL public votes
    window.sb
        .channel('public:votes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, payload => {
            const sanctuary = getSanctuaryName(payload.new.sanctuary_id);
            addPulseItem(`Someone ignited ${sanctuary}`);
        })
        .subscribe();
}

function addPulseItem(text) {
    const feed = document.getElementById('pulse-feed');
    const item = document.createElement('div');
    item.className = 'text-xs text-orange-400 font-mono mb-1 animate-pulse-ember';
    item.textContent = `> ${text}`;
    feed.prepend(item);
    if (feed.children.length > 5) feed.lastChild.remove();
}

// --- 7. TOASTS ---
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full glass text-sm font-semibold z-50 transition-all duration-300 ${type === 'error' ? 'text-red-400 border-red-900' : 'text-orange-400'}`;

    // Show
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
    }, 3000);
}

// --- 8. THREE.JS EMBERS (Placeholder) ---
function initThreeJSEmbers() {
    // Ideally this would be full Three.js, but for simplicity/performance in this file
    // we will inject the CSS ember logic here or simple canvas if needed.
    // For now, we rely on the CSS 'animate-float' we added in style.css
}