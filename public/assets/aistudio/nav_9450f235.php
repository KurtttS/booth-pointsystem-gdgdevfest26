
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

    <button
        class="menu-toggle"
        id="menuToggle"
        type="button"
        aria-label="Toggle navigation"
        aria-controls="navLinks"
        aria-expanded="false">
        ☰
    </button>

    <nav class="nav-links" id="navLinks" aria-label="Main navigation">

        <a href="LoginBooth.php"
           class="<?= $boothActive ? 'active' : '' ?>"
           <?= $boothActive ? 'aria-current="page"' : '' ?>>
            Booth Portal
        </a>

        <a href="SuperAdmin.php"
           class="<?= $superAdminActive ? 'active' : '' ?>"
           <?= $superAdminActive ? 'aria-current="page"' : '' ?>>
            SuperAdmin
        </a>

        <a href="Leaderboard.php"
           class="<?= $leaderboardActive ? 'active' : '' ?>"
           <?= $leaderboardActive ? 'aria-current="page"' : '' ?>>
            Leaderboard
        </a>

    </nav>

</header>
