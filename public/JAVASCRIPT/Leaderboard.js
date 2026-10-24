// Expand or collapse ranks 8+ with smooth slide animation
const fullStandingsBtn = document.getElementById("fullStandingsBtn");
const moreRankings = document.getElementById("moreRankings");

if (fullStandingsBtn && moreRankings) {
    // Remove the HTML 'hidden' attribute so CSS transitions can animate the height
    moreRankings.removeAttribute("hidden");

    fullStandingsBtn.addEventListener("click", function () {
        const isOpen = moreRankings.classList.toggle("open");

        if (isOpen) {
            fullStandingsBtn.innerHTML = 'Show Less <span>↑</span>';
            fullStandingsBtn.setAttribute('aria-expanded', 'true');
            // Smoothly glide into view
            setTimeout(() => {
                moreRankings.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 120);
        } else {
            fullStandingsBtn.innerHTML = 'View More Rankings <span>↓</span>';
            fullStandingsBtn.setAttribute('aria-expanded', 'false');
            // Smoothly glide back to the button as it collapses
            fullStandingsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

// Live polling to refresh scores automatically when booths scan attendees
(function initLiveLeaderboardSync() {
    const banner = document.getElementById('lockedEventBanner');
    const eventId = banner ? banner.getAttribute('data-event-id') : null;
    if (!eventId) return;

    let lastSnapshot = null;

    async function checkScores() {
        try {
            const res = await fetch(`/api/leaderboard?event_id=${encodeURIComponent(eventId)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.success || !Array.isArray(data.standings)) return;

            const currentSnapshot = JSON.stringify(data.standings.map(s => ({ id: s.id, pts: s.points })));
            if (lastSnapshot !== null && lastSnapshot !== currentSnapshot) {
                // Points changed; reload to display live updated podium & standings
                window.location.reload();
            } else {
                lastSnapshot = currentSnapshot;
            }
        } catch (_) {
            // Transient network ignore
        }
    }

    // Initialize snapshot then check every 10 seconds
    checkScores();
    setInterval(checkScores, 10000);
})();