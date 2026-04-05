// State Management
let tabs = JSON.parse(localStorage.getItem('banana_tabs')) || [];
let activeTabId = null;
let bookmarks = JSON.parse(localStorage.getItem('banana_bookmarks')) || [];
let searchEngineUrl = localStorage.getItem('banana_search_engine') || 'https://www.google.com/search?q=';

// Service Worker Registration for Proxy
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/uv/sw.js', {
        scope: '/uv/service/'
    }).catch(err => console.error("Proxy SW Registration Failed:", err));
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search-engine').value = searchEngineUrl;
    renderBookmarks();
    
    if (tabs.length === 0) {
        createNewTab();
    } else {
        tabs.forEach(tab => renderTabUI(tab));
        switchTab(tabs[0].id);
    }
});

// Save state
function saveState() {
    // Strip loading state before saving
    const savedTabs = tabs.map(t => ({ ...t, loading: false }));
    localStorage.setItem('banana_tabs', JSON.stringify(savedTabs));
}

// Search Engine Logic
function changeSearchEngine() {
    searchEngineUrl = document.getElementById('search-engine').value;
    localStorage.setItem('banana_search_engine', searchEngineUrl);
}

// URL/Search Processing
function processInput(input) {
    input = input.trim();
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    
    if (urlPattern.test(input)) {
        return input.startsWith('http') ? input : 'https://' + input;
    }
    return searchEngineUrl + encodeURIComponent(input);
}

// Proxy URL Encoder (Hooks into UV)
function encodeProxyUrl(url) {
    // If UV is configured, use its encoder. Otherwise, fallback to generic routing format.
    if (typeof __uv$config !== 'undefined') {
        return __uv$config.prefix + __uv$config.encodeUrl(url);
    }
    // Fallback if script isn't loaded yet
    return '/uv/service/' + btoa(url); 
}

// Tab Management
function createNewTab(url = '', title = 'New Tab') {
    const id = 'tab_' + Date.now();
    const tab = { id, url, title, loading: false };
    tabs.push(tab);
    renderTabUI(tab);
    switchTab(id);
    saveState();
}

function renderTabUI(tab) {
    const tabContainer = document.getElementById('tabs-container');
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.id = `ui_${tab.id}`;
    tabEl.onclick = () => switchTab(tab.id);
    
    tabEl.innerHTML = `
        <span class="tab-title" id="title_${tab.id}">${tab.title}</span>
        <button class="tab-close" onclick="closeTab(event, '${tab.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    tabContainer.appendChild(tabEl);

    // Create Viewport
    const viewports = document.getElementById('viewports');
    const viewportEl = document.createElement('div');
    viewportEl.className = 'viewport';
    viewportEl.id = `view_${tab.id}`;
    
    if (!tab.url) {
        // Load Home Screen
        const template = document.getElementById('home-template');
        viewportEl.appendChild(template.content.cloneNode(true));
    } else {
        // Load Iframe
        loadIframe(viewportEl, tab);
    }
    
    viewports.appendChild(viewportEl);
}

function loadIframe(container, tab) {
    container.innerHTML = `
        <div class="loader-overlay" id="loader_${tab.id}">
            <div class="spin-banana">🍌</div>
        </div>
        <iframe src="${encodeProxyUrl(tab.url)}" 
                style="width:100%; height:100%; border:none;" 
                onload="hideLoader('${tab.id}')">
        </iframe>
    `;
}

function hideLoader(id) {
    const loader = document.getElementById(`loader_${id}`);
    if (loader) loader.style.display = 'none';
}

function switchTab(id) {
    activeTabId = id;
    const tabData = tabs.find(t => t.id === id);
    
    // Update UI Classes
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.viewport').forEach(v => v.classList.remove('active'));
    
    document.getElementById(`ui_${id}`).classList.add('active');
    document.getElementById(`view_${id}`).classList.add('active');
    
    // Update Address Bar
    const addressInput = document.getElementById('address-input');
    addressInput.value = tabData.url || '';
    
    checkBookmarkStatus();
}

function closeTab(event, id) {
    event.stopPropagation();
    const index = tabs.findIndex(t => t.id === id);
    
    // Remove Elements
    document.getElementById(`ui_${id}`).remove();
    document.getElementById(`view_${id}`).remove();
    
    tabs.splice(index, 1);
    
    if (tabs.length === 0) {
        createNewTab();
    } else if (activeTabId === id) {
        const newIndex = Math.max(0, index - 1);
        switchTab(tabs[newIndex].id);
    }
    saveState();
}

// Navigation Events
function handleEnter(e) {
    if (e.key === 'Enter') {
        const url = processInput(e.target.value);
        navigate(url);
    }
}

function handleHomeSearch(e, inputEl) {
    if (e.key === 'Enter') {
        const url = processInput(inputEl.value);
        navigate(url);
    }
}

function navigate(url) {
    const tab = tabs.find(t => t.id === activeTabId);
    tab.url = url;
    tab.title = url; // In a real scenario, you'd fetch the document title
    
    document.getElementById(`title_${activeTabId}`).innerText = url;
    document.getElementById('address-input').value = url;
    
    const viewport = document.getElementById(`view_${activeTabId}`);
    loadIframe(viewport, tab);
    
    saveState();
    checkBookmarkStatus();
}

function reloadTab() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab.url) navigate(tab.url);
}

function navBack() {
    // Iframes cross-origin restricts history.back(), standard proxy limitation.
    console.log("Back navigation depends on internal iframe history");
}

function navForward() {
    console.log("Forward navigation depends on internal iframe history");
}

// Bookmarking System
function toggleBookmark() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab.url) return;
    
    const existsIndex = bookmarks.findIndex(b => b.url === tab.url);
    
    if (existsIndex > -1) {
        bookmarks.splice(existsIndex, 1);
    } else {
        bookmarks.push({ url: tab.url, title: tab.title });
    }
    
    localStorage.setItem('banana_bookmarks', JSON.stringify(bookmarks));
    checkBookmarkStatus();
    renderBookmarks();
}

function checkBookmarkStatus() {
    const tab = tabs.find(t => t.id === activeTabId);
    const btn = document.getElementById('bookmark-btn');
    if (!tab || !tab.url) {
        btn.classList.remove('active');
        return;
    }
    const exists = bookmarks.some(b => b.url === tab.url);
    if (exists) btn.classList.add('active');
    else btn.classList.remove('active');
}

function renderBookmarks() {
    const bar = document.getElementById('bookmarks-bar');
    if (bookmarks.length === 0) {
        bar.style.display = 'none';
        return;
    }
    
    bar.style.display = 'flex';
    bar.innerHTML = bookmarks.map(b => `
        <div class="bookmark-item" onclick="navigate('${b.url}')" title="${b.url}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            ${b.title.substring(0, 15)}${b.title.length > 15 ? '...' : ''}
        </div>
    `).join('');
}
