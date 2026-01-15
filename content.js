(function() {
'use strict';

if (window.FB_REMOVER_RUNNING) {
    alert('⚠️ Script déjà actif!');
    return;
}

window.FB_REMOVER_RUNNING = true;
window.FB_REMOVER_STOP = false;

let CONFIG = window.FB_REMOVER_CONFIG || {
    filter: 'all',
    maxFriends: 0,
    delay: 2000,
    isPremium: false
};

window.FB_REMOVER_UPDATE_CONFIG = function(maxFriends, delay) {
    CONFIG.maxFriends = maxFriends;
    CONFIG.delay = delay;
    console.log('🔄 Config mise à jour:', CONFIG);
};

console.log('==========================================');
console.log('🎯 FB FRIEND REMOVER PRO v4.6');
console.log('==========================================');
console.log('Filtre:', CONFIG.filter);
console.log('Limite:', CONFIG.maxFriends === 0 ? 'Illimité' : CONFIG.maxFriends);
console.log('Délai:', CONFIG.delay + 'ms');
console.log('Premium:', CONFIG.isPremium ? 'OUI ✅' : 'NON (limité à 10)');
console.log('==========================================\n');

let stats = {
    removed: 0,
    skipped: 0
};

const FREE_LIMIT = 10;
let mainScrollContainer = null;

function sendStats(currentFriend = null, action = '') {
    try {
        chrome.runtime.sendMessage({
            type: 'STATS_UPDATE',
            data: {
                removed: stats.removed,
                skipped: stats.skipped,
                currentFriend: currentFriend,
                action: action
            }
        });
        chrome.storage.local.set({
            isRunning: true,
            currentStats: {
                removed: stats.removed,
                skipped: stats.skipped
            }
        });
    } catch(e) {
        console.log('Erreur envoi stats:', e);
    }
}

function sendFinished() {
    try {
        chrome.runtime.sendMessage({
            type: 'FINISHED',
            data: {
                removed: stats.removed,
                skipped: stats.skipped
            }
        });
        chrome.storage.local.set({
            isRunning: false,
            currentStats: null
        });
    } catch(e) {
        console.log('Erreur envoi finished:', e);
    }
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isArabic(text) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function hasMutualFriends(text) {
    const lower = text.toLowerCase();
    if (lower.includes('ami en commun') || lower.includes('amis en commun') || 
        lower.includes('mutual friend')) {
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) > 0 : true;
    }
    return false;
}

async function findThreeDotsButton(container) {
    const buttons = container.querySelectorAll('div[role="button"], [aria-label]');
    for (let btn of buttons) {
        const ariaLabel = btn.getAttribute('aria-label') || '';
        const text = btn.textContent || '';
        if (ariaLabel.toLowerCase().includes('plus') ||
            ariaLabel.toLowerCase().includes('more') ||
            text === '...' ||
            (btn.querySelector('svg') && ariaLabel === '')) {
            return btn;
        }
    }
    return null;
}

function findMainScrollContainer() {
    if (mainScrollContainer && document.contains(mainScrollContainer)) {
        return mainScrollContainer;
    }
    
    const allDivs = document.querySelectorAll('div');
    let bestContainer = null;
    let maxHeight = 0;
    
    for (let div of allDivs) {
        const style = window.getComputedStyle(div);
        const hasScroll = (style.overflowY === 'auto' || style.overflowY === 'scroll');
        const isScrollable = div.scrollHeight > div.clientHeight + 100;
        
        if (hasScroll && isScrollable && div.scrollHeight > maxHeight) {
            const hasCards = div.querySelectorAll('[data-visualcompletion="ignore-dynamic"]').length > 0;
            if (hasCards) {
                bestContainer = div;
                maxHeight = div.scrollHeight;
            }
        }
    }
    
    if (bestContainer) {
        mainScrollContainer = bestContainer;
        console.log(`✅ Conteneur trouvé: ${bestContainer.scrollHeight}px`);
        return bestContainer;
    }
    
    return null;
}

// 🚀 PRÉ-CHARGEMENT RAPIDE AVEC LONGS SCROLLS
async function preloadAllFriends() {
    console.log('\n📦 PHASE 1: PRÉ-CHARGEMENT COMPLET');
    console.log('='.repeat(50));
    sendStats('Pré-chargement...', '📦 Initialisation');
    
    const container = findMainScrollContainer();
    if (!container) {
        console.log('⚠️ Conteneur non trouvé, scroll fenêtre');
        await preloadWithWindowScroll();
        return true;
    }
    
    let scrollStep = 0;
    const maxScrolls = 200;
    
    while (scrollStep < maxScrolls) {
        const beforeScrollCount = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
        console.log(`\n📜 Scroll #${scrollStep + 1}`);
        console.log(` 📊 Cartes actuelles: ${beforeScrollCount}`);
        sendStats(`Chargement: ${beforeScrollCount} amis`, `📦 scroll ${scrollStep + 1}`);
        
        // Position actuelle
        const currentPos = container.scrollTop;
        const maxPos = container.scrollHeight - container.clientHeight;
        const newPos = Math.min(currentPos + 800, maxPos); // LONGS SCROLLS (800px)
        
        console.log(` 📍 Scroll: ${currentPos}px → ${newPos}px`);
        container.scrollTo({
            top: newPos,
            behavior: 'smooth'
        });
        
        // ⏱️ ATTENTE RÉDUITE
        console.log(' ⏱️ Attente 1.5 secondes...');
        await wait(1500);
        
        // 🔍 VÉRIFICATION UNIQUE
        const afterScrollCount = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
        const newCardsLoaded = afterScrollCount - beforeScrollCount;
        
        if (newCardsLoaded > 0) {
            console.log(` ✅ +${newCardsLoaded} nouvelles cartes chargées`);
        } else {
            console.log(` ⏸️ Aucune nouvelle carte`);
        }
        
        // Vérifier si on a atteint le bas
        const currentScrollPos = container.scrollTop;
        const maxScrollPos = container.scrollHeight - container.clientHeight;
        
        if (currentScrollPos >= maxScrollPos - 10) {
            console.log(' 🔻 BAS ATTEINT!');
            console.log(' ⏱️ Attente finale 2 secondes...');
            await wait(2000);
            
            const beforeFinalCheck = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
            await wait(1500);
            const afterFinalCheck = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
            
            if (afterFinalCheck === beforeFinalCheck) {
                console.log('\n✅ CHARGEMENT TERMINÉ!');
                console.log(`📊 TOTAL: ${afterFinalCheck} amis chargés`);
                break;
            } else {
                console.log(` 📦 Encore ${afterFinalCheck - beforeFinalCheck} cartes chargées`);
            }
        }
        
        scrollStep++;
        // Dans chaque cas d'arrêt dans processCards()
        if (window.FB_REMOVER_STOP) {
            console.log('\n⏹️ ARRÊTÉ');
            sendFinished();
            window.FB_REMOVER_RUNNING = false; // ✅ Déjà présent
            alert(`⏹️ Arrêté!\n\nSupprimés: ${stats.removed}\nIgnorés: ${stats.skipped}`);
            return;
        }

    }
    
    // Remonter en haut
    console.log('\n⬆️ Retour en haut de la liste...');
    container.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    await wait(1500);
    
    const totalCards = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
    console.log('\n' + '='.repeat(50));
    console.log(`✅ CHARGEMENT TERMINÉ - ${totalCards} amis prêts\n`);
    return true;
}

async function preloadWithWindowScroll() {
    let scrolls = 0;
    while (scrolls < 100) {
        const beforeCount = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
        console.log(`\n📜 Scroll fenêtre #${scrolls + 1}: ${beforeCount} cartes`);
        sendStats(`Chargement: ${beforeCount} amis`, '📦 scroll fenêtre');
        
        window.scrollBy({ top: 800, behavior: 'smooth' }); // LONG SCROLL
        
        console.log(' ⏱️ Attente 1.5s...');
        await wait(1500);
        
        const afterCount = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
        const diff = afterCount - beforeCount;
        
        if (diff > 0) {
            console.log(` ✅ +${diff} cartes`);
        } else {
            console.log(' ⏸️ Aucune nouvelle carte');
        }
        
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        
        if (scrollPos >= maxScroll - 100) {
            console.log(' 🔻 Bas atteint, attente finale...');
            await wait(2000);
            
            const finalBefore = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
            await wait(1500);
            const finalAfter = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').length;
            
            if (finalAfter === finalBefore) {
                console.log(`\n✅ Terminé: ${finalAfter} amis`);
                break;
            }
        }
        
        scrolls++;
        if (window.FB_REMOVER_STOP) return false;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await wait(1500);
    return true;
}

async function processCards() {
    // Lire config
    try {
        const storage = await chrome.storage.local.get(['maxFriends', 'delay']);
        if (CONFIG.isPremium) {
            if (storage.maxFriends !== undefined) {
                CONFIG.maxFriends = storage.maxFriends;
            }
            if (storage.delay !== undefined) {
                CONFIG.delay = storage.delay * 1000;
            }
        }
    } catch(e) {}
    
    // Vérifications
    if (!CONFIG.isPremium && stats.removed >= FREE_LIMIT) {
        console.log('\n🔒 LIMITE GRATUITE');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        alert(`🔒 Limite gratuite atteinte!\n\n${stats.removed}/${FREE_LIMIT} supprimés\n\n💎 Passez à Premium!`);
        return;
    }
    
    if (window.FB_REMOVER_STOP) {
        console.log('\n⏹️ ARRÊTÉ');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        alert(`⏹️ Arrêté!\n\nSupprimés: ${stats.removed}\nIgnorés: ${stats.skipped}`);
        return;
    }
    
    if (CONFIG.maxFriends > 0 && stats.removed >= CONFIG.maxFriends) {
        console.log('\n🎯 LIMITE ATTEINTE');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        alert(`🎯 Limite!\n\nSupprimés: ${stats.removed}\nIgnorés: ${stats.skipped}`);
        return;
    }
    
    if (!window.location.href.includes('/friends')) {
        console.log('\n⚠️ Plus sur /friends');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        return;
    }
    
    console.log('\n🔍 Recherche cartes...');
    const allCards = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]');
    console.log(`📊 ${allCards.length} cartes`);
    
    if (allCards.length === 0) {
        console.log('\n✅ TERMINÉ');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        alert(`✅ Terminé!\n\nSupprimés: ${stats.removed}\nIgnorés: ${stats.skipped}`);
        return;
    }
    
    let processedAny = false;
    
    for (let card of allCards) {
        const cardText = card.textContent;
        
        if (cardText.includes('Non lu') || cardText.includes('Marquer comme lue') ||
            cardText.includes('Ajouter amie') || cardText.includes('Ajouter ami') ||
            cardText.includes('Amie retiré') || cardText.includes('Ami retiré') ||
            cardText.includes('vous a envoyé') || cardText.includes('invitation') ||
            cardText.includes('Confirmer') || cardText.includes('Add Friend') ||
            cardText.includes('Suggestions')) {
            continue;
        }
        
        const nameLink = card.querySelector('a[role="link"]');
        if (!nameLink) continue;
        
        const name = nameLink.textContent.trim();
        if (!name || name.length < 2) continue;
        
        const arabic = isArabic(name);
        const mutual = hasMutualFriends(cardText);
        
        console.log(`\n👤 ${name} | Arabe: ${arabic} | Communs: ${mutual}`);
        
        let shouldRemove = false;
        switch(CONFIG.filter) {
            case 'arabic': shouldRemove = arabic; break;
            case 'non-arabic': shouldRemove = !arabic; break;
            case 'no-mutual': shouldRemove = !mutual; break;
            case 'all': shouldRemove = true; break;
        }
        
        if (!shouldRemove) {
            stats.skipped++;
            sendStats(name, '⏭️ ignoré');
            console.log(' ⏭️ Ignoré');
            continue;
        }
        
        console.log(' 🎯 Correspond!');
        sendStats(name, '🔄 suppression...');
        
        const threeDotsButton = await findThreeDotsButton(card);
        if (!threeDotsButton) {
            console.log(' ❌ Bouton introuvable');
            continue;
        }
        
        console.log(' ✅ Ouverture menu...');
        threeDotsButton.click();
        await wait(1000);
        
        const menuItems = document.querySelectorAll('div[role="menuitem"], span');
        let unfriendOption = null;
        
        for (let item of menuItems) {
            const text = item.textContent.toLowerCase();
            if ((text.includes('retirer') && text.includes('ami')) ||
                text.includes('unfriend') ||
                (text.includes('remove') && text.includes('friend'))) {
                unfriendOption = item;
                break;
            }
        }
        
        if (!unfriendOption) {
            console.log(' ❌ Option introuvable');
            document.body.click();
            await wait(300);
            continue;
        }
        
        console.log(' ✅ Clic retirer...');
        unfriendOption.click();
        await wait(1000);
        
        const confirmButtons = document.querySelectorAll('div[role="button"], button');
        let confirmed = false;
        
        for (let btn of confirmButtons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('confirmer') || text.includes('confirm') ||
                text.includes('retirer') || text.includes('remove')) {
                console.log(' ✅ Confirmation...');
                btn.click();
                stats.removed++;
                confirmed = true;
                console.log(` ✅✅✅ SUPPRIMÉ! (${stats.removed})`);
                sendStats(name, '✅ supprimé');
                processedAny = true;
                break;
            }
        }
        
        if (confirmed) {
            await wait(CONFIG.delay);
            setTimeout(processCards, 500);
            return;
        }
    }
    
    if (!processedAny) {
        console.log('\n✅ TERMINÉ');
        sendFinished();
        window.FB_REMOVER_RUNNING = false;
        alert(`✅ Terminé!\n\nSupprimés: ${stats.removed}\nIgnorés: ${stats.skipped}`);
        return;
    }
    
    processCards();
}

// 🚀 DÉMARRAGE
console.log('🚀 Démarrage dans 2s...\n');
chrome.storage.local.set({ isRunning: true, currentStats: { removed: 0, skipped: 0 } });

setTimeout(async () => {
    const loaded = await preloadAllFriends();
    if (loaded !== false) {
        console.log('\n🎯 PHASE 2: SUPPRESSIONS');
        console.log('='.repeat(50) + '\n');
        await wait(1000);
        processCards();
    }
}, 2000);

})();
