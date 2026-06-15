// State Management
let state = {
    releases: [],
    filteredReleases: [],
    activeFilter: 'all',
    searchQuery: '',
    sortOrder: 'desc',
    currentDraft: {
        text: '',
        link: '',
        date: '',
        type: ''
    }
};

// CONSTANTS
const TWITTER_CHAR_LIMIT = 280;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 14; // r = 14, circ = 87.964

// DOM Elements
const DOM = {
    feedContainer: document.getElementById('feed-container'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    refreshBtn: document.getElementById('refresh-btn'),
    retryBtn: document.getElementById('retry-btn'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    typeFilters: document.getElementById('type-filters'),
    sortSelect: document.getElementById('sort-select'),
    
    // Stats Panel
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statChanges: document.getElementById('stat-changes'),
    statFixes: document.getElementById('stat-fixes'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModal: document.getElementById('close-modal'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    previewText: document.getElementById('preview-text'),
    charCount: document.getElementById('char-count'),
    progressCircle: document.getElementById('progress-circle'),
    postTweetBtn: document.getElementById('post-tweet-btn'),
    hashtagPills: document.querySelectorAll('.hashtag-pill')
};

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    fetchReleases();
}

// Event Listeners Setup
function setupEventListeners() {
    // Refresh feed
    DOM.refreshBtn.addEventListener('click', () => fetchReleases(true));
    DOM.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        toggleClearSearchButton();
        filterAndRender();
    });
    DOM.clearSearch.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        DOM.searchInput.focus();
        filterAndRender();
    });
    
    // Filters
    DOM.typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Update UI active state
            DOM.typeFilters.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update state and re-render
            state.activeFilter = e.target.dataset.type;
            filterAndRender();
        }
    });
    DOM.resetFiltersBtn.addEventListener('click', resetAllFilters);
    
    // Sorting
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        filterAndRender();
    });
    
    // Modal closing
    DOM.closeModal.addEventListener('click', closeTweetComposer);
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) closeTweetComposer();
    });
    
    // Character limit tracking in modal
    DOM.tweetTextarea.addEventListener('input', (e) => {
        updateTweetText(e.target.value);
    });
    
    // Post to X
    DOM.postTweetBtn.addEventListener('click', postTweet);
    
    // Hashtag suggestions
    DOM.hashtagPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const hashtag = pill.dataset.tag;
            let currentText = DOM.tweetTextarea.value;
            
            // Check if hashtag is already in text to prevent duplicates
            if (!currentText.includes(hashtag)) {
                // Ensure proper spacing
                if (currentText.length > 0 && !currentText.endsWith(' ')) {
                    currentText += ' ';
                }
                currentText += hashtag;
                DOM.tweetTextarea.value = currentText;
                updateTweetText(currentText);
            }
        });
    });
}

// Show/Hide Search Clear Button
function toggleClearSearchButton() {
    if (state.searchQuery.length > 0) {
        DOM.clearSearch.style.display = 'flex';
    } else {
        DOM.clearSearch.style.display = 'none';
    }
}

// Reset filters back to default
function resetAllFilters() {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    toggleClearSearchButton();
    
    DOM.typeFilters.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    DOM.typeFilters.querySelector('[data-type="all"]').classList.add('active');
    state.activeFilter = 'all';
    
    DOM.sortSelect.value = 'desc';
    state.sortOrder = 'desc';
    
    filterAndRender();
}

// Fetch Release Notes from backend
async function fetchReleases(forceRefresh = false) {
    showLoading(true);
    
    // Spinning refresh icon animation
    const spinner = DOM.refreshBtn.querySelector('.spinner-icon');
    if (spinner) spinner.classList.add('spinning');
    
    try {
        const url = `/api/releases${forceRefresh ? '?force_refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned HTTP status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message || 'Unknown server error');
        }
        
        state.releases = result.data || [];
        updateStats(state.releases);
        filterAndRender();
        
    } catch (err) {
        console.error('Failed to load release notes:', err);
        DOM.errorMessage.textContent = err.message || 'Failed to fetch release notes from Google Cloud.';
        showError(true);
    } finally {
        showLoading(false);
        if (spinner) spinner.classList.remove('spinning');
    }
}

// Calculate and render stats in top panel
function updateStats(releases) {
    let total = 0;
    let features = 0;
    let changes = 0;
    let fixes = 0;
    
    releases.forEach(rel => {
        rel.updates.forEach(upd => {
            total++;
            const cat = normalizeCategory(upd.type);
            if (cat === 'feature') features++;
            else if (cat === 'changed') changes++;
            else if (cat === 'fixed') fixes++;
        });
    });
    
    DOM.statTotal.textContent = total;
    DOM.statFeatures.textContent = features;
    DOM.statChanges.textContent = changes;
    DOM.statFixes.textContent = fixes;
}

// Normalize categories for mapping and UI grouping
function normalizeCategory(type) {
    const t = type.toLowerCase().trim();
    if (t.includes('feature') || t.includes('new')) return 'feature';
    if (t.includes('change') || t.includes('update') || t.includes('modify')) return 'changed';
    if (t.includes('fix') || t.includes('resolve') || t.includes('bug')) return 'fixed';
    if (t.includes('deprecat') || t.includes('remove')) return 'deprecated';
    return 'changed'; // fallback
}

// Filter and Sort the Releases in memory, then Render
function filterAndRender() {
    let processedGroups = [];
    
    state.releases.forEach(rel => {
        // Filter individual updates in this group
        const matchingUpdates = rel.updates.filter(upd => {
            // 1. Filter by category
            if (state.activeFilter !== 'all') {
                const normCat = normalizeCategory(upd.type);
                if (normCat !== state.activeFilter) return false;
            }
            
            // 2. Filter by search query
            if (state.searchQuery) {
                const textMatch = upd.text.toLowerCase().includes(state.searchQuery);
                const typeMatch = upd.type.toLowerCase().includes(state.searchQuery);
                const dateMatch = rel.date.toLowerCase().includes(state.searchQuery);
                return textMatch || typeMatch || dateMatch;
            }
            
            return true;
        });
        
        if (matchingUpdates.length > 0) {
            processedGroups.push({
                ...rel,
                updates: matchingUpdates
            });
        }
    });
    
    // Sort groups by date
    // Note: dates are formatted like "June 15, 2026". We can parse them or sort based on the iso timestamp "updated" key
    processedGroups.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return state.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    renderFeed(processedGroups);
}

// Render the processed release notes list to the DOM
function renderFeed(groups) {
    DOM.feedContainer.innerHTML = '';
    
    if (groups.length === 0) {
        showEmpty(true);
        return;
    }
    
    showEmpty(false);
    showError(false);
    
    groups.forEach(group => {
        // Group Container
        const timelineGroup = document.createElement('div');
        timelineGroup.className = 'timeline-group';
        
        // Date Header
        const header = document.createElement('div');
        header.className = 'timeline-date-header';
        header.innerHTML = `
            <div class="timeline-date-dot"></div>
            <span>${group.date}</span>
        `;
        timelineGroup.appendChild(header);
        
        // Cards for each update
        group.updates.forEach(upd => {
            const cat = normalizeCategory(upd.type);
            const card = document.createElement('article');
            card.className = 'update-card';
            card.setAttribute('data-category', cat);
            
            // Format content HTML to display properly
            let formattedHtml = upd.html;
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="category-tag">${upd.type}</span>
                    </div>
                </div>
                <div class="card-content">
                    ${formattedHtml}
                </div>
                <div class="card-footer">
                    <a href="${group.link}" target="_blank" rel="noopener noreferrer" class="doc-link">
                        <span>Official Release Notes</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                    </a>
                    <button class="btn btn-secondary btn-tweet" title="Compose Tweet for this update">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                </div>
            `;
            
            // Event listener for tweeting
            const tweetBtn = card.querySelector('.btn-tweet');
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(upd, group.date, group.link);
            });
            
            timelineGroup.appendChild(card);
        });
        
        DOM.feedContainer.appendChild(timelineGroup);
    });
}

// Loading/Error/Empty togglers
function showLoading(isLoading) {
    if (isLoading) {
        DOM.loadingState.classList.remove('hidden');
        DOM.feedContainer.classList.add('hidden');
    } else {
        DOM.loadingState.classList.add('hidden');
        DOM.feedContainer.classList.remove('hidden');
    }
}

function showError(isError) {
    if (isError) {
        DOM.errorState.classList.remove('hidden');
        DOM.feedContainer.classList.add('hidden');
        DOM.loadingState.classList.add('hidden');
        DOM.emptyState.classList.add('hidden');
    } else {
        DOM.errorState.classList.add('hidden');
    }
}

function showEmpty(isEmpty) {
    if (isEmpty) {
        DOM.emptyState.classList.remove('hidden');
        DOM.feedContainer.classList.add('hidden');
    } else {
        DOM.emptyState.classList.add('hidden');
    }
}

// Compose & Modal Logics
function openTweetComposer(update, date, link) {
    // Save draft state
    state.currentDraft = {
        date: date,
        type: update.type,
        link: link,
        text: update.text
    };
    
    // Intelligently draft the initial tweet text under 280 characters
    // Standard template:
    // "BigQuery Update [June 15, 2026] - Feature: Use Gemini Cloud Assist to optimize SQL query performance... Read more: https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026 #BigQuery #GoogleCloud"
    const heading = `BigQuery Update (${date}) - ${update.type}:\n\n`;
    const footerLink = `\n\nRead more: ${link}`;
    const hashtags = `\n#BigQuery #GoogleCloud`;
    
    // Calculate space left for the main description
    const baseLength = heading.length + footerLink.length + hashtags.length;
    const maxDescLength = TWITTER_CHAR_LIMIT - baseLength;
    
    let descriptionText = update.text;
    if (descriptionText.length > maxDescLength) {
        descriptionText = descriptionText.slice(0, maxDescLength - 3) + '...';
    }
    
    const draftText = `${heading}${descriptionText}${footerLink}${hashtags}`;
    
    // Load into UI
    DOM.tweetTextarea.value = draftText;
    updateTweetText(draftText);
    
    // Open Modal
    DOM.tweetModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent scrolling underneath
}

function closeTweetComposer() {
    DOM.tweetModal.classList.remove('active');
    document.body.style.overflow = '';
}

function updateTweetText(text) {
    state.currentDraft.text = text;
    DOM.previewText.textContent = text;
    
    // Character Count updates
    const len = text.length;
    const remaining = TWITTER_CHAR_LIMIT - len;
    
    DOM.charCount.textContent = remaining;
    
    // Progress Ring updates
    const percent = Math.min(100, (len / TWITTER_CHAR_LIMIT) * 100);
    const strokeOffset = PROGRESS_CIRCUMFERENCE - (percent / 100) * PROGRESS_CIRCUMFERENCE;
    
    DOM.progressCircle.style.strokeDashoffset = strokeOffset;
    
    // Handle Warning Levels
    if (remaining < 0) {
        DOM.charCount.className = 'char-count danger';
        DOM.progressCircle.style.stroke = 'var(--color-google-red)';
        DOM.postTweetBtn.disabled = true;
    } else if (remaining < 20) {
        DOM.charCount.className = 'char-count warning';
        DOM.progressCircle.style.stroke = 'var(--color-google-yellow)';
        DOM.postTweetBtn.disabled = false;
    } else {
        DOM.charCount.className = 'char-count';
        DOM.progressCircle.style.stroke = 'var(--color-google-blue)';
        DOM.postTweetBtn.disabled = false;
    }
}

// Redirect user to Twitter Web Intent with content
function postTweet() {
    const text = DOM.tweetTextarea.value;
    if (text.length > TWITTER_CHAR_LIMIT) {
        return; // safeguard
    }
    
    const encodedText = encodeURIComponent(text);
    const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
}
