<?php
/**
 * Dashboard.php (or SuperAdmin.php) — DevFest Bacolod 2026 Booth & Admin Dashboard
 * Displays active station banner, live scan statistics, reward rates, and booth leaderboard.
 */

// Error reporting enabled to prevent blank screens
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Session variables with sensible DevFest defaults
$admin_name = $_SESSION['admin_name'] ?? 'Admin';
$station_name = $_SESSION['booth_name'] ?? 'AI & Robotics Innovation';
$station_location = $_SESSION['booth_location'] ?? 'Hall A - Stand 001';
$total_unique_visitors = $_SESSION['unique_visitors'] ?? 1;
$current_reward_rate = $_SESSION['reward_rate'] ?? 100;
$points_distributed = $_SESSION['points_distributed'] ?? 100;
$total_scans = $_SESSION['total_scans'] ?? 10;
$scans_today = $_SESSION['scans_today'] ?? 5;
$points_awarded = $_SESSION['points_awarded'] ?? 100;

// Booth photo: uses the uploaded image when the booth page saves one, otherwise the default
$booth_image = $_SESSION['booth_image'] ?? 'IMG/booth-banner.jpg';

// Leaderboard sample data
$leaderboard = [
    ['id' => 'ID: 025', 'points' => 55, 'active' => true],
    ['id' => 'ID: 025', 'points' => 55, 'active' => false],
    ['id' => 'ID: 025', 'points' => 55, 'active' => false],
    ['id' => 'ID: 025', 'points' => 55, 'active' => false],
    ['id' => 'ID: 025', 'points' => 55, 'active' => false],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevFest Bacolod 2026 - Dashboard</title>

    <!-- Browser tab icon -->
    <link rel="icon" type="image/png" href="IMG/GDGTOP.png?v=2">

    <!-- Google Font: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Single stylesheet (the one source of truth for this page) -->
    <link rel="stylesheet" href="CSS/Dashboard.css">
    <link rel="stylesheet" href="CSS/nav.css">

</head>
<body>


<div class="dashboard-page">

    <!-- Top Navigation Bar (Header) -->
        <?php include 'DashboardNav.php'; ?>
            <!-- Exact DevFest 4-Color Chevrons Logo -->
            <!-- <svg width="46" height="40" viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7.5L8 18.5" stroke="#EA4335" stroke-width="6.5" stroke-linecap="round" />
                <path d="M8 21.5L19 32.5" stroke="#4285F4" stroke-width="6.5" stroke-linecap="round" />
                <path d="M29 7.5L40 18.5" stroke="#34A853" stroke-width="6.5" stroke-linecap="round" />
                <path d="M40 21.5L29 32.5" stroke="#FBBC05" stroke-width="6.5" stroke-linecap="round" />
            </svg>
            <div class="dash-brand-title">
                <span class="dash-brand-name">DevFest</span>
                <span class="dash-brand-sub">Bacolod 2026</span>
            </div>
        </a> -->

    

    <!-- Main Ambient Backdrop Blooms -->
    <div class="blur-orb blur-top-right"></div>
    <div class="blur-orb blur-mid-left"></div>
    <div class="blur-orb blur-mid-right"></div>
    <div class="blur-orb blur-bottom-left"></div>

    <!-- Main Dashboard Container -->
    <main class="dash-container">

        <!-- Welcome Banner Greetings -->
        <div class="dash-welcome-header">
            <h1 class="dash-welcome-title">Welcome, <?php echo htmlspecialchars($admin_name); ?>!</h1>
            <p class="dash-welcome-subtitle">Google Developer Groups</p>
        </div>

        <!-- Hero Station Banner -->
        <section class="hero-station-card">
            <!-- Tech Booth Photo -->
            <img
                src="<?php echo htmlspecialchars($booth_image); ?>"
                alt="<?php echo htmlspecialchars($station_name); ?> booth"
                class="hero-station-img"
                onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80';"
            >

            <div class="hero-station-overlay">
                <div class="station-badge">
                    <!-- Booth / storefront icon -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                        <path d="M2 7h20"/>
                        <path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
                    </svg>
                    <span>Active Station</span>
                </div>
                <h2 class="station-name"><?php echo htmlspecialchars($station_name); ?></h2>
                <p class="station-location"><?php echo htmlspecialchars($station_location); ?></p>
            </div>
        </section>

        <!-- Row of 3 Summary Metrics -->
        <section class="metric-cards-grid">

            <!-- Card 1: Total Unique Visitor -->
            <div class="metric-card">
                <div class="metric-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                </div>
                <h3 class="metric-title">Total Unique Visitor</h3>
                <span class="metric-subtitle">Cumulative unique scans</span>
                <span class="metric-value"><?php echo (int)$total_unique_visitors; ?></span>
                <span class="metric-unit">Attendees</span>
            </div>

            <!-- Card 2: Current Reward Rate -->
            <div class="metric-card">
                <div class="metric-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/>
                    </svg>
                </div>
                <h3 class="metric-title">Current Reward Rate</h3>
                <span class="metric-subtitle">First 1 - 10 (Early Bird)</span>
                <span class="metric-value">+<?php echo (int)$current_reward_rate; ?></span>
                <span class="metric-unit">Points</span>
            </div>

            <!-- Card 3: Points Distributed -->
            <div class="metric-card">
                <div class="metric-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5L2 9l10 12L22 9l-3-6zM4.3 8l1.7-3.4h3.6L7.9 8H4.3zm6.2 0l1.7-3.4h3.6l-1.7 3.4h-3.6zm4.9 0l1.7-3.4h3.6L19.7 8h-4.3z"/>
                    </svg>
                </div>
                <h3 class="metric-title">Points Distributed</h3>
                <span class="metric-subtitle">Across <?php echo (int)$total_unique_visitors; ?> verified scans</span>
                <span class="metric-value"><?php echo (int)$points_distributed; ?></span>
                <span class="metric-unit">Points</span>
            </div>

        </section>

        <!-- Main Lower Grid: Leaderboard (Left) + Stats (Right) -->
        <section class="dash-columns-grid">

<!-- Left: Leaderboard Card -->
<div class="leaderboard-card">
    <a href="AdminLeaderboard.php" class="card-link" aria-label="Open full leaderboard"></a>

    <div class="leaderboard-header">
        <h3 class="leaderboard-title">Leaderboard</h3>
        <p class="leaderboard-subtitle">Top-performing booths ranked by points and QR scans.</p>
    </div>

    <div class="leaderboard-list">
        <?php foreach ($leaderboard as $index => $item): ?>
            <?php $rank = $index + 1; ?>
            <div class="leaderboard-item <?php echo ($rank === 1) ? 'rank-gold' : ''; ?>">
                <div class="leader-left">
                    <span class="rank-circle"><?php echo $rank; ?></span>
                    <span class="booth-id-text"><?php echo htmlspecialchars($item['id']); ?></span>
                </div>
                <span class="pts-pill"><?php echo (int)$item['points']; ?> PTS</span>
            </div>
        <?php endforeach; ?>
    </div>
</div>

            <!-- Right: Total Scans & Points Awarded Cards -->
            <div class="dash-stacked-column">

                <!-- Stat Card 1: Total Scans -->
                <div class="stat-banner-card">
                    <div class="stat-card-header">
                        <span class="stat-card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M7 17c0-2.5 2.5-4 5-4s5 1.5 5 4"/>
                            </svg>
                        </span>
                        <h4 class="stat-card-title">Total Scans</h4>
                    </div>

                    <div class="stat-huge-row">
                        <span class="stat-huge-number"><?php echo (int)$total_scans; ?></span>
                        <span class="stat-badge-today">+<?php echo (int)$scans_today; ?> Scans Today</span>
                    </div>

                    <p class="stat-footnote">Total number of QR code scans recorded during the event.</p>
                </div>

                <!-- Stat Card 2: Points Awarded -->
                <div class="stat-banner-card">
                    <div class="stat-card-header">
                        <span class="stat-card-icon">
                            <!-- Shield badge with star -->
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 13.5l-3.23 1.7 0.62-3.6-2.62-2.55 3.61-0.52L12 7.2l1.62 3.28 3.61 0.52-2.62 2.55 0.62 3.6L12 15.5z"/>
                            </svg>
                        </span>
                        <h4 class="stat-card-title">Points Awarded</h4>
                    </div>

                    <div class="stat-huge-row">
                        <span class="stat-huge-number">+<?php echo (int)$points_awarded; ?></span>
                    </div>

                    <p class="stat-footnote">Total points earned from successful QR scans and booth activities.</p>
                </div>

            </div>

        </section>

        <!-- Footer -->
        <footer class="dash-footer">
            <p class="dash-footer-text">
                &copy; 2026 GDG BACOLOD - AI Innovations Team . All Rights Reserved
            </p>
        </footer>

    </main>
</div>
<script>
(function () {
  var counters = document.querySelectorAll('.metric-value, .stat-huge-number');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Skip the animation if the browser doesn't support it or the user prefers less motion
  if (!('IntersectionObserver' in window) || reduceMotion) return;

  function format(prefix, value, suffix) {
    return prefix + value.toLocaleString() + suffix;
  }

  function countUp(el) {
    var original = el.dataset.original;
    var match = original.match(/^(\D*)(\d[\d,]*)(\D*)$/);   // e.g. "+100" -> "+", "100", ""
    if (!match) return;

    var prefix = match[1];
    var target = parseInt(match[2].replace(/,/g, ''), 10);
    var suffix = match[3];
    var duration = 3000;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);            // fast start, soft landing
      el.textContent = format(prefix, Math.round(target * eased), suffix);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = original;                          // restore the exact original text
      }
    }
    requestAnimationFrame(step);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        countUp(entry.target);
        observer.unobserve(entry.target);                   // count only once
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(function (el) {
    var text = el.textContent.trim();
    var match = text.match(/^(\D*)(\d[\d,]*)(\D*)$/);
    if (!match) return;
    el.dataset.original = text;
    el.textContent = match[1] + '0' + match[3];             // start at 0 so there's no flash
    observer.observe(el);
  });
})();
</script>