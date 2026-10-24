// Expand or collapse ranks 8+ with smooth slide animation
const fullStandingsBtn = document.getElementById("fullStandingsBtn");
const moreRankings = document.getElementById("moreRankings");

if (fullStandingsBtn && moreRankings) {
    moreRankings.removeAttribute("hidden");

    fullStandingsBtn.addEventListener("click", function () {
        const isOpen = moreRankings.classList.toggle("open");

        if (isOpen) {
            fullStandingsBtn.innerHTML = 'Show Less <span>↑</span>';
            fullStandingsBtn.setAttribute('aria-expanded', 'true');
            setTimeout(() => {
                moreRankings.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 120);
        } else {
            const count = moreRankings.querySelectorAll('.rank-row').length;
            fullStandingsBtn.innerHTML = `View More Rankings (${count} more) <span>↓</span>`;
            fullStandingsBtn.setAttribute('aria-expanded', 'false');
            fullStandingsBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
}

// Helper to escape HTML safely
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Build rank row element
function createRankRowHtml(item) {
    const displayName = escapeHtml(item.name || item.id);
    const subToken = (item.name && item.id) ? `<span class="rank-sub-id">${escapeHtml(item.id)}</span>` : '';
    return `
        <article class="rank-row" data-rank-id="${escapeHtml(item.id)}">
            <span class="rank-number">${item.rank}</span>
            <div class="rank-user-info">
                <strong>${displayName}</strong>
                ${subToken}
            </div>
            <span class="row-points">${item.points} PTS</span>
        </article>
    `;
}

// Live real-time polling to update leaderboard in-place without page refresh
(function initLiveLeaderboardSync() {
    const banner = document.getElementById('lockedEventBanner');
    const eventId = banner ? banner.getAttribute('data-event-id') : null;
    if (!eventId) return;

    let previousDataKey = null;

    async function checkScoresLive() {
        try {
            const res = await fetch(`/api/leaderboard?event_id=${encodeURIComponent(eventId)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.success || !Array.isArray(data.standings)) return;

            const standings = data.standings;
            const currentDataKey = standings.map(s => `${s.id}:${s.points}:${s.rank}:${s.latestScanTimestamp || ''}`).join('|');

            // If nothing changed, do not touch DOM
            if (previousDataKey === currentDataKey) {
                return;
            }

            previousDataKey = currentDataKey;

            const podiumSection = document.getElementById('podiumSection');
            const noScansNotice = document.getElementById('noScansNotice');
            const rankListSection = document.getElementById('rankListSection');
            const ranks4to7List = document.getElementById('ranks4to7List');
            const moreRankingsContainer = document.getElementById('moreRankings');
            const standingsBtn = document.getElementById('fullStandingsBtn');

            if (standings.length === 0) {
                if (podiumSection) {
                    podiumSection.classList.add('is-hidden');
                    podiumSection.style.display = 'none';
                }
                if (rankListSection) {
                    rankListSection.classList.add('is-hidden');
                    rankListSection.style.display = 'none';
                }
                if (standingsBtn) {
                    standingsBtn.classList.add('is-hidden');
                    standingsBtn.style.display = 'none';
                }
                if (noScansNotice) {
                    noScansNotice.classList.remove('is-hidden');
                    noScansNotice.style.display = 'block';
                }
                return;
            }

            // Reveal podium and rankings if previously empty
            if (noScansNotice) {
                noScansNotice.classList.add('is-hidden');
                noScansNotice.style.display = 'none';
            }
            if (podiumSection) {
                podiumSection.classList.remove('is-hidden');
                podiumSection.style.display = 'grid';
            }

            const top1 = standings[0] || null;
            const top2 = standings[1] || null;
            const top3 = standings[2] || null;

            // 1. In-place update for Podium Top 1
            if (top1) {
                const nameEl = document.getElementById('top1Name');
                const subidEl = document.getElementById('top1Subid');
                const ptsEl = document.getElementById('top1Points');

                if (nameEl) nameEl.textContent = top1.name || top1.id;
                if (subidEl) subidEl.textContent = (top1.name && top1.id) ? top1.id : '';
                if (ptsEl) {
                    const newPtsText = `${top1.points} PTS`;
                    if (ptsEl.textContent !== newPtsText) {
                        ptsEl.textContent = newPtsText;
                        ptsEl.classList.remove('pts-pulse');
                        void ptsEl.offsetWidth; // Force reflow
                        ptsEl.classList.add('pts-pulse');
                    }
                }
            }

            // 2. In-place update for Podium Top 2
            if (top2) {
                const nameEl = document.getElementById('top2Name');
                const subidEl = document.getElementById('top2Subid');
                const ptsEl = document.getElementById('top2Points');

                if (nameEl) nameEl.textContent = top2.name || top2.id;
                if (subidEl) subidEl.textContent = (top2.name && top2.id) ? top2.id : '';
                if (ptsEl) {
                    const newPtsText = `${top2.points} PTS`;
                    if (ptsEl.textContent !== newPtsText) {
                        ptsEl.textContent = newPtsText;
                        ptsEl.classList.remove('pts-pulse');
                        void ptsEl.offsetWidth;
                        ptsEl.classList.add('pts-pulse');
                    }
                }
            }

            // 3. In-place update for Podium Top 3
            if (top3) {
                const nameEl = document.getElementById('top3Name');
                const subidEl = document.getElementById('top3Subid');
                const ptsEl = document.getElementById('top3Points');

                if (nameEl) nameEl.textContent = top3.name || top3.id;
                if (subidEl) subidEl.textContent = (top3.name && top3.id) ? top3.id : '';
                if (ptsEl) {
                    const newPtsText = `${top3.points} PTS`;
                    if (ptsEl.textContent !== newPtsText) {
                        ptsEl.textContent = newPtsText;
                        ptsEl.classList.remove('pts-pulse');
                        void ptsEl.offsetWidth;
                        ptsEl.classList.add('pts-pulse');
                    }
                }
            }

            // 4. In-place update for ranks 4 to 7
            const ranks4to7 = standings.slice(3, 7);
            if (ranks4to7.length > 0) {
                if (rankListSection) {
                    rankListSection.classList.remove('is-hidden');
                    rankListSection.style.display = 'flex';
                }
                if (ranks4to7List) {
                    ranks4to7List.innerHTML = ranks4to7.map(createRankRowHtml).join('');
                }
            } else {
                if (rankListSection) {
                    rankListSection.classList.add('is-hidden');
                    rankListSection.style.display = 'none';
                }
                if (ranks4to7List) ranks4to7List.innerHTML = '';
            }

            // 5. In-place update for ranks 8+
            const ranks8plus = standings.slice(7);
            if (moreRankingsContainer) {
                moreRankingsContainer.innerHTML = ranks8plus.map(createRankRowHtml).join('');
            }

            // 6. Update View More Button
            if (standingsBtn) {
                if (ranks8plus.length > 0) {
                    standingsBtn.classList.remove('is-hidden');
                    standingsBtn.style.display = 'flex';
                    if (!moreRankingsContainer.classList.contains('open')) {
                        standingsBtn.innerHTML = `View More Rankings (${ranks8plus.length} more) <span>↓</span>`;
                    }
                } else {
                    standingsBtn.classList.add('is-hidden');
                    standingsBtn.style.display = 'none';
                }
            }
        } catch (_) {
            // Transient network ignore
        }
    }

    // Live polling every 2.5 seconds for instant real-time updates
    setInterval(checkScoresLive, 2500);
})();