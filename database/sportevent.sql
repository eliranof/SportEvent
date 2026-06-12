-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: יוני 12, 2026 בזמן 03:45 AM
-- גרסת שרת: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sportevent`
--

-- --------------------------------------------------------

--
-- מבנה טבלה עבור טבלה `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- הוצאת מידע עבור טבלה `admins`
--

INSERT INTO `admins` (`id`, `username`, `password_hash`, `full_name`, `is_active`, `created_at`) VALUES
(1, 'admin', '$2y$10$KU5aMThhAzvRh5ARWbjZ1.FuGUYPhnguS5eaLamhmgY1xouIeDzCm', 'מנהל מערכת', 1, '2026-06-10 17:42:48');

-- --------------------------------------------------------

--
-- מבנה טבלה עבור טבלה `admin_2fa_codes`
--

CREATE TABLE `admin_2fa_codes` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- הוצאת מידע עבור טבלה `admin_2fa_codes`
--

INSERT INTO `admin_2fa_codes` (`id`, `admin_id`, `code`, `expires_at`, `is_used`, `created_at`) VALUES
(1, 1, '922665', '2026-06-10 20:53:05', 1, '2026-06-10 17:43:05');

-- --------------------------------------------------------

--
-- מבנה טבלה עבור טבלה `events_catalog`
--

CREATE TABLE `events_catalog` (
  `id` int(11) NOT NULL,
  `event_id` varchar(100) NOT NULL,
  `bucket_key` varchar(50) NOT NULL,
  `section_title` varchar(255) DEFAULT '',
  `title` varchar(255) DEFAULT '',
  `competition` varchar(255) DEFAULT '',
  `category` varchar(255) DEFAULT '',
  `location` varchar(255) DEFAULT '',
  `date_time` varchar(100) DEFAULT '',
  `price` varchar(100) DEFAULT '',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `payload_json` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- הוצאת מידע עבור טבלה `events_catalog`
--

INSERT INTO `events_catalog` (`id`, `event_id`, `bucket_key`, `section_title`, `title`, `competition`, `category`, `location`, `date_time`, `price`, `sort_order`, `is_active`, `payload_json`, `created_at`, `updated_at`) VALUES
(1, '1', 'near', 'ליגת העל בכדורגל', 'מכבי תל אביב נגד הפועל באר שבע', 'ליגת העל בכדורגל', 'כדורגל', 'אצטדיון בלומפילד, תל אביב', '05/06/2026 | 20:30', '60 ₪', 1, 1, '{\"id\":1,\"sectionTitle\":\"ליגת העל בכדורגל\",\"category\":\"כדורגל\",\"competition\":\"ליגת העל בכדורגל\",\"homeTeam\":\"מכבי תל אביב\",\"awayTeam\":\"הפועל באר שבע\",\"teams\":\"מכבי תל אביב נגד הפועל באר שבע\",\"homeLogoImage\":\"/logos/mta.png\",\"awayLogoImage\":\"/logos/hbs.png\",\"homeLogoText\":\"MTA\",\"awayLogoText\":\"HBS\",\"homeLogoBg\":\"#f6c343\",\"awayLogoBg\":\"#d64545\",\"homeLogoColor\":\"#1f1f1f\",\"awayLogoColor\":\"#ffffff\",\"location\":\"אצטדיון בלומפילד, תל אביב\",\"dateTime\":\"05/06/2026 | 20:30\",\"price\":\"60 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(2, '2', 'near', 'ליגת העל בכדורגל', 'מכבי חיפה נגד בית״ר ירושלים', 'ליגת העל בכדורגל', 'כדורגל', 'אצטדיון סמי עופר, חיפה', '08/06/2026 | 19:45', '75 ₪', 2, 1, '{\"id\":2,\"sectionTitle\":\"ליגת העל בכדורגל\",\"category\":\"כדורגל\",\"competition\":\"ליגת העל בכדורגל\",\"homeTeam\":\"מכבי חיפה\",\"awayTeam\":\"בית״ר ירושלים\",\"teams\":\"מכבי חיפה נגד בית״ר ירושלים\",\"homeLogoImage\":\"/logos/mhf.png\",\"awayLogoImage\":\"/logos/bjr.png\",\"homeLogoText\":\"MHF\",\"awayLogoText\":\"BJR\",\"homeLogoBg\":\"#1f9d55\",\"awayLogoBg\":\"#f4c542\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#1f1f1f\",\"location\":\"אצטדיון סמי עופר, חיפה\",\"dateTime\":\"08/06/2026 | 19:45\",\"price\":\"75 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(3, '3', 'near', 'ליגת העל בכדורגל', 'הפועל תל אביב נגד מכבי נתניה', 'ליגת העל בכדורגל', 'כדורגל', 'אצטדיון בלומפילד, תל אביב', '20/06/2026 | 21:00', '69 ₪', 3, 1, '{\"id\":3,\"sectionTitle\":\"ליגת העל בכדורגל\",\"category\":\"כדורגל\",\"competition\":\"ליגת העל בכדורגל\",\"homeTeam\":\"הפועל תל אביב\",\"awayTeam\":\"מכבי נתניה\",\"teams\":\"הפועל תל אביב נגד מכבי נתניה\",\"homeLogoImage\":\"/logos/hta.png\",\"awayLogoImage\":\"/logos/mne.png\",\"homeLogoText\":\"HTA\",\"awayLogoText\":\"MNE\",\"homeLogoBg\":\"#c53030\",\"awayLogoBg\":\"#f7c948\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#1f1f1f\",\"location\":\"אצטדיון בלומפילד, תל אביב\",\"dateTime\":\"20/06/2026 | 21:00\",\"price\":\"69 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(4, '4', 'near', 'ליגת האלופות', 'ריאל מדריד נגד מנצ\'סטר סיטי', 'ליגת האלופות', 'כדורגל', 'סנטיאגו ברנבאו, מדריד', '12/06/2026 | 22:00', '399 דולר', 4, 1, '{\"id\":4,\"sectionTitle\":\"ליגת האלופות\",\"category\":\"כדורגל\",\"competition\":\"ליגת האלופות\",\"homeTeam\":\"ריאל מדריד\",\"awayTeam\":\"מנצ\'סטר סיטי\",\"teams\":\"ריאל מדריד נגד מנצ\'סטר סיטי\",\"homeLogoImage\":\"/logos/rma.png\",\"awayLogoImage\":\"/logos/mnc.png\",\"homeLogoText\":\"RMA\",\"awayLogoText\":\"MNC\",\"homeLogoBg\":\"#f3f4f6\",\"awayLogoBg\":\"#6cb4ee\",\"homeLogoColor\":\"#1f2937\",\"awayLogoColor\":\"#102a43\",\"location\":\"סנטיאגו ברנבאו, מדריד\",\"dateTime\":\"12/06/2026 | 22:00\",\"price\":\"399 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(5, '5', 'near', 'ליגת האלופות', 'ברצלונה נגד באיירן מינכן', 'ליגת האלופות', 'כדורגל', 'ברצלונה, ספרד', '19/06/2026 | 22:00', '429 דולר', 5, 1, '{\"id\":5,\"sectionTitle\":\"ליגת האלופות\",\"category\":\"כדורגל\",\"competition\":\"ליגת האלופות\",\"homeTeam\":\"ברצלונה\",\"awayTeam\":\"באיירן מינכן\",\"teams\":\"ברצלונה נגד באיירן מינכן\",\"homeLogoImage\":\"/logos/bar.png\",\"awayLogoImage\":\"/logos/bym.png\",\"homeLogoText\":\"BAR\",\"awayLogoText\":\"BYM\",\"homeLogoBg\":\"#8b1e3f\",\"awayLogoBg\":\"#d62839\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#ffffff\",\"location\":\"ברצלונה, ספרד\",\"dateTime\":\"19/06/2026 | 22:00\",\"price\":\"429 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(6, '6', 'near', 'ליגת האלופות', 'ליברפול נגד פריז סן ז\'רמן', 'ליגת האלופות', 'כדורגל', 'אנפילד, ליברפול', '23/06/2026 | 22:00', '459 דולר', 6, 1, '{\"id\":6,\"sectionTitle\":\"ליגת האלופות\",\"category\":\"כדורגל\",\"competition\":\"ליגת האלופות\",\"homeTeam\":\"ליברפול\",\"awayTeam\":\"פריז סן ז\'רמן\",\"teams\":\"ליברפול נגד פריז סן ז\'רמן\",\"homeLogoImage\":\"/logos/liv.png\",\"awayLogoImage\":\"/logos/psg.png\",\"homeLogoText\":\"LIV\",\"awayLogoText\":\"PSG\",\"homeLogoBg\":\"#b91c1c\",\"awayLogoBg\":\"#1d4ed8\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#ffffff\",\"location\":\"אנפילד, ליברפול\",\"dateTime\":\"23/06/2026 | 22:00\",\"price\":\"459 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(7, '7', 'near', 'יורוליג', 'מכבי תל אביב נגד אולימפיאקוס', 'יורוליג', 'כדורסל', 'היכל מנורה מבטחים, תל אביב', '17/06/2026 | 21:05', '89 ₪', 7, 1, '{\"id\":7,\"sectionTitle\":\"יורוליג\",\"category\":\"כדורסל\",\"competition\":\"יורוליג\",\"homeTeam\":\"מכבי תל אביב\",\"awayTeam\":\"אולימפיאקוס\",\"teams\":\"מכבי תל אביב נגד אולימפיאקוס\",\"homeLogoImage\":\"/logos/mtabas.png\",\"awayLogoImage\":\"/logos/oly.png\",\"homeLogoText\":\"MTA\",\"awayLogoText\":\"OLY\",\"homeLogoBg\":\"#f6c343\",\"awayLogoBg\":\"#cf1124\",\"homeLogoColor\":\"#1f1f1f\",\"awayLogoColor\":\"#ffffff\",\"location\":\"היכל מנורה מבטחים, תל אביב\",\"dateTime\":\"17/06/2026 | 21:05\",\"price\":\"89 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(8, '8', 'near', 'יורוליג', 'פנאתינאיקוס נגד ריאל מדריד', 'יורוליג', 'כדורסל', 'אתונה, יוון', '21/06/2026 | 21:30', '399 דולר', 8, 1, '{\"id\":8,\"sectionTitle\":\"יורוליג\",\"category\":\"כדורסל\",\"competition\":\"יורוליג\",\"homeTeam\":\"פנאתינאיקוס\",\"awayTeam\":\"ריאל מדריד\",\"teams\":\"פנאתינאיקוס נגד ריאל מדריד\",\"homeLogoImage\":\"/logos/pna.png\",\"awayLogoImage\":\"/logos/rmabas.png\",\"homeLogoText\":\"PNA\",\"awayLogoText\":\"RMA\",\"homeLogoBg\":\"#15803d\",\"awayLogoBg\":\"#f3f4f6\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#1f2937\",\"location\":\"אתונה, יוון\",\"dateTime\":\"21/06/2026 | 21:30\",\"price\":\"399 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(9, '9', 'near', 'יורוליג', 'ברצלונה נגד פנרבחצ\'ה', 'יורוליג', 'כדורסל', 'ברצלונה, ספרד', '26/06/2026 | 21:45', '419 דולר', 9, 1, '{\"id\":9,\"sectionTitle\":\"יורוליג\",\"category\":\"כדורסל\",\"competition\":\"יורוליג\",\"homeTeam\":\"ברצלונה\",\"awayTeam\":\"פנרבחצ\'ה\",\"teams\":\"ברצלונה נגד פנרבחצ\'ה\",\"homeLogoImage\":\"/logos/barbas.png\",\"awayLogoImage\":\"/logos/fnr.png\",\"homeLogoText\":\"BAR\",\"awayLogoText\":\"FNR\",\"homeLogoBg\":\"#8b1e3f\",\"awayLogoBg\":\"#eab308\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#1f1f1f\",\"location\":\"ברצלונה, ספרד\",\"dateTime\":\"26/06/2026 | 21:45\",\"price\":\"419 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(10, '10', 'near', 'טניס בינלאומי', 'יאניק סינר נגד קרלוס אלקראס', 'טניס בינלאומי', 'טניס', 'רומא, איטליה', '30/06/2026 | 18:30', '399 דולר', 10, 1, '{\"id\":10,\"sectionTitle\":\"טניס בינלאומי\",\"category\":\"טניס\",\"competition\":\"טניס בינלאומי\",\"homeTeam\":\"יאניק סינר\",\"awayTeam\":\"קרלוס אלקראס\",\"teams\":\"יאניק סינר נגד קרלוס אלקראס\",\"homeLogoText\":\"SIN\",\"awayLogoText\":\"ALC\",\"homeLogoBg\":\"#2563eb\",\"awayLogoBg\":\"#f97316\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#ffffff\",\"location\":\"רומא, איטליה\",\"dateTime\":\"30/06/2026 | 18:30\",\"price\":\"399 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(11, '11', 'near', 'טניס בינלאומי', 'נובאק ג\'וקוביץ\' נגד אלכסנדר זברב', 'טניס בינלאומי', 'טניס', 'פריז, צרפת', '03/06/2026 | 19:00', '419 דולר', 11, 1, '{\"id\":11,\"sectionTitle\":\"טניס בינלאומי\",\"category\":\"טניס\",\"competition\":\"טניס בינלאומי\",\"homeTeam\":\"נובאק ג\'וקוביץ\'\",\"awayTeam\":\"אלכסנדר זברב\",\"teams\":\"נובאק ג\'וקוביץ\' נגד אלכסנדר זברב\",\"homeLogoText\":\"DJO\",\"awayLogoText\":\"ZVE\",\"homeLogoBg\":\"#0f766e\",\"awayLogoBg\":\"#7c3aed\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#ffffff\",\"location\":\"פריז, צרפת\",\"dateTime\":\"03/06/2026 | 19:00\",\"price\":\"419 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(12, '12', 'near', 'טניס בינלאומי', 'איגה שוויונטק נגד קוקו גוף', 'טניס בינלאומי', 'טניס', 'מדריד, ספרד', '07/06/2026 | 18:00', '399 דולר', 12, 1, '{\"id\":12,\"sectionTitle\":\"טניס בינלאומי\",\"category\":\"טניס\",\"competition\":\"טניס בינלאומי\",\"homeTeam\":\"איגה שוויונטק\",\"awayTeam\":\"קוקו גוף\",\"teams\":\"איגה שוויונטק נגד קוקו גוף\",\"homeLogoText\":\"IGA\",\"awayLogoText\":\"GAU\",\"homeLogoBg\":\"#db2777\",\"awayLogoBg\":\"#2563eb\",\"homeLogoColor\":\"#ffffff\",\"awayLogoColor\":\"#ffffff\",\"location\":\"מדריד, ספרד\",\"dateTime\":\"07/06/2026 | 18:00\",\"price\":\"399 דולר\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(13, 'so-1', 'sold_out', '', 'ברצלונה נגד ריאל מדריד', 'לה ליגה', 'כדורגל', 'ברצלונה', '03/06/2026 | 22:00', '', 1, 1, '{\"id\":\"so-1\",\"category\":\"כדורגל\",\"competition\":\"לה ליגה\",\"teams\":\"ברצלונה נגד ריאל מדריד\",\"location\":\"ברצלונה\",\"dateTime\":\"03/06/2026 | 22:00\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(14, 'so-2', 'sold_out', '', 'מכבי תל אביב נגד פנאתינאיקוס', 'יורוליג', 'כדורסל', 'תל אביב', '10/06/2026 | 21:15', '', 2, 1, '{\"id\":\"so-2\",\"category\":\"כדורסל\",\"competition\":\"יורוליג\",\"teams\":\"מכבי תל אביב נגד פנאתינאיקוס\",\"location\":\"תל אביב\",\"dateTime\":\"10/06/2026 | 21:15\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(15, 'so-3', 'sold_out', '', 'גביע דיוויס תל אביב 2026', 'גביע דיוויס', 'טניס', 'תל אביב', '28/06/2026 | 19:30', '', 3, 1, '{\"id\":\"so-3\",\"category\":\"טניס\",\"competition\":\"גביע דיוויס\",\"teams\":\"גביע דיוויס תל אביב 2026\",\"location\":\"תל אביב\",\"dateTime\":\"28/06/2026 | 19:30\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(16, 'isr-1', 'israel', 'משחקים בישראל', 'מכבי חיפה נגד בית״ר ירושלים', 'ליגת העל בכדורגל', 'כדורגל', 'אצטדיון סמי עופר, חיפה', '08/06/2026 | 19:45', '', 1001, 1, '{\"id\":\"isr-1\",\"tag\":\"כדורגל\",\"category\":\"כדורגל\",\"competition\":\"ליגת העל בכדורגל\",\"teams\":\"מכבי חיפה נגד בית״ר ירושלים\",\"location\":\"אצטדיון סמי עופר, חיפה\",\"dateTime\":\"08/06/2026 | 19:45\",\"sectionTitle\":\"משחקים בישראל\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(17, 'isr-2', 'israel', 'משחקים בישראל', 'מכבי תל אביב נגד אולימפיאקוס', 'יורוליג', 'כדורסל', 'היכל מנורה מבטחים, תל אביב', '17/06/2026 | 21:05', '', 1002, 1, '{\"id\":\"isr-2\",\"tag\":\"כדורסל\",\"category\":\"כדורסל\",\"competition\":\"יורוליג\",\"teams\":\"מכבי תל אביב נגד אולימפיאקוס\",\"location\":\"היכל מנורה מבטחים, תל אביב\",\"dateTime\":\"17/06/2026 | 21:05\",\"sectionTitle\":\"משחקים בישראל\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(18, 'world-1', 'world', 'משחקים בחו״ל', 'ריאל מדריד נגד מנצ\'סטר סיטי', 'ליגת האלופות', 'כדורגל', 'מדריד, ספרד', '15/06/2026 | 22:00', '', 1001, 1, '{\"id\":\"world-1\",\"tag\":\"כדורגל\",\"category\":\"כדורגל\",\"competition\":\"ליגת האלופות\",\"teams\":\"ריאל מדריד נגד מנצ\'סטר סיטי\",\"location\":\"מדריד, ספרד\",\"dateTime\":\"15/06/2026 | 22:00\",\"sectionTitle\":\"משחקים בחו״ל\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(19, 'world-2', 'world', 'משחקים בחו״ל', 'יאניק סינר נגד קרלוס אלקראס', 'טניס בינלאומי', 'טניס', 'רומא, איטליה', '30/06/2026 | 18:30', '', 1002, 1, '{\"id\":\"world-2\",\"tag\":\"טניס\",\"category\":\"טניס\",\"competition\":\"טניס בינלאומי\",\"teams\":\"יאניק סינר נגד קרלוס אלקראס\",\"location\":\"רומא, איטליה\",\"dateTime\":\"30/06/2026 | 18:30\",\"sectionTitle\":\"משחקים בחו״ל\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(20, 'must-1', 'featured', '', 'משחקי מונדיאל 2026 בארצות הברית, קנדה ומקסיקו', 'מונדיאל 2026', 'כדורגל', 'ארצות הברית | קנדה | מקסיקו', '2026 | מועדים יעודכנו בהמשך', '', 1, 1, '{\"id\":\"must-1\",\"badge\":\"מונדיאל 2026\",\"category\":\"כדורגל\",\"competition\":\"מונדיאל 2026\",\"title\":\"משחקי מונדיאל 2026 בארצות הברית, קנדה ומקסיקו\",\"location\":\"ארצות הברית | קנדה | מקסיקו\",\"dateTime\":\"2026 | מועדים יעודכנו בהמשך\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(21, 'must-2', 'featured', '', 'אירוע גרנד סלאם טניס', 'גרנד סלאם', 'טניס', 'תל אביב', 'תאריך יעודכן בהמשך | שעה תעודכן בהמשך', '', 2, 1, '{\"id\":\"must-2\",\"badge\":\"גרנד סלאם טניס\",\"category\":\"טניס\",\"competition\":\"גרנד סלאם\",\"title\":\"אירוע גרנד סלאם טניס\",\"location\":\"תל אביב\",\"dateTime\":\"תאריך יעודכן בהמשך | שעה תעודכן בהמשך\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(22, 'must-3', 'featured', '', 'פיינל פור יורוליג 2026', 'פיינל פור יורוליג', 'כדורסל', 'אבו דאבי', '2026 | פרטים מלאים בהמשך', '', 3, 1, '{\"id\":\"must-3\",\"badge\":\"פיינל פור יורוליג 2026\",\"category\":\"כדורסל\",\"competition\":\"פיינל פור יורוליג\",\"title\":\"פיינל פור יורוליג 2026\",\"location\":\"אבו דאבי\",\"dateTime\":\"2026 | פרטים מלאים בהמשך\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(23, 'must-tennis-1', 'tennis_must_see', '', 'גביע דיוויס תל אביב 2026', 'גביע דיוויס', 'טניס', 'תל אביב', '28/06/2026 | 19:30', '420 ₪', 1, 1, '{\"id\":\"must-tennis-1\",\"category\":\"טניס\",\"competition\":\"גביע דיוויס\",\"teams\":\"גביע דיוויס תל אביב 2026\",\"location\":\"תל אביב\",\"dateTime\":\"28/06/2026 | 19:30\",\"price\":\"420 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(24, 'ff-1', 'final_four', '', 'ריאל מדריד נגד אולימפיאקוס', 'פיינל פור יורוליג', 'כדורסל', 'אבו דאבי', '22/05/2026 | 18:00', '1,350 ₪', 1, 1, '{\"id\":\"ff-1\",\"category\":\"כדורסל\",\"competition\":\"פיינל פור יורוליג\",\"round\":\"משחק פיינל פור 1\",\"teams\":\"ריאל מדריד נגד אולימפיאקוס\",\"location\":\"אבו דאבי\",\"dateTime\":\"22/05/2026 | 18:00\",\"price\":\"1,350 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(25, 'ff-2', 'final_four', '', 'פנאתינאיקוס נגד מונאקו', 'פיינל פור יורוליג', 'כדורסל', 'אבו דאבי', '22/05/2026 | 21:00', '1,390 ₪', 2, 1, '{\"id\":\"ff-2\",\"category\":\"כדורסל\",\"competition\":\"פיינל פור יורוליג\",\"round\":\"משחק פיינל פור 2\",\"teams\":\"פנאתינאיקוס נגד מונאקו\",\"location\":\"אבו דאבי\",\"dateTime\":\"22/05/2026 | 21:00\",\"price\":\"1,390 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(26, 'ff-3', 'final_four', '', 'המפסידה מחצי גמר 1 נגד המפסידה מחצי גמר 2', 'פיינל פור יורוליג', 'כדורסל', 'אבו דאבי', '24/05/2026 | 18:00', '1,150 ₪', 3, 1, '{\"id\":\"ff-3\",\"category\":\"כדורסל\",\"competition\":\"פיינל פור יורוליג\",\"round\":\"המשחק על המקום השלישי\",\"teams\":\"המפסידה מחצי גמר 1 נגד המפסידה מחצי גמר 2\",\"location\":\"אבו דאבי\",\"dateTime\":\"24/05/2026 | 18:00\",\"price\":\"1,150 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(27, 'ff-4', 'final_four', '', 'המנצחת מחצי גמר 1 נגד המנצחת מחצי גמר 2', 'פיינל פור יורוליג', 'כדורסל', 'אבו דאבי', '24/05/2026 | 21:00', '1,890 ₪', 4, 1, '{\"id\":\"ff-4\",\"category\":\"כדורסל\",\"competition\":\"פיינל פור יורוליג\",\"round\":\"משחק הגמר\",\"teams\":\"המנצחת מחצי גמר 1 נגד המנצחת מחצי גמר 2\",\"location\":\"אבו דאבי\",\"dateTime\":\"24/05/2026 | 21:00\",\"price\":\"1,890 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(28, 'wc26-g1', 'world_cup', '', 'מקסיקו נגד יפן', 'מונדיאל 2026', 'כדורגל', 'מקסיקו סיטי', '11/06/2026 | 21:00', '1,990 ₪', 1, 1, '{\"id\":\"wc26-g1\",\"category\":\"כדורגל\",\"competition\":\"מונדיאל 2026\",\"teams\":\"מקסיקו נגד יפן\",\"location\":\"מקסיקו סיטי\",\"dateTime\":\"11/06/2026 | 21:00\",\"price\":\"1,990 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34'),
(29, 'wc26-g2', 'world_cup', '', 'אנגליה נגד ארצות הברית', 'מונדיאל 2026', 'כדורגל', 'ניו יורק', '12/06/2026 | 20:30', '2,150 ₪', 2, 1, '{\"id\":\"wc26-g2\",\"category\":\"כדורגל\",\"competition\":\"מונדיאל 2026\",\"teams\":\"אנגליה נגד ארצות הברית\",\"location\":\"ניו יורק\",\"dateTime\":\"12/06/2026 | 20:30\",\"price\":\"2,150 ₪\"}', '2026-06-10 17:43:34', '2026-06-10 17:43:34');

-- --------------------------------------------------------

--
-- מבנה טבלה עבור טבלה `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_code` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `full_name` varchar(255) DEFAULT '',
  `event_id` varchar(100) NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT '',
  `date_time` varchar(255) DEFAULT '',
  `category` varchar(100) DEFAULT '',
  `competition` varchar(255) DEFAULT '',
  `tickets_count` int(11) NOT NULL DEFAULT 1,
  `selected_seats` text DEFAULT NULL,
  `price` varchar(100) DEFAULT '',
  `package_title` varchar(255) DEFAULT '',
  `hotel_name` varchar(255) DEFAULT '',
  `hotel_stars` varchar(50) DEFAULT '',
  `room_type` varchar(255) DEFAULT '',
  `flight_label` varchar(255) DEFAULT '',
  `airline` varchar(255) DEFAULT '',
  `outbound_flight` varchar(255) DEFAULT '',
  `return_flight` varchar(255) DEFAULT '',
  `nights` varchar(50) DEFAULT '',
  `status` varchar(50) NOT NULL DEFAULT 'pending_payment',
  `payment_method` varchar(50) DEFAULT '',
  `installments_count` int(11) NOT NULL DEFAULT 1,
  `hold_expires_at` datetime DEFAULT NULL,
  `ticket_code` varchar(100) DEFAULT '',
  `qr_value` text DEFAULT NULL,
  `purchase_source` varchar(50) DEFAULT 'regular',
  `waitlist_request_id` int(11) DEFAULT NULL,
  `hold_key` varchar(191) DEFAULT NULL,
  `purchase_date` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_fee_amount` varchar(100) DEFAULT '',
  `refund_amount` varchar(100) DEFAULT '',
  `cancellation_window_label` varchar(255) DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- מבנה טבלה עבור טבלה `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- אינדקסים לטבלה `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- אינדקסים לטבלה `admin_2fa_codes`
--
ALTER TABLE `admin_2fa_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- אינדקסים לטבלה `events_catalog`
--
ALTER TABLE `events_catalog`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_event_bucket` (`event_id`,`bucket_key`),
  ADD KEY `idx_bucket_active_order` (`bucket_key`,`is_active`,`sort_order`);

--
-- אינדקסים לטבלה `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user` (`user_id`),
  ADD KEY `idx_orders_event` (`event_id`),
  ADD KEY `idx_orders_code` (`order_code`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_hold_key` (`hold_key`),
  ADD KEY `idx_orders_waitlist_request` (`waitlist_request_id`);

--
-- אינדקסים לטבלה `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_2fa_codes`
--
ALTER TABLE `admin_2fa_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `events_catalog`
--
ALTER TABLE `events_catalog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
