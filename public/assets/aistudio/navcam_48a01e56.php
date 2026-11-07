
<?php
$currentPage = basename($_SERVER['PHP_SELF']);

$boothActive = ($currentPage === 'LoginBooth.php');
$superAdminActive = ($currentPage === 'SuperAdmin.php');
$leaderboardActive = ($currentPage === 'Leaderboard.php');
?>

<header class="topbar">

    <a class="brand" href="LoginBooth.php"
       aria-label="DevFest Bacolod 2026 home">

        <img src="IMG/GDG_LOGO.png"
             alt="DevFest Logo"
             class="gdg-logo">

        <span class="brand-copy">
            <span class="brand-name">DevFest</span>
            <span class="brand-location">Bacolod 2026</span>
        </span>

    </a>
    </header>