let currentStats = { removed: 0, skipped: 0 };

document.addEventListener('DOMContentLoaded', () => {
    // Restaurer les valeurs
    const savedDelay = localStorage.getItem('fb_delay');
    if (savedDelay) document.getElementById('delay').value = savedDelay;
    
    const savedMax = localStorage.getItem('fb_max');
    if (savedMax) document.getElementById('maxFriends').value = savedMax;

    // Listeners boutons
    document.getElementById('btnArabic').onclick = () => start('arabic');
    document.getElementById('btnNonArabic').onclick = () => start('non-arabic');
    document.getElementById('btnNoMutual').onclick = () => start('no-mutual');
    document.getElementById('btnAll').onclick = () => start('all');
    document.getElementById('btnStop').onclick = stop;

    // Écouter les retours du content script
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'UPDATE') {
            updateUI(msg.data);
        }
    });
});

async function start(filterType) {
    // Validation
    const delay = parseFloat(document.getElementById('delay').value) || 1;
    const max = parseInt(document.getElementById('maxFriends').value) || 0;
    
    // Sauvegarde
    localStorage.setItem('fb_delay', delay);
    localStorage.setItem('fb_max', max);

    // Vérifier onglet
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.includes('facebook.com')) {
        setStatus('❌ Allez sur la page "Amis" de Facebook', 'error');
        return;
    }

    // UI State
    toggleRunning(true);
    setStatus('🚀 Injection du script...', 'info');

    // Injection (Idempotente)
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
        
        // Attendre un peu que le script s'initialise
        setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'START',
                config: {
                    filter: filterType,
                    max: max,
                    delay: delay * 1000 // conversion ms
                }
            }).catch(e => {
                setStatus('❌ Erreur de communication. Rechargez la page Facebook.', 'error');
                toggleRunning(false);
            });
        }, 500);

    } catch (e) {
        setStatus('❌ Impossible d\'injecter le script.', 'error');
        toggleRunning(false);
    }
}

function stop() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP' });
        }
    });
    toggleRunning(false);
    setStatus('⏹️ Arrêt demandé...', 'info');
}

function updateUI(data) {
    if (!data) return;
    
    document.getElementById('countRemoved').innerText = data.stats.removed;
    document.getElementById('countSkipped').innerText = data.stats.skipped;
    
    if (data.action) {
        document.getElementById('currentAction').innerText = data.action;
        setStatus(data.action, 'info');
    }

    // Barre de progression (visuelle seulement si max défini)
    const max = parseInt(document.getElementById('maxFriends').value) || 0;
    if (max > 0) {
        const pct = Math.min((data.stats.removed / max) * 100, 100);
        document.getElementById('progressBar').style.width = pct + '%';
    } else {
        document.getElementById('progressBar').style.width = '100%';
        document.getElementById('progressBar').style.opacity = '0.5'; // Indéterminé
    }

    if (!data.isRunning) {
        toggleRunning(false);
        setStatus('✅ Script en pause / terminé', 'success');
    } else {
        toggleRunning(true);
    }
}

function toggleRunning(isRunning) {
    const btns = document.querySelectorAll('.btn-action, .btn-primary');
    const inputs = document.querySelectorAll('input');
    const stopBtn = document.getElementById('btnStop');
    const statsPanel = document.getElementById('statsCard');
    const settingsPanel = document.getElementById('settingsCard');

    btns.forEach(b => b.style.display = isRunning ? 'none' : 'flex');
    inputs.forEach(i => i.disabled = isRunning);
    
    stopBtn.style.display = isRunning ? 'block' : 'none';
    statsPanel.style.display = isRunning ? 'block' : 'none';
    settingsPanel.style.opacity = isRunning ? '0.5' : '1';
}

function setStatus(msg, type) {
    const el = document.getElementById('statusBox');
    el.innerText = msg;
    el.className = `status-msg active ${type}`;
}