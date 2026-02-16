// Sacred Scroll - Community Ballot Logic with Supabase Integration

// Initialize Supabase (replace with your actual credentials)
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
let supabase = null;

// Check if Supabase is available (on pages that include it)
if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
}

// Feature Data (with updated Sacred Sign-In as winner)
const features = [
    {
        id: 'sacred-signin',
        title: 'Sacred Sign-In',
        description: 'Member access. Save progress. Unlock features. [NOW FORGING - See auth.html]',
        marks: 342,
        icon: 'key',
        winner: true,
        link: 'auth.html'
    },
    {
        id: 'hymnal-music',
        title: 'Hymnal Music',
        description: 'Music uploads. Spoken word. Community releases.',
        marks: 518,
        icon: 'music'
    },
    {
        id: 'the-library',
        title: 'The Library',
        description: 'Curated writings, docs, videos. Organized for study.',
        marks: 423,
        icon: 'book-open'
    },
    {
        id: 'tbt-chat',
        title: 'TBT Chat',
        description: 'Real-time discussion. Without algorithmic noise.',
        marks: 267,
        icon: 'messages-square'
    },
    {
        id: 'the-community',
        title: 'The Community',
        description: 'Member spotlights. Collaborations. Local projects.',
        marks: 198,
        icon: 'users'
    },
    {
        id: 'the-pool',
        title: 'The Pool',
        description: 'Transparent community fund. Support projects & emergencies.',
        marks: 445,
        icon: 'droplets'
    },
    {
        id: 'teachings',
        title: 'Teachings & Dialogues',
        description: 'Long-form breakdowns. Faith, society, lived truth.',
        marks: 389,
        icon: 'graduation-cap'
    },
    {
        id: 'creative-works',
        title: 'Creative Works',
        description: 'Art, writing, film, music. Experimental community projects.',
        marks: 234,
        icon: 'palette'
    },
    {
        id: 'action-outreach',
        title: 'Action & Outreach',
        description: 'Mutual aid. Events. Coordinated responses.',
        marks: 312,
        icon: 'hand-heart'
    },
    {
        id: 'the-archive',
        title: 'The Archive',
        description: 'Chronological record. Timeline of Truth. Preserved history.',
        marks: 276,
        icon: 'clock'
    }
];

// State Management
let hasVoted = false;
let selectedFeature = null;
let totalMarks = 0;
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initializeEmbers();
    checkUserSession();
    loadState();
    renderFeatures();
    startCountdown();
    setupForms();
    updateTotalMarks();
});

// Create floating embers
function initializeEmbers() {
    const container = document.getElementById('ember-container');
    for (let i = 0; i < 15; i++) {
        const ember = document.createElement('div');
        ember.className = 'floating-ember';
        ember.style.left = Math.random() * 100 + '%';
        ember.style.animationDelay = Math.random() * 8 + 's';
        ember.style.animationDuration = (8 + Math.random() * 4) + 's';
        container.appendChild(ember);
    }
}

// Check if user is authenticated with Supabase
async function checkUserSession() {
    if (!supabase) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        loadUserVotesFromSupabase();
    }
}

// Load votes from Supabase if authenticated, otherwise fallback to localStorage
async function loadUserVotesFromSupabase() {
    if (!currentUser) return;
    
    const { data: votes } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (votes && votes.length > 0) {
        const lastVote = votes[0];
        const voteDate = new Date(lastVote.created_at);
        const now = new Date();
        const hoursDiff = (now - voteDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            hasVoted = true;
            selectedFeature = lastVote.feature_id;
            showVoteStatus();
        }
    }
}

// Load voting state from localStorage (fallback)
function loadState() {
    // If we have Supabase and a user, don't use localStorage
    if (currentUser) return;
    
    const voteData = localStorage.getItem('sacredScrollVote');
    const voteTime = localStorage.getItem('sacredScrollVoteTime');
    
    if (voteData && voteTime) {
        const voteDate = new Date(voteTime);
        const now = new Date();
        const hoursDiff = (now - voteDate) / (1000 * 60 * 60);
        
        // Reset vote if 24 hours have passed
        if (hoursDiff >= 24) {
            localStorage.removeItem('sacredScrollVote');
            localStorage.removeItem('sacredScrollVoteTime');
        } else {
            hasVoted = true;
            selectedFeature = voteData;
            showVoteStatus();
        }
    }
}

// Render feature cards
function renderFeatures() {
    const container = document.getElementById('features-container');
    totalMarks = features.reduce((sum, f) => sum + f.marks, 0);
    
    // Sort by marks (descending) for display order
    const sortedFeatures = [...features].sort((a, b) => b.marks - a.marks);
    const maxMarks = sortedFeatures[0].marks;

    container.innerHTML = features.map(feature => {
        const percentage = ((feature.marks / totalMarks) * 100).toFixed(1);
        const isVoted = hasVoted && selectedFeature === feature.id;
        const isDisabled = hasVoted && !isVoted;
        
        return `
            <div class="vote-card rounded-lg p-5 md:p-6 relative overflow-hidden ${isVoted ? 'voted' : ''}" data-feature-id="${feature.id}">
                <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    <!-- Icon & Info -->
                    <div class="flex items-start gap-4 flex-1">
                        <div class="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 border border-stone-200">
                            <i data-lucide="${feature.icon}" class="w-6 h-6 text-stone-600"></i>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-ritual text-lg font-semibold text-stone-800 mb-1">${feature.title}</h3>
                            <p class="text-sm text-stone-600 leading-relaxed">${feature.description}</p>
                        </div>
                    </div>

                    <!-- Progress & Action -->
                    <div class="flex-1 md:max-w-md">
                        <div class="flex items-center justify-between mb-2 text-sm">
                            <span class="font-semibold text-orange-700">${percentage}%</span>
                            <span class="text-stone-500 text-xs">${feature.marks.toLocaleString()} marks</span>
                        </div>
                        
                        <div class="h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
                            <div class="progress-fill h-full rounded-full" style="width: ${percentage}%"></div>
                        </div>

                        <button 
                            onclick="castVote('${feature.id}')"
                            class="btn-ritual w-full text-white text-sm font-medium py-2.5 px-4 rounded-md flex items-center justify-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${isDisabled ? 'disabled' : ''}
                        >
                            ${isVoted ? 
                                '<i data-lucide="check" class="w-4 h-4"></i><span>Marked</span>' : 
                                '<i data-lucide="flame" class="w-4 h-4"></i><span>Cast Mark</span>'
                            }
                        </button>
                    </div>
                </div>
                
                ${isVoted ? '<div class="absolute top-4 right-4 text-orange-600"><i data-lucide="seal-check" class="w-5 h-5"></i></div>' : ''}
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Cast vote functionality with Supabase integration
async function castVote(featureId) {
    if (hasVoted) return;
    
    // If user is authenticated, save to Supabase
    if (supabase && currentUser) {
        const { error } = await supabase
            .from('votes')
            .insert([
                {
                    user_id: currentUser.id,
                    feature_id: featureId,
                    created_at: new Date().toISOString()
                }
            ]);
        
        if (error) {
            console.error('Error saving vote:', error);
            showNotification('The scroll rejected thy mark. Try again.');
            return;
        }
    } else {
        // Fallback to localStorage for anonymous users
        localStorage.setItem('sacredScrollVote', featureId);
        localStorage.setItem('sacredScrollVoteTime', new Date().toISOString());
    }
    
    // Update state
    hasVoted = true;
    selectedFeature = featureId;
    
    // Update feature marks locally
    const feature = features.find(f => f.id === featureId);
    if (feature) {
        feature.marks++;
    }
    
    // Update UI
    renderFeatures();
    updateTotalMarks();
    showVoteStatus();
    
    // Scroll to status
    document.getElementById('vote-status').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Show appropriate message
    if (currentUser) {
        showNotification('Thy mark has been recorded in the eternal chronicles.');
    }
}

// Show vote status message
function showVoteStatus() {
    const status = document.getElementById('vote-status');
    status.classList.remove('hidden');
    status.classList.add('animate-pulse');
    setTimeout(() => status.classList.remove('animate-pulse'), 1000);
}

// Update total marks display
function updateTotalMarks() {
    const total = features.reduce((sum, f) => sum + f.marks, 0);
    document.getElementById('total-marks').textContent = total.toLocaleString();
}

// Countdown Timer (24 hours from now)
function startCountdown() {
    const countdownEl = document.getElementById('countdown');
    
    // Set deadline to midnight tonight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    
    function update() {
        const current = new Date();
        const diff = tomorrow - current;
        
        if (diff <= 0) {
            countdownEl.textContent = "00:00:00";
            // Reset votes when timer hits zero
            localStorage.removeItem('sacredScrollVote');
            localStorage.removeItem('sacredScrollVoteTime');
            location.reload();
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        countdownEl.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    update();
    setInterval(update, 1000);
}

// Setup form submissions
function setupForms() {
    // Main suggestion form
    document.getElementById('suggestion-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('suggestion-text').value;
        const email = document.getElementById('suggestion-email').value;
        
        if (!text.trim()) return;
        
        const subject = 'New Feature Suggestion for The Sacred Scroll';
        const body = `Suggestion:\n${text}\n\n${email ? `Contact: ${email}` : ''}`;
        
        window.location.href = `mailto:info@truthbtoldhub.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // Reset form
        e.target.reset();
        showNotification('Thy suggestion has been prepared for the messengers.');
    });

    // Archive form
    document.getElementById('archive-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('archive-text').value;
        
        if (!text.trim()) return;
        
        const subject = 'Additional Council for The Archive';
        const body = `Counsel:\n${text}`;
        
        window.location.href = `mailto:info@truthbtoldhub.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        e.target.reset();
        showNotification('Thy counsel has been sent to the Archive.');
    });
}

// Notification helper
function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'fixed bottom-6 right-6 bg-stone-800 text-stone-100 px-6 py-3 rounded-lg shadow-lg z-50 font-ritual text-sm animate-fade-in-up';
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.5s';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

// Add animation styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
        animation: fadeInUp 0.5s ease-out;
    }
`;
document.head.appendChild(style);