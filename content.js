(function() {
    if (window.FB_CLEANER_LOADED) return;
    window.FB_CLEANER_LOADED = true;

    let state = {
        isRunning: false,
        stats: { removed: 0, skipped: 0 },
        config: { filter: 'all', max: 0, delay: 1000 },
        scrollContainer: null
    };

    function log(msg) { console.log(`[FB Cleaner] ${msg}`); }
    function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    // Envoi des stats au popup
    function sendUpdate(action = '') {
        try {
            chrome.runtime.sendMessage({
                type: 'UPDATE',
                data: {
                    stats: state.stats,
                    isRunning: state.isRunning,
                    action: action
                }
            });
        } catch (e) { }
    }

    // --- 1. TROUVER LA BONNE BARRE DE SCROLL (C'est la clé !) ---
    function findScrollableContainer() {
        // On cherche une carte d'ami
        const card = document.querySelector('div[data-visualcompletion="ignore-dynamic"]');
        if (!card) return window; // Fallback

        // On remonte les parents pour trouver celui qui a une scrollbar
        let parent = card.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            // Vérifie si l'élément est scrollable verticalement
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                log("Conteneur de scroll trouvé !");
                return parent;
            }
            parent = parent.parentElement;
            if (parent === document.body) break;
        }
        return window; // Si on ne trouve rien, on scroll la fenêtre
    }

    // --- 2. CHARGEMENT COMPLET ---
    async function loadAllFriends() {
        sendUpdate('🔍 Recherche du conteneur...');
        state.scrollContainer = findScrollableContainer();
        
        let previousCount = 0;
        let retries = 0;
        const maxRetries = 10; // On insiste lourdement

        sendUpdate('📥 Chargement de TOUTE la liste...');

        while (state.isRunning) {
            const currentCards = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]');
            const currentCount = currentCards.length;
            
            sendUpdate(`Chargé: ${currentCount} amis... (Ne touchez à rien)`);

            // Scroll vers le bas du conteneur spécifique
            if (state.scrollContainer === window) {
                window.scrollTo(0, document.body.scrollHeight);
            } else {
                state.scrollContainer.scrollTop = state.scrollContainer.scrollHeight;
            }

            await wait(1500); // Attente chargement Facebook

            // Si le nombre a augmenté, c'est bon, on continue
            if (currentCount > previousCount) {
                previousCount = currentCount;
                retries = 0; // Reset des essais
                log(`Progression: ${currentCount} amis`);
            } else {
                // Rien de nouveau ? On insiste un peu
                retries++;
                // Petit "shake" pour débloquer le scroll
                if (state.scrollContainer !== window) {
                    state.scrollContainer.scrollTop = state.scrollContainer.scrollHeight - 200;
                    await wait(300);
                    state.scrollContainer.scrollTop = state.scrollContainer.scrollHeight;
                }
                
                if (retries >= maxRetries) {
                    log("Fin de la liste atteinte.");
                    break; 
                }
            }
        }
        
        // Remonter tout en haut avant de commencer
        sendUpdate('✅ Liste chargée. Retour en haut...');
        if (state.scrollContainer === window) window.scrollTo(0, 0);
        else state.scrollContainer.scrollTop = 0;
        
        await wait(2000);
    }

    // --- 3. SUPPRESSION ---
    async function processRemoval() {
        if (!state.isRunning) return;

        const allCards = Array.from(document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]'));
        log(`Début du traitement sur ${allCards.length} cartes`);

        for (const card of allCards) {
            if (!state.isRunning) break;
            if (state.config.max > 0 && state.stats.removed >= state.config.max) {
                finish('Limite atteinte.');
                return;
            }

            // Ignorer ceux déjà traités visuellement
            if (card.style.opacity === "0.1") continue;

            const text = card.innerText;
            const lines = text.split('\n').filter(l => l.length > 1);
            if (lines.length === 0) continue;
            
            const name = lines[0];
            const isAr = /[\u0600-\u06FF]/.test(name);
            const hasMutual = text.toLowerCase().includes('commun') || text.toLowerCase().includes('mutual');

            let shouldRemove = false;
            switch (state.config.filter) {
                case 'arabic': shouldRemove = isAr; break;
                case 'non-arabic': shouldRemove = !isAr; break;
                case 'no-mutual': shouldRemove = !hasMutual; break;
                case 'all': shouldRemove = true; break;
            }

            // Scroll l'élément dans la vue pour être sûr que le bouton est cliquable
            card.scrollIntoView({ block: 'center', behavior: 'auto' });
            
            if (!shouldRemove) {
                state.stats.skipped++;
                // On ne log que tous les 10 pour pas spammer
                if (state.stats.skipped % 10 === 0) sendUpdate(`Ignoré: ${name}`);
                continue;
            }

            // --- ACTION SUPPRESSION ---
            sendUpdate(`Suppression: ${name}`);
            
            // Chercher le bouton (...)
            let menuBtn = card.querySelector('div[aria-label="Actions"], div[aria-label="Plus"]');
            if (!menuBtn) {
                // Recherche large
                const buttons = card.querySelectorAll('div[role="button"]');
                for (let b of buttons) {
                    if (b.innerHTML.includes('<svg') || b.textContent.includes('...')) {
                        menuBtn = b;
                        break; // On prend le premier qui ressemble
                    }
                }
            }

            if (menuBtn) {
                try {
                    menuBtn.click();
                    await wait(1000); // Attendre menu

                    // Chercher "Retirer" dans tout le document (car menu flottant)
                    const menuItems = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"]'));
                    const removeBtn = menuItems.find(el => {
                        const t = el.innerText.toLowerCase();
                        return (t.includes('retirer') || t.includes('unfriend') || t.includes('supprimer')) && t.includes('ami');
                    });

                    if (removeBtn) {
                        removeBtn.click();
                        await wait(1000); // Attendre confirmation

                        const confirmBtns = Array.from(document.querySelectorAll('div[aria-label="Confirmer"], div[aria-label="Confirm"]'));
                        // Souvent le bouton de confirmation est le dernier bouton bleu chargé
                        const finalBtn = confirmBtns.find(b => b.innerText.length > 0) || document.querySelector('div[role="dialog"] div[role="button"][tabindex="0"]');

                        if (finalBtn) {
                            finalBtn.click();
                            state.stats.removed++;
                            card.style.opacity = "0.1"; // Masquer visuellement
                            card.style.pointerEvents = "none";
                            sendUpdate(`✅ Supprimé: ${name}`);
                            await wait(state.config.delay);
                        } else {
                            document.body.click(); // Annuler si pas trouvé
                        }
                    } else {
                        document.body.click(); // Fermer menu
                    }
                } catch (e) {
                    document.body.click();
                }
            }
            await wait(200); // Petite pause
        }
        
        finish('Terminé !');
    }

    function finish(msg) {
        state.isRunning = false;
        sendUpdate(msg);
        //setTimeout(() => alert(msg + `\nSupprimés: ${state.stats.removed}`), 500);
    }

    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (req.type === 'START') {
            console.clear();
            
            // RESET COMPLET DES ETATS
            state.stats = { removed: 0, skipped: 0 };
            state.isRunning = true;
            state.config = req.config;
            
            // Réinitialiser le DOM (au cas où on relance sans rafraichir)
            document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]').forEach(el => {
                el.style.opacity = "1";
                el.style.pointerEvents = "auto";
            });

            (async () => {
                await loadAllFriends();
                await processRemoval();
            })();
        } else if (req.type === 'STOP') {
            state.isRunning = false;
            sendUpdate('Arrêt demandé');
        }
    });
})();