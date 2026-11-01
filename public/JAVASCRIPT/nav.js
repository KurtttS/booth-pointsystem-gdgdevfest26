
document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    // --- Session Persistence across iFrames ---
    const urlParams = new URLSearchParams(window.location.search);

    // If on LoginBooth with a message or logged_out flag, clear saved session tokens
    if (urlParams.has('message') || urlParams.has('logged_out') || window.location.pathname.includes('logout')) {
        try {
            sessionStorage.removeItem('devfest_sid');
            localStorage.removeItem('devfest_sid');
        } catch (e) {}
    }

    let sid = urlParams.get('sid');

    if (sid && !urlParams.has('message') && !urlParams.has('logged_out')) {
        try {
            sessionStorage.setItem('devfest_sid', sid);
            localStorage.setItem('devfest_sid', sid);
        } catch (e) {
            // Storage quota or restriction ignored
        }
    } else if (!urlParams.has('message') && !urlParams.has('logged_out')) {
        try {
            sid = sessionStorage.getItem('devfest_sid') || localStorage.getItem('devfest_sid');
        } catch (e) {
            sid = null;
        }
    } else {
        sid = null;
    }

    // Attach sid to internal links to prevent losing authentication inside cross-origin iframes
    if (sid) {
        document.querySelectorAll('a[href]').forEach(function (link) {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('http')) return;

            if (href.toLowerCase().includes('logout')) {
                link.addEventListener('click', function () {
                    try {
                        sessionStorage.removeItem('devfest_sid');
                        localStorage.removeItem('devfest_sid');
                    } catch (e) {}
                });
                return;
            }

            try {
                const url = new URL(href, window.location.origin);
                if (!url.searchParams.has('sid')) {
                    url.searchParams.set('sid', sid);
                    link.setAttribute('href', url.pathname + url.search);
                }
            } catch (err) {
                // Ignore parse errors
            }
        });
    }

    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener("click", function () {
        const isOpen = navLinks.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );

        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            navLinks.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation");
            menuToggle.textContent = "☰";
        });
    });
});
