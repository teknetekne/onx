// js/main.js

document.addEventListener('DOMContentLoaded', async () => {
    const header = document.querySelector('.site-header');
    const menuButton = document.querySelector('.menu-toggle');

    const pageSections = document.querySelector('#page-sections');
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
                    .querySelectorAll('main > section')
                    .forEach(section => sections.append(document.importNode(section, true)));
            });
            pageSections.replaceWith(sections);
            document.getElementById(location.hash.slice(1))?.scrollIntoView();
        } catch (error) {
            pageSections.innerHTML = `<p class="section-load-error">${document.documentElement.lang === 'en' ? 'Content could not be loaded. Please refresh the page.' : 'İçerik yüklenemedi. Lütfen sayfayı yenileyin.'}</p>`;
            console.error(error);
        }
    }

    if (menuButton && header) {
        menuButton.addEventListener('click', () => {
            const isOpen = header.classList.toggle('menu-open');
            menuButton.setAttribute('aria-expanded', String(isOpen));
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        const navLinks = header.querySelectorAll('.main-nav a, .btn-contact-mobile');
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
                asamalar: 'phases', phases: 'asamalar',
                stratejik: 'strategic', strategic: 'stratejik',
                iletisim: 'contact', contact: 'iletisim'
            };
            dropdown.querySelectorAll('.lang-dropdown-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    const viewportCenter = window.innerHeight / 2;
                    const section = [...document.querySelectorAll('.site-wrapper [id]')].reverse()
                        .find(section => {
                            const bounds = section.getBoundingClientRect();
                            return bounds.top <= viewportCenter && bounds.bottom > viewportCenter;
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


    const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
    const sections = navLinks
        .map(link => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    const observer = new IntersectionObserver(entries => {
        const current = entries.find(entry => entry.isIntersecting);
        if (!current) return;
        navLinks.forEach(link => {
            const isActive = link.hash === `#${current.target.id}`;
            link.classList.toggle('active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }, { rootMargin: '-20% 0px -70%' });

    sections.forEach(section => observer.observe(section));

    // Scroll state for logo animation
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            document.body.classList.add('scrolled');
        } else {
            document.body.classList.remove('scrolled');
        }
    }, { passive: true });

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
