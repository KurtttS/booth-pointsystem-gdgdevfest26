
document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    // --- Session Persistence across iFrames ---
    const urlParams = new URLSearchParams(window.location.search);

    // Only clear saved session tokens on explicit logout
    const isLogout = urlParams.get('logged_out') === '1' || urlParams.get('logged_out') === 'true' ||
                     urlParams.get('logout') === '1' || urlParams.get('logout') === 'true' ||
                     window.location.pathname.toLowerCase().includes('logout');

    if (isLogout) {
        try {
            sessionStorage.removeItem('devfest_sid');
            localStorage.removeItem('devfest_sid');
            document.cookie = 'devfest_sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        } catch (e) {}
    }

    let sid = urlParams.get('sid');

    if (sid && !isLogout) {
        try {
            sessionStorage.setItem('devfest_sid', sid);
            localStorage.setItem('devfest_sid', sid);
            document.cookie = 'devfest_sid=' + encodeURIComponent(sid) + '; path=/; SameSite=Lax';
        } catch (e) {
            // Storage quota or restriction ignored
        }
    } else if (!isLogout) {
        try {
            sid = sessionStorage.getItem('devfest_sid') || localStorage.getItem('devfest_sid');
            if (sid) {
                document.cookie = 'devfest_sid=' + encodeURIComponent(sid) + '; path=/; SameSite=Lax';
            }
        } catch (e) {
            sid = null;
        }
    } else {
        sid = null;
    }

    // Immediately hide file types (.php), query parameters with response/JSON payloads, messages, and raw sid from the address bar
    try {
        if (window.history && window.history.replaceState) {
            const curUrl = new URL(window.location.href);
            let urlChanged = false;

            // 1. Hide .php file extension from pathname if present
            const cleanPathMap = {
                '/superadmin.php': '/superadmin',
                '/dashboard.php': '/dashboard',
                '/loginbooth.php': '/login',
                '/eventchoices.php': '/choices',
                '/scanner.php': '/scanner',
                '/leaderboard.php': '/leaderboard',
                '/adminleaderboard.php': '/adminleaderboard',
                '/stationprofile.php': '/stationprofile',
                '/logout.php': '/logout',
                '/logoutbooth.php': '/logout'
            };
            const pathLower = curUrl.pathname.toLowerCase();
            if (cleanPathMap[pathLower]) {
                curUrl.pathname = cleanPathMap[pathLower];
                urlChanged = true;
            } else if (curUrl.pathname.endsWith('.php')) {
                curUrl.pathname = curUrl.pathname.slice(0, -4);
                urlChanged = true;
            }

            // 2. Hide JSON responses, status, message, error, and session IDs from the URL search params
            const sensitiveParams = ['message', 'msg', 'error', 'status', 'json', 'response', 'sid', 'logged_out', 'logout'];
            sensitiveParams.forEach(function (param) {
                if (curUrl.searchParams.has(param)) {
                    curUrl.searchParams.delete(param);
                    urlChanged = true;
                }
            });

            // Also remove any parameter containing serialized JSON objects/arrays
            for (const [key, value] of Array.from(curUrl.searchParams.entries())) {
                if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('%7B') || value.startsWith('[') || value.includes('{"') || value.includes('%22'))) {
                    curUrl.searchParams.delete(key);
                    urlChanged = true;
                }
            }

            if (urlChanged) {
                const newCleanUrl = curUrl.pathname + (curUrl.search ? curUrl.search : '') + (curUrl.hash ? curUrl.hash : '');
                window.history.replaceState({}, document.title, newCleanUrl);
            }
        }
    } catch (cleanErr) {
        // Fallback safe
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
