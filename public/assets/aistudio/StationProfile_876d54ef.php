<?php
/**
 * StationProfile.php — DevFest Bacolod 2026 Station Profile
 * Displays active scanner terminal parameters, booth details, and background upload.
 * Strictly PHP and HTML with zero embedded CSS (external stylesheet: CSS/StationProfile.css).
 */

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Handle Background Upload if posted
$upload_message = '';
$upload_status = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['dashboard_bg'])) {
    $file = $_FILES['dashboard_bg'];
    if ($file['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/IMG/';
        if (!is_dir($upload_dir)) {
            @mkdir($upload_dir, 0777, true);
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (in_array($ext, $allowed)) {
            $dest = $upload_dir . 'booth-banner.' . $ext;
            if (move_uploaded_file($file['tmp_name'], $dest)) {
                $_SESSION['booth_bg'] = 'IMG/booth-banner.' . $ext;
                $upload_message = 'Background image updated successfully!';
                $upload_status = 'success';
            } else {
                $upload_message = 'Failed to move uploaded file.';
                $upload_status = 'error';
            }
        } else {
            $upload_message = 'Please upload a valid image file (JPG, PNG, WEBP).';
            $upload_status = 'error';
        }
    }
}

// Dynamic parameters with defaults matching reference design
$booth_name      = $_SESSION['booth_name']      ?? 'AI & Robotics Innovation';
$category        = $_SESSION['booth_category']  ?? 'Robotics & AI';
$venue_location  = $_SESSION['booth_location']  ?? 'Hall A - Stand 101';
$active_context  = $_SESSION['active_context']  ?? 'Devfest Bacolod 2026';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevFest Bacolod 2026 - Station Profile</title>

    <!-- Browser tab icon -->
    <link rel="icon" type="image/png" href="IMG/GDGTOP.png?v=2">

    <!-- Google Font: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">

    <!-- External Stylesheet (Separated Cleanly) -->
    <link rel="stylesheet" href="CSS/StationProfile.css">
    <link rel="stylesheet" href="CSS/Dashboard.css">
    <link rel="stylesheet" href="CSS/nav.css">
</head>
<body>

<div class="station-page">

    <!-- Top Navigation Bar -->
    <?php include 'DashboardNav.php'; ?>

    <!-- Main Ambient Backdrop Blooms -->
    <div class="blur-orb blur-top-right"></div>
    <div class="blur-orb blur-mid-left"></div>
    <div class="blur-orb blur-mid-right"></div>
    <div class="blur-orb blur-bottom-left"></div>

    <!-- Main Stage -->
    <main class="station-stage">

        <!-- Notification Banner if file upload succeeded or failed -->
        <?php if (!empty($upload_message)): ?>
            <div class="toast-alert toast-<?php echo $upload_status; ?>">
                <?php echo htmlspecialchars($upload_message); ?>
            </div>
        <?php endif; ?>

        <!-- Station Profile Card -->
        <section class="station-card" aria-labelledby="stationTitle">

            <!-- Card Header: Building / Terminal Icon + Title & Subtitle -->
            <div class="station-header-row">
                <div class="station-icon-wrap" aria-hidden="true">
                    <!-- High-tech Station / Terminal Icon matching reference -->
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5h8V3H4zm14 8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2h-4zm2 2h2v4h-2v-4zM6 7h4v2H6V7zm0 4h4v2H6v-2zm0 4h4v2H6v-2z"/>
                    </svg>
                </div>
                <div class="station-title-group">
                    <h1 id="stationTitle" class="station-title">Station Profile</h1>
                    <p class="station-subtitle">Active Scanner and Terminal Parameters</p>
                </div>
            </div>

            <!-- Inner Light-Mint Parameter Grid Box -->
            <div class="station-params-box">

                <!-- Row 1: Booth Name -->
                <div class="param-row">
                    <span class="param-label">Booth Name</span>
                    <span class="param-value"><?php echo htmlspecialchars($booth_name); ?></span>
                </div>

                <!-- Row 2: Category -->
                <div class="param-row">
                    <span class="param-label">Category</span>
                    <span class="param-value"><?php echo htmlspecialchars($category); ?></span>
                </div>

                <!-- Row 3: Venue Location -->
                <div class="param-row">
                    <span class="param-label">Venue Location</span>
                    <span class="param-value"><?php echo htmlspecialchars($venue_location); ?></span>
                </div>

                <!-- Row 4: Dashboard Background Upload -->
                <div class="param-row">
                    <span class="param-label">Dashboard Background</span>
                    <div class="param-action">
                        <form id="bgUploadForm" action="" method="post" enctype="multipart/form-data">
                            <input 
                                type="file" 
                                id="dashboard_bg" 
                                name="dashboard_bg" 
                                accept="image/*" 
                                class="hidden-file-input"
                                onchange="document.getElementById('bgUploadForm').submit();"
                            >
                            <label for="dashboard_bg" class="btn-upload" role="button" tabindex="0">
                                Upload
                            </label>
                        </form>
                    </div>
                </div>

                <!-- Divider line -->
                <hr class="param-divider">

                <!-- Row 5: Active Context -->
                <div class="param-row">
                    <span class="param-label">Active Context</span>
                    <span class="param-value param-value-context"><?php echo htmlspecialchars($active_context); ?></span>
                </div>

            </div>

           <!-- Bottom Navigation Actions -->
<div class="station-action-row">
    <a href="Dashboard.php" class="btn-dashboard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Dashboard</span>
    </a>

    <a href="LogOutBooth.php" class="btn-logout">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Logout</span>
    </a>
</div>

        </section>

        <!-- Page Footer -->
        <footer class="station-footer">
            <p class="station-footer-text">
                &copy; 2026 GDG BACOLOD - AI Innovations Team . All Rights Reserved
            </p>
        </footer>

    </main>

</div>

</body>
</html>
