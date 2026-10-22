
<?php
$currentPage = basename($_SERVER['PHP_SELF']);

$boothActive = ($currentPage === 'LoginBooth.php');
$superAdminActive = ($currentPage === 'SuperAdmin.php');
$leaderboardActive = ($currentPage === 'Leaderboard.php');
?>

<header class="topbar">

    <a class="brand" href="Dashboard.php"
       aria-label="DevFest Bacolod 2026 home">

        <img src="IMG/GDG_LOGO.png"
             alt="DevFest Logo"
             class="gdg-logo">

        <span class="brand-copy">
            <span class="brand-name">DevFest</span>
            <span class="brand-location">Bacolod 2026</span>
        </span>

         <div class="dash-nav-actions">
            <!-- Scanner Shortcut Button -->
            <a href="scanner.php" class="btn-scanner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Scanner</span>
            </a>

            <!-- Admin Profile Avatar (outlined two-person icon) -->
<!-- Admin Profile Avatar -->
<a href="StationProfile.php" class="profile-btn" aria-label="Station Profile">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
    </a>
        </div>
    </a>
    </header>