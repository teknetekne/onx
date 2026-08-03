// js/main.js

document.addEventListener('DOMContentLoaded', async () => {
    const header = document.querySelector('.site-header');
    const menuButton = document.querySelector('.menu-toggle');

    document.querySelectorAll('.hero').forEach(hero => {
        const content = hero.querySelector('.hero-content');
        if (!content) return;

        const setHeroContentHeight = () => {
            const contentHeight = content.getBoundingClientRect().height;
            hero.style.setProperty('--hero-content-height', `${contentHeight}px`);
        };

        setHeroContentHeight();
        document.fonts?.ready.then(setHeroContentHeight);

        if ('ResizeObserver' in window) {
            new ResizeObserver(setHeroContentHeight).observe(content);
        } else {
            window.addEventListener('resize', setHeroContentHeight, { passive: true });
        }
    });

    // Focus Tab Helper
    const applySavedFocusTab = () => {
        try {
            const savedTab = sessionStorage.getItem('onx_active_tab');
            if (!savedTab) return;

            const focusSections = document.querySelectorAll('#odak, #focus');
            focusSections.forEach(sectionContainer => {
                const navBtn = sectionContainer.querySelector(`.focus-tab-btn[data-tab="${savedTab}"]`);
                if (navBtn) {
                    sectionContainer.querySelectorAll('.focus-tab-btn').forEach(btn => {
                        const isActive = btn === navBtn;
                        btn.classList.toggle('active', isActive);
                        btn.setAttribute('aria-selected', String(isActive));
                    });
                    sectionContainer.querySelectorAll('.focus-tab-panel').forEach(panel => {
                        const isTarget = panel.dataset.focusPanel === savedTab;
                        panel.classList.toggle('active', isTarget);
                    });
                }
            });
        } catch (e) {}
    };

    const pageSections = document.querySelector('#page-sections');
    const hasInitialHash = Boolean(location.hash && location.hash.length > 1);

    if (pageSections && hasInitialHash) {
        document.body.style.opacity = '0';
    }

    if (pageSections) {
        try {
            const sections = document.createDocumentFragment();
            const prefix = document.documentElement.lang === 'en' ? 'en-' : '';
            const pages = await Promise.all(
                ['fund.html', 'network.html', 'innova.html', 'team.html']
                    .map(page => `${prefix}${page}`)
                    .map(page => fetch(page).then(response => {
                        if (!response.ok) throw new Error(`Could not load ${page}`);
                        return response.text();
                    }))
            );
            const parser = new DOMParser();
            pages.forEach(html => {
                parser.parseFromString(html, 'text/html')
                    .querySelectorAll('main > section:not(#iletisim):not(#contact)')
                    .forEach(section => sections.append(document.importNode(section, true)));
            });
            pageSections.replaceWith(sections);
            
            applySavedFocusTab();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            if (hasInitialHash) {
                const targetId = location.hash.slice(1);
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
                requestAnimationFrame(() => {
                    document.body.style.transition = 'opacity 0.2s ease-in-out';
                    document.body.style.opacity = '1';
                });
            }
        } catch (error) {
            pageSections.innerHTML = `<p class="section-load-error">${document.documentElement.lang === 'en' ? 'Content could not be loaded. Please refresh the page.' : 'İçerik yüklenemedi. Lütfen sayfayı yenileyin.'}</p>`;
            console.error(error);
            document.body.style.opacity = '1';
        }
    } else {
        applySavedFocusTab();
    }

    if (menuButton && header) {
        menuButton.addEventListener('click', () => {
            const isOpen = header.classList.toggle('menu-open');
            menuButton.setAttribute('aria-expanded', String(isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        const navLinks = header.querySelectorAll('.main-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                header.classList.remove('menu-open');
                menuButton.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // Language Dropdown Mobile Click Support
        const langDropdowns = document.querySelectorAll('.lang-dropdown');
        langDropdowns.forEach(dropdown => {
            const btn = dropdown.querySelector('.lang-dropdown-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('is-active');
                });
            }

            const translatedSectionIds = {
                yaklasim: 'approach', approach: 'yaklasim',
                odak: 'focus', focus: 'odak',
                iletisim: 'contact', contact: 'iletisim',
                top: 'top', fund: 'fund', network: 'network',
                innova: 'innova', komite: 'komite', ekip: 'ekip'
            };
            dropdown.querySelectorAll('.lang-dropdown-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    const validSectionIds = ['top', 'fund', 'yaklasim', 'approach', 'odak', 'focus', 'network', 'innova', 'komite', 'ekip', 'iletisim', 'contact'];
                    const focusPoint = window.innerHeight * 0.35;
                    const section = validSectionIds
                        .map(id => document.getElementById(id))
                        .filter(Boolean)
                        .reverse()
                        .find(sec => {
                            const bounds = sec.getBoundingClientRect();
                            return bounds.top <= focusPoint && bounds.bottom > 0;
                        });
                    if (!section?.id) return;

                    const sectionId = translatedSectionIds[section.id] ?? section.id;
                    link.hash = sectionId;
                });
            });
        });

        document.addEventListener('click', (e) => {
            langDropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('is-active');
                }
            });
        });
    }

    // ScrollSpy & Section Scroll Calculations
    function initScrollSpy() {
        const navLinks = [...document.querySelectorAll('.main-nav a')];
        const validSectionIds = ['top', 'fund', 'yaklasim', 'approach', 'odak', 'focus', 'network', 'innova', 'komite', 'ekip', 'iletisim', 'contact'];
        
        const getTargetSectionId = (link) => {
            const href = link.getAttribute('href') || '';
            if (href.includes('#')) {
                return href.split('#')[1];
            }
            const pageMap = {
                'index.html': 'top', 'en.html': 'top',
                'fund.html': 'fund', 'en-fund.html': 'fund',
                'network.html': 'network', 'en-network.html': 'network',
                'innova.html': 'innova', 'en-innova.html': 'innova',
                'team.html': 'komite', 'en-team.html': 'komite'
            };
            const filename = href.split('/').pop();
            return pageMap[filename] || null;
        };

        const getSections = () => validSectionIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        const getActiveSectionId = () => {
            const sections = getSections();
            if (!sections.length) return null;

            // Bottom of page check
            if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 30) {
                return sections[sections.length - 1].id;
            }

            const focusPoint = window.innerHeight * 0.35;
            let activeId = null;

            for (const section of sections) {
                const bounds = section.getBoundingClientRect();
                if (bounds.top <= focusPoint && bounds.bottom > 0) {
                    activeId = section.id;
                }
            }

            return activeId || sections[0].id;
        };

        const updateActiveNav = () => {
            const activeId = getActiveSectionId();
            if (!activeId) return;

            // Map sub-sections or aliases to main nav targets (e.g., ekip -> komite)
            const targetId = activeId === 'ekip' ? 'komite' : activeId;

            navLinks.forEach(link => {
                const linkTarget = getTargetSectionId(link);
                const isActive = linkTarget === targetId;
                link.classList.toggle('active', isActive);
                if (isActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });

            if (history.replaceState && location.hash !== `#${activeId}` && activeId !== 'top') {
                history.replaceState(null, '', `#${activeId}`);
            } else if (activeId === 'top' && location.hash) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        };

        let tick = false;
        window.addEventListener('scroll', () => {
            if (!tick) {
                requestAnimationFrame(() => {
                    updateActiveNav();
                    tick = false;
                });
                tick = true;
            }
        }, { passive: true });

        updateActiveNav();
    }

    initScrollSpy();

    // Scroll state for logo animation
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            document.body.classList.add('scrolled');
        } else {
            document.body.classList.remove('scrolled');
        }
    }, { passive: true });

    // Focus Areas Tabs Handler
    document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.focus-tab-btn');
        if (!tabBtn) return;

        const targetTab = tabBtn.dataset.tab;
        try {
            sessionStorage.setItem('onx_active_tab', targetTab);
        } catch(err) {}

        const navContainer = tabBtn.closest('.focus-tabs-nav');
        const sectionContainer = tabBtn.closest('#odak, #focus') || document;

        if (navContainer) {
            navContainer.querySelectorAll('.focus-tab-btn').forEach(btn => {
                const isActive = btn === tabBtn;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
            });
        }

        sectionContainer.querySelectorAll('.focus-tab-panel').forEach(panel => {
            const isTarget = panel.dataset.focusPanel === targetTab;
            panel.classList.toggle('active', isTarget);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
