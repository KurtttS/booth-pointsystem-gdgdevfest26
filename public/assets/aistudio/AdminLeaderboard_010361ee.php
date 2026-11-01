
<?php
// Leaderboard.php — DevFest Bacolod 2026 leaderboard.
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>DevFest Bacolod 2026</title>

    <!-- Browser tab icon -->
    <link rel="icon" type="image/png" href="IMG/GDGTOP.png">

    <!-- Page stylesheet -->
    <link rel="stylesheet" href="CSS/AdminLeaderboard.css">
    <link rel="stylesheet" href="CSS/nav.css">
</head>

<div class="page-shell">

    <!-- Shared navbar -->
<!-- Header (same as Dashboard) -->
 <?php include 'DashboardNav.php'; ?>

    <!-- LEADERBOARD CONTENT -->
    <main class="leaderboard">

        <div class="ambient ambient-top"></div>
        <div class="ambient ambient-bottom"></div>

        <!-- TITLE -->
        <section class="page-heading">
            <h1>LEADERBOARD</h1>

            <div class="subtitle">
                <span></span>
                <p>TOP ATTENDEES PERFORMERS</p>
                <span></span>
            </div>
        </section>

        <!-- TOP THREE -->
        <section class="podium">

            <!-- SECOND PLACE -->
            <article class="podium-card second-place">

                <div class="avatar">
                    <span class="avatar-head"></span>
                    <span class="avatar-body"></span>
                </div>

                <div class="podium-info">
                    <h2>ID 003</h2>
                    <p class="rank-label">TOP 2</p>
                    <span class="points">90 PTS</span>
                </div>

            </article>

            <!-- FIRST PLACE -->
            <article class="podium-card first-place">

                <div class="crown">👑</div>

                <div class="avatar avatar-first">
                    <span class="avatar-head"></span>
                    <span class="avatar-body"></span>
                </div>

                <div class="podium-info">
                    <h2>ID 002</h2>
                    <p class="rank-label">TOP 1</p>
                    <span class="points">120 PTS</span>
                </div>

            </article>

            <!-- THIRD PLACE -->
            <article class="podium-card third-place">

                <div class="avatar">
                    <span class="avatar-head"></span>
                    <span class="avatar-body"></span>
                </div>

                <div class="podium-info">
                    <h2>ID 009</h2>
                    <p class="rank-label">TOP 3</p>
                    <span class="points">75 PTS</span>
                </div>

            </article>

        </section>

     <!-- RANKINGS LIST (TOP 4 - 7) -->
        <section class="rank-list">

            <article class="rank-row">
                <span class="rank-number">4</span>
                <strong>ID 025</strong>
                <span class="row-points">55 PTS</span>
            </article>

            <article class="rank-row">
                <span class="rank-number">5</span>
                <strong>ID 011</strong>
                <span class="row-points">45 PTS</span>
            </article>

            <article class="rank-row">
                <span class="rank-number">6</span>
                <strong>ID 067</strong>
                <span class="row-points">35 PTS</span>
            </article>

            <article class="rank-row">
                <span class="rank-number">7</span>
                <strong>ID 001</strong>
                <span class="row-points">15 PTS</span>
            </article>

            <!-- CONTINUATION (RANKS 8 - 12) HIDDEN BY DEFAULT -->
            <div class="more-rankings" id="moreRankings">

                <article class="rank-row">
                    <span class="rank-number">8</span>
                    <strong>ID 014</strong>
                    <span class="row-points">12 PTS</span>
                </article>

                <article class="rank-row">
                    <span class="rank-number">9</span>
                    <strong>ID 033</strong>
                    <span class="row-points">10 PTS</span>
                </article>

                <article class="rank-row">
                    <span class="rank-number">10</span>
                    <strong>ID 042</strong>
                    <span class="row-points">8 PTS</span>
                </article>

                <article class="rank-row">
                    <span class="rank-number">11</span>
                    <strong>ID 019</strong>
                    <span class="row-points">5 PTS</span>
                </article>

                <article class="rank-row">
                    <span class="rank-number">12</span>
                    <strong>ID 055</strong>
                    <span class="row-points">3 PTS</span>
                </article>

            </div>

        </section>

        <!-- VIEW MORE / SHOW LESS BUTTON -->
        <button
            class="full-standings-btn"
            id="fullStandingsBtn"
            type="button"
            aria-expanded="false"
            aria-controls="moreRankings"
        >
            View More Rankings <span>↓</span>
        </button>

        <!-- FOOTER -->
        <footer>
            © 2026 GDG BACOLOD - AI Innovations Team. All Rights Reserved
        </footer>

    </main>

  
</div>

<script src="JAVASCRIPT/Leaderboard.js" defer></script>
</body>
</html>
