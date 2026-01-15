let isRunning = false;
let isPremium = false;
let originalSettings = { maxFriends: 0, delay: 2 };
const FREE_LIMIT = 10;

async function checkPremiumStatus() {
    try {
        const result = await chrome.storage.local.get([
            'isPremium',
            'maxFriends',
            'delay',
            'isRunning',
            'currentStats'
        ]);
        
        isPremium = result.isPremium || false;
        
        if (result.maxFriends !== undefined) {
            originalSettings.maxFriends = result.maxFriends;
            document.getElementById('maxFriends').value = result.maxFriends;
        }
        
        if (result.delay !== undefined) {
            originalSettings.delay = result.delay;
            document.getElementById('delay').value = result.delay;
        }
        
        if (result.isRunning && result.currentStats) {
            isRunning = true;
            restoreRunningState(result.currentStats);
        }
        
        updateUI();
    } catch (error) {
        console.log('Storage non disponible, mode gratuit par défaut');
        isPremium = false;
        updateUI();
    }
}

async function resetExtension() {
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser ?\n\nToutes les statistiques seront perdues.')) {
        await chrome.storage.local.set({
            isRunning: false,
            currentStats: null,
            pageSession: null
        });
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    window.FB_REMOVER_STOP = true;
                    window.FB_REMOVER_RUNNING = false;
                }
            });
        } catch(e) {}
        
        location.reload();
    }
}

document.getElementById('resetBtn')?.addEventListener('click', resetExtension);

function restoreRunningState(stats) {
    if (!stats) return;
    
    toggleUI(true);
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('removedCount').textContent = stats.removed || 0;
    document.getElementById('skippedCount').textContent = stats.skipped || 0;
    document.getElementById('settingsNote').style.display = 'block';
    
    if (!isPremium) {
        const remaining = Math.max(0, FREE_LIMIT - (stats.removed || 0));
        document.getElementById('remainingCount').textContent = remaining;
        const progress = ((stats.removed || 0) / FREE_LIMIT) * 100;
        document.getElementById('progressBar').style.width = Math.min(progress, 100) + '%';
    } else {
        document.getElementById('limitDisplay').textContent = 
            originalSettings.maxFriends === 0 ? 'Illimité' : originalSettings.maxFriends;
    }
    
    document.getElementById('currentFriend').innerHTML = 
        `🔄 Suppression en cours...`;
    document.getElementById('status').className = 'success';
    document.getElementById('status').textContent = '✅ Script en cours d\'exécution';
}

checkPremiumStatus();

function updateUI() {
    if (isPremium) {
        document.getElementById('premiumBanner').style.display = 'none';
        document.getElementById('premiumSection').style.display = 'none';
        document.getElementById('versionText').textContent = '💎 Version Premium';
        document.getElementById('maxFriends').disabled = false;
        document.getElementById('delay').disabled = false;
        document.getElementById('premiumLimitRow').style.display = 'none';
        document.querySelectorAll('.locked').forEach(el => el.classList.remove('locked'));
    } else {
        document.getElementById('premiumBanner').style.display = 'block';
        document.getElementById('versionText').textContent = `Version Gratuite (${FREE_LIMIT} max)`;
        document.getElementById('premiumLimitRow').style.display = 'flex';
    }
}

document.getElementById('maxFriends')?.addEventListener('input', function() {
    if (!isPremium) return;
    this.classList.add('changed');
    document.getElementById('applySettings').style.display = 'flex';
});

document.getElementById('delay')?.addEventListener('input', function() {
    if (!isPremium) return;
    this.classList.add('changed');
    document.getElementById('applySettings').style.display = 'flex';
});

document.getElementById('applySettings')?.addEventListener('click', async () => {
    if (!isPremium) return;
    
    const maxFriends = parseInt(document.getElementById('maxFriends').value) || 0;
    const delay = parseInt(document.getElementById('delay').value) || 2;
    
    if (delay < 1 || delay > 10) {
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = '❌ Délai doit être entre 1 et 10 secondes';
        return;
    }
    
    await chrome.storage.local.set({ maxFriends, delay });
    originalSettings = { maxFriends, delay };
    
    document.getElementById('maxFriends').classList.remove('changed');
    document.getElementById('delay').classList.remove('changed');
    document.getElementById('applySettings').style.display = 'none';
    
    if (isRunning) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (max, del) => {
                    if (window.FB_REMOVER_UPDATE_CONFIG) {
                        window.FB_REMOVER_UPDATE_CONFIG(max, del * 1000);
                    }
                },
                args: [maxFriends, delay]
            });
            document.getElementById('status').className = 'success';
            document.getElementById('status').textContent = '✅ Paramètres appliqués en temps réel!';
            document.getElementById('limitDisplay').textContent = maxFriends === 0 ? 'Illimité' : maxFriends;
        } catch(e) {
            console.log('Erreur application:', e);
        }
    } else {
        document.getElementById('status').className = 'success';
        document.getElementById('status').textContent = '✅ Paramètres sauvegardés!';
    }
    
    setTimeout(() => {
        if (document.getElementById('status').className === 'success') {
            document.getElementById('status').className = '';
            document.getElementById('status').textContent = '✨ Configurez et lancez la suppression';
        }
    }, 3000);
});

document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    window.open('https://votre-site.com/buy', '_blank');
});

document.getElementById('premiumBanner')?.addEventListener('click', () => {
    window.open('https://votre-site.com/buy', '_blank');
});

document.getElementById('removeArabic').addEventListener('click', () => startRemoval('arabic'));
document.getElementById('removeNonArabic').addEventListener('click', () => startRemoval('non-arabic'));
document.getElementById('removeNoMutual').addEventListener('click', () => startRemoval('no-mutual'));
document.getElementById('removeAll').addEventListener('click', () => startRemoval('all'));
document.getElementById('stopButton').addEventListener('click', stopRemoval);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATE') {
        updateStats(message.data);
        chrome.storage.local.set({
            currentStats: {
                removed: message.data.removed,
                skipped: message.data.skipped
            }
        });
    } else if (message.type === 'FINISHED') {
        onFinished(message.data);
    }
});

async function startRemoval(filter) {
    const maxFriends = isPremium ? originalSettings.maxFriends : 0;
    const delay = isPremium ? originalSettings.delay : 2;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('facebook.com/friends')) {
        document.getElementById('status').className = 'error';
        document.getElementById('status').innerHTML = '❌ Ouvrez facebook.com/friends/list';
        return;
    }
    
    isRunning = true;
    toggleUI(true);
    
    await chrome.storage.local.set({
        isRunning: true,
        currentStats: { removed: 0, skipped: 0 }
    });
    
    document.getElementById('settingsNote').style.display = 'block';
    document.getElementById('applySettings').style.display = 'none';
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('removedCount').textContent = '0';
    document.getElementById('skippedCount').textContent = '0';
    document.getElementById('remainingCount').textContent = FREE_LIMIT;
    document.getElementById('limitDisplay').textContent = isPremium ? 
        (maxFriends === 0 ? 'Illimité' : maxFriends) : 
        FREE_LIMIT;
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('currentFriend').innerHTML = '⏳ Démarrage...';
    document.getElementById('status').className = '';
    document.getElementById('status').textContent = '🚀 Démarrage...';
    
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (filterType, maxCount, delaySeconds, premium) => {
                window.FB_REMOVER_CONFIG = {
                    filter: filterType,
                    maxFriends: maxCount,
                    delay: delaySeconds * 1000,
                    isPremium: premium
                };
            },
            args: [filter, maxFriends, delay, isPremium]
        });
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
        
        document.getElementById('status').className = 'success';
        document.getElementById('status').textContent = isPremium ? 
            '✅ Mode Premium actif - Suppression illimitée !' :
            `⚠️ Mode gratuit - Maximum ${FREE_LIMIT} suppressions`;
    } catch (error) {
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = `❌ Erreur: ${error.message}`;
        toggleUI(false);
        await chrome.storage.local.set({ isRunning: false });
    }
}

// ✅ FONCTION STOP CORRIGÉE
// ✅ FONCTION STOP CORRIGÉE - Réinitialise aussi FB_REMOVER_RUNNING
async function stopRemoval() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Définir les flags d'arrêt ET réinitialiser le running
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => { 
                window.FB_REMOVER_STOP = true;
                window.FB_REMOVER_RUNNING = false; // ✅ AJOUTÉ
            }
        });
        
        document.getElementById('status').className = 'warning';
        document.getElementById('status').textContent = '⏹️ Arrêt en cours...';
        
        // Attendre un peu que le script s'arrête
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Récupérer les stats actuelles avant de nettoyer
        const storage = await chrome.storage.local.get(['currentStats']);
        const stats = storage.currentStats || { removed: 0, skipped: 0 };
        
        // Nettoyer l'état
        isRunning = false;
        await chrome.storage.local.set({
            isRunning: false,
            currentStats: null
        });
        
        // Mettre à jour l'UI
        toggleUI(false);
        document.getElementById('status').className = 'warning';
        document.getElementById('status').innerHTML = 
            `⏹️ Arrêté! ${stats.removed} supprimés, ${stats.skipped} ignorés`;
        document.getElementById('currentFriend').innerHTML = '⏹️ Arrêté par l\'utilisateur';
        document.getElementById('settingsNote').style.display = 'none';
        
    } catch(e) {
        console.error('Erreur lors de l\'arrêt:', e);
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = '❌ Erreur lors de l\'arrêt';
    }
}


function updateStats(data) {
    const removed = data.removed || 0;
    const skipped = data.skipped || 0;
    const currentFriend = data.currentFriend || '';
    const action = data.action || '';
    
    document.getElementById('removedCount').textContent = removed;
    document.getElementById('skippedCount').textContent = skipped;
    
    if (!isPremium) {
        const remaining = Math.max(0, FREE_LIMIT - removed);
        document.getElementById('remainingCount').textContent = remaining;
        const progress = (removed / FREE_LIMIT) * 100;
        document.getElementById('progressBar').style.width = Math.min(progress, 100) + '%';
    } else {
        const maxFriends = originalSettings.maxFriends;
        if (maxFriends > 0) {
            const progress = (removed / maxFriends) * 100;
            document.getElementById('progressBar').style.width = Math.min(progress, 100) + '%';
        } else {
            document.getElementById('progressBar').style.width = '100%';
        }
    }
    
    if (currentFriend) {
        document.getElementById('currentFriend').innerHTML = 
            `${currentFriend} ${action}`;
    }
}

async function onFinished(data) {
    const removed = data.removed || 0;
    const skipped = data.skipped || 0;
    
    document.getElementById('status').className = 'success';
    document.getElementById('status').innerHTML = 
        `✅ Terminé! ${removed} supprimés, ${skipped} ignorés`;
    document.getElementById('currentFriend').innerHTML = 
        `🎉 Opération terminée!`;
    document.getElementById('progressBar').style.width = '100%';
    
    toggleUI(false);
    isRunning = false;
    
    await chrome.storage.local.set({
        isRunning: false,
        currentStats: null
    });
    
    document.getElementById('settingsNote').style.display = 'none';
    
    if (!isPremium && removed >= FREE_LIMIT) {
        setTimeout(() => {
            if (confirm(`🎉 Limite gratuite atteinte!\n\n${removed} amis supprimés.\n\nVoulez-vous passer à Premium pour des suppressions illimitées?`)) {
                window.open('https://votre-site.com/buy', '_blank');
            }
        }, 1000);
    }
}

function toggleUI(running) {
    const buttons = ['removeArabic', 'removeNonArabic', 'removeNoMutual', 'removeAll'];
    buttons.forEach(id => {
        document.getElementById(id).disabled = running;
        document.getElementById(id).style.display = running ? 'none' : 'flex';
    });
    
    document.getElementById('stopButton').style.display = running ? 'flex' : 'none';
    document.getElementById('maxFriends').disabled = running || !isPremium;
    document.getElementById('delay').disabled = running || !isPremium;
}

document.getElementById('debugPremium')?.addEventListener('click', async () => {
    await chrome.storage.local.set({ isPremium: true });
    alert('✅ Premium activé ! Rechargez le popup');
    location.reload();
});
