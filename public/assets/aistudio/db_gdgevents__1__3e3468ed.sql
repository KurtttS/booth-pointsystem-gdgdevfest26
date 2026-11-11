-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 22, 2026 at 03:55 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_gdgevents`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password_hash`, `createdAt`) VALUES
(1, 'admin', '$2y$10$dummyHashForAdminAccount', '2026-10-22 21:55:15'),
(2, 'eventmanager', '$2y$10$dummyHashForEventManager', '2026-10-22 21:55:15'),
(3, 'superadmin', '$2y$10$dummyHashForSuperAdmin', '2026-10-22 21:55:15');

-- --------------------------------------------------------

--
-- Table structure for table `attendees`
--

CREATE TABLE `attendees` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `twitter` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `qr_code_token` varchar(255) DEFAULT NULL,
  `createdAt` datetime(3) DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendees`
--

INSERT INTO `attendees` (`id`, `first_name`, `last_name`, `email`, `twitter`, `company`, `role`, `qr_code_token`, `createdAt`) VALUES
(1, 'Juan', 'Dela Cruz', 'juan@example.com', '@juandelacruz', 'ABC Technologies', 'Developer', 'QR-JUAN-001', '2026-10-22 21:54:52.000'),
(2, 'Maria', 'Santos', 'maria@example.com', '@mariasantos', 'XYZ Solutions', 'Student', 'QR-MARIA-002', '2026-10-22 21:54:52.000'),
(3, 'Pedro', 'Reyes', 'pedro@example.com', '@pedroreyes', 'CodeWorks', 'Designer', 'QR-PEDRO-003', '2026-10-22 21:54:52.000'),
(4, 'Ana', 'Garcia', 'ana@example.com', '@anagarcia', 'Digital Labs', 'IT Student', 'QR-ANA-004', '2026-10-22 21:54:52.000'),
(5, 'Carlo', 'Mendoza', 'carlo@example.com', '@carlomendoza', 'NextGen Systems', 'Software Engineer', 'QR-CARLO-005', '2026-10-22 21:54:52.000');

-- --------------------------------------------------------

--
-- Table structure for table `booths`
--

CREATE TABLE `booths` (
  `id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `sponsorName` varchar(100) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booths`
--

INSERT INTO `booths` (`id`, `name`, `location`, `description`, `sponsorName`, `createdAt`) VALUES
('BOOTH001', 'Tech Innovation', 'Ground Floor', 'Showcase of innovative technology', 'Tech Solutions Inc.', '2026-10-22 21:54:52'),
('BOOTH002', 'Game Zone', 'Second Floor', 'Gaming demos and interactive activities', 'Pixel Studios', '2026-10-22 21:54:52'),
('BOOTH003', 'Career Hub', 'Ground Floor', 'Career opportunities and networking', 'Future Careers Corp.', '2026-10-22 21:54:52');

-- --------------------------------------------------------

--
-- Table structure for table `booth_users`
--

CREATE TABLE `booth_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `booth_id` varchar(64) NOT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booth_users`
--

INSERT INTO `booth_users` (`id`, `username`, `password_hash`, `booth_id`, `createdAt`) VALUES
(1, 'techbooth', '$2y$10$dummyHashForTechBooth', 'BOOTH001', '2026-10-22 21:54:52'),
(2, 'gamebooth', '$2y$10$dummyHashForGameBooth', 'BOOTH002', '2026-10-22 21:54:52'),
(3, 'careerbooth', '$2y$10$dummyHashForCareerBooth', 'BOOTH003', '2026-10-22 21:54:52');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `event_date` date DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `event_name`, `event_date`, `venue`, `createdAt`) VALUES
(1, 'GDG Tech Summit 2026', '2026-11-15', 'University Convention Hall', '2026-10-22 21:54:52'),
(2, 'Developer Workshop', '2026-11-20', 'Computer Laboratory', '2026-10-22 21:54:52'),
(3, 'Innovation Expo', '2026-12-05', 'University Activity Center', '2026-10-22 21:54:52');

-- --------------------------------------------------------

--
-- Table structure for table `event_attendees`
--

CREATE TABLE `event_attendees` (
  `id` int(11) NOT NULL,
  `attendee_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `order_number` varchar(100) DEFAULT NULL,
  `ticket_number` varchar(100) NOT NULL,
  `ticket_title` varchar(255) DEFAULT NULL,
  `ticket_venue` varchar(255) DEFAULT NULL,
  `checkin_status` tinyint(1) DEFAULT 0,
  `checked_in_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_attendees`
--

INSERT INTO `event_attendees` (`id`, `attendee_id`, `event_id`, `order_number`, `ticket_number`, `ticket_title`, `ticket_venue`, `checkin_status`, `checked_in_at`) VALUES
(1, 1, 1, 'ORD-2026-001', 'TKT-2026-001', 'General Admission', 'University Convention Hall', 1, '2026-10-22 21:54:52'),
(2, 2, 1, 'ORD-2026-002', 'TKT-2026-002', 'Student Pass', 'University Convention Hall', 0, NULL),
(3, 3, 1, 'ORD-2026-003', 'TKT-2026-003', 'VIP Pass', 'University Convention Hall', 1, '2026-10-22 21:54:52'),
(4, 4, 2, 'ORD-2026-004', 'TKT-2026-004', 'Workshop Pass', 'Computer Laboratory', 0, NULL),
(5, 5, 3, 'ORD-2026-005', 'TKT-2026-005', 'Expo Pass', 'University Activity Center', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `scan_logs`
--

CREATE TABLE `scan_logs` (
  `id` varchar(64) NOT NULL,
  `attendeeId` int(11) NOT NULL,
  `boothId` varchar(64) NOT NULL,
  `eventId` int(11) NOT NULL,
  `timestamp` datetime(3) DEFAULT current_timestamp(3),
  `points` int(11) DEFAULT 100,
  `category` enum('1-10','11-50','51-90','91+') DEFAULT '1-10'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `attendees`
--
ALTER TABLE `attendees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `booths`
--
ALTER TABLE `booths`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `booth_users`
--
ALTER TABLE `booth_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `unique_booth_id` (`booth_id`),
  ADD KEY `booth_id` (`booth_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `event_attendees`
--
ALTER TABLE `event_attendees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_number` (`ticket_number`),
  ADD UNIQUE KEY `attendee_event` (`attendee_id`,`event_id`),
  ADD KEY `event_id` (`event_id`);

--
-- Indexes for table `scan_logs`
--
ALTER TABLE `scan_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UNIQUE_ATTENDEE_BOOTH_EVENT` (`attendeeId`,`boothId`,`eventId`),
  ADD KEY `boothId` (`boothId`),
  ADD KEY `eventId` (`eventId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `attendees`
--
ALTER TABLE `attendees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `booth_users`
--
ALTER TABLE `booth_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `event_attendees`
--
ALTER TABLE `event_attendees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booth_users`
--
ALTER TABLE `booth_users`
  ADD CONSTRAINT `fk_booth_users_booth` FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `event_attendees`
--
ALTER TABLE `event_attendees`
  ADD CONSTRAINT `fk_event_attendees_attendee` FOREIGN KEY (`attendee_id`) REFERENCES `attendees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_event_attendees_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scan_logs`
--
ALTER TABLE `scan_logs`
  ADD CONSTRAINT `fk_scan_logs_attendee` FOREIGN KEY (`attendeeId`) REFERENCES `attendees` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_scan_logs_booth` FOREIGN KEY (`boothId`) REFERENCES `booths` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_scan_logs_event` FOREIGN KEY (`eventId`) REFERENCES `events` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
