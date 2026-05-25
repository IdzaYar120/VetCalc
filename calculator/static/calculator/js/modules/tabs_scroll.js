// ---------------- ІНТЕРАКТИВНЕ КЕРУВАННЯ ПРОКРУТКОЮ ВКЛАДОК ----------------
    const tabsContainer = document.getElementById('tabs-container');
    const tabsWrapper = document.getElementById('tabs-wrapper');
    const arrowLeft = document.getElementById('tabs-arrow-left');
    const arrowRight = document.getElementById('tabs-arrow-right');

    if (tabsContainer && tabsWrapper && arrowLeft && arrowRight) {
        // 1. Перетягування мишкою (Drag-to-Scroll) на десктопі
        let isDown = false;
        let startX;
        let scrollLeftVal;

        tabsContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            tabsContainer.classList.add('active-drag');
            startX = e.pageX - tabsContainer.offsetLeft;
            scrollLeftVal = tabsContainer.scrollLeft;
        });

        tabsContainer.addEventListener('mouseleave', () => {
            isDown = false;
            tabsContainer.classList.remove('active-drag');
        });

        tabsContainer.addEventListener('mouseup', () => {
            isDown = false;
            tabsContainer.classList.remove('active-drag');
        });

        tabsContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - tabsContainer.offsetLeft;
            const walk = (x - startX) * 1.5; // швидкість прокрутки
            tabsContainer.scrollLeft = scrollLeftVal - walk;
            updateTabScrollState();
        });

        // 2. Перетворення вертикальної прокрутки коліщатка миші на горизонтальну
        tabsContainer.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                tabsContainer.scrollLeft += e.deltaY * 0.8;
                updateTabScrollState();
            }
        }, { passive: false });

        // 3. Плавне клікання по стрілкам
        window.scrollTabs = function(direction) {
            const scrollAmt = 240;
            if (direction === 'left') {
                tabsContainer.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
            } else {
                tabsContainer.scrollBy({ left: scrollAmt, behavior: 'smooth' });
            }
            setTimeout(updateTabScrollState, 300);
        };

        // 4. Оновлення стану стрілок та градієнтних масок
        function updateTabScrollState() {
            const maxScroll = tabsContainer.scrollWidth - tabsContainer.clientWidth;
            const currentScroll = tabsContainer.scrollLeft;

            // Стрілка ліворуч
            if (currentScroll > 4) {
                arrowLeft.classList.add('visible');
                tabsWrapper.classList.add('can-scroll-left');
            } else {
                arrowLeft.classList.remove('visible');
                tabsWrapper.classList.remove('can-scroll-left');
            }

            // Стрілка праворуч
            if (currentScroll < maxScroll - 4) {
                arrowRight.classList.add('visible');
                tabsWrapper.classList.add('can-scroll-right');
            } else {
                arrowRight.classList.remove('visible');
                tabsWrapper.classList.remove('can-scroll-right');
            }
        }

        let isScrollTicking = false;
        tabsContainer.addEventListener('scroll', () => {
            if (!isScrollTicking) {
                window.requestAnimationFrame(() => {
                    updateTabScrollState();
                    isScrollTicking = false;
                });
                isScrollTicking = true;
            }
        });
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateTabScrollState, 150);
        });

        // Ініціалізація стану при завантаженні сторінки
        setTimeout(updateTabScrollState, 400);
    }