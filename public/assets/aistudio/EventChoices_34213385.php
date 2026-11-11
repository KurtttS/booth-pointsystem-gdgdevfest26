<?php
/**
 * EventChoices.php — DevFest Bacolod 2026 Event & Track Selection
 * Directed here immediately upon pressing 'LOGIN BOOTH' on LoginBooth.php
 */

// Show all PHP errors instead of a blank white screen
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Handle form submission to scanner.php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $selected_track = isset($_POST['track']) ? trim($_POST['track']) : 'students';
    $_SESSION['selected_track'] = $selected_track;
    
    // Redirects to scanner.php
    header('Location: scanner.php?track=' . urlencode($selected_track));
    exit;
}

$current_track = $_SESSION['selected_track'] ?? 'students';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>DevFest Bacolod 2026 - Event Choices</title>

    <!-- Browser tab icon -->
    <link rel="icon" type="image/png" href="IMG/GDGTOP.png?v=2">

    <!-- Google Fonts for DevFest Typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- Page stylesheets -->
    <link rel="stylesheet" href="CSS/EventChoices.css">
    <link rel="stylesheet" href="CSS/nav.css">
</head>

<body>

<div class="devfest-page">
    
    <!-- Shared navbar with automatic fallback if nav.php is absent -->
    <?php 
    if (file_exists(__DIR__ . '/nav.php')) {
        include __DIR__ . '/nav.php';
    } else {
    ?>
    <header class="devfest-header">
        <nav class="devfest-nav">
            <a href="LoginBooth.php" class="btn-booth-portal">Booth Portal</a>
            <a href="SuperAdmin.php" class="nav-link">SuperAdmin</a>
            <a href="Leaderboard.php" class="nav-link">Leaderboard</a>
        </nav>
    </header>
    <?php } ?>

    <!-- Main Stage with Vibrant DevFest Gradient Mesh -->
    <main class="devfest-stage">
        
        <!-- Ambient DevFest Color Blooms -->
        <div class="blur-orb blur-top-right-1"></div>
        <div class="blur-orb blur-top-right-2"></div>
        <div class="blur-orb blur-bottom-left"></div>
        <div class="blur-orb blur-mid-left"></div>
        <div class="blur-orb blur-mid-right"></div>
        <div class="blur-orb blur-bottom-center"></div>

        <!-- Central Frosted Glass Container -->
        <div class="frosted-modal">
            
            <!-- Interior Decorative Blobs -->
            <div class="card-interior-blob-1"></div>
            <div class="card-interior-blob-2"></div>

            <!-- DevFest Header (Logo + Title) -->
            <div class="devfest-logo-row">
                <!-- Exact DevFest 4-Color Chevrons Logo -->
                <svg width="46" height="40" viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7.5L8 18.5" stroke="#EA4335" stroke-width="6.5" stroke-linecap="round" />
                    <path d="M8 21.5L19 32.5" stroke="#4285F4" stroke-width="6.5" stroke-linecap="round" />
                    <path d="M29 7.5L40 18.5" stroke="#34A853" stroke-width="6.5" stroke-linecap="round" />
                    <path d="M40 21.5L29 32.5" stroke="#FBBC05" stroke-width="6.5" stroke-linecap="round" />
                </svg>

                <div class="devfest-title-box">
                    <h1 class="devfest-main-title">DevFest</h1>
                    <span class="devfest-subtitle">Bacolod 2026</span>
                </div>
            </div>

            <!-- Track Selection Form -->
            <form method="POST" action="scanner.php" id="eventChoicesForm">
                
                <div class="track-selection-grid">
                    
                    <!-- Card 1: STUDENTS DEV DAY -->
                    <label class="track-card track-card-students <?php echo ($current_track === 'students') ? 'active' : ''; ?>" id="cardStudents">
                        <input type="radio" name="track" value="students" class="track-radio" <?php echo ($current_track === 'students') ? 'checked' : ''; ?>>
                        <div class="selection-check">✓</div>

                        <div class="track-icon-wrapper">
                            <svg width="112" height="112" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="44" cy="40" r="16" fill="#1b6837" />
                                <path d="M20 86C20 68 34 62 48 62C58 62 67 65 72 71C67 76 65 83 65 90H20V86Z" fill="#1b6837" />
                                <circle cx="78" cy="46" r="13" fill="#1b6837" />
                                <rect x="72" y="63" width="34" height="38" rx="12" fill="#1b6837" />
                                <rect x="79" y="73" width="18" height="4" rx="2" fill="#ffffff" />
                                <rect x="79" y="82" width="13" height="4" rx="2" fill="#ffffff" />
                                <path d="M66 84C66 75 72 68 80 66C76 64 71 63 67 63C57 63 51 68 49 74" stroke="#1b6837" stroke-width="3" stroke-linecap="round" />
                            </svg>
                        </div>

                        <div>
                            <div class="students-label">STUDENTS</div>
                            <div class="students-sublabel">DEV DAY</div>
                        </div>
                    </label>

                    <!-- Card 2: PROFESSIONALS NETWORK DAY -->
                    <label class="track-card track-card-professionals <?php echo ($current_track === 'professionals') ? 'active' : ''; ?>" id="cardProfessionals">
                        <input type="radio" name="track" value="professionals" class="track-radio" <?php echo ($current_track === 'professionals') ? 'checked' : ''; ?>>
                        <div class="selection-check">✓</div>

                        <div class="track-icon-wrapper">
                            <svg width="112" height="112" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="36" cy="46" r="10" fill="#d93829" />
                                <circle cx="56" cy="46" r="10" fill="#d93829" />
                                <circle cx="48" cy="65" r="11" fill="#d93829" />
                                <ellipse cx="32" cy="65" rx="11" ry="8" fill="#d93829" />
                                <ellipse cx="48" cy="80" rx="14" ry="7" fill="#d93829" />
                                <g transform="translate(68, 52)">
                                    <path d="M13 8C13 3.5 16.5 0 21 0C25.5 0 29 3.5 29 8" stroke="#d93829" stroke-width="3.5" stroke-linecap="round" />
                                    <rect x="0" y="6" width="42" height="30" rx="7" fill="#d93829" />
                                    <rect x="0" y="15" width="42" height="2.5" fill="#ffffff" />
                                    <rect x="18" y="13" width="6" height="7" rx="1.5" fill="#ffffff" />
                                </g>
                            </svg>
                        </div>

                        <div>
                            <div class="professionals-label">PROFESSIONALS</div>
                            <div class="professionals-sublabel">NETWORK DAY</div>
                        </div>
                    </label>

                </div>

                <!-- PROCEED Button -->
                <div class="proceed-btn-wrapper">
                    <button type="submit" class="btn-proceed">PROCEED</button>
                </div>

            </form>

        </div>

        <!-- Footer -->
        <footer class="devfest-footer">
            <p class="devfest-footer-text">
                &copy; 2026 GDG BACOLOD - AI Innovations Team . All Rights Reserved
            </p>
        </footer>

    </main>

</div>

<script>
// Interactive Card Selection
const cardStudents = document.getElementById('cardStudents');
const cardProfessionals = document.getElementById('cardProfessionals');

if (cardStudents && cardProfessionals) {
    cardStudents.addEventListener('click', function() {
        cardStudents.classList.add('active');
        cardProfessionals.classList.remove('active');
        const radio = cardStudents.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });

    cardProfessionals.addEventListener('click', function() {
        cardProfessionals.classList.add('active');
        cardStudents.classList.remove('active');
        const radio = cardProfessionals.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    });
}
</script>

</body>
</html>