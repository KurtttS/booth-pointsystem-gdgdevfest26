<?php
// Scanner.php — DevFest Bacolod 2026 Live Camera Scanner
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">

    <title>DevFest Bacolod 2026</title>

    <!-- Browser tab icon -->
    <link rel="icon" type="image/png" href="IMG/GDGTOP.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Page Stylesheets -->
    <link rel="stylesheet" href="CSS/Scanner.css">
    <link rel="stylesheet" href="CSS/nav.css">
</head>

<body>

<div class="page-shell">

    <!-- DevFest Topbar -->
     <?php include 'navcam.php'; ?>

    <main class="scanner-main">
        <div class="ambient ambient-top"></div>
        <div class="ambient ambient-bottom"></div>

        <div class="scanner-container">

            <!-- ============================================================
                 TOP ROW: EXPANDED 2-COLUMN GRID (CAMERA & FEED)
            ============================================================ -->
            <div class="scanner-top-grid">

                <!-- LEFT: LIVE CAMERA SCANNER -->
                <section class="scanner-card card-fade-up delay-1" aria-labelledby="scannerHeading">
                    <div class="card-header">
                        <div class="header-brand">
                            <div class="scanner-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M9 10h.01"></path>
                                </svg>
                            </div>
                            <div>
                                <h1 id="scannerHeading">Live Camera Scanner</h1>
                                <p class="subtitle">Scanner for the visitors</p>
                            </div>
                        </div>

                        <!-- Camera Selector Dropdown -->
                        <div class="camera-selector-wrap">
                            <label for="cameraSelect">Camera Selector</label>
                            <div class="select-wrapper">
                                <select id="cameraSelect" aria-label="Select camera">
                                    <option value="">HD webcam (Default)</option>
                                </select>
                                <span class="select-arrow">▼</span>
                            </div>
                        </div>
                    </div>

                    <!-- Video Viewport (Responsive & Fluid) -->
                    <div class="video-container" id="videoContainer">
                        <video id="scannerVideo" playsinline autoplay muted></video>
                        <canvas id="qrCanvas" hidden></canvas>

                        <!-- Camera Status Overlay -->
                        <div id="cameraStatusOverlay" class="camera-overlay" hidden>
                            <p id="cameraStatusText">Camera is starting...</p>
                            <button type="button" id="simScanBtn" class="sim-scan-btn sim-scan-btn-overlay">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                </svg>
                                <span>Simulate QR Scan</span>
                            </button>
                        </div>

                        <!-- Success Flash Banner -->
                        <div id="scanSuccessBanner" class="scan-banner" hidden>
                            <span id="scanSuccessText">✓ Attendee Scanned (+100 PTS)</span>
                        </div>

                        <!-- 4-COLOR DEVFEST RETICLE (Green=100, Yellow=85, Blue=65, Red=45) -->
                        <div class="qr-target-box" aria-hidden="true">
                            <div class="corner-top-row">
                                <div class="reticle-corner corner-red" title="45 PTS (Red)"></div>
                                <div class="reticle-corner corner-green" title="100 PTS (Green)"></div>
                            </div>

                            <div class="scanner-laser"></div>

                            <div class="corner-bottom-row">
                                <div class="reticle-corner corner-blue" title="65 PTS (Blue)"></div>
                                <div class="reticle-corner corner-yellow" title="85 PTS (Yellow)"></div>
                            </div>
                        </div>

                        <!-- Camera Toggle Button on Lower Side -->
                        <button type="button" id="toggleCameraBtn" class="camera-toggle-btn" aria-label="Toggle camera">
                            <svg id="camIconOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                                <circle cx="12" cy="13" r="3"></circle>
                            </svg>
                            <svg id="camIconOff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" hidden>
                                <line x1="2" x2="22" y1="2" y2="22"></line>
                                <path d="M10.41 10.41a2 2 0 1 0 2.83 2.83"></path>
                                <path d="M13.5 4h-3L8 7H4a2 2 0 0 0-2 2v9c0 .29.06.57.17.81"></path>
                                <path d="M6.5 19H20a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.5l-1-1.2"></path>
                            </svg>
                            <span id="camToggleText">Turn Off Camera</span>
                        </button>
                    </div>

                    <!-- Footer Controls -->
                    <div class="card-footer footer-between">
                        <button type="button" id="simScanBtnFooter" class="sim-scan-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                            <span>Simulate QR Scan</span>
                        </button>

                        <button type="button" id="manualEntryBtn" class="manual-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                                <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4"></path>
                            </svg>
                            <span>Manual Entry</span>
                        </button>
                    </div>
                </section>

                <!-- RIGHT: RECENT SCANS FEED (AUTOMATIC & COLOR-CODED POINTS) -->
                <section class="feed-card side-feed-card card-fade-up delay-2" aria-labelledby="feedHeading">
                    <div class="feed-header">
                        <div>
                            <h2 id="feedHeading">Recent Scans Feed</h2>
                            <p class="feed-subtitle">Live attendee visit records</p>
                        </div>
                        <div id="activeFilterTag" class="active-filter-tag" hidden>
                            <span id="activeFilterLabel">Filtered: 100 PTS</span>
                            <button type="button" id="clearFilterBtn" class="clear-filter-btn" title="Clear filter" aria-label="Clear active filter">✕</button>
                        </div>
                    </div>

                    <!-- Search and Connected Filter Controls -->
                    <div class="feed-controls">
                        <div class="search-wrap">
                            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.3-4.3"></path>
                            </svg>
                            <input
                                type="text"
                                id="scanSearchInput"
                                placeholder="Search e.g Attendees 001"
                                aria-label="Search attendees"
                            >
                        </div>

                        <!-- Modern SVG Filter Icon & Connected Color Tiers -->
                        <div class="filter-wrap">
                            <div class="select-wrapper">
                                <svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                </svg>
                                <select id="feedFilterSelect" aria-label="Filter recent scans by points tier">
                                    <option value="all">Filter: All Points</option>
                                    <option value="auto" id="autoFilterOption">Auto: Current Tier (100 PTS)</option>
                                    <option value="100">100 PTS · Early Bird (Green)</option>
                                    <option value="85">85 PTS · Prime Time (Yellow)</option>
                                    <option value="65">65 PTS · Rush Hour (Blue)</option>
                                    <option value="45">45 PTS · Standard (Red)</option>
                                </select>
                                <span class="select-arrow">▼</span>
                            </div>
                        </div>
                    </div>

                    <!-- Table Header Row -->
                    <div class="feed-table-header">
                        <span>Attendee &amp; Timestamp</span>
                        <span>Points Awarded</span>
                    </div>

                    <!-- Empty Results Message -->
                    <div id="emptyFeedMessage" class="empty-feed" hidden>
                        <p>No scans match your current filter.</p>
                        <button type="button" id="resetEmptyFilterBtn" class="reset-filter-link">Show all scans</button>
                    </div>

                    <!-- Scrollable Scanned List with Color-Coded Points Badges -->
                    <div class="scans-list" id="scansList">
                        <!-- Default Initial Scan: Kurt Satumbaga (100 PTS -> Green) -->
                        <article class="scan-item" data-id="Attendee001" data-name="Kurt Satumbaga" data-points="100">
                            <div class="attendee-info">
                                <div class="attendee-avatar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                                        <circle cx="12" cy="8" r="4"></circle>
                                        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
                                    </svg>
                                </div>
                                <div class="attendee-details">
                                    <strong class="attendee-name">Kurt Satumbaga</strong>
                                    <span class="attendee-sub">ID: Attendee001 · 10:24 AM</span>
                                </div>
                            </div>
                            <span class="points-badge points-badge-100">+100 PTS</span>
                        </article>
                    </div>
                </section>

            </div>

            <!-- ============================================================
                 BOTTOM ROW: POINT ALLOCATION MATRIX (AUTOMATIC & COLOR-CODED)
            ============================================================ -->
            <section class="matrix-card card-fade-up delay-3" aria-labelledby="matrixHeading">
                <div class="matrix-header-row">
                    <div class="matrix-header-left">
                        <div class="matrix-icon">✦</div>
                        <div>
                            <h2 id="matrixHeading">Point Allocation Matrix</h2>
                            <p class="matrix-sub">Points are earned based on individually scanned visits · Color coded to match the scanner</p>
                        </div>
                    </div>

                    <!-- Total Scans Counter -->
                    <div class="total-scans-badge">
                        <span class="total-label">Total Booth Scans</span>
                        <strong class="total-count" id="totalScansCounter">1</strong>
                    </div>
                </div>

                <!-- 4 Color-Coded Tier Cards -->
                <div class="matrix-grid">
                    <!-- Tier 1: 100 PTS (Green) -->
                    <div class="tier-card tier-100 tier-active" id="tierCard1" data-tier-points="100">
                        <span class="active-badge badge-green-active" id="activeBadge1">Active Tier</span>
                        <span class="filter-indicator-badge" id="filterBadge1" hidden>Filter Active</span>
                        <span class="tier-range">Visits 1-10</span>
                        <div class="tier-points">+ 100 <span>PTS</span></div>
                        <span class="tier-label">Early Bird</span>
                        <div class="tier-color-tag" style="color: #34a853;">
                            <span class="tier-color-dot" style="background: #34a853;"></span>
                            <span>Scanner Green</span>
                        </div>
                    </div>

                    <!-- Tier 2: 85 PTS (Yellow) -->
                    <div class="tier-card tier-85" id="tierCard2" data-tier-points="85">
                        <span class="active-badge badge-yellow-active" id="activeBadge2" hidden>Active Tier</span>
                        <span class="filter-indicator-badge" id="filterBadge2" hidden>Filter Active</span>
                        <span class="tier-range">Visits 11-50</span>
                        <div class="tier-points">+ 85 <span>PTS</span></div>
                        <span class="tier-label">Prime Time</span>
                        <div class="tier-color-tag" style="color: #b45309;">
                            <span class="tier-color-dot" style="background: #fbbc05;"></span>
                            <span>Scanner Yellow</span>
                        </div>
                    </div>

                    <!-- Tier 3: 65 PTS (Blue) -->
                    <div class="tier-card tier-65" id="tierCard3" data-tier-points="65">
                        <span class="active-badge badge-blue-active" id="activeBadge3" hidden>Active Tier</span>
                        <span class="filter-indicator-badge" id="filterBadge3" hidden>Filter Active</span>
                        <span class="tier-range">Visits 51-90</span>
                        <div class="tier-points">+ 65 <span>PTS</span></div>
                        <span class="tier-label">Rush Hour</span>
                        <div class="tier-color-tag" style="color: #1a73e8;">
                            <span class="tier-color-dot" style="background: #1a73e8;"></span>
                            <span>Scanner Blue</span>
                        </div>
                    </div>

                    <!-- Tier 4: 45 PTS (Red) -->
                    <div class="tier-card tier-45" id="tierCard4" data-tier-points="45">
                        <span class="active-badge badge-red-active" id="activeBadge4" hidden>Active Tier</span>
                        <span class="filter-indicator-badge" id="filterBadge4" hidden>Filter Active</span>
                        <span class="tier-range">Visits 91+</span>
                        <div class="tier-points">+ 45 <span>PTS</span></div>
                        <span class="tier-label">Standard Visit</span>
                        <div class="tier-color-tag" style="color: #ea4335;">
                            <span class="tier-color-dot" style="background: #ea4335;"></span>
                            <span>Scanner Red</span>
                        </div>
                    </div>
                </div>

                <!-- Animated Dynamic Progress Bar -->
                <div class="matrix-progress-wrap">
                    <div class="progress-left">
                        <span class="progress-dot"></span>
                        <span id="tierProgressLabel">Current Tier Progress (1/10 Visits)</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill" id="tierProgressBar" style="width: 10%;"></div>
                    </div>
                    <span class="progress-right" id="nextTierLabel">Next Tier: 11-50 Visits (85 PTS · Yellow)</span>
                </div>
            </section>

            <!-- FOOTER -->
            <footer>
                © 2026 GDG BACOLOD - AI Innovations Team · All Rights Reserved
            </footer>

        </div>
    </main>

</div>

<!-- MANUAL ENTRY MODAL -->
<div id="manualModal" class="modal-backdrop" hidden>
    <div class="modal-box card-fade-up" role="dialog" aria-modal="true" aria-labelledby="modalHeading">
        <div class="modal-header">
            <h3 id="modalHeading">Manual Attendee Entry</h3>
            <button type="button" id="closeModalBtn" class="close-btn" aria-label="Close dialog">✕</button>
        </div>

        <form id="manualScanForm">
            <div class="modal-field">
                <label for="manualAttendeeId">Attendee ID *</label>
                <input type="text" id="manualAttendeeId" placeholder="e.g. Attendee002" required autocomplete="off">
            </div>

            <div class="modal-field">
                <label for="manualAttendeeName">Attendee Name (Optional)</label>
                <input type="text" id="manualAttendeeName" placeholder="e.g. Maria Santos" autocomplete="off">
            </div>

            <div class="modal-field">
                <label for="manualAttendeePoints">Points Awarded</label>
                <input type="number" id="manualAttendeePoints" value="100" min="1" max="1000" required>
                <small class="field-hint">Auto-set to current active tier points (+100 PTS · Green)</small>
            </div>

            <div class="modal-actions">
                <button type="button" id="cancelModalBtn" class="btn-cancel">Cancel</button>
                <button type="submit" class="btn-submit">Award Points</button>
            </div>
        </form>
    </div>
</div>

<!-- Page Scripts -->
<script src="JAVASCRIPT/Scanner.js" defer></script>
</body>
</html>