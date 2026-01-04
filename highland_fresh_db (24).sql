-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 04, 2026 at 11:33 AM
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
-- Database: `highland_fresh_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `batch_reservations`
--

CREATE TABLE `batch_reservations` (
  `reservation_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `sale_item_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `reserved_quantity` decimal(10,3) NOT NULL,
  `reservation_status` enum('active','fulfilled','released','expired') DEFAULT 'active',
  `reserved_by` int(11) DEFAULT NULL,
  `reserved_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiry_time` timestamp NULL DEFAULT NULL,
  `fulfilled_at` timestamp NULL DEFAULT NULL,
  `released_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks batch reservations for pending orders (FIFO locking)';

--
-- Dumping data for table `batch_reservations`
--

INSERT INTO `batch_reservations` (`reservation_id`, `batch_id`, `sale_id`, `sale_item_id`, `product_id`, `reserved_quantity`, `reservation_status`, `reserved_by`, `reserved_at`, `expiry_time`, `fulfilled_at`, `released_at`) VALUES
(1, 3, 5, 5, 75, 1.000, 'active', 1, '2025-12-10 00:57:49', '2025-12-11 17:57:49', NULL, NULL),
(2, 3, 6, 6, 75, 1.000, 'active', 1, '2025-12-10 01:38:25', '2025-12-11 18:38:25', NULL, NULL),
(3, 6, 7, 7, 1, 1.000, 'active', 1, '2025-12-10 01:39:38', '2025-12-11 18:39:38', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cities`
--

CREATE TABLE `cities` (
  `city_id` int(11) NOT NULL,
  `city_name` varchar(100) NOT NULL,
  `region` varchar(100) DEFAULT NULL,
  `country_id` int(11) NOT NULL DEFAULT 1,
  `postal_code_pattern` varchar(20) DEFAULT NULL COMMENT 'Common postal code pattern for this city',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cities`
--

INSERT INTO `cities` (`city_id`, `city_name`, `region`, `country_id`, `postal_code_pattern`, `is_active`, `created_at`) VALUES
(1, 'Manila', 'NCR', 1, '1000-1099', 1, '2025-08-01 18:01:04'),
(2, 'Quezon City', 'NCR', 1, '1100-1199', 1, '2025-08-01 18:01:04'),
(3, 'Makati City', 'NCR', 1, '1200-1299', 1, '2025-08-01 18:01:04'),
(4, 'Pasig City', 'NCR', 1, '1600-1699', 1, '2025-08-01 18:01:04'),
(5, 'Taguig City', 'NCR', 1, '1630-1639', 1, '2025-08-01 18:01:04'),
(6, 'Marikina City', 'NCR', 1, '1800-1899', 1, '2025-08-01 18:01:04'),
(7, 'Las Piñas City', 'NCR', 1, '1740-1749', 1, '2025-08-01 18:01:04'),
(8, 'Muntinlupa City', 'NCR', 1, '1770-1789', 1, '2025-08-01 18:01:04'),
(9, 'Parañaque City', 'NCR', 1, '1700-1719', 1, '2025-08-01 18:01:04'),
(10, 'Pasay City', 'NCR', 1, '1300-1309', 1, '2025-08-01 18:01:04'),
(11, 'Caloocan City', 'NCR', 1, '1400-1499', 1, '2025-08-01 18:01:04'),
(12, 'Malabon City', 'NCR', 1, '1470-1479', 1, '2025-08-01 18:01:04'),
(13, 'Navotas City', 'NCR', 1, '1485', 1, '2025-08-01 18:01:04'),
(14, 'Valenzuela City', 'NCR', 1, '1440-1449', 1, '2025-08-01 18:01:04'),
(15, 'San Juan City', 'NCR', 1, '1500-1509', 1, '2025-08-01 18:01:04'),
(16, 'Mandaluyong City', 'NCR', 1, '1550-1559', 1, '2025-08-01 18:01:04'),
(17, 'Cebu City', 'Central Visayas', 1, '6000', 1, '2025-08-01 18:01:04'),
(18, 'Davao City', 'Davao Region', 1, '8000', 1, '2025-08-01 18:01:04'),
(19, 'Antipolo City', 'CALABARZON', 1, '1870', 1, '2025-08-01 18:01:04'),
(20, 'Cagayan de Oro', 'Northern Mindanao', 1, '9000', 1, '2025-08-01 18:01:04'),
(21, 'Zamboanga City', 'Zamboanga Peninsula', 1, '7000', 1, '2025-08-01 18:01:04'),
(22, 'Iloilo City', 'Western Visayas', 1, '5000', 1, '2025-08-01 18:01:04'),
(23, 'Bacolod City', 'Western Visayas', 1, '6100', 1, '2025-08-01 18:01:04'),
(24, 'General Santos', 'SOCCSKSARGEN', 1, '9500', 1, '2025-08-01 18:01:04'),
(25, 'Baguio City', 'Cordillera Administrative Region', 1, '2600', 1, '2025-08-01 18:01:04');

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `country_id` int(11) NOT NULL,
  `country_code` varchar(3) NOT NULL COMMENT 'ISO 3166-1 alpha-3 code',
  `country_name` varchar(100) NOT NULL,
  `phone_prefix` varchar(10) NOT NULL COMMENT 'International dialing code',
  `currency_code` varchar(3) NOT NULL COMMENT 'ISO 4217 currency code',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `countries`
--

INSERT INTO `countries` (`country_id`, `country_code`, `country_name`, `phone_prefix`, `currency_code`, `is_active`, `created_at`) VALUES
(1, 'PHL', 'Philippines', '+63', 'PHP', 1, '2025-08-01 18:01:03'),
(2, 'USA', 'United States', '+1', 'USD', 1, '2025-08-01 18:01:03'),
(3, 'CAN', 'Canada', '+1', 'CAD', 1, '2025-08-01 18:01:03'),
(4, 'JPN', 'Japan', '+81', 'JPY', 1, '2025-08-01 18:01:03'),
(5, 'SGP', 'Singapore', '+65', 'SGD', 1, '2025-08-01 18:01:03'),
(6, 'HKG', 'Hong Kong', '+852', 'HKD', 1, '2025-08-01 18:01:03'),
(7, 'TWN', 'Taiwan', '+886', 'TWD', 1, '2025-08-01 18:01:03'),
(8, 'KOR', 'South Korea', '+82', 'KRW', 1, '2025-08-01 18:01:03'),
(9, 'CHN', 'China', '+86', 'CNY', 1, '2025-08-01 18:01:03'),
(10, 'THA', 'Thailand', '+66', 'THB', 1, '2025-08-01 18:01:03');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `customer_number` varchar(50) NOT NULL COMMENT 'Unique customer identifier (e.g., CUST-2025-001)',
  `email` varchar(255) DEFAULT NULL,
  `business_name` varchar(255) NOT NULL COMMENT 'Name of retail outlet or reseller business',
  `contact_person` varchar(255) NOT NULL COMMENT 'Primary contact person name',
  `phone` varchar(20) DEFAULT NULL COMMENT 'Contact phone number',
  `address` text DEFAULT NULL COMMENT 'Complete business address',
  `city_id` int(11) DEFAULT NULL COMMENT 'Foreign key to cities table',
  `credit_limit` decimal(10,2) DEFAULT 0.00 COMMENT 'Maximum credit allowed for customer',
  `payment_term_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether customer account is active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_type_id` int(11) DEFAULT NULL,
  `payment_mode` enum('Cash','Terms') DEFAULT 'Cash' COMMENT 'Walk-in is Cash, Malls are Terms',
  `tin_number` varchar(50) DEFAULT NULL COMMENT 'For Invoicing Big Clients'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer accounts for login and order placement';

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `customer_number`, `email`, `business_name`, `contact_person`, `phone`, `address`, `city_id`, `credit_limit`, `payment_term_id`, `is_active`, `created_at`, `updated_at`, `customer_type_id`, `payment_mode`, `tin_number`) VALUES
(1, 'CUST-001', NULL, 'Gaisano Supermarket', 'Purchasing Officer', NULL, NULL, NULL, 0.00, NULL, 1, '2025-12-02 06:05:28', '2025-12-02 06:05:28', 1, 'Terms', '123-456-789-000'),
(2, 'CUST-002', NULL, 'NVM Mall', 'Purchasing Officer', NULL, NULL, NULL, 0.00, NULL, 1, '2025-12-02 06:05:28', '2025-12-02 06:05:28', 1, 'Terms', '987-654-321-000'),
(3, 'CUST-WALKIN', NULL, 'Walk-in / Reseller', 'Counter', NULL, NULL, NULL, 0.00, NULL, 1, '2025-12-02 06:05:28', '2025-12-02 06:05:28', 2, 'Cash', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customer_order_status`
--

CREATE TABLE `customer_order_status` (
  `status_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_order_status`
--

INSERT INTO `customer_order_status` (`status_id`, `status_name`, `description`, `display_order`, `is_active`) VALUES
(1, 'pending_approval', 'Order submitted, waiting for staff approval', 1, 1),
(2, 'approved', 'Order approved, ready for fulfillment', 2, 1),
(3, 'in_preparation', 'Order being prepared in warehouse', 3, 1),
(4, 'ready_for_pickup', 'Order ready for pickup or delivery', 4, 1),
(5, 'completed', 'Order picked up or delivered', 5, 1),
(6, 'cancelled', 'Order cancelled', 6, 1),
(7, 'rejected', 'Order rejected by staff', 7, 1);

-- --------------------------------------------------------

--
-- Table structure for table `customer_payments`
--

CREATE TABLE `customer_payments` (
  `payment_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `amount_paid` decimal(10,2) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL COMMENT 'Check number, bank ref, receipt number',
  `notes` text DEFAULT NULL,
  `recorded_by` int(11) NOT NULL COMMENT 'User who recorded the payment',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_types`
--

CREATE TABLE `customer_types` (
  `customer_type_id` int(11) NOT NULL,
  `type_code` varchar(50) NOT NULL,
  `type_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_percentage` decimal(5,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_types`
--

INSERT INTO `customer_types` (`customer_type_id`, `type_code`, `type_name`, `description`, `discount_percentage`, `is_active`, `created_at`) VALUES
(1, 'MALL', 'Supermarket/Mall', 'Big clients like Gaisano/NVM (Terms Payment)', 0.00, 1, '2025-12-02 06:02:34'),
(2, 'RESELLER', 'Reseller/Walk-in', 'Small businesses buying in bulk (Cash Payment)', 0.00, 1, '2025-12-02 06:02:34'),
(3, 'INSTITUTION', 'Institutional', 'Schools or Government Offices', 0.00, 1, '2025-12-02 06:02:34');

-- --------------------------------------------------------

--
-- Table structure for table `dispatch_audit_log`
--

CREATE TABLE `dispatch_audit_log` (
  `audit_id` int(11) NOT NULL,
  `sales_order_id` int(11) NOT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `dispatched_batch_id` int(11) NOT NULL COMMENT 'Batch that was actually dispatched',
  `dispatched_batch_number` varchar(100) NOT NULL,
  `dispatched_batch_production_date` date NOT NULL,
  `dispatched_batch_expiry_date` date NOT NULL,
  `oldest_available_batch_id` int(11) DEFAULT NULL COMMENT 'Batch that SHOULD have been dispatched (FIFO)',
  `oldest_batch_production_date` date DEFAULT NULL,
  `oldest_batch_expiry_date` date DEFAULT NULL,
  `fifo_compliant` tinyint(1) DEFAULT 1 COMMENT '1=Correct batch used, 0=FIFO bypassed',
  `days_newer` int(11) DEFAULT NULL COMMENT 'If bypassed, how many days newer was dispatched batch',
  `quantity_dispatched` decimal(12,2) NOT NULL,
  `dispatch_date` datetime NOT NULL,
  `dispatched_by` int(11) DEFAULT NULL COMMENT 'Staff who performed dispatch',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Audit log for dispatch FIFO compliance tracking';

-- --------------------------------------------------------

--
-- Table structure for table `farmer_payouts`
--

CREATE TABLE `farmer_payouts` (
  `payout_id` int(11) NOT NULL,
  `payout_reference` varchar(50) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `total_liters_accepted` decimal(10,2) NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `total_transport_deductions` decimal(10,2) NOT NULL,
  `net_amount_payable` decimal(10,2) NOT NULL,
  `status` enum('Draft','Approved','Paid') DEFAULT 'Draft',
  `generated_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `farmer_payouts`
--

INSERT INTO `farmer_payouts` (`payout_id`, `payout_reference`, `supplier_id`, `period_start`, `period_end`, `total_liters_accepted`, `gross_amount`, `total_transport_deductions`, `net_amount_payable`, `status`, `generated_by`, `created_at`) VALUES
(1, 'PAY-20260104-001', 4, '2025-12-31', '2026-01-04', 80.00, 3200.00, 0.00, 3200.00, 'Paid', 1, '2026-01-04 05:39:45'),
(2, 'PAY-20260104-002', 1, '2025-12-31', '2026-01-04', 608.00, 24320.00, 0.00, 24320.00, 'Paid', 1, '2026-01-04 05:46:25');

-- --------------------------------------------------------

--
-- Stand-in structure for view `finished_products_inventory_view`
-- (See below for the actual view)
--
CREATE TABLE `finished_products_inventory_view` (
`product_id` int(11)
,`product_name` varchar(100)
,`sku` varchar(50)
,`category_name` varchar(100)
,`unit_name` varchar(20)
,`quantity_on_hand` decimal(10,3)
,`reorder_level` decimal(10,3)
,`max_stock_level` decimal(10,3)
,`selling_price` decimal(10,2)
,`production_cost` decimal(10,2)
,`stock_status` varchar(17)
,`inventory_retail_value` decimal(20,5)
,`inventory_cost_value` decimal(20,5)
,`profit_per_unit` decimal(11,2)
,`profit_margin_percent` decimal(20,6)
,`quality_grade` enum('Economy','Standard','Premium')
,`expiry_date` date
,`days_until_expiry` int(7)
,`expiry_status` varchar(7)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `highland_fresh_raw_materials_view`
-- (See below for the actual view)
--
CREATE TABLE `highland_fresh_raw_materials_view` (
`raw_material_id` int(11)
,`name` varchar(100)
,`sku` varchar(50)
,`category` varchar(50)
,`unit_id` int(11)
,`unit_name` varchar(20)
,`standard_cost` decimal(10,2)
,`quantity_on_hand` decimal(10,3)
,`reorder_level` decimal(10,3)
,`quality_grade` enum('Premium','Standard','Economy')
,`highland_fresh_approved` tinyint(1)
,`requires_quality_test` tinyint(1)
,`storage_temp_min` decimal(4,1)
,`storage_temp_max` decimal(4,1)
,`shelf_life_days` int(11)
,`description` text
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `highland_fresh_suppliers_view`
-- (See below for the actual view)
--
CREATE TABLE `highland_fresh_suppliers_view` (
`supplier_id` int(11)
,`name` varchar(255)
,`contact_person` varchar(255)
,`email` varchar(255)
,`phone_number` varchar(20)
,`supplier_type` enum('Dairy Cooperative','Individual Farm','Packaging Supplier','Ingredient Supplier','Equipment Supplier')
,`highland_fresh_material_category` enum('dairy_cooperative','packaging_supplier','culture_supplier','ingredient_supplier','general_supplier')
,`highland_fresh_approved` tinyint(1)
,`highland_fresh_approval_date` date
,`highland_fresh_certifications` text
,`highland_fresh_restrictions` text
,`is_nmfdc_member` tinyint(1)
,`nmfdc_member_since` date
,`daily_milk_capacity_liters` decimal(10,2)
,`milk_quality_grade` enum('Grade A','Grade B','Grade C')
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `highland_fresh_supplier_materials_view`
-- (See below for the actual view)
--
CREATE TABLE `highland_fresh_supplier_materials_view` (
`supplier_raw_material_id` int(11)
,`supplier_id` int(11)
,`supplier_name` varchar(255)
,`highland_fresh_material_category` enum('dairy_cooperative','packaging_supplier','culture_supplier','ingredient_supplier','general_supplier')
,`raw_material_id` int(11)
,`raw_material_name` varchar(100)
,`material_category` varchar(50)
,`supplier_sku` varchar(100)
,`unit_cost` decimal(10,2)
,`minimum_order_quantity` decimal(10,3)
,`maximum_order_quantity` decimal(10,3)
,`lead_time_days` int(11)
,`is_preferred_supplier` tinyint(1)
,`quality_certification` varchar(255)
,`last_price_update` date
);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_adjustments`
--

CREATE TABLE `inventory_adjustments` (
  `adjustment_id` int(11) NOT NULL,
  `adjustment_number` varchar(20) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `adjustment_type` enum('Manual','Sale','Return','Purchase','Damage','Expiry','Theft','Count') NOT NULL,
  `quantity_before` int(11) NOT NULL,
  `quantity_change` int(11) NOT NULL COMMENT 'Positive for increase, negative for decrease',
  `quantity_after` int(11) NOT NULL,
  `unit_cost` decimal(10,2) DEFAULT 0.00,
  `total_value_change` decimal(10,2) GENERATED ALWAYS AS (`quantity_change` * `unit_cost`) STORED,
  `reason` varchar(255) NOT NULL,
  `reference_id` int(11) DEFAULT NULL COMMENT 'Reference to sale_id, return_id, po_id, etc.',
  `reference_type` enum('Sale','Return','Purchase','Manual') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL COMMENT 'Manager/Admin who approved the adjustment',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `inventory_summary_view`
-- (See below for the actual view)
--
CREATE TABLE `inventory_summary_view` (
`inventory_type` varchar(17)
,`total_items` bigint(21)
,`total_value` decimal(42,5)
,`items_needing_reorder` bigint(21)
,`overstocked_items` bigint(21)
,`avg_stock_level` decimal(14,7)
);

-- --------------------------------------------------------

--
-- Table structure for table `low_stock_alerts`
--

CREATE TABLE `low_stock_alerts` (
  `alert_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `alert_date` datetime DEFAULT current_timestamp(),
  `current_quantity` decimal(10,2) NOT NULL,
  `reorder_level` decimal(10,2) NOT NULL,
  `shortage_quantity` decimal(10,2) GENERATED ALWAYS AS (`reorder_level` - `current_quantity`) STORED,
  `status` enum('ACTIVE','RESOLVED','REQUISITION_CREATED') DEFAULT 'ACTIVE',
  `resolved_by_requisition_id` int(11) DEFAULT NULL,
  `resolved_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Low stock alerts for dashboard';

-- --------------------------------------------------------

--
-- Table structure for table `milk_daily_collections`
--

CREATE TABLE `milk_daily_collections` (
  `collection_id` int(11) NOT NULL,
  `rmr_number` varchar(50) NOT NULL COMMENT 'From RMR# column in document',
  `collection_date` date NOT NULL,
  `supplier_id` int(11) NOT NULL COMMENT 'Link to Supplier (Farmer)',
  `milk_type` enum('Cow','Goat','Buffalo') DEFAULT 'Cow' COMMENT 'Cow vs Goat have different prices',
  `liters_delivered` decimal(10,2) NOT NULL DEFAULT 0.00,
  `liters_rejected` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rejected column in doc',
  `liters_accepted` decimal(10,2) GENERATED ALWAYS AS (`liters_delivered` - `liters_rejected`) STORED,
  `sediment_test` varchar(20) DEFAULT NULL COMMENT 'e.g., G-1',
  `titratable_acidity` decimal(5,2) DEFAULT NULL COMMENT '%TA column',
  `fat_content` decimal(5,2) DEFAULT NULL COMMENT '%FAT column',
  `alcohol_test_passed` tinyint(1) DEFAULT 1,
  `base_price_per_liter` decimal(10,2) NOT NULL COMMENT 'e.g., 40.00 or 69.25',
  `quality_premium` decimal(10,2) DEFAULT 0.00 COMMENT 'Bonus for high fat',
  `transport_fee` decimal(10,2) DEFAULT 0.00 COMMENT 'Transpo column (Deduction)',
  `total_amount` decimal(10,2) NOT NULL COMMENT 'The final calculated Amount',
  `qc_officer_id` int(11) NOT NULL COMMENT 'Prepared by (Divine Grace)',
  `finance_officer_id` int(11) DEFAULT NULL COMMENT 'Checked by (Geraldine)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `milk_daily_collections`
--

INSERT INTO `milk_daily_collections` (`collection_id`, `rmr_number`, `collection_date`, `supplier_id`, `milk_type`, `liters_delivered`, `liters_rejected`, `sediment_test`, `titratable_acidity`, `fat_content`, `alcohol_test_passed`, `base_price_per_liter`, `quality_premium`, `transport_fee`, `total_amount`, `qc_officer_id`, `finance_officer_id`, `created_at`) VALUES
(1, '66174', '2025-10-21', 2, 'Cow', 112.00, 0.00, 'G-1', 0.20, 5.00, 1, 40.00, 0.00, 500.00, 3980.00, 1, NULL, '2025-12-02 06:05:28'),
(2, '66175', '2025-10-21', 3, 'Cow', 107.00, 87.00, 'G-1', 0.19, 5.00, 1, 40.25, 0.00, 141.51, 663.49, 1, NULL, '2025-12-02 06:05:28'),
(3, 'RMR-20250602-001', '2025-06-02', 1, 'Cow', 100.00, 0.00, NULL, NULL, NULL, 1, 40.00, 0.00, 0.00, 4000.00, 1, NULL, '2025-12-02 09:27:26'),
(4, 'RMR-20250602-002', '2025-06-02', 1, 'Cow', 100.00, 0.00, NULL, NULL, NULL, 1, 40.00, 0.00, 0.00, 4000.00, 1, NULL, '2025-12-02 09:28:16'),
(5, 'RMR-20251202-001', '2025-12-02', 1, 'Cow', 100.00, 0.00, NULL, NULL, NULL, 1, 40.00, 0.00, 0.00, 4000.00, 1, NULL, '2025-12-02 09:39:37'),
(6, 'RMR-20251202-002', '2025-12-02', 3, 'Cow', 50.00, 10.00, NULL, 0.15, 10.00, 1, 42.00, 0.00, 2.00, 418.00, 1, NULL, '2025-12-02 09:43:39'),
(7, 'RMR-20251209-001', '2025-12-09', 3, 'Cow', 50.00, 40.00, NULL, 0.20, 3.20, 1, 38.00, 0.00, 0.00, 380.00, 1, NULL, '2025-12-09 06:13:39'),
(8, 'RMR-20251210-001', '2025-12-10', 4, 'Cow', 50.00, 40.00, NULL, 0.15, 0.10, 1, 38.00, 0.00, 0.00, 1520.00, 1, NULL, '2025-12-10 00:46:41'),
(9, 'RMR-20260101-001', '2026-01-01', 4, 'Cow', 50.00, 20.00, NULL, 0.14, 3.20, 1, 40.00, 0.00, 0.00, 1200.00, 1, NULL, '2026-01-01 11:32:54'),
(10, 'RMR-20260104-001', '2026-01-04', 3, 'Cow', 25.00, 5.00, NULL, 0.13, 2.20, 1, 38.00, 0.00, 0.00, 760.00, 1, NULL, '2026-01-04 04:25:54'),
(12, 'RMR-20260101-01-001', '2026-01-01', 1, 'Cow', 150.00, 5.00, NULL, NULL, 3.80, 1, 40.00, 0.00, 0.00, 5800.00, 1, NULL, '2026-01-04 05:25:58'),
(13, 'RMR-20260102-01-002', '2026-01-02', 1, 'Cow', 160.00, 0.00, NULL, NULL, 4.00, 1, 40.00, 0.00, 0.00, 6400.00, 1, NULL, '2026-01-04 05:25:58'),
(14, 'RMR-20260103-01-003', '2026-01-03', 1, 'Cow', 155.00, 0.00, NULL, NULL, 3.90, 1, 40.00, 0.00, 0.00, 6200.00, 1, NULL, '2026-01-04 05:25:58'),
(15, 'RMR-20260104-01-004', '2026-01-04', 1, 'Cow', 148.00, 0.00, NULL, NULL, 4.10, 1, 40.00, 0.00, 0.00, 5920.00, 1, NULL, '2026-01-04 05:25:58'),
(16, 'RMR-20260102-02-005', '2026-01-02', 2, 'Cow', 80.00, 2.00, NULL, NULL, 3.70, 1, 40.00, 0.00, 0.00, 3120.00, 1, NULL, '2026-01-04 05:25:58'),
(17, 'RMR-20260104-02-006', '2026-01-04', 2, 'Cow', 85.00, 0.00, NULL, NULL, 3.80, 1, 40.00, 0.00, 0.00, 3400.00, 1, NULL, '2026-01-04 05:25:58'),
(18, 'RMR-20260101-03-007', '2026-01-01', 3, 'Cow', 200.00, 10.00, NULL, NULL, 3.60, 1, 40.00, 0.00, 0.00, 7600.00, 1, NULL, '2026-01-04 05:25:58'),
(19, 'RMR-20260102-03-008', '2026-01-02', 3, 'Cow', 220.00, 0.00, NULL, NULL, 3.80, 1, 40.00, 0.00, 0.00, 8800.00, 1, NULL, '2026-01-04 05:25:58'),
(20, 'RMR-20260103-03-009', '2026-01-03', 3, 'Cow', 210.00, 5.00, NULL, NULL, 3.70, 1, 40.00, 0.00, 0.00, 8200.00, 1, NULL, '2026-01-04 05:25:58'),
(21, 'RMR-20260104-03-010', '2026-01-04', 3, 'Cow', 215.00, 0.00, NULL, NULL, 3.90, 1, 40.00, 0.00, 0.00, 8600.00, 1, NULL, '2026-01-04 05:25:58'),
(22, 'RMR-20260103-04-011', '2026-01-03', 4, 'Cow', 50.00, 0.00, NULL, NULL, 4.20, 1, 40.00, 0.00, 0.00, 2000.00, 1, NULL, '2026-01-04 05:25:58');

--
-- Triggers `milk_daily_collections`
--
DELIMITER $$
CREATE TRIGGER `trg_generate_rmr_number` BEFORE INSERT ON `milk_daily_collections` FOR EACH ROW BEGIN
    DECLARE next_seq INT;
    
    IF NEW.rmr_number IS NULL OR NEW.rmr_number = '' THEN
        
        SELECT COALESCE(MAX(
            CAST(SUBSTRING_INDEX(rmr_number, '-', -1) AS UNSIGNED)
        ), 0) + 1 INTO next_seq
        FROM milk_daily_collections
        WHERE DATE(collection_date) = NEW.collection_date;
        
        SET NEW.rmr_number = CONCAT('RMR-', DATE_FORMAT(NEW.collection_date, '%Y%m%d'), '-', LPAD(next_seq, 3, '0'));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `payment_method_id` int(11) NOT NULL,
  `method_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `requires_change` tinyint(1) DEFAULT 0 COMMENT 'Whether this payment method can provide change',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`payment_method_id`, `method_name`, `description`, `is_active`, `requires_change`, `created_at`) VALUES
(1, 'Cash', 'Cash payment', 1, 1, '2025-08-01 17:58:26'),
(2, 'Credit Card', 'Credit card payment', 1, 0, '2025-08-01 17:58:26'),
(3, 'Debit Card', 'Debit card payment', 1, 0, '2025-08-01 17:58:26'),
(4, 'GCash', 'GCash mobile payment', 1, 0, '2025-08-01 17:58:26'),
(5, 'Maya', 'Maya (formerly PayMaya) payment', 1, 0, '2025-08-01 17:58:26'),
(6, 'Bank Transfer', 'Bank transfer payment', 1, 0, '2025-08-01 17:58:26'),
(7, 'Check', 'Check payment', 1, 0, '2025-08-01 17:58:26');

-- --------------------------------------------------------

--
-- Table structure for table `payment_terms`
--

CREATE TABLE `payment_terms` (
  `payment_term_id` int(11) NOT NULL,
  `term_code` varchar(20) NOT NULL COMMENT 'Short code like NET30, NET15, COD',
  `term_name` varchar(100) NOT NULL,
  `days_to_pay` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of days to pay, 0 for immediate',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_terms`
--

INSERT INTO `payment_terms` (`payment_term_id`, `term_code`, `term_name`, `days_to_pay`, `description`, `is_active`, `created_at`) VALUES
(1, 'COD', 'Cash on Delivery', 0, 'Payment due upon delivery', 1, '2025-08-01 18:01:04'),
(2, 'NET7', 'Net 7 Days', 7, 'Payment due within 7 days of invoice', 1, '2025-08-01 18:01:04'),
(3, 'NET15', 'Net 15 Days', 15, 'Payment due within 15 days of invoice', 1, '2025-08-01 18:01:04'),
(4, 'NET21', 'Net 21 Days', 21, 'Payment due within 21 days of invoice', 1, '2025-08-01 18:01:04'),
(5, 'NET30', 'Net 30 Days', 30, 'Payment due within 30 days of invoice', 1, '2025-08-01 18:01:04'),
(6, 'NET45', 'Net 45 Days', 45, 'Payment due within 45 days of invoice', 1, '2025-08-01 18:01:04'),
(7, 'NET60', 'Net 60 Days', 60, 'Payment due within 60 days of invoice', 1, '2025-08-01 18:01:04'),
(8, 'PREPAID', 'Prepaid', -1, 'Payment required before delivery', 1, '2025-08-01 18:01:04'),
(9, '2/10-NET30', '2% 10 Days, Net 30', 30, '2% discount if paid within 10 days, otherwise due in 30 days', 1, '2025-08-01 18:01:04');

-- --------------------------------------------------------

--
-- Table structure for table `production_batches`
--

CREATE TABLE `production_batches` (
  `batch_id` int(11) NOT NULL,
  `batch_number` varchar(50) NOT NULL,
  `recipe_id` int(11) DEFAULT NULL COMMENT 'Recipe used (NULL for manual production)',
  `product_id` int(11) DEFAULT NULL COMMENT 'Direct product link (for recipe-less batches)',
  `batch_size` decimal(10,3) NOT NULL,
  `planned_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Planned production quantity',
  `production_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'Product expiry date for food safety tracking',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `status` enum('Planned','In Progress','Quality Control','Completed','Failed') DEFAULT 'Planned',
  `quality_grade` enum('Economy','Standard','Premium') DEFAULT 'Standard',
  `yield_quantity` decimal(10,3) DEFAULT NULL,
  `quantity_remaining` decimal(10,3) DEFAULT NULL COMMENT 'Remaining quantity available for dispatch (FIFO)',
  `waste_quantity` decimal(10,3) DEFAULT 0.000,
  `production_cost` decimal(10,2) DEFAULT NULL,
  `quality_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `production_notes` text DEFAULT NULL COMMENT 'Additional production notes',
  `reserved_quantity` decimal(10,3) DEFAULT 0.000 COMMENT 'Quantity reserved for pending orders'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_batches`
--

INSERT INTO `production_batches` (`batch_id`, `batch_number`, `recipe_id`, `product_id`, `batch_size`, `planned_quantity`, `production_date`, `expiry_date`, `start_time`, `end_time`, `operator_name`, `status`, `quality_grade`, `yield_quantity`, `quantity_remaining`, `waste_quantity`, `production_cost`, `quality_notes`, `created_at`, `updated_at`, `production_notes`, `reserved_quantity`) VALUES
(2, 'BATCH-20251209-2878', NULL, 2, 20.000, 20.000, '2025-12-09', '2025-12-16', NULL, '19:32:55', 'Basta', 'Completed', 'Standard', 50.000, 50.000, 10.000, 0.00, '[WASTAGE] Qty: 10, Reason: SPILLAGE\n10', '2025-12-09 11:32:17', '2025-12-09 11:32:55', 'Using Raw Milk batch RMR-20250602-001 (100L available) - FIFO allocation', 0.000),
(3, 'BATCH-20251209-8317', NULL, 75, 20.000, 20.000, '2025-12-09', '2025-12-16', NULL, '20:05:48', 'Basta', 'Completed', 'Standard', 10.000, 10.000, 1.000, 0.00, '[WASTAGE] Qty: 1, Reason: EQUIPMENT_FAILURE\nTest', '2025-12-09 12:05:13', '2025-12-10 01:38:25', 'Using Raw Milk batch RMR-20251209-001 (10L available) - FIFO allocation', 2.000),
(4, 'BATCH-20251210-5741', NULL, 7, 50.000, 50.000, '2025-12-10', '2025-12-17', NULL, '08:53:29', 'Yawa', 'Completed', 'Standard', 50.000, 50.000, 20.000, 0.00, '[WASTAGE] Qty: 20, Reason: CONTAMINATION\nBingBong', '2025-12-10 00:53:00', '2025-12-10 00:53:29', 'TongTongSahur', 0.000),
(5, 'BATCH-20251210-2552', NULL, 2, 20.000, 20.000, '2025-12-10', '2025-12-17', NULL, '08:56:21', 'YOWWW', 'Completed', 'Standard', 10.000, 10.000, 0.000, 0.00, 'Basta', '2025-12-10 00:56:05', '2025-12-10 00:56:21', 'Ngekngok', 0.000),
(6, 'BATCH-20251210-6373', NULL, 1, 50.000, 50.000, '2025-12-10', '2025-12-17', NULL, '09:34:34', 'Yawards', 'Completed', 'Standard', 50.000, 50.000, 10.000, 0.00, '[WASTAGE] Qty: 10, Reason: EQUIPMENT_FAILURE\nLa', '2025-12-10 01:34:18', '2025-12-10 01:39:38', 'Basta', 1.000),
(7, 'BATCH-20260104-4785', NULL, 2, 50.000, 50.000, '2026-01-04', '2026-01-11', NULL, '15:38:06', 'WOWERS', 'Completed', 'Standard', 49.000, 49.000, 1.000, 0.00, '[WASTAGE] Qty: 1, Reason: EQUIPMENT_FAILURE', '2026-01-04 07:37:39', '2026-01-04 07:38:06', 'Using Raw Milk batch HF-20260104-001-RM014 (150L available) - FIFO allocation', 0.000),
(8, 'BATCH-20260104-4958', NULL, 1, 10000.000, 10000.000, '2026-01-04', '2026-01-11', NULL, '17:33:23', 'Basta', 'Completed', 'Standard', 45.000, 45.000, 30.000, 0.00, '[WASTAGE] Qty: 30, Reason: EQUIPMENT_FAILURE', '2026-01-04 09:33:03', '2026-01-04 09:33:23', 'Using Raw Milk batch HF-20260104-001-RM014 (149.875L available) - FIFO allocation', 0.000),
(9, 'BATCH-20260104-9846', NULL, 5, 500.000, 500.000, '2026-01-04', '2026-01-11', NULL, '17:38:16', 'Basta', 'Completed', 'Standard', 45.000, 45.000, 20.000, 0.00, '[WASTAGE] Qty: 20, Reason: CONTAMINATION\nBasta', '2026-01-04 09:37:57', '2026-01-04 09:38:16', 'Itlog', 0.000),
(10, 'BATCH-20260104-5244', NULL, 5, 3000.000, 3000.000, '2026-01-04', '2026-01-11', NULL, '17:55:45', 'Basta', 'Completed', 'Standard', 50.000, 50.000, 0.140, 0.00, '[WASTAGE] Qty: 0.14, Reason: CONTAMINATION\n50', '2026-01-04 09:54:03', '2026-01-04 09:55:45', 'nge', 0.000),
(11, 'BATCH-20260104-2943', NULL, 5, 3000.000, 3000.000, '2026-01-04', '2026-01-11', NULL, '18:24:50', 'Basta', 'Completed', 'Standard', 30.000, 30.000, 10.000, 0.00, '[WASTAGE] Qty: 10, Reason: EQUIPMENT_FAILURE\nBasta', '2026-01-04 10:24:32', '2026-01-04 10:24:50', 'Yawa', 0.000);

-- --------------------------------------------------------

--
-- Table structure for table `production_cost_approvals`
--

CREATE TABLE `production_cost_approvals` (
  `approval_id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `planned_quantity` decimal(12,3) NOT NULL,
  `estimated_cost` decimal(12,2) NOT NULL,
  `standard_cost` decimal(12,2) NOT NULL,
  `variance_percent` decimal(5,2) NOT NULL,
  `variance_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','approved','rejected','expired') DEFAULT 'pending',
  `requested_by` int(11) NOT NULL,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_notes` text DEFAULT NULL,
  `batch_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FIFO batch breakdown at time of request' CHECK (json_valid(`batch_details`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_cost_approvals`
--

INSERT INTO `production_cost_approvals` (`approval_id`, `recipe_id`, `product_id`, `planned_quantity`, `estimated_cost`, `standard_cost`, `variance_percent`, `variance_amount`, `status`, `requested_by`, `requested_at`, `reviewed_by`, `reviewed_at`, `review_notes`, `batch_details`) VALUES
(1, 5, 5, 3000.000, 1300.00, 300.00, 333.33, 1000.00, 'approved', 1, '2026-01-04 10:16:29', 1, '2026-01-04 10:23:51', 'Fuck you', '[{\"id\":48,\"raw_material_id\":16,\"quantity_required\":\"0.100\",\"is_critical\":0,\"processing_notes\":\"\",\"material_name\":\"Yogurt Culture\",\"available_qty\":\"6.000\",\"unit\":\"L\",\"quantity_per_unit\":0.002,\"batches\":[{\"batch_id\":35,\"current_quantity\":\"4.000\",\"unit_cost\":\"50.00\",\"received_date\":\"2026-01-04\"},{\"batch_id\":36,\"current_quantity\":\"1.000\",\"unit_cost\":\"500.00\",\"received_date\":\"2026-01-04\"},{\"batch_id\":37,\"current_quantity\":\"1.000\",\"unit_cost\":\"600.00\",\"received_date\":\"2026-01-04\"},{\"batch_id\":38,\"current_quantity\":\"4.000\",\"unit_cost\":\"50.00\",\"received_date\":\"2026-01-04\"},{\"batch_id\":39,\"current_quantity\":\"1.000\",\"unit_cost\":\"500.00\",\"received_date\":\"2026-01-04\"},{\"batch_id\":40,\"current_quantity\":\"1.000\",\"unit_cost\":\"600.00\",\"received_date\":\"2026-01-04\"}],\"batch_count\":6,\"has_mixed_prices\":true,\"lowest_price\":\"50.00\",\"highest_price\":\"600.00\",\"fifo_price\":50}]');

-- --------------------------------------------------------

--
-- Table structure for table `production_material_usage`
--

CREATE TABLE `production_material_usage` (
  `usage_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL COMMENT 'FK to production_batches',
  `raw_material_id` int(11) NOT NULL COMMENT 'FK to raw_materials',
  `quantity_issued` decimal(10,3) NOT NULL COMMENT 'Quantity of material issued for this batch',
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When material was issued'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks raw materials issued for production batches';

--
-- Dumping data for table `production_material_usage`
--

INSERT INTO `production_material_usage` (`usage_id`, `batch_id`, `raw_material_id`, `quantity_issued`, `issued_at`) VALUES
(2, 2, 9, 10.000, '2025-12-09 11:32:17'),
(3, 2, 6, 10.000, '2025-12-09 11:32:17'),
(4, 2, 5, 10.000, '2025-12-09 11:32:17'),
(5, 3, 11, 1.000, '2025-12-09 12:05:13'),
(6, 3, 3, 1.000, '2025-12-09 12:05:13'),
(7, 3, 12, 1.000, '2025-12-09 12:05:14'),
(8, 4, 14, 10.000, '2025-12-10 00:53:00'),
(9, 5, 4, 20.000, '2025-12-10 00:56:05'),
(10, 5, 14, 20.000, '2025-12-10 00:56:05'),
(11, 5, 12, 1.000, '2025-12-10 00:56:05'),
(12, 6, 8, 1.000, '2025-12-10 01:34:18'),
(13, 6, 1, 1.000, '2025-12-10 01:34:18'),
(14, 6, 14, 1.000, '2025-12-10 01:34:18'),
(15, 7, 14, 0.125, '2026-01-04 07:37:39'),
(16, 7, 15, 0.003, '2026-01-04 07:37:39'),
(17, 7, 13, 0.125, '2026-01-04 07:37:39'),
(18, 7, 12, 0.075, '2026-01-04 07:37:39'),
(19, 7, 11, 0.050, '2026-01-04 07:37:39'),
(20, 8, 14, 15.000, '2026-01-04 09:33:03'),
(21, 9, 16, 1.000, '2026-01-04 09:37:57'),
(22, 10, 16, 6.000, '2026-01-04 09:54:03'),
(23, 11, 16, 6.000, '2026-01-04 10:24:32');

-- --------------------------------------------------------

--
-- Stand-in structure for view `production_planning_view`
-- (See below for the actual view)
--
CREATE TABLE `production_planning_view` (
`product_id` int(11)
,`product_name` varchar(100)
,`current_stock` decimal(10,3)
,`reorder_level` decimal(10,3)
,`production_needed` decimal(11,3)
,`recipe_id` int(11)
,`batch_size_yield` decimal(10,3)
,`batches_needed` bigint(13)
,`production_time_hours` decimal(4,2)
,`total_production_time` decimal(16,2)
);

-- --------------------------------------------------------

--
-- Table structure for table `production_recipes`
--

CREATE TABLE `production_recipes` (
  `recipe_id` int(11) NOT NULL,
  `finished_product_id` int(11) NOT NULL,
  `recipe_name` varchar(100) NOT NULL,
  `batch_size_yield` decimal(10,3) NOT NULL,
  `production_time_hours` decimal(4,2) DEFAULT 1.00,
  `difficulty_level` enum('Easy','Medium','Hard') DEFAULT 'Medium',
  `instructions` text DEFAULT NULL,
  `quality_control_notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `standard_batch_cost` decimal(12,2) DEFAULT NULL COMMENT 'Expected cost per batch at standard prices',
  `cost_variance_threshold_percent` decimal(5,2) DEFAULT 10.00 COMMENT 'Percentage above standard that requires Finance approval',
  `requires_cost_approval` tinyint(1) DEFAULT 0 COMMENT 'If 1, any cost variance requires approval'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_recipes`
--

INSERT INTO `production_recipes` (`recipe_id`, `finished_product_id`, `recipe_name`, `batch_size_yield`, `production_time_hours`, `difficulty_level`, `instructions`, `quality_control_notes`, `is_active`, `created_at`, `updated_at`, `standard_batch_cost`, `cost_variance_threshold_percent`, `requires_cost_approval`) VALUES
(1, 2, 'Highland Fresh Chocolate Milk 500ml Production Recipe', 200.000, 3.00, 'Medium', '1. Test raw milk quality. 2. Blend milk with chocolate flavoring and sugar. 3. Pasteurize mixture at 72°C. 4. Cool to 4°C. 5. Fill into 500ml bottles. 6. Apply labels and seal. 7. Quality taste test.', NULL, 1, '2025-08-27 15:50:04', '2025-08-27 15:50:04', NULL, 10.00, 0),
(2, 1, 'Highland Fresh Milk 1L Production Recipe', 100.000, 2.50, 'Easy', '1. Test raw milk quality and temperature. 2. Pasteurize at 72°C for 15 seconds. 3. Cool to 4°C. 4. Fill into sterilized 1L bottles. 5. Apply Highland Fresh labels and caps. 6. Quality control check. 7. Refrigerate immediately.', NULL, 1, '2025-08-27 15:50:04', '2025-08-27 15:50:04', NULL, 10.00, 0),
(3, 6, 'Highland Fresh Strawberry Yogurt 500g Production Recipe', 50.000, 8.50, 'Medium', '1. Prepare plain yogurt base (see plain yogurt recipe). 2. Add strawberry flavoring during final mixing. 3. Ensure even distribution. 4. Package in tubs. 5. Quality control for flavor balance. 6. Refrigerate.', NULL, 1, '2025-08-27 15:50:04', '2025-08-27 15:50:04', NULL, 10.00, 0),
(4, 4, 'Highland Fresh White Cheese 200g Production Recipe', 25.000, 24.00, 'Hard', '1. Heat milk to 32°C. 2. Add cheese cultures and rennet. 3. Form curds (2-3 hours). 4. Drain whey. 5. Press curds. 6. Salt and age for 12 hours minimum. 7. Package in tubs. 8. Quality control for texture and taste.', NULL, 1, '2025-08-27 15:50:04', '2025-08-27 15:50:04', NULL, 10.00, 0),
(5, 5, 'Highland Fresh Yogurt Plain 500g Production Recipe', 50.000, 8.00, 'Medium', '1. Heat milk to 85°C and cool to 45°C. 2. Add yogurt cultures. 3. Incubate at 42°C for 4-6 hours. 4. Cool to 4°C. 5. Package in tubs. 6. Quality control for taste and consistency. 7. Refrigerate.', NULL, 1, '2025-08-27 15:50:04', '2026-01-04 10:09:44', 5.00, 20.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `production_wastage_logs`
--

CREATE TABLE `production_wastage_logs` (
  `wastage_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `log_date` datetime DEFAULT current_timestamp(),
  `stage` enum('Receiving','Pasteurization','Bottling','Storage') NOT NULL,
  `material_type` enum('Raw Milk','Processed Milk','Bottle','Cap','Label') NOT NULL,
  `quantity_wasted` decimal(10,3) NOT NULL,
  `reason` text DEFAULT NULL COMMENT 'e.g., Spillage, Machine Error, Contamination',
  `reported_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL DEFAULT 1,
  `price` decimal(10,2) NOT NULL CHECK (`price` > 0),
  `cost` decimal(10,2) DEFAULT 0.00 CHECK (`cost` >= 0),
  `quantity_on_hand` decimal(10,3) NOT NULL DEFAULT 0.000 CHECK (`quantity_on_hand` >= 0),
  `reorder_level` decimal(10,3) NOT NULL DEFAULT 0.000 CHECK (`reorder_level` >= 0),
  `max_stock_level` decimal(10,3) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'Product expiry date',
  `milk_source_cooperative` varchar(255) DEFAULT NULL COMMENT 'Highland Fresh: Which cooperative provided the milk',
  `batch_lot_number` varchar(100) DEFAULT NULL COMMENT 'Highland Fresh: Batch/Lot number for traceability',
  `production_date` date DEFAULT NULL COMMENT 'Highland Fresh: When product was processed',
  `cold_chain_temp_min` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Minimum storage temperature in Celsius',
  `cold_chain_temp_max` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Maximum storage temperature in Celsius',
  `quality_grade` enum('Economy','Standard','Premium') DEFAULT 'Standard' COMMENT 'Highland Fresh: Product quality grade',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `standard_order_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Standard quantity to order for this product',
  `auto_reorder_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Automatic reorder quantity (usually 2x reorder_level)',
  `min_order_quantity` decimal(10,3) DEFAULT 1.000 COMMENT 'Minimum quantity per order',
  `max_order_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Maximum quantity per order (if applicable)',
  `last_order_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Last ordered quantity for this product',
  `avg_monthly_usage` decimal(10,3) DEFAULT NULL COMMENT 'Average monthly usage for forecasting'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `name`, `sku`, `category_id`, `unit_id`, `price`, `cost`, `quantity_on_hand`, `reorder_level`, `max_stock_level`, `barcode`, `description`, `expiry_date`, `milk_source_cooperative`, `batch_lot_number`, `production_date`, `cold_chain_temp_min`, `cold_chain_temp_max`, `quality_grade`, `is_active`, `created_at`, `updated_at`, `standard_order_quantity`, `auto_reorder_quantity`, `min_order_quantity`, `max_order_quantity`, `last_order_quantity`, `avg_monthly_usage`) VALUES
(1, 'Highland Fresh Milk 1L', 'HF-MILK-001', 6, 8, 175.00, 140.00, 255.000, 10.000, 100.000, 'HF001001', 'Highland Fresh 100% pure cow milk, 1 liter bottle', '2025-09-15', 'Dalwangan Dairy Cooperative', 'HF-20250820-001', '2025-08-20', 2.0, 6.0, 'Premium', 1, '2025-08-01 17:58:26', '2026-01-04 09:33:24', 500.000, 1000.000, 100.000, 2000.000, NULL, 15000.000),
(2, 'Highland Fresh Chocolate Milk 500ml', 'HF-CHOC-002', 7, 8, 95.00, 75.00, 233.000, 8.000, 50.000, 'HF002001', 'Highland Fresh chocolate flavored milk, 500ml bottle', '2025-09-10', 'Bukidnon Dairy Cooperative', 'HF-20250818-002', '2025-08-18', 2.0, 6.0, 'Standard', 1, '2025-08-01 17:58:27', '2026-01-04 07:38:06', 500.000, 1000.000, 100.000, 2000.000, NULL, 15000.000),
(3, 'Highland Fresh Queso de Oro 250g', 'HF-GOUDA-003', 9, 8, 285.00, 225.00, 34.000, 5.000, 30.000, 'HF003001', 'Highland Fresh artisanal Gouda cheese (Queso de Oro), aged 3 months', '2025-12-15', 'Malaybalay Cheese Artisans', 'HF-20250815-003', '2025-08-15', 8.0, 12.0, 'Premium', 1, '2025-08-01 17:58:27', '2025-10-23 04:41:08', 10.000, 15.000, 1.000, NULL, NULL, NULL),
(4, 'Highland Fresh White Cheese 200g', 'HF-WHITE-004', 10, 8, 165.00, 135.00, 30.000, 8.000, 40.000, 'HF004001', 'Highland Fresh fresh white cheese, soft and creamy', '2025-09-30', 'Misamis Oriental Dairy Cooperative', 'HF-20250819-004', '2025-08-19', 4.0, 8.0, 'Standard', 1, '2025-08-01 17:58:27', '2025-10-23 04:41:08', 12.000, 24.000, 1.000, NULL, NULL, NULL),
(5, 'Highland Fresh Yogurt Plain 500g', 'HF-YOGURT-005', 12, 8, 125.00, 95.00, 185.000, 6.000, 35.000, 'HF005001', 'Highland Fresh natural plain yogurt, rich and creamy', '2025-09-05', 'Dalwangan Dairy Cooperative', 'HF-20250817-005', '2025-08-17', 2.0, 6.0, 'Premium', 1, '2025-08-01 17:58:27', '2026-01-04 10:24:50', 15.000, 18.000, 1.000, NULL, NULL, NULL),
(6, 'Highland Fresh Strawberry Yogurt 500g', 'HF-STRWYOG-006', 13, 8, 135.00, 105.00, 41.000, 5.000, 30.000, 'HF006001', 'Highland Fresh strawberry flavored yogurt with real fruit pieces', '2025-09-08', 'Bukidnon Dairy Cooperative', 'HF-20250816-006', '2025-08-16', 2.0, 6.0, 'Standard', 1, '2025-08-01 17:58:27', '2025-10-23 04:41:08', 15.000, 15.000, 1.000, NULL, NULL, NULL),
(7, 'Highland Fresh Butter 250g', 'HF-BUTTER-007', 15, 8, 195.00, 155.00, 124.000, 4.000, 20.000, 'HF007001', 'Highland Fresh creamy butter, made from fresh cream', '2025-08-29', 'Cagayan de Oro Dairy Alliance', 'HF-20250814-007', '2025-08-14', 4.0, 8.0, 'Premium', 1, '2025-08-01 17:58:27', '2025-12-10 00:53:29', 8.000, 12.000, 1.000, NULL, NULL, NULL),
(8, 'Highland Fresh Mango Milk 500ml', 'HF-MANGO-008', 7, 8, 105.00, 85.00, 430.000, 10.000, 45.000, 'HF008001', 'Highland Fresh tropical mango flavored milk drink', '2025-09-12', 'Iligan Dairy Cooperative', 'HF-20250818-008', '2025-08-18', 2.0, 6.0, 'Standard', 1, '2025-08-01 17:58:27', '2025-10-23 22:21:46', 500.000, 1000.000, 100.000, 2000.000, NULL, 15000.000),
(9, 'Highland Fresh Cultured Milk 350ml', 'HF-CULTURE-009', 14, 8, 75.00, 55.00, 332.000, 12.000, 60.000, 'HF009001', 'Highland Fresh fermented cultured milk beverage, probiotic', '2025-09-06', 'Dalwangan Dairy Cooperative', 'HF-20250819-009', '2025-08-19', 2.0, 6.0, 'Premium', 1, '2025-08-01 17:58:27', '2025-08-27 15:24:21', 500.000, 1000.000, 100.000, 2000.000, NULL, 15000.000),
(75, 'Basta', '23232', 15, 7, 23.00, 0.00, 78.000, 1.000, NULL, '23232', '2323', '2025-08-29', NULL, NULL, NULL, NULL, NULL, 'Standard', 1, '2025-08-23 05:10:40', '2025-12-09 12:05:48', 2.000, 3.000, 1.000, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `parent_category_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_categories`
--

INSERT INTO `product_categories` (`category_id`, `category_name`, `description`, `parent_category_id`, `is_active`, `created_at`) VALUES
(1, 'Highland Fresh Dairy', 'Highland Fresh dairy products made from 100% local cow milk', NULL, 1, '2025-08-01 17:58:26'),
(2, 'Liquid Milk', 'Fresh milk and flavored milk products', 1, 1, '2025-08-01 17:58:26'),
(3, 'Cheese Products', 'Artisanal cheeses including Highland Fresh specialties', 1, 1, '2025-08-01 17:58:26'),
(4, 'Dairy Desserts', 'Yogurt and cultured milk products', 1, 1, '2025-08-01 17:58:26'),
(5, 'Butter & Creamery', 'Butter and other creamery by-products', 1, 1, '2025-08-01 17:58:26'),
(6, 'Fresh Milk - Plain', 'Plain fresh whole milk', 2, 1, '2025-08-01 17:58:27'),
(7, 'Flavored Milk', 'Sweet and fruit flavored milk drinks', 2, 1, '2025-08-01 17:58:27'),
(8, 'Milk Bottles & Containers', 'Bottled milk products for retail', 2, 1, '2025-08-01 17:58:27'),
(9, 'Gouda Cheese', 'Highland Fresh Gouda cheese (Queso de Oro)', 3, 1, '2025-08-01 17:58:27'),
(10, 'White Cheese', 'Fresh white cheese varieties', 3, 1, '2025-08-01 17:58:27'),
(11, 'Aged Cheese', 'Matured cheese products from the plant', 3, 1, '2025-08-01 17:58:27'),
(12, 'Plain Yogurt', 'Natural yogurt products', 4, 1, '2025-08-01 17:58:27'),
(13, 'Flavored Yogurt', 'Fruit and sweet flavored yogurts', 4, 1, '2025-08-01 17:58:27'),
(14, 'Cultured Milk', 'Fermented milk beverages', 4, 1, '2025-08-01 17:58:27'),
(15, 'Fresh Butter', 'Highland Fresh butter products', 5, 1, '2025-08-01 17:58:27'),
(16, 'Specialty Creamery', 'Other dairy by-products and cream', 5, 1, '2025-08-01 17:58:27');

-- --------------------------------------------------------

--
-- Stand-in structure for view `product_defaults`
-- (See below for the actual view)
--
CREATE TABLE `product_defaults` (
`product_id` int(11)
,`product_name` varchar(100)
,`category_id` int(11)
,`category_name` varchar(100)
,`unit` varchar(20)
,`unit_cost` decimal(10,2)
,`standard_order_quantity` decimal(10,3)
,`auto_reorder_quantity` decimal(10,3)
,`min_order_quantity` decimal(10,3)
,`max_order_quantity` decimal(10,3)
,`last_order_quantity` decimal(10,3)
,`avg_monthly_usage` decimal(10,3)
,`quantity_on_hand` decimal(10,3)
,`reorder_level` decimal(10,3)
,`stock_status` varchar(12)
,`suggested_quantity` decimal(10,3)
);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `po_id` int(11) NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'User who created the PO',
  `total_amount` decimal(10,2) NOT NULL CHECK (`total_amount` >= 0),
  `status_id` int(11) NOT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `expected_delivery_date` date DEFAULT NULL,
  `received_date` timestamp NULL DEFAULT NULL,
  `purchase_type` enum('raw_milk','packaging_materials','general_materials','bacterial_cultures','packaging','general','equipment') DEFAULT 'general_materials',
  `milk_quality_grade` enum('Grade A','Grade B','Grade C') DEFAULT NULL COMMENT 'Highland Fresh: Required milk quality for dairy purchases',
  `cold_chain_temp_min` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Minimum storage temperature for dairy products',
  `cold_chain_temp_max` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Maximum storage temperature for dairy products',
  `cooperative_delivery_time` time DEFAULT NULL COMMENT 'Highland Fresh: Preferred delivery time for cooperative milk',
  `is_nmfdc_cooperative` tinyint(1) DEFAULT 0 COMMENT 'Highland Fresh: Is this from NMFDC member cooperative',
  `quality_specifications` text DEFAULT NULL COMMENT 'Highland Fresh: Special quality requirements (fat content, protein, etc.)',
  `collection_station` varchar(255) DEFAULT NULL COMMENT 'Highland Fresh: Which collection station to use',
  `batch_requirements` text DEFAULT NULL COMMENT 'Highland Fresh: Batch/lot number requirements',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delivery_schedule` enum('daily_morning','daily_evening','weekly_bulk','on_demand') DEFAULT NULL,
  `batch_tracking_code` varchar(100) DEFAULT NULL,
  `highland_fresh_approved` tinyint(1) DEFAULT 0,
  `highland_fresh_validation_notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`po_id`, `po_number`, `supplier_id`, `user_id`, `total_amount`, `status_id`, `order_date`, `expected_delivery_date`, `received_date`, `purchase_type`, `milk_quality_grade`, `cold_chain_temp_min`, `cold_chain_temp_max`, `cooperative_delivery_time`, `is_nmfdc_cooperative`, `quality_specifications`, `collection_station`, `batch_requirements`, `notes`, `created_at`, `updated_at`, `delivery_schedule`, `batch_tracking_code`, `highland_fresh_approved`, `highland_fresh_validation_notes`) VALUES
(1, 'HF-PO-20260104-001', 1, 1, 7500.00, 14, '2026-01-04 03:36:16', NULL, '2026-01-04 04:03:22', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0001', '2026-01-04 03:36:16', '2026-01-04 04:03:22', NULL, NULL, 0, NULL),
(4, 'HF-PO-20260104-004', 1, 1, 1250.00, 14, '2026-01-04 06:53:48', NULL, '2026-01-04 06:58:02', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0004', '2026-01-04 06:53:48', '2026-01-04 06:58:02', NULL, NULL, 0, NULL),
(5, 'HF-PO-20260104-003', 1, 1, 250.00, 14, '2026-01-04 06:54:10', NULL, '2026-01-04 06:58:05', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0003', '2026-01-04 06:54:10', '2026-01-04 06:58:05', NULL, NULL, 0, NULL),
(6, 'HF-PO-20260104-005', 1, 1, 500.00, 14, '2026-01-04 07:31:05', NULL, '2026-01-04 07:34:01', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0005', '2026-01-04 07:31:05', '2026-01-04 07:34:01', NULL, NULL, 0, NULL),
(7, 'HF-PO-20260104-006', 1, 1, 500.00, 14, '2026-01-04 07:32:31', NULL, '2026-01-04 07:34:03', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0006', '2026-01-04 07:32:31', '2026-01-04 07:34:03', NULL, NULL, 0, NULL),
(8, 'HF-PO-20260104-007', 1, 1, 2500.00, 14, '2026-01-04 07:33:38', NULL, '2026-01-04 07:34:05', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0007', '2026-01-04 07:33:38', '2026-01-04 07:34:05', NULL, NULL, 0, NULL),
(9, 'HF-PO-20260104-008', 1, 1, 700.00, 14, '2026-01-04 07:40:39', NULL, '2026-01-04 07:41:18', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0008', '2026-01-04 07:40:39', '2026-01-04 07:41:18', NULL, NULL, 0, NULL),
(10, 'HF-PO-20260104-011', 1, 1, 500.00, 14, '2026-01-04 08:24:20', NULL, '2026-01-04 08:25:10', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0011', '2026-01-04 08:24:20', '2026-01-04 08:25:10', NULL, NULL, 0, NULL),
(11, 'HF-PO-20260104-012', 1, 1, 600.00, 14, '2026-01-04 08:28:36', NULL, '2026-01-04 08:29:23', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0012', '2026-01-04 08:28:36', '2026-01-04 08:29:23', NULL, NULL, 0, NULL),
(12, 'HF-PO-20260104-013', 1, 1, 700.00, 14, '2026-01-04 09:58:16', NULL, '2026-01-04 10:29:21', 'general_materials', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, 'Auto-generated from Requisition #REQ-20260104-0013', '2026-01-04 09:58:16', '2026-01-04 10:29:21', NULL, NULL, 0, NULL);

--
-- Triggers `purchase_orders`
--
DELIMITER $$
CREATE TRIGGER `tr_po_auto_receive_quantities` AFTER UPDATE ON `purchase_orders` FOR EACH ROW BEGIN
                IF NEW.status_id = 14 AND OLD.status_id != 14 THEN
                    UPDATE purchase_order_items 
                    SET received_quantity = ordered_quantity
                    WHERE po_id = NEW.po_id;
                END IF;
            END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Stand-in structure for view `purchase_orders_simplified`
-- (See below for the actual view)
--
CREATE TABLE `purchase_orders_simplified` (
`po_id` int(11)
,`po_number` varchar(50)
,`supplier_id` int(11)
,`supplier_name` varchar(255)
,`user_id` int(11)
,`created_by` varchar(50)
,`total_amount` decimal(10,2)
,`status_id` int(11)
,`status_display` varchar(50)
,`order_date` timestamp
,`expected_delivery_date` date
,`received_date` timestamp
,`notes` text
,`created_at` timestamp
,`updated_at` timestamp
,`total_items` bigint(21)
,`total_quantity_ordered` decimal(32,3)
,`total_quantity_received` decimal(32,3)
);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `po_item_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `ordered_quantity` decimal(10,3) NOT NULL CHECK (`ordered_quantity` > 0),
  `received_quantity` decimal(10,3) DEFAULT 0.000 COMMENT 'Total processed (accepted + rejected)',
  `accepted_quantity` decimal(10,3) DEFAULT 0.000 COMMENT 'Quantity accepted (increases inventory)',
  `rejected_quantity` decimal(10,3) DEFAULT 0.000 COMMENT 'Quantity rejected (quality issues, tracked only)',
  `unit_cost` decimal(10,2) NOT NULL CHECK (`unit_cost` > 0),
  `line_total` decimal(10,2) NOT NULL CHECK (`line_total` >= 0),
  `expiry_date` date DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL COMMENT 'Highland Fresh: Cooperative batch identifier',
  `milk_source_cooperative` varchar(255) DEFAULT NULL COMMENT 'Highland Fresh: Which cooperative provided this milk',
  `quality_grade_received` enum('Grade A','Grade B','Grade C') DEFAULT NULL COMMENT 'Highland Fresh: Actual quality grade received',
  `temperature_on_receipt` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Temperature when received (°C)',
  `fat_content_percent` decimal(4,2) DEFAULT NULL COMMENT 'Highland Fresh: Milk fat content percentage',
  `protein_content_percent` decimal(4,2) DEFAULT NULL COMMENT 'Highland Fresh: Protein content percentage',
  `quality_test_passed` tinyint(1) DEFAULT 1 COMMENT 'Highland Fresh: Did the item pass quality testing',
  `quality_test_notes` text DEFAULT NULL COMMENT 'Highland Fresh: Quality test results and notes',
  `production_date` date DEFAULT NULL COMMENT 'Highland Fresh: When the dairy product was processed',
  `collection_station_source` varchar(255) DEFAULT NULL COMMENT 'Highland Fresh: Which collection station the milk came from',
  `delivery_truck_id` varchar(20) DEFAULT NULL COMMENT 'Highland Fresh: Delivery vehicle identification',
  `driver_name` varchar(100) DEFAULT NULL COMMENT 'Highland Fresh: Name of delivery driver',
  `highland_fresh_batch_code` varchar(50) DEFAULT NULL COMMENT 'Highland Fresh: Internal batch code for traceability',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `used_default_quantity` tinyint(1) DEFAULT 0 COMMENT 'Whether default quantity suggestion was used',
  `suggested_quantity` int(11) DEFAULT NULL COMMENT 'System-suggested quantity',
  `quantity_source` enum('manual','default','supplier_based','usage_based') DEFAULT 'manual' COMMENT 'Source of quantity decision',
  `raw_material_id` int(11) DEFAULT NULL,
  `temperature_at_receipt` decimal(4,1) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ;

--
-- Dumping data for table `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`po_item_id`, `po_id`, `product_id`, `ordered_quantity`, `received_quantity`, `accepted_quantity`, `rejected_quantity`, `unit_cost`, `line_total`, `expiry_date`, `lot_number`, `batch_number`, `milk_source_cooperative`, `quality_grade_received`, `temperature_on_receipt`, `fat_content_percent`, `protein_content_percent`, `quality_test_passed`, `quality_test_notes`, `production_date`, `collection_station_source`, `delivery_truck_id`, `driver_name`, `highland_fresh_batch_code`, `created_at`, `used_default_quantity`, `suggested_quantity`, `quantity_source`, `raw_material_id`, `temperature_at_receipt`, `rejection_reason`) VALUES
(1, 1, NULL, 150.000, 150.000, 150.000, 0.000, 50.00, 7500.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-001-RM014', '2026-01-04 03:36:16', 0, NULL, 'manual', 14, NULL, NULL),
(2, 4, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-004-RM015', '2026-01-04 06:53:48', 0, NULL, 'manual', 15, NULL, NULL),
(3, 4, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-004-RM016', '2026-01-04 06:53:48', 0, NULL, 'manual', 16, NULL, NULL),
(4, 4, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-004-RM017', '2026-01-04 06:53:48', 0, NULL, 'manual', 17, NULL, NULL),
(5, 4, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-004-RM018', '2026-01-04 06:53:48', 0, NULL, 'manual', 18, NULL, NULL),
(6, 4, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-004-RM019', '2026-01-04 06:53:48', 0, NULL, 'manual', 19, NULL, NULL),
(7, 5, NULL, 5.000, 5.000, 5.000, 0.000, 50.00, 250.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-005-RM012', '2026-01-04 06:54:10', 0, NULL, 'manual', 12, NULL, NULL),
(8, 6, NULL, 10.000, 10.000, 10.000, 0.000, 50.00, 500.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-006-RM012', '2026-01-04 07:31:05', 0, NULL, 'manual', 12, NULL, NULL),
(9, 7, NULL, 10.000, 10.000, 10.000, 0.000, 50.00, 500.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-007-RM013', '2026-01-04 07:32:31', 0, NULL, 'manual', 13, NULL, NULL),
(10, 8, NULL, 50.000, 50.000, 50.000, 0.000, 50.00, 2500.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-008-RM013', '2026-01-04 07:33:38', 0, NULL, 'manual', 13, NULL, NULL),
(11, 9, NULL, 10.000, 10.000, 10.000, 0.000, 70.00, 700.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-009-RM013', '2026-01-04 07:40:39', 0, NULL, 'manual', 13, NULL, NULL),
(12, 10, NULL, 1.000, 1.000, 1.000, 0.000, 500.00, 500.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-010-RM016', '2026-01-04 08:24:20', 0, NULL, 'manual', 16, NULL, NULL),
(13, 11, NULL, 1.000, 1.000, 1.000, 0.000, 600.00, 600.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-011-RM016', '2026-01-04 08:28:36', 0, NULL, 'manual', 16, NULL, NULL),
(14, 12, NULL, 1.000, 1.000, 1.000, 0.000, 700.00, 700.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, 'HF-20260104-012-RM016', '2026-01-04 09:58:16', 0, NULL, 'manual', 16, NULL, NULL);

--
-- Triggers `purchase_order_items`
--
DELIMITER $$
CREATE TRIGGER `prevent_highland_fresh_product_purchase_insert` BEFORE INSERT ON `purchase_order_items` FOR EACH ROW BEGIN
  DECLARE product_name VARCHAR(255);
  DECLARE error_message VARCHAR(500);

  
  IF NEW.product_id IS NOT NULL THEN
    
    SELECT name INTO product_name FROM products WHERE product_id = NEW.product_id;

    
    IF product_name LIKE '%Highland Fresh%' OR product_name LIKE '%HF-%' OR product_name LIKE 'HF %' THEN
      SET error_message = CONCAT('Highland Fresh Business Rule Violation: Cannot purchase Highland Fresh branded product "', product_name, '". Highland Fresh produces these items, it does not procure them from suppliers.');
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;
  END IF;

  
  IF NEW.product_id IS NOT NULL AND NEW.raw_material_id IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Highland Fresh Business Rule: Purchase order item cannot have both product_id and raw_material_id set.';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `prevent_highland_fresh_product_purchase_update` BEFORE UPDATE ON `purchase_order_items` FOR EACH ROW BEGIN
  DECLARE product_name VARCHAR(255);
  DECLARE error_message VARCHAR(500);

  
  IF NEW.product_id IS NOT NULL THEN
    
    SELECT name INTO product_name FROM products WHERE product_id = NEW.product_id;

    
    IF product_name LIKE '%Highland Fresh%' OR product_name LIKE '%HF-%' OR product_name LIKE 'HF %' THEN
      SET error_message = CONCAT('Highland Fresh Business Rule Violation: Cannot purchase Highland Fresh branded product "', product_name, '". Highland Fresh produces these items, it does not procure them from suppliers.');
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = error_message;
    END IF;
  END IF;

  
  IF NEW.product_id IS NOT NULL AND NEW.raw_material_id IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Highland Fresh Business Rule: Purchase order item cannot have both product_id and raw_material_id set.';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requisitions`
--

CREATE TABLE `purchase_requisitions` (
  `requisition_id` int(11) NOT NULL,
  `requisition_number` varchar(50) NOT NULL,
  `requested_by` int(11) NOT NULL COMMENT 'FK to staff_users',
  `request_date` datetime DEFAULT current_timestamp(),
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  `reason` text DEFAULT NULL COMMENT 'Reason for request (e.g., Low Stock Alert)',
  `status` enum('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED','CONVERTED') DEFAULT 'DRAFT',
  `approved_by` int(11) DEFAULT NULL COMMENT 'FK to staff_users (Admin/Finance)',
  `approved_date` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `converted_to_po_id` int(11) DEFAULT NULL COMMENT 'FK to purchase_orders if converted',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Purchase requisitions from warehouse staff';

--
-- Dumping data for table `purchase_requisitions`
--

INSERT INTO `purchase_requisitions` (`requisition_id`, `requisition_number`, `requested_by`, `request_date`, `priority`, `reason`, `status`, `approved_by`, `approved_date`, `rejection_reason`, `converted_to_po_id`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'REQ-20260104-0001', 1, '2026-01-04 11:35:23', 'URGENT', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 11:36:16', NULL, 1, '', '2026-01-04 03:35:23', '2026-01-04 03:36:17'),
(2, 'REQ-20260104-0002', 1, '2026-01-04 14:29:51', 'HIGH', 'Low Stock Alert', 'REJECTED', 1, '2026-01-04 14:50:30', 'patakag rag set sa price', NULL, 'Bulk requisition for all low stock items', '2026-01-04 06:29:51', '2026-01-04 06:50:30'),
(3, 'REQ-20260104-0003', 1, '2026-01-04 14:52:05', 'HIGH', 'Production Requirement', 'CONVERTED', 1, '2026-01-04 14:54:10', NULL, 5, 'boom', '2026-01-04 06:52:05', '2026-01-04 06:54:10'),
(4, 'REQ-20260104-0004', 1, '2026-01-04 14:53:10', 'HIGH', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 14:53:48', NULL, 4, 'Bulk requisition for all low stock items', '2026-01-04 06:53:10', '2026-01-04 06:53:48'),
(5, 'REQ-20260104-0005', 1, '2026-01-04 15:30:21', 'MEDIUM', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 15:31:05', NULL, 6, '', '2026-01-04 07:30:21', '2026-01-04 07:31:05'),
(6, 'REQ-20260104-0006', 1, '2026-01-04 15:32:13', 'HIGH', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 15:32:31', NULL, 7, '', '2026-01-04 07:32:13', '2026-01-04 07:32:31'),
(7, 'REQ-20260104-0007', 1, '2026-01-04 15:33:18', 'HIGH', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 15:33:38', NULL, 8, '', '2026-01-04 07:33:18', '2026-01-04 07:33:38'),
(8, 'REQ-20260104-0008', 1, '2026-01-04 15:40:07', 'MEDIUM', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 15:40:39', NULL, 9, '', '2026-01-04 07:40:07', '2026-01-04 07:40:39'),
(9, 'REQ-20260104-0009', 1, '2026-01-04 16:09:46', 'MEDIUM', 'Emergency Replenishment', 'REJECTED', 1, '2026-01-04 16:18:17', 'POtanginamo', NULL, '', '2026-01-04 08:09:46', '2026-01-04 08:18:17'),
(10, 'REQ-20260104-0010', 1, '2026-01-04 16:19:23', 'HIGH', 'Low Stock Alert', 'CANCELLED', NULL, NULL, NULL, NULL, '', '2026-01-04 08:19:23', '2026-01-04 08:19:26'),
(11, 'REQ-20260104-0011', 1, '2026-01-04 16:19:54', 'HIGH', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 16:24:20', NULL, 10, '', '2026-01-04 08:19:54', '2026-01-04 08:24:20'),
(12, 'REQ-20260104-0012', 1, '2026-01-04 16:28:08', 'MEDIUM', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 16:28:36', NULL, 11, '', '2026-01-04 08:28:08', '2026-01-04 08:28:36'),
(13, 'REQ-20260104-0013', 1, '2026-01-04 17:57:38', 'HIGH', 'Low Stock Alert', 'CONVERTED', 1, '2026-01-04 17:58:16', NULL, 12, '', '2026-01-04 09:57:38', '2026-01-04 09:58:16');

--
-- Triggers `purchase_requisitions`
--
DELIMITER $$
CREATE TRIGGER `trg_requisition_number` BEFORE INSERT ON `purchase_requisitions` FOR EACH ROW BEGIN
    DECLARE next_seq INT;
    
    IF NEW.requisition_number IS NULL OR NEW.requisition_number = '' THEN
        SELECT COALESCE(MAX(requisition_id), 0) + 1 INTO next_seq FROM purchase_requisitions;
        SET NEW.requisition_number = CONCAT('REQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(next_seq, 4, '0'));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requisition_items`
--

CREATE TABLE `purchase_requisition_items` (
  `item_id` int(11) NOT NULL,
  `requisition_id` int(11) NOT NULL,
  `item_type` enum('RAW_MATERIAL','PACKAGING','OTHER') DEFAULT 'RAW_MATERIAL',
  `raw_material_id` int(11) DEFAULT NULL COMMENT 'FK to raw_materials if RAW_MATERIAL type',
  `item_name` varchar(255) NOT NULL COMMENT 'Item name (redundant for display)',
  `quantity_requested` decimal(10,2) NOT NULL,
  `unit_of_measure` varchar(50) DEFAULT 'pcs',
  `current_stock` decimal(10,2) DEFAULT NULL COMMENT 'Stock level at time of request',
  `reorder_level` decimal(10,2) DEFAULT NULL COMMENT 'Reorder point for reference',
  `estimated_unit_cost` decimal(10,2) DEFAULT NULL,
  `estimated_total_cost` decimal(12,2) DEFAULT NULL,
  `preferred_supplier_id` int(11) DEFAULT NULL COMMENT 'Suggested supplier',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Items in purchase requisition';

--
-- Dumping data for table `purchase_requisition_items`
--

INSERT INTO `purchase_requisition_items` (`item_id`, `requisition_id`, `item_type`, `raw_material_id`, `item_name`, `quantity_requested`, `unit_of_measure`, `current_stock`, `reorder_level`, `estimated_unit_cost`, `estimated_total_cost`, `preferred_supplier_id`, `notes`) VALUES
(1, 1, 'RAW_MATERIAL', 14, 'Raw Milk', 150.00, 'Liter', NULL, NULL, 50.00, 7500.00, NULL, NULL),
(2, 2, 'RAW_MATERIAL', 15, 'Chocolate Flavoring', 5.00, 'Liter', NULL, NULL, 0.00, 0.00, NULL, NULL),
(3, 2, 'RAW_MATERIAL', 16, 'Yogurt Culture', 5.00, 'Liter', NULL, NULL, 0.00, 0.00, NULL, NULL),
(4, 2, 'RAW_MATERIAL', 17, 'Fruit Flavoring', 5.00, 'Liter', NULL, NULL, 0.00, 0.00, NULL, NULL),
(5, 2, 'RAW_MATERIAL', 18, 'Cheese Culture', 5.00, 'Liter', NULL, NULL, 0.00, 0.00, NULL, NULL),
(6, 2, 'RAW_MATERIAL', 19, 'Salt', 5.00, 'Kilogram', NULL, NULL, 0.00, 0.00, NULL, NULL),
(7, 3, 'RAW_MATERIAL', 12, 'Linx Solvent', 5.00, 'Piece', NULL, NULL, 50.00, 250.00, NULL, NULL),
(8, 4, 'RAW_MATERIAL', 15, 'Chocolate Flavoring', 5.00, 'Liter', NULL, NULL, 50.00, 250.00, NULL, NULL),
(9, 4, 'RAW_MATERIAL', 16, 'Yogurt Culture', 5.00, 'Liter', NULL, NULL, 50.00, 250.00, NULL, NULL),
(10, 4, 'RAW_MATERIAL', 17, 'Fruit Flavoring', 5.00, 'Liter', NULL, NULL, 50.00, 250.00, NULL, NULL),
(11, 4, 'RAW_MATERIAL', 18, 'Cheese Culture', 5.00, 'Liter', NULL, NULL, 50.00, 250.00, NULL, NULL),
(12, 4, 'RAW_MATERIAL', 19, 'Salt', 5.00, 'Kilogram', NULL, NULL, 50.00, 250.00, NULL, NULL),
(13, 5, 'RAW_MATERIAL', 12, 'Linx Solvent', 10.00, 'Piece', NULL, NULL, 50.00, 500.00, NULL, NULL),
(14, 6, 'RAW_MATERIAL', 13, 'Linx Ink', 10.00, 'Piece', NULL, NULL, 50.00, 500.00, NULL, NULL),
(15, 7, 'RAW_MATERIAL', 13, 'Linx Ink', 50.00, 'Piece', NULL, NULL, 50.00, 2500.00, NULL, NULL),
(16, 8, 'RAW_MATERIAL', 13, 'Linx Ink', 10.00, 'Piece', NULL, NULL, 70.00, 700.00, NULL, NULL),
(17, 9, 'RAW_MATERIAL', 6, 'Brown Sugar', 6.00, 'Kilogram', NULL, NULL, 0.00, 0.00, NULL, NULL),
(18, 10, 'RAW_MATERIAL', 11, 'Ribbon Roll', 10.00, 'Piece', NULL, NULL, 50.00, 500.00, NULL, NULL),
(19, 11, 'RAW_MATERIAL', 16, 'Yogurt Culture', 1.00, 'Liter', NULL, NULL, 500.00, 500.00, NULL, NULL),
(20, 12, 'RAW_MATERIAL', 16, 'Yogurt Culture', 1.00, 'Liter', NULL, NULL, 600.00, 600.00, NULL, NULL),
(21, 13, 'RAW_MATERIAL', 16, 'Yogurt Culture', 1.00, 'Liter', NULL, NULL, 700.00, 700.00, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `raw_materials`
--

CREATE TABLE `raw_materials` (
  `raw_material_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `category` varchar(50) NOT NULL,
  `unit_id` int(11) DEFAULT 1,
  `standard_cost` decimal(10,2) DEFAULT 0.00,
  `quantity_on_hand` decimal(10,3) DEFAULT 0.000,
  `reorder_level` decimal(10,3) DEFAULT 0.000,
  `standard_order_quantity` decimal(10,3) DEFAULT 100.000,
  `max_stock_level` decimal(10,3) DEFAULT 0.000,
  `barcode` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `shelf_life_days` int(11) DEFAULT NULL,
  `storage_temp_min` decimal(4,1) DEFAULT NULL,
  `storage_temp_max` decimal(4,1) DEFAULT NULL,
  `quality_grade` enum('Premium','Standard','Economy') DEFAULT 'Standard',
  `supplier_material_code` varchar(100) DEFAULT NULL,
  `highland_fresh_approved` tinyint(1) DEFAULT 0,
  `requires_quality_test` tinyint(1) DEFAULT 1,
  `storage_requirements` text DEFAULT NULL,
  `supplier_category` enum('Dairy Cooperative','Packaging Supplier','Ingredient Supplier','Chemical Supplier','Consumables Supplier') NOT NULL DEFAULT 'Ingredient Supplier',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `raw_materials`
--

INSERT INTO `raw_materials` (`raw_material_id`, `name`, `sku`, `category`, `unit_id`, `standard_cost`, `quantity_on_hand`, `reorder_level`, `standard_order_quantity`, `max_stock_level`, `barcode`, `description`, `shelf_life_days`, `storage_temp_min`, `storage_temp_max`, `quality_grade`, `supplier_material_code`, `highland_fresh_approved`, `requires_quality_test`, `storage_requirements`, `supplier_category`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Bottles 1000ml Clear', 'RM-OTH-001', 'Bottle', 8, 0.00, 4999.000, 1000.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Packaging Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(2, 'Bottles 500ml Clear', 'RM-OTH-002', 'Bottle', 8, 0.00, 5000.000, 1000.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Packaging Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(3, 'Bottles 330ml Clear', 'RM-OTH-003', 'Bottle', 8, 0.00, 4999.000, 1000.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Packaging Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(4, 'Caps', 'RM-OTH-004', 'Cap', 8, 0.00, 19980.000, 5000.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Packaging Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(5, 'White Sugar', 'RM-OTH-005', 'Sweetener', 1, 0.00, 490.000, 50.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(6, 'Brown Sugar', 'RM-OTH-006', 'Sweetener', 1, 0.00, 190.000, 50.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(7, 'Caustic Soda', 'RM-CHM-001', 'Chemicals', 1, 0.00, 50.000, 10.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Chemical Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(8, 'Chlorinix', 'RM-CHM-002', 'Chemicals', 11, 0.00, 19.000, 5.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Chemical Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(9, 'Linol-Liquid Detergent', 'RM-CHM-003', 'Chemicals', 11, 0.00, 10.000, 5.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Chemical Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(10, 'Advacip 200', 'RM-CHM-004', 'Chemicals', 10, 0.00, 10.000, 2.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Chemical Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:16:46'),
(11, 'Ribbon Roll', 'RM-CON-001', 'Consumables', 8, 0.00, 8.950, 2.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Consumables Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:37:39'),
(12, 'Linx Solvent', 'RM-CON-002', 'Consumables', 8, 50.00, 22.925, 2.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Consumables Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 08:25:34'),
(13, 'Linx Ink', 'RM-CON-003', 'Consumables', 8, 70.00, 79.875, 2.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Consumables Supplier', 1, '2025-12-02 06:05:28', '2026-01-04 07:41:18'),
(14, 'Raw Milk', 'RM-RAWMILK-001', 'Dairy', 5, 50.00, 134.875, 100.000, 100.000, 0.000, NULL, 'Fresh raw milk from dairy farmers for production', 2, NULL, NULL, 'Premium', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2025-12-09 06:56:12', '2026-01-04 09:33:03'),
(15, 'Chocolate Flavoring', 'RM-OTH-007', 'Raw Material', 5, 50.00, 4.998, 0.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2026-01-04 05:00:33', '2026-01-04 08:59:49'),
(16, 'Yogurt Culture', 'RM-OTH-008', 'Raw Material', 5, 700.00, 1.000, 0.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2026-01-04 05:00:33', '2026-01-04 10:29:21'),
(17, 'Fruit Flavoring', 'RM-OTH-009', 'Raw Material', 5, 50.00, 5.000, 0.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2026-01-04 05:00:33', '2026-01-04 08:59:49'),
(18, 'Cheese Culture', 'RM-OTH-010', 'Raw Material', 5, 50.00, 5.000, 0.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2026-01-04 05:00:33', '2026-01-04 08:59:49'),
(19, 'Salt', 'RM-OTH-011', 'Raw Material', 1, 50.00, 5.000, 0.000, 100.000, 0.000, NULL, NULL, NULL, NULL, NULL, 'Standard', NULL, 1, 1, NULL, 'Ingredient Supplier', 1, '2026-01-04 05:00:33', '2026-01-04 08:59:49');

-- --------------------------------------------------------

--
-- Stand-in structure for view `raw_materials_inventory_view`
-- (See below for the actual view)
--
CREATE TABLE `raw_materials_inventory_view` (
`raw_material_id` int(11)
,`material_name` varchar(100)
,`sku` varchar(50)
,`category` varchar(50)
,`unit_of_measure` varchar(20)
,`quantity_on_hand` decimal(10,3)
,`reorder_level` decimal(10,3)
,`max_stock_level` decimal(10,3)
,`standard_cost` decimal(10,2)
,`supplier_category` enum('Dairy Cooperative','Individual Farm','Packaging Supplier','Ingredient Supplier','Equipment Supplier')
,`storage_requirements` text
,`stock_status` varchar(14)
,`inventory_value` decimal(20,5)
,`available_suppliers` bigint(21)
,`cheapest_supplier_cost` decimal(10,2)
,`most_expensive_cost` decimal(10,2)
,`supplier_names` mediumtext
);

-- --------------------------------------------------------

--
-- Table structure for table `raw_material_batches`
--

CREATE TABLE `raw_material_batches` (
  `batch_id` int(11) NOT NULL,
  `highland_fresh_batch_code` varchar(50) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `po_item_id` int(11) DEFAULT NULL COMMENT 'Reference to purchase_order_items',
  `supplier_id` int(11) DEFAULT NULL,
  `quantity_received` decimal(10,3) NOT NULL DEFAULT 0.000,
  `current_quantity` decimal(10,3) NOT NULL DEFAULT 0.000 COMMENT 'Remaining quantity after consumption',
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `received_date` date NOT NULL COMMENT 'When batch was received - used for FIFO ordering',
  `expiry_date` date DEFAULT NULL COMMENT 'Expiration date - also used for FIFO priority',
  `production_date` date DEFAULT NULL COMMENT 'Manufacturing/production date from supplier',
  `quality_grade_received` enum('Grade A','Grade B','Grade C','Premium','Standard') DEFAULT NULL,
  `temperature_at_receipt` decimal(4,1) DEFAULT NULL,
  `quality_test_required` tinyint(1) DEFAULT 0,
  `quality_test_passed` tinyint(1) DEFAULT NULL,
  `quality_test_date` datetime DEFAULT NULL,
  `quality_test_notes` text DEFAULT NULL,
  `storage_location` varchar(100) DEFAULT NULL COMMENT 'Physical location in warehouse',
  `status` enum('PENDING','RECEIVED','APPROVED','CONSUMED','EXPIRED','REJECTED','DISCARDED') DEFAULT 'PENDING',
  `highland_fresh_approved` tinyint(1) DEFAULT 0,
  `milk_source_cooperative` varchar(255) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Raw material batch tracking for FIFO inventory management';

--
-- Dumping data for table `raw_material_batches`
--

INSERT INTO `raw_material_batches` (`batch_id`, `highland_fresh_batch_code`, `raw_material_id`, `po_item_id`, `supplier_id`, `quantity_received`, `current_quantity`, `unit_cost`, `received_date`, `expiry_date`, `production_date`, `quality_grade_received`, `temperature_at_receipt`, `quality_test_required`, `quality_test_passed`, `quality_test_date`, `quality_test_notes`, `storage_location`, `status`, `highland_fresh_approved`, `milk_source_cooperative`, `lot_number`, `notes`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 'RMR-20250602-001', 14, NULL, 1, 100.000, 0.000, 40.00, '2025-06-02', '2025-06-04', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection RMR-20250602-001\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-09 06:57:46', '2026-01-01 11:18:31', NULL),
(2, 'RMR-20250602-002', 14, NULL, 1, 100.000, 0.000, 40.00, '2025-06-02', '2025-06-04', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection RMR-20250602-002\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-09 06:57:46', '2026-01-01 11:18:31', NULL),
(3, '66174', 14, NULL, 2, 112.000, 0.000, 40.00, '2025-10-21', '2025-10-23', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection 66174\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-09 06:57:46', '2026-01-01 11:18:31', NULL),
(4, '66175', 14, NULL, 3, 20.000, 0.000, 40.00, '2025-10-21', '2025-10-23', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection 66175\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-09 06:57:46', '2026-01-01 11:18:31', NULL),
(5, 'RMR-20251202-001', 14, NULL, 1, 100.000, 0.000, 40.00, '2025-12-02', '2025-12-04', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection RMR-20251202-001\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-09 06:57:46', '2026-01-01 11:18:31', NULL),
(6, 'RMR-20251202-002', 14, NULL, 3, 10.000, 0.000, 40.00, '2025-12-02', '2025-12-04', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection RMR-20251202-002\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]\n[DISCARDED: 2026-01-01 19:25:41 - ANTIBIOTICS]', '2025-12-09 06:57:46', '2026-01-01 11:25:41', NULL),
(7, 'RMR-20251209-001', 14, NULL, 3, 10.000, 0.000, 40.00, '2025-12-09', '2025-12-11', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, 'Highland Fresh', NULL, 'Migrated from QC milk collection RMR-20251209-001\n[DISCARDED: 2026-01-01 19:25:47 - HIGH_ACIDITY]', '2025-12-09 06:57:46', '2026-01-01 11:25:47', NULL),
(8, 'INIT-1-20251209', 1, NULL, NULL, 5000.000, 4999.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-10 01:34:18', NULL),
(9, 'INIT-2-20251209', 2, NULL, NULL, 5000.000, 5000.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(10, 'INIT-3-20251209', 3, NULL, NULL, 5000.000, 4999.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:05:13', NULL),
(11, 'INIT-4-20251209', 4, NULL, NULL, 20000.000, 19980.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-10 00:56:05', NULL),
(12, 'INIT-5-20251209', 5, NULL, NULL, 490.000, 490.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(13, 'INIT-6-20251209', 6, NULL, NULL, 190.000, 190.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(14, 'INIT-7-20251209', 7, NULL, NULL, 50.000, 50.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(15, 'INIT-8-20251209', 8, NULL, NULL, 20.000, 19.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-10 01:34:18', NULL),
(16, 'INIT-9-20251209', 9, NULL, NULL, 10.000, 10.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(17, 'INIT-10-20251209', 10, NULL, NULL, 10.000, 10.000, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2025-12-09 12:01:55', NULL),
(18, 'INIT-11-20251209', 11, NULL, NULL, 10.000, 8.950, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2026-01-04 07:37:39', NULL),
(19, 'INIT-12-20251209', 12, NULL, NULL, 10.000, 7.925, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2026-01-04 07:37:39', NULL),
(20, 'INIT-13-20251209', 13, NULL, NULL, 10.000, 9.875, 0.00, '2025-12-09', NULL, NULL, 'Standard', NULL, 0, NULL, NULL, NULL, NULL, 'APPROVED', 1, NULL, NULL, 'Initial batch created for existing inventory on 2025-12-09 20:01:55. This is the starting balance before batch tracking was enabled.', '2025-12-09 12:01:55', '2026-01-04 07:37:39', NULL),
(21, 'RMR-20251210-001', 14, NULL, 4, 40.000, 0.000, 40.00, '2025-12-10', '2025-12-12', NULL, 'Grade A', NULL, 0, NULL, NULL, NULL, NULL, 'DISCARDED', 1, NULL, NULL, 'Auto-synced from milk_daily_collections\n[DISCARDED: 2026-01-01 19:18:31 - REJECTED]', '2025-12-10 00:51:25', '2026-01-01 11:18:31', NULL),
(22, 'HF-20260104-001-RM014', 14, 1, 1, 150.000, 134.875, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 04:03:21', '2026-01-04 09:33:03', NULL),
(23, 'HF-20260104-004-RM018', 18, 5, 1, 5.000, 5.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 06:58:02', '2026-01-04 06:58:02', NULL),
(24, 'HF-20260104-004-RM015', 15, 2, 1, 5.000, 4.998, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 06:58:02', '2026-01-04 07:37:39', NULL),
(25, 'HF-20260104-004-RM017', 17, 4, 1, 5.000, 5.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 06:58:02', '2026-01-04 06:58:02', NULL),
(26, 'HF-20260104-004-RM019', 19, 6, 1, 5.000, 5.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 06:58:02', '2026-01-04 06:58:02', NULL),
(27, 'HF-20260104-004-RM016', 16, 3, 1, 5.000, 0.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 1, NULL, NULL, NULL, '2026-01-04 06:58:02', '2026-01-04 09:54:03', NULL),
(28, 'HF-20260104-005-RM012', 12, 7, 1, 5.000, 5.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 06:58:05', '2026-01-04 06:58:05', NULL),
(29, 'HF-20260104-006-RM012', 12, 8, 1, 10.000, 10.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 07:34:01', '2026-01-04 07:34:01', NULL),
(30, 'HF-20260104-007-RM013', 13, 9, 1, 10.000, 10.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 07:34:03', '2026-01-04 07:34:03', NULL),
(31, 'HF-20260104-008-RM013', 13, 10, 1, 50.000, 50.000, 50.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 07:34:05', '2026-01-04 07:34:05', NULL),
(32, 'HF-20260104-009-RM013', 13, 11, 1, 10.000, 10.000, 70.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 07:41:18', '2026-01-04 07:41:18', NULL),
(33, 'HF-20260104-010-RM016', 16, 12, 1, 1.000, 0.000, 500.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 1, NULL, NULL, NULL, '2026-01-04 08:25:10', '2026-01-04 09:54:03', NULL),
(34, 'HF-20260104-011-RM016', 16, 13, 1, 1.000, 0.000, 600.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 1, NULL, NULL, NULL, '2026-01-04 08:29:23', '2026-01-04 09:54:03', NULL),
(35, 'HF-20260104-YC001', 16, NULL, NULL, 4.000, 0.000, 50.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 0, NULL, NULL, NULL, '2026-01-04 10:03:08', '2026-01-04 10:24:32', NULL),
(36, 'HF-20260104-YC002', 16, NULL, NULL, 1.000, 0.000, 500.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 0, NULL, NULL, NULL, '2026-01-04 10:03:08', '2026-01-04 10:24:32', NULL),
(37, 'HF-20260104-YC003', 16, NULL, NULL, 1.000, 0.000, 600.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'CONSUMED', 0, NULL, NULL, NULL, '2026-01-04 10:03:08', '2026-01-04 10:24:32', NULL),
(38, 'HF-20260104-YC001', 16, NULL, NULL, 4.000, 4.000, 50.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 0, NULL, NULL, NULL, '2026-01-04 10:08:21', '2026-01-04 10:08:21', NULL),
(39, 'HF-20260104-YC002', 16, NULL, NULL, 1.000, 1.000, 500.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 0, NULL, NULL, NULL, '2026-01-04 10:08:21', '2026-01-04 10:08:21', NULL),
(40, 'HF-20260104-YC003', 16, NULL, NULL, 1.000, 1.000, 600.00, '2026-01-04', '2026-02-04', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 0, NULL, NULL, NULL, '2026-01-04 10:08:21', '2026-01-04 10:08:21', NULL),
(41, 'HF-20260104-012-RM016', 16, 14, 1, 1.000, 1.000, 700.00, '2026-01-04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 'RECEIVED', 1, NULL, NULL, NULL, '2026-01-04 10:29:21', '2026-01-04 10:29:21', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `raw_material_consumption`
--

CREATE TABLE `raw_material_consumption` (
  `consumption_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL COMMENT 'Reference to raw_material_batches',
  `highland_fresh_batch_code` varchar(50) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `production_batch_id` int(11) DEFAULT NULL COMMENT 'Reference to production_batches',
  `quantity_consumed` decimal(10,3) NOT NULL,
  `consumption_date` datetime NOT NULL DEFAULT current_timestamp(),
  `consumption_reason` enum('PRODUCTION','WASTAGE','EXPIRED','QUALITY_REJECT','ADJUSTMENT') DEFAULT 'PRODUCTION',
  `consumed_by` int(11) DEFAULT NULL COMMENT 'User who performed the consumption',
  `verified_by` int(11) DEFAULT NULL COMMENT 'User who verified FIFO compliance',
  `highland_fresh_traceability` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Full traceability data for audit' CHECK (json_valid(`highland_fresh_traceability`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Raw material consumption tracking for FIFO traceability';

--
-- Dumping data for table `raw_material_consumption`
--

INSERT INTO `raw_material_consumption` (`consumption_id`, `batch_id`, `highland_fresh_batch_code`, `raw_material_id`, `production_batch_id`, `quantity_consumed`, `consumption_date`, `consumption_reason`, `consumed_by`, `verified_by`, `highland_fresh_traceability`, `notes`, `created_at`) VALUES
(1, 18, 'INIT-11-20251209', 11, 3, 1.000, '2025-12-09 20:05:13', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251209-8317\",\"product_id\":75,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-09 12:05:13'),
(2, 10, 'INIT-3-20251209', 3, 3, 1.000, '2025-12-09 20:05:13', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251209-8317\",\"product_id\":75,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-09 12:05:13'),
(3, 19, 'INIT-12-20251209', 12, 3, 1.000, '2025-12-09 20:05:14', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251209-8317\",\"product_id\":75,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-09 12:05:14'),
(4, 7, 'RMR-20251209-001', 14, 4, 10.000, '2025-12-10 08:53:00', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-5741\",\"product_id\":7,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":\"2025-12-11\"}', NULL, '2025-12-10 00:53:00'),
(5, 11, 'INIT-4-20251209', 4, 5, 20.000, '2025-12-10 08:56:05', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-2552\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-10 00:56:05'),
(6, 21, 'RMR-20251210-001', 14, 5, 20.000, '2025-12-10 08:56:05', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-2552\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-10\",\"batch_expiry_date\":\"2025-12-12\"}', NULL, '2025-12-10 00:56:05'),
(7, 19, 'INIT-12-20251209', 12, 5, 1.000, '2025-12-10 08:56:05', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-2552\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-10 00:56:05'),
(8, 15, 'INIT-8-20251209', 8, 6, 1.000, '2025-12-10 09:34:18', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-6373\",\"product_id\":1,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-10 01:34:18'),
(9, 8, 'INIT-1-20251209', 1, 6, 1.000, '2025-12-10 09:34:18', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-6373\",\"product_id\":1,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2025-12-10 01:34:18'),
(10, 21, 'RMR-20251210-001', 14, 6, 1.000, '2025-12-10 09:34:18', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20251210-6373\",\"product_id\":1,\"fifo_order\":1,\"batch_received_date\":\"2025-12-10\",\"batch_expiry_date\":\"2025-12-12\"}', NULL, '2025-12-10 01:34:18'),
(11, 22, 'HF-20260104-001-RM014', 14, 7, 0.125, '2026-01-04 15:37:39', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4785\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 07:37:39'),
(12, 24, 'HF-20260104-004-RM015', 15, 7, 0.003, '2026-01-04 15:37:39', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4785\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 07:37:39'),
(13, 20, 'INIT-13-20251209', 13, 7, 0.125, '2026-01-04 15:37:39', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4785\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2026-01-04 07:37:39'),
(14, 19, 'INIT-12-20251209', 12, 7, 0.075, '2026-01-04 15:37:39', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4785\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2026-01-04 07:37:39'),
(15, 18, 'INIT-11-20251209', 11, 7, 0.050, '2026-01-04 15:37:39', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4785\",\"product_id\":2,\"fifo_order\":1,\"batch_received_date\":\"2025-12-09\",\"batch_expiry_date\":null}', NULL, '2026-01-04 07:37:39'),
(16, 22, 'HF-20260104-001-RM014', 14, 8, 15.000, '2026-01-04 17:33:03', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-4958\",\"product_id\":1,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 09:33:03'),
(17, 27, 'HF-20260104-004-RM016', 16, 9, 1.000, '2026-01-04 17:37:57', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-9846\",\"product_id\":5,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 09:37:57'),
(18, 27, 'HF-20260104-004-RM016', 16, 10, 4.000, '2026-01-04 17:54:03', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-5244\",\"product_id\":5,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 09:54:03'),
(19, 33, 'HF-20260104-010-RM016', 16, 10, 1.000, '2026-01-04 17:54:03', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-5244\",\"product_id\":5,\"fifo_order\":2,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 09:54:03'),
(20, 34, 'HF-20260104-011-RM016', 16, 10, 1.000, '2026-01-04 17:54:03', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-5244\",\"product_id\":5,\"fifo_order\":3,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":null}', NULL, '2026-01-04 09:54:03'),
(21, 35, 'HF-20260104-YC001', 16, 11, 4.000, '2026-01-04 18:24:32', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-2943\",\"product_id\":5,\"fifo_order\":1,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":\"2026-02-04\"}', NULL, '2026-01-04 10:24:32'),
(22, 36, 'HF-20260104-YC002', 16, 11, 1.000, '2026-01-04 18:24:32', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-2943\",\"product_id\":5,\"fifo_order\":2,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":\"2026-02-04\"}', NULL, '2026-01-04 10:24:32'),
(23, 37, 'HF-20260104-YC003', 16, 11, 1.000, '2026-01-04 18:24:32', 'PRODUCTION', NULL, NULL, '{\"production_batch_number\":\"BATCH-20260104-2943\",\"product_id\":5,\"fifo_order\":3,\"batch_received_date\":\"2026-01-04\",\"batch_expiry_date\":\"2026-02-04\"}', NULL, '2026-01-04 10:24:32');

-- --------------------------------------------------------

--
-- Table structure for table `raw_material_quality_tests`
--

CREATE TABLE `raw_material_quality_tests` (
  `test_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `highland_fresh_batch_code` varchar(50) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `test_type` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Types of tests performed' CHECK (json_valid(`test_type`)),
  `scheduled_date` date DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  `test_results` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`test_results`)),
  `pass_fail_status` enum('PENDING','PASS','FAIL','CONDITIONAL') DEFAULT 'PENDING',
  `technician` varchar(100) DEFAULT NULL,
  `highland_fresh_standards` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`highland_fresh_standards`)),
  `highland_fresh_compliance` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`highland_fresh_compliance`)),
  `status` enum('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') DEFAULT 'SCHEDULED',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Quality test tracking for raw material batches';

-- --------------------------------------------------------

--
-- Table structure for table `raw_material_temperature_log`
--

CREATE TABLE `raw_material_temperature_log` (
  `log_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `temperature` decimal(4,1) NOT NULL,
  `event_type` enum('RECEIPT','STORAGE','MONITORING','TRANSFER','ISSUANCE') DEFAULT 'MONITORING',
  `compliance_status` enum('COMPLIANT','NON_COMPLIANT','WARNING','UNKNOWN') DEFAULT 'UNKNOWN',
  `recorded_by` varchar(100) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Temperature monitoring log for cold chain compliance';

-- --------------------------------------------------------

--
-- Table structure for table `recipe_raw_materials`
--

CREATE TABLE `recipe_raw_materials` (
  `id` int(11) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `quantity_required` decimal(10,3) NOT NULL,
  `processing_notes` varchar(255) DEFAULT NULL,
  `is_critical` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `recipe_raw_materials`
--

INSERT INTO `recipe_raw_materials` (`id`, `recipe_id`, `raw_material_id`, `quantity_required`, `processing_notes`, `is_critical`, `created_at`) VALUES
(30, 1, 14, 0.500, '0.5L milk per 500ml bottle', 1, '2026-01-04 05:00:44'),
(32, 1, 15, 0.010, '10ml flavoring per bottle', 0, '2026-01-04 05:00:44'),
(33, 2, 14, 0.150, '1.05L raw milk per 1L bottle (accounts for loss)', 1, '2026-01-04 05:00:44'),
(34, 3, 14, 0.450, '0.45L milk per 500g tub', 1, '2026-01-04 05:00:44'),
(35, 3, 16, 0.005, '5ml culture per tub', 0, '2026-01-04 05:00:44'),
(36, 3, 5, 0.030, '30g sugar per tub', 0, '2026-01-04 05:00:44'),
(37, 3, 17, 0.050, '50ml strawberry flavoring per tub', 0, '2026-01-04 05:00:44'),
(38, 4, 14, 2.000, '2L milk per 200g cheese (high yield loss)', 1, '2026-01-04 05:00:44'),
(39, 4, 18, 0.010, '10ml culture per pack', 0, '2026-01-04 05:00:44'),
(40, 4, 19, 0.005, '5g salt per pack', 0, '2026-01-04 05:00:44'),
(43, 1, 13, 0.500, '', 0, '2026-01-04 06:08:52'),
(44, 1, 12, 0.300, '', 0, '2026-01-04 07:20:09'),
(46, 1, 11, 0.200, '', 0, '2026-01-04 07:25:30'),
(48, 5, 16, 0.100, '', 0, '2026-01-04 09:36:00');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL,
  `sale_number` varchar(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `customer_type` enum('Walk-in','Regular','Wholesale','Cooperative Member','NMFDC Member') DEFAULT 'Walk-in',
  `cooperative_member_id` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL CHECK (`subtotal` >= 0),
  `tax_rate` decimal(5,4) DEFAULT 0.1200,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT 0.00 CHECK (`tax_amount` >= 0),
  `discount_amount` decimal(10,2) DEFAULT 0.00 CHECK (`discount_amount` >= 0),
  `cooperative_discount_percent` decimal(5,2) DEFAULT 0.00,
  `member_discount_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL CHECK (`total_amount` >= 0),
  `payment_method_id` int(11) NOT NULL,
  `payment_status` enum('unpaid','partially_paid','paid') DEFAULT 'unpaid',
  `payment_due_date` date DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `invoice_number` varchar(50) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL COMMENT 'User ID of approver (Warehouse Manager/Admin)',
  `approved_at` datetime DEFAULT NULL COMMENT 'Timestamp when order was approved',
  `dispatched_at` datetime DEFAULT NULL COMMENT 'Timestamp when order was dispatched by warehouse staff',
  `dispatched_by` int(11) DEFAULT NULL COMMENT 'User ID of warehouse staff who dispatched the order',
  `rejected_by` int(11) DEFAULT NULL COMMENT 'User ID of rejector (Warehouse Manager/Admin)',
  `rejected_at` datetime DEFAULT NULL COMMENT 'Timestamp when order was rejected',
  `rejection_reason` text DEFAULT NULL COMMENT 'Reason provided for order rejection',
  `payment_received` decimal(10,2) DEFAULT 0.00,
  `change_amount` decimal(10,2) DEFAULT 0.00,
  `transaction_type` enum('Retail Sale','Wholesale','Cooperative Order','Milk Collection Payment','Product Distribution') DEFAULT 'Retail Sale',
  `delivery_required` tinyint(1) DEFAULT 0,
  `delivery_address` text DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_time` time DEFAULT NULL,
  `cold_chain_required` tinyint(1) DEFAULT 0,
  `temperature_logged` varchar(50) DEFAULT NULL,
  `quality_check_done` tinyint(1) DEFAULT 0,
  `quality_notes` text DEFAULT NULL,
  `batch_codes` text DEFAULT NULL COMMENT 'JSON array of Highland Fresh batch codes',
  `cooperative_codes` text DEFAULT NULL COMMENT 'Cooperative codes involved',
  `origin_farm_ids` text DEFAULT NULL COMMENT 'Source farm tracking',
  `traceability_code` varchar(100) DEFAULT NULL,
  `highland_fresh_receipt_number` varchar(50) DEFAULT NULL,
  `pos_terminal_id` varchar(20) DEFAULT NULL,
  `cashier_shift_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `sale_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `dispatch_date` datetime DEFAULT NULL COMMENT 'When order was dispatched'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Highland Fresh Dairy Sales - Enhanced for NMFDC Operations';

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`sale_id`, `sale_number`, `user_id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `customer_type`, `cooperative_member_id`, `subtotal`, `tax_rate`, `tax_amount`, `discount_amount`, `cooperative_discount_percent`, `member_discount_amount`, `total_amount`, `payment_method_id`, `payment_status`, `payment_due_date`, `amount_paid`, `invoice_number`, `paid_at`, `status_id`, `approved_by`, `approved_at`, `dispatched_at`, `dispatched_by`, `rejected_by`, `rejected_at`, `rejection_reason`, `payment_received`, `change_amount`, `transaction_type`, `delivery_required`, `delivery_address`, `delivery_date`, `delivery_time`, `cold_chain_required`, `temperature_logged`, `quality_check_done`, `quality_notes`, `batch_codes`, `cooperative_codes`, `origin_farm_ids`, `traceability_code`, `highland_fresh_receipt_number`, `pos_terminal_id`, `cashier_shift_id`, `notes`, `sale_date`, `created_at`, `updated_at`, `dispatch_date`) VALUES
(1, 'SO-202512-0001', 1, 1, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 3, 'unpaid', NULL, 0.00, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-09 12:13:09', '2025-12-09 12:13:09', '2025-12-09 12:13:09', NULL),
(2, 'SO-202512-0002', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 2, 'unpaid', NULL, 0.00, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-09 12:24:33', '2025-12-09 12:24:33', '2025-12-09 12:24:33', NULL),
(3, 'SO-202512-0003', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 2, 'unpaid', NULL, 0.00, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-09 12:29:46', '2025-12-09 12:29:46', '2025-12-09 12:29:46', NULL),
(4, 'SO-202512-0004', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 2, 'unpaid', NULL, 0.00, NULL, NULL, 2, 1, '2025-12-09 20:41:15', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-09 12:41:14', '2025-12-09 12:41:14', '2025-12-09 12:41:15', NULL),
(5, 'SO-202512-0005', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 2, 'unpaid', NULL, 0.00, NULL, NULL, 2, 1, '2025-12-10 08:57:49', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-10 00:57:48', '2025-12-10 00:57:48', '2025-12-10 00:57:49', NULL),
(6, 'SO-202512-0006', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 23.00, 0.1200, 2.76, 0.00, 0.00, 0.00, 25.76, 2, 'unpaid', NULL, 0.00, NULL, NULL, 2, 1, '2025-12-10 09:38:25', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-10 01:38:25', '2025-12-10 01:38:25', '2025-12-10 01:38:25', NULL),
(7, 'SO-202512-0007', 1, 2, NULL, NULL, NULL, 'Walk-in', NULL, 175.00, 0.1200, 21.00, 0.00, 0.00, 0.00, 196.00, 2, 'unpaid', NULL, 0.00, NULL, NULL, 2, 1, '2025-12-10 09:39:38', NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 'Retail Sale', 0, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-12-10 01:39:38', '2025-12-10 01:39:38', '2025-12-10 01:39:38', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `sale_item_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_id` int(11) DEFAULT NULL COMMENT 'FK to production_batches - tracks which batch was dispatched (FIFO)',
  `quantity` decimal(10,3) NOT NULL CHECK (`quantity` > 0),
  `unit_price` decimal(10,2) NOT NULL CHECK (`unit_price` > 0),
  `discount_percent` decimal(5,2) DEFAULT 0.00 CHECK (`discount_percent` >= 0 and `discount_percent` <= 100),
  `discount_amount` decimal(10,2) DEFAULT 0.00 CHECK (`discount_amount` >= 0),
  `line_total` decimal(10,2) NOT NULL CHECK (`line_total` >= 0),
  `status_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`sale_item_id`, `sale_id`, `product_id`, `batch_id`, `quantity`, `unit_price`, `discount_percent`, `discount_amount`, `line_total`, `status_id`, `created_at`) VALUES
(1, 1, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-09 12:13:10'),
(2, 2, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-09 12:24:33'),
(3, 3, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-09 12:29:46'),
(4, 4, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-09 12:41:15'),
(5, 5, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-10 00:57:48'),
(6, 6, 75, NULL, 1.000, 23.00, 0.00, 0.00, 23.00, 1, '2025-12-10 01:38:25'),
(7, 7, 1, NULL, 1.000, 175.00, 0.00, 0.00, 175.00, 1, '2025-12-10 01:39:38');

-- --------------------------------------------------------

--
-- Table structure for table `spoilage_log`
--

CREATE TABLE `spoilage_log` (
  `spoilage_id` int(11) NOT NULL,
  `spoilage_reference` varchar(50) NOT NULL COMMENT 'SPL-YYYYMMDD-XXX',
  `source_type` enum('PRODUCTION_BATCH','RAW_MATERIAL','RAW_MILK') NOT NULL,
  `batch_id` int(11) DEFAULT NULL COMMENT 'FK to production_batches if finished goods',
  `raw_material_batch_id` int(11) DEFAULT NULL COMMENT 'FK to raw_material_batches if raw material',
  `milk_collection_id` int(11) DEFAULT NULL COMMENT 'FK to milk_daily_collections if raw milk',
  `product_id` int(11) DEFAULT NULL COMMENT 'FK to products',
  `raw_material_id` int(11) DEFAULT NULL COMMENT 'FK to raw_materials',
  `batch_number` varchar(100) DEFAULT NULL COMMENT 'Batch code for reference',
  `item_name` varchar(255) NOT NULL COMMENT 'Product or material name',
  `spoilage_type` enum('EXPIRED','DAMAGED','CONTAMINATED','QUALITY_REJECT','FIFO_BYPASS') NOT NULL,
  `spoilage_reason` text DEFAULT NULL COMMENT 'Detailed reason for spoilage',
  `quantity_spoiled` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unit_of_measure` varchar(20) DEFAULT 'units',
  `unit_cost` decimal(12,2) DEFAULT 0.00 COMMENT 'Cost per unit',
  `total_loss` decimal(14,2) GENERATED ALWAYS AS (`quantity_spoiled` * `unit_cost`) STORED COMMENT 'Total financial loss',
  `production_date` date DEFAULT NULL COMMENT 'When item was produced/received',
  `expiry_date` date DEFAULT NULL COMMENT 'Original expiry date',
  `spoilage_date` date NOT NULL COMMENT 'When spoilage was recorded',
  `days_expired` int(11) GENERATED ALWAYS AS (to_days(`spoilage_date`) - to_days(`expiry_date`)) STORED COMMENT 'Days past expiry',
  `fifo_bypassed` tinyint(1) DEFAULT 0 COMMENT '1 if newer batch was used before this one',
  `bypass_evidence` text DEFAULT NULL COMMENT 'Details of FIFO bypass if detected',
  `bypassing_batch_id` int(11) DEFAULT NULL COMMENT 'ID of batch that was incorrectly used first',
  `bypass_date` datetime DEFAULT NULL COMMENT 'When FIFO was bypassed',
  `responsible_user_id` int(11) DEFAULT NULL COMMENT 'Staff responsible (if identifiable)',
  `reported_by` int(11) DEFAULT NULL COMMENT 'User who reported the spoilage',
  `approved_by` int(11) DEFAULT NULL COMMENT 'Finance officer who approved write-off',
  `status` enum('PENDING','VERIFIED','APPROVED','WRITTEN_OFF','RECOVERED') DEFAULT 'PENDING',
  `recovery_amount` decimal(14,2) DEFAULT 0.00 COMMENT 'Any recovered value',
  `net_loss` decimal(14,2) GENERATED ALWAYS AS (`quantity_spoiled` * `unit_cost` - `recovery_amount`) STORED,
  `insurance_claim_filed` tinyint(1) DEFAULT 0,
  `insurance_claim_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Track spoilage incidents for finance reporting and FIFO compliance';

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country_id` int(11) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `payment_term_id` int(11) NOT NULL,
  `credit_limit` decimal(12,2) DEFAULT 0.00,
  `supplier_type` enum('Dairy Cooperative','Individual Farm','Packaging Supplier','Ingredient Supplier','Equipment Supplier') DEFAULT 'Dairy Cooperative' COMMENT 'Highland Fresh: Type of supplier',
  `cooperative_code` varchar(20) DEFAULT NULL COMMENT 'Highland Fresh: Unique cooperative identifier (e.g., DDC-001)',
  `daily_milk_capacity_liters` decimal(10,2) DEFAULT NULL COMMENT 'Highland Fresh: Daily milk production capacity in liters',
  `number_of_cows` int(11) DEFAULT NULL COMMENT 'Highland Fresh: Total number of dairy cows',
  `milk_quality_grade` enum('Grade A','Grade B','Grade C') DEFAULT 'Grade A' COMMENT 'Highland Fresh: Milk quality classification',
  `established_year` int(4) DEFAULT NULL COMMENT 'Highland Fresh: Year the cooperative/farm was established',
  `collection_station_address` text DEFAULT NULL COMMENT 'Highland Fresh: Address of milk collection/chilling station',
  `is_nmfdc_member` tinyint(1) DEFAULT 0 COMMENT 'Highland Fresh: Is this supplier a NMFDC member cooperative',
  `nmfdc_member_since` date DEFAULT NULL COMMENT 'Highland Fresh: Date joined NMFDC',
  `cattle_breeds` text DEFAULT NULL COMMENT 'Highland Fresh: Types of cattle breeds (Holstein-Sahiwal, Holstein-Jersey, etc.)',
  `specialization` text DEFAULT NULL COMMENT 'Highland Fresh: What the supplier specializes in',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `max_daily_order_quantity` decimal(10,2) DEFAULT NULL COMMENT 'Highland Fresh: Maximum quantity that can be ordered per day from this supplier',
  `max_single_order_quantity` decimal(10,2) DEFAULT NULL COMMENT 'Highland Fresh: Maximum quantity per single purchase order',
  `quantity_unit` varchar(20) DEFAULT 'liters' COMMENT 'Highland Fresh: Unit for quantity limits (liters, kg, pieces, etc)',
  `enforce_quantity_limits` tinyint(1) DEFAULT 1 COMMENT 'Highland Fresh: Whether to enforce quantity limits for this supplier',
  `highland_fresh_material_category` enum('dairy_cooperative','packaging_supplier','culture_supplier','ingredient_supplier','general_supplier') DEFAULT 'general_supplier',
  `highland_fresh_approved` tinyint(1) DEFAULT 0,
  `highland_fresh_approval_date` date DEFAULT NULL,
  `highland_fresh_certifications` text DEFAULT NULL,
  `highland_fresh_restrictions` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `name`, `contact_person`, `email`, `phone_number`, `address`, `city_id`, `postal_code`, `country_id`, `tax_id`, `payment_term_id`, `credit_limit`, `supplier_type`, `cooperative_code`, `daily_milk_capacity_liters`, `number_of_cows`, `milk_quality_grade`, `established_year`, `collection_station_address`, `is_nmfdc_member`, `nmfdc_member_since`, `cattle_breeds`, `specialization`, `is_active`, `notes`, `created_at`, `updated_at`, `max_daily_order_quantity`, `max_single_order_quantity`, `quantity_unit`, `enforce_quantity_limits`, `highland_fresh_material_category`, `highland_fresh_approved`, `highland_fresh_approval_date`, `highland_fresh_certifications`, `highland_fresh_restrictions`) VALUES
(1, 'Lacandula Farm', 'Mr. Lacandula', '', '', NULL, NULL, NULL, NULL, NULL, 3, 0.00, 'Individual Farm', 'RMR-LAC', NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'dairy_cooperative', 0, NULL, NULL, NULL),
(2, 'Galla Farm', 'Mr. Galla', '', '', NULL, NULL, NULL, NULL, NULL, 3, 0.00, 'Individual Farm', 'RMR-GAL', NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'dairy_cooperative', 0, NULL, NULL, NULL),
(3, 'DMDC', 'DMDC Rep', '', '', NULL, NULL, NULL, NULL, NULL, 3, 0.00, 'Dairy Cooperative', 'RMR-DMDC', NULL, NULL, 'Grade A', NULL, NULL, 1, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'dairy_cooperative', 0, NULL, NULL, NULL),
(4, 'Dumundin', 'Mr. Dumundin', '', '', NULL, NULL, NULL, NULL, NULL, 3, 0.00, 'Individual Farm', 'RMR-DUM', NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'dairy_cooperative', 0, NULL, NULL, NULL),
(5, 'C1/Dumuluan Goat', 'Mr. Dumuluan', '', '', NULL, NULL, NULL, NULL, NULL, 3, 0.00, 'Individual Farm', 'RMR-GOAT', NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'dairy_cooperative', 0, NULL, NULL, NULL),
(6, 'LPC', 'Sales Dept', '', '', NULL, NULL, NULL, NULL, NULL, 2, 0.00, 'Packaging Supplier', NULL, NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'packaging_supplier', 0, NULL, NULL, NULL),
(7, 'Ian Gao', 'Ian Gao', '', '', NULL, NULL, NULL, NULL, NULL, 1, 0.00, 'Ingredient Supplier', NULL, NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'ingredient_supplier', 0, NULL, NULL, NULL),
(8, 'Elixir', 'Sales Dept', '', '', NULL, NULL, NULL, NULL, NULL, 2, 0.00, '', NULL, NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'general_supplier', 0, NULL, NULL, NULL),
(9, 'Aya Commercial', 'Sales Dept', '', '', NULL, NULL, NULL, NULL, NULL, 1, 0.00, 'Ingredient Supplier', NULL, NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'ingredient_supplier', 0, NULL, NULL, NULL),
(10, 'Kalinisam', 'Sales Dept', '', '', NULL, NULL, NULL, NULL, NULL, 2, 0.00, '', NULL, NULL, NULL, 'Grade A', NULL, NULL, 0, NULL, NULL, NULL, 1, NULL, '2025-12-02 06:05:28', '2025-12-02 06:05:28', NULL, NULL, 'liters', 1, 'general_supplier', 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `supplier_info_view`
-- (See below for the actual view)
--
CREATE TABLE `supplier_info_view` (
`supplier_id` int(11)
,`name` varchar(255)
,`contact_person` varchar(255)
,`email` varchar(255)
,`phone_number` varchar(20)
,`address` text
,`city_name` varchar(100)
,`country_name` varchar(100)
,`payment_terms` varchar(100)
,`days_to_pay` int(11)
,`credit_limit` decimal(12,2)
,`is_active` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_raw_materials`
--

CREATE TABLE `supplier_raw_materials` (
  `supplier_raw_material_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `supplier_sku` varchar(100) DEFAULT NULL,
  `lead_time_days` int(11) DEFAULT 7,
  `minimum_order_quantity` decimal(10,3) DEFAULT 1.000,
  `maximum_order_quantity` decimal(10,3) DEFAULT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `is_preferred_supplier` tinyint(1) DEFAULT 0,
  `highland_fresh_approved` tinyint(1) DEFAULT 0,
  `quality_certification` varchar(255) DEFAULT NULL,
  `last_price_update` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `supplier_raw_materials`
--

INSERT INTO `supplier_raw_materials` (`supplier_raw_material_id`, `supplier_id`, `raw_material_id`, `supplier_sku`, `lead_time_days`, `minimum_order_quantity`, `maximum_order_quantity`, `unit_cost`, `is_preferred_supplier`, `highland_fresh_approved`, `quality_certification`, `last_price_update`, `is_active`, `created_at`, `updated_at`) VALUES
(44, 6, 1, NULL, 7, 1.000, NULL, 4.38, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(45, 6, 4, NULL, 7, 1.000, NULL, 0.62, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(46, 7, 5, NULL, 7, 1.000, NULL, 68.00, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(47, 7, 6, NULL, 7, 1.000, NULL, 56.00, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(48, 8, 12, NULL, 7, 1.000, NULL, 2315.25, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(49, 8, 13, NULL, 7, 1.000, NULL, 5299.35, 1, 1, NULL, '2026-01-04', 1, '2025-12-02 06:05:28', '2026-01-04 07:29:03'),
(50, 1, 2, NULL, 7, 1.000, NULL, 4.38, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(51, 1, 3, NULL, 7, 1.000, NULL, 2.38, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(52, 1, 7, NULL, 7, 1.000, NULL, 56.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(53, 1, 8, NULL, 7, 1.000, NULL, 800.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(54, 1, 9, NULL, 7, 1.000, NULL, 1400.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(55, 1, 10, NULL, 7, 1.000, NULL, 390.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(56, 1, 11, NULL, 7, 1.000, NULL, 680.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(57, 1, 14, NULL, 7, 1.000, NULL, 25.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(58, 1, 15, NULL, 7, 1.000, NULL, 150.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(59, 1, 16, NULL, 7, 1.000, NULL, 500.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(60, 1, 17, NULL, 7, 1.000, NULL, 120.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(61, 1, 18, NULL, 7, 1.000, NULL, 600.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03'),
(62, 1, 19, NULL, 7, 1.000, NULL, 25.00, 0, 1, NULL, '2026-01-04', 1, '2026-01-04 07:28:41', '2026-01-04 07:29:03');

-- --------------------------------------------------------

--
-- Table structure for table `system_notifications`
--

CREATE TABLE `system_notifications` (
  `notification_id` int(11) NOT NULL,
  `notification_type` varchar(50) NOT NULL COMMENT 'PRICE_CHANGE, LOW_STOCK, EXPIRY_WARNING, etc.',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `severity` enum('info','warning','critical') DEFAULT 'info',
  `reference_type` varchar(50) DEFAULT NULL COMMENT 'raw_material, product, batch, etc.',
  `reference_id` int(11) DEFAULT NULL COMMENT 'ID of the related entity',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional data like old_price, new_price, etc.' CHECK (json_valid(`metadata`)),
  `target_role` varchar(50) DEFAULT NULL COMMENT 'Finance Officer, Admin, etc.',
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `read_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_notifications`
--

INSERT INTO `system_notifications` (`notification_id`, `notification_type`, `title`, `message`, `severity`, `reference_type`, `reference_id`, `metadata`, `target_role`, `is_read`, `read_at`, `read_by`, `created_at`) VALUES
(1, 'BOM_PRICE_CHANGE', 'Material Price Change Alert', 'Linx Ink price increased from ₱50.00 to ₱70.00 (+40.0%, +₱20.00). 3 product(s) may need cost review.', 'critical', 'raw_material', 13, '{\"old_cost\":50,\"new_cost\":70,\"change\":20,\"percent_change\":40,\"affected_products\":3}', 'Finance Officer', 1, '2026-01-04 17:05:16', NULL, '2026-01-04 07:51:58'),
(2, 'BOM_PRICE_CHANGE', 'Material Price Change Alert', 'Yogurt Culture price increased from ₱275.00 to ₱500.00 (+81.8%, +₱225.00). 0 product(s) may need cost review.', 'critical', 'raw_material', 16, '{\"old_cost\":275,\"new_cost\":500,\"change\":225,\"percent_change\":81.8,\"affected_products\":0}', 'Finance Officer', 1, '2026-01-04 17:05:14', NULL, '2026-01-04 08:25:10'),
(3, 'BOM_PRICE_CHANGE', 'Material Price Change Alert', 'Yogurt Culture price increased from ₱50.00 to ₱600.00 (+1100.0%, +₱550.00). 0 product(s) may need cost review.', 'critical', 'raw_material', 16, '{\"old_cost\":50,\"new_cost\":600,\"change\":550,\"percent_change\":1100,\"affected_products\":0}', 'Finance Officer', 1, '2026-01-04 17:05:17', NULL, '2026-01-04 08:29:23'),
(4, 'cost_approval_request', 'Production Cost Approval Required', 'Production batch for Highland Fresh Yogurt Plain 500g (3000 units) has cost variance of 333.3% (₱1,000.00 over standard). Estimated cost: ₱1,300.00', 'info', 'production_cost_approval', 1, NULL, NULL, 1, '2026-01-04 18:16:51', NULL, '2026-01-04 10:16:29'),
(5, 'cost_approval_approved', 'Production Cost Approved', 'Your production request for Highland Fresh Yogurt Plain 500g (3000.000 units) has been approved. You may now proceed with production.', 'info', 'production_cost_approval', 1, NULL, NULL, 1, '2026-01-04 18:29:50', NULL, '2026-01-04 10:23:51'),
(6, 'BOM_PRICE_CHANGE', 'Material Price Change Alert', 'Yogurt Culture price increased from ₱600.00 to ₱700.00 (+16.7%, +₱100.00). 0 product(s) may need cost review.', 'critical', 'raw_material', 16, '{\"old_cost\":600,\"new_cost\":700,\"change\":100,\"percent_change\":16.7,\"affected_products\":0}', 'Finance Officer', 0, NULL, NULL, '2026-01-04 10:29:21');

-- --------------------------------------------------------

--
-- Table structure for table `tax_rates`
--

CREATE TABLE `tax_rates` (
  `tax_rate_id` int(11) NOT NULL,
  `rate_code` varchar(20) NOT NULL,
  `rate_name` varchar(100) NOT NULL,
  `rate_percentage` decimal(5,4) NOT NULL COMMENT 'Tax rate as decimal (0.12 for 12%)',
  `applicable_to` enum('Sale','Purchase','Both') DEFAULT 'Both',
  `city_id` int(11) DEFAULT NULL COMMENT 'Specific to a city, NULL for national',
  `category_id` int(11) DEFAULT NULL COMMENT 'Specific to product category, NULL for all',
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'NULL for indefinite',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tax_rates`
--

INSERT INTO `tax_rates` (`tax_rate_id`, `rate_code`, `rate_name`, `rate_percentage`, `applicable_to`, `city_id`, `category_id`, `effective_date`, `expiry_date`, `is_active`, `created_at`) VALUES
(1, 'VAT_STD', 'Standard VAT Rate', 0.1200, 'Both', NULL, NULL, '2020-01-01', NULL, 1, '2025-08-01 18:01:04'),
(2, 'VAT_ZERO', 'Zero-Rated VAT', 0.0000, 'Both', NULL, NULL, '2020-01-01', NULL, 1, '2025-08-01 18:01:04'),
(3, 'VAT_EXEMPT', 'VAT Exempt', 0.0000, 'Both', NULL, NULL, '2020-01-01', NULL, 1, '2025-08-01 18:01:04'),
(4, 'WT_COR', 'Withholding Tax - Corporation', 0.0200, 'Purchase', NULL, NULL, '2020-01-01', NULL, 1, '2025-08-01 18:01:04'),
(5, 'WT_IND', 'Withholding Tax - Individual', 0.0100, 'Purchase', NULL, NULL, '2020-01-01', NULL, 1, '2025-08-01 18:01:04');

-- --------------------------------------------------------

--
-- Table structure for table `transaction_statuses`
--

CREATE TABLE `transaction_statuses` (
  `status_id` int(11) NOT NULL,
  `status_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status_type` enum('Sale','Return','Purchase','General') DEFAULT 'General',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transaction_statuses`
--

INSERT INTO `transaction_statuses` (`status_id`, `status_name`, `description`, `status_type`, `is_active`, `created_at`) VALUES
(1, 'Pending', 'Transaction is pending completion', 'Sale', 1, '2025-08-01 17:58:26'),
(2, 'Completed', 'Transaction completed successfully', 'Sale', 1, '2025-08-01 17:58:26'),
(3, 'Cancelled', 'Transaction was cancelled', 'Sale', 1, '2025-08-01 17:58:26'),
(4, 'Refunded', 'Transaction was refunded', 'Sale', 1, '2025-08-01 17:58:26'),
(5, 'Partially Refunded', 'Transaction was partially refunded', 'Sale', 1, '2025-08-01 17:58:26'),
(6, 'Return Pending', 'Return is pending approval', 'Return', 1, '2025-08-01 17:58:26'),
(7, 'Return Approved', 'Return has been approved', 'Return', 1, '2025-08-01 17:58:26'),
(8, 'Return Rejected', 'Return has been rejected', 'Return', 1, '2025-08-01 17:58:26'),
(9, 'Return Completed', 'Return has been completed', 'Return', 1, '2025-08-01 17:58:26'),
(10, 'PO Draft', 'Purchase order is in draft status', 'Purchase', 1, '2025-08-01 17:58:26'),
(11, 'PO Sent', 'Purchase order sent to supplier', 'Purchase', 1, '2025-08-01 17:58:26'),
(12, 'PO Confirmed', 'Purchase order confirmed by supplier', 'Purchase', 1, '2025-08-01 17:58:26'),
(14, 'PO Received', 'Purchase order fully received', 'Purchase', 1, '2025-08-01 17:58:26'),
(15, 'PO Cancelled', 'Purchase order cancelled', 'Purchase', 1, '2025-08-01 17:58:26'),
(16, 'Active', 'Record is active', 'General', 1, '2025-08-01 17:58:26'),
(17, 'Inactive', 'Record is inactive', 'General', 1, '2025-08-01 17:58:26'),
(18, 'Deleted', 'Record is marked as deleted', 'General', 1, '2025-08-01 17:58:26'),
(74, 'Sent', 'Purchase order sent to supplier', 'Purchase', 1, '2025-08-27 11:47:53');

-- --------------------------------------------------------

--
-- Table structure for table `units_of_measure`
--

CREATE TABLE `units_of_measure` (
  `unit_id` int(11) NOT NULL,
  `unit_name` varchar(20) NOT NULL,
  `unit_abbreviation` varchar(10) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `unit_type` enum('Weight','Volume','Count','Length') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units_of_measure`
--

INSERT INTO `units_of_measure` (`unit_id`, `unit_name`, `unit_abbreviation`, `description`, `unit_type`, `is_active`, `created_at`) VALUES
(1, 'Kilogram', 'kg', 'Kilogram weight measurement', 'Weight', 1, '2025-08-01 17:58:26'),
(2, 'Gram', 'g', 'Gram weight measurement', 'Weight', 1, '2025-08-01 17:58:26'),
(3, 'Pound', 'lb', 'Pound weight measurement', 'Weight', 1, '2025-08-01 17:58:26'),
(4, 'Ounce', 'oz', 'Ounce weight measurement', 'Weight', 1, '2025-08-01 17:58:26'),
(5, 'Liter', 'L', 'Liter volume measurement', 'Volume', 1, '2025-08-01 17:58:26'),
(6, 'Milliliter', 'mL', 'Milliliter volume measurement', 'Volume', 1, '2025-08-01 17:58:26'),
(7, 'Gallon', 'gal', 'Gallon volume measurement', 'Volume', 1, '2025-08-01 17:58:26'),
(8, 'Piece', 'pc', 'Individual piece or item', 'Count', 1, '2025-08-01 17:58:26'),
(9, 'Dozen', 'doz', 'Twelve pieces', 'Count', 1, '2025-08-01 17:58:26'),
(10, 'Pack', 'pk', 'Package or pack', 'Count', 1, '2025-08-01 17:58:26'),
(11, 'Box', 'box', 'Box container', 'Count', 1, '2025-08-01 17:58:26'),
(12, 'Case', 'case', 'Case container', 'Count', 1, '2025-08-01 17:58:26');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL DEFAULT 3,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password_hash`, `role_id`, `first_name`, `last_name`, `email`, `phone`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2y$10$jqhwP2qWBaWU9YPvdI24oeVYkh9ykAdQE6VosigEGf0ObA/n6DH/q', 1, 'System', 'Administrator', 'admin@highlandfresh.com', NULL, 1, '2025-08-25 02:57:50', '2025-08-01 17:58:26', '2025-08-25 02:57:50'),
(8, 'sales', '$2y$10$09uuW79Cge9xIlgALG.rSuUsqIHzk1Meh80H9Gig6bLJYOtJ1k4uq', 3, 'brian', 'ragasi', 'ragasibrian2@gmail.com', NULL, 1, '2025-08-23 05:32:31', '2025-08-22 14:31:13', '2025-10-23 03:58:20'),
(9, 'inventory', '$2y$10$S5d3x6u4M7QzJsGXGC31LeK4qak8sIg.eg1EDgZ87asXXHadEAZkC', 4, 'brian', 'ragasi', 'ragasibrian2@gmail.com', NULL, 1, '2025-08-25 02:53:57', '2025-08-23 05:17:57', '2025-12-09 13:14:10'),
(10, 'production', '$2y$10$t2LxHPBqNfEVKAFCtlgErOA.8Kh3NoZZPiyFJ52zfqN.GJpj8rDje', 18, 'brian', 'ragasi', 'ragasibrian2@gmail.com', NULL, 1, NULL, '2025-08-27 17:13:34', '2025-12-09 06:14:52'),
(11, 'manager', '$2y$10$VFejM4UIwfTfdEcskJw8ue7LMC6iHLiKU9IgG5vBQMSafadriU1i2', 20, 'brian', 'ragasi', 'ragasibrian2@gmail.com', NULL, 1, NULL, '2025-10-20 14:59:47', '2025-12-07 09:36:20'),
(12, 'qcofficer', '$2y$10$l3KBAoWsi0xmMQYinXBmWudSYY0Rm/wNd0zFpJehqW7OgIQg/59WW', 19, 'Maria', 'Santos', 'qc@highlandfresh.com', NULL, 1, NULL, '2025-12-02 08:52:17', '2025-12-09 05:57:22');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON object storing role permissions' CHECK (json_valid(`permissions`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`role_id`, `role_name`, `description`, `permissions`, `is_active`, `created_at`) VALUES
(1, 'Admin', 'System administrator with full access', '{\"users\": \"full\", \"products\": \"full\", \"suppliers\": \"full\", \"sales\": \"full\", \"reports\": \"full\", \"settings\": \"full\"}', 1, '2025-08-01 17:58:26'),
(2, 'Warehouse Manager', 'Manages warehouse operations, creates purchase orders, approves sales orders', '{\"users\": \"read\", \"products\": \"full\", \"suppliers\": \"full\", \"sales\": \"full\", \"reports\": \"full\", \"settings\": \"read\"}', 1, '2025-08-01 17:58:26'),
(3, 'Sales Officer', 'Creates and manages wholesale sales orders for retail outlets and independent resellers', '{\"users\": \"none\", \"products\": \"read\", \"suppliers\": \"none\", \"sales\": \"create\", \"reports\": \"none\", \"settings\": \"none\"}', 1, '2025-08-01 17:58:26'),
(4, 'Warehouse Staff', 'Receives raw materials, dispatches orders with FIFO validation, manages inventory', '{\"users\": \"none\", \"products\": \"full\", \"suppliers\": \"read\", \"sales\": \"read\", \"reports\": \"limited\", \"settings\": \"none\"}', 1, '2025-08-01 17:58:26'),
(18, 'Production Supervisor', 'Manages the production process, issues materials, and records production output', '{\"users\":\"read\",\"products\":\"read\",\"suppliers\":\"read\",\"sales\":\"none\",\"reports\":\"limited\",\"settings\":\"none\",\"production\":\"full\"}', 1, '2025-08-27 17:07:21'),
(19, 'Quality Control Officer', 'Responsible for milk testing, lab results (Fat/TA), and accepting/rejecting milk.', '{\"milk_receiving\": \"full\", \"production\": \"read\"}', 1, '2025-12-02 05:54:38'),
(20, 'Finance Officer', 'Responsible for checking milk records and processing farmer payouts.', '{\"milk_receiving\": \"read\", \"payouts\": \"full\", \"sales\": \"read\"}', 1, '2025-12-02 05:54:38');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_customer_details`
-- (See below for the actual view)
--
CREATE TABLE `v_customer_details` (
`customer_id` int(11)
,`customer_number` varchar(50)
,`business_name` varchar(255)
,`contact_person` varchar(255)
,`phone` varchar(20)
,`email` varchar(255)
,`address` text
,`credit_limit` decimal(10,2)
,`payment_mode` enum('Cash','Terms')
,`tin_number` varchar(50)
,`customer_type` varchar(100)
,`city_name` varchar(100)
,`country_name` varchar(100)
,`total_orders` bigint(21)
,`total_spent` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_monthly_spoilage_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_monthly_spoilage_summary` (
`year` int(4)
,`month` int(2)
,`period` varchar(7)
,`spoilage_type` enum('EXPIRED','DAMAGED','CONTAMINATED','QUALITY_REJECT','FIFO_BYPASS')
,`source_type` enum('PRODUCTION_BATCH','RAW_MATERIAL','RAW_MILK')
,`incident_count` bigint(21)
,`total_quantity_spoiled` decimal(34,2)
,`total_loss_value` decimal(46,4)
,`fifo_bypass_count` decimal(22,0)
,`avg_days_expired` decimal(14,4)
);

-- --------------------------------------------------------

--
-- Structure for view `finished_products_inventory_view`
--
DROP TABLE IF EXISTS `finished_products_inventory_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `finished_products_inventory_view`  AS SELECT `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`sku` AS `sku`, `pc`.`category_name` AS `category_name`, `uom`.`unit_name` AS `unit_name`, `p`.`quantity_on_hand` AS `quantity_on_hand`, `p`.`reorder_level` AS `reorder_level`, `p`.`max_stock_level` AS `max_stock_level`, `p`.`price` AS `selling_price`, `p`.`cost` AS `production_cost`, CASE WHEN `p`.`quantity_on_hand` <= `p`.`reorder_level` THEN 'PRODUCTION_NEEDED' WHEN `p`.`quantity_on_hand` >= `p`.`max_stock_level` THEN 'OVERSTOCKED' ELSE 'NORMAL' END AS `stock_status`, `p`.`quantity_on_hand`* `p`.`price` AS `inventory_retail_value`, `p`.`quantity_on_hand`* `p`.`cost` AS `inventory_cost_value`, `p`.`price`- `p`.`cost` AS `profit_per_unit`, (`p`.`price` - `p`.`cost`) / `p`.`price` * 100 AS `profit_margin_percent`, `p`.`quality_grade` AS `quality_grade`, `p`.`expiry_date` AS `expiry_date`, to_days(`p`.`expiry_date`) - to_days(curdate()) AS `days_until_expiry`, CASE WHEN `p`.`expiry_date` <= curdate() + interval 3 day THEN 'URGENT' WHEN `p`.`expiry_date` <= curdate() + interval 7 day THEN 'WARNING' ELSE 'OK' END AS `expiry_status` FROM ((`products` `p` left join `product_categories` `pc` on(`p`.`category_id` = `pc`.`category_id`)) left join `units_of_measure` `uom` on(`p`.`unit_id` = `uom`.`unit_id`)) WHERE `p`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `highland_fresh_raw_materials_view`
--
DROP TABLE IF EXISTS `highland_fresh_raw_materials_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `highland_fresh_raw_materials_view`  AS SELECT `rm`.`raw_material_id` AS `raw_material_id`, `rm`.`name` AS `name`, `rm`.`sku` AS `sku`, `rm`.`category` AS `category`, `rm`.`unit_id` AS `unit_id`, `uom`.`unit_name` AS `unit_name`, `rm`.`standard_cost` AS `standard_cost`, `rm`.`quantity_on_hand` AS `quantity_on_hand`, `rm`.`reorder_level` AS `reorder_level`, `rm`.`quality_grade` AS `quality_grade`, `rm`.`highland_fresh_approved` AS `highland_fresh_approved`, `rm`.`requires_quality_test` AS `requires_quality_test`, `rm`.`storage_temp_min` AS `storage_temp_min`, `rm`.`storage_temp_max` AS `storage_temp_max`, `rm`.`shelf_life_days` AS `shelf_life_days`, `rm`.`description` AS `description` FROM (`raw_materials` `rm` left join `units_of_measure` `uom` on(`rm`.`unit_id` = `uom`.`unit_id`)) WHERE `rm`.`highland_fresh_approved` = 1 AND `rm`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `highland_fresh_suppliers_view`
--
DROP TABLE IF EXISTS `highland_fresh_suppliers_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `highland_fresh_suppliers_view`  AS SELECT `s`.`supplier_id` AS `supplier_id`, `s`.`name` AS `name`, `s`.`contact_person` AS `contact_person`, `s`.`email` AS `email`, `s`.`phone_number` AS `phone_number`, `s`.`supplier_type` AS `supplier_type`, `s`.`highland_fresh_material_category` AS `highland_fresh_material_category`, `s`.`highland_fresh_approved` AS `highland_fresh_approved`, `s`.`highland_fresh_approval_date` AS `highland_fresh_approval_date`, `s`.`highland_fresh_certifications` AS `highland_fresh_certifications`, `s`.`highland_fresh_restrictions` AS `highland_fresh_restrictions`, `s`.`is_nmfdc_member` AS `is_nmfdc_member`, `s`.`nmfdc_member_since` AS `nmfdc_member_since`, `s`.`daily_milk_capacity_liters` AS `daily_milk_capacity_liters`, `s`.`milk_quality_grade` AS `milk_quality_grade` FROM `suppliers` AS `s` WHERE `s`.`highland_fresh_approved` = 1 AND `s`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `highland_fresh_supplier_materials_view`
--
DROP TABLE IF EXISTS `highland_fresh_supplier_materials_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `highland_fresh_supplier_materials_view`  AS SELECT `srm`.`supplier_raw_material_id` AS `supplier_raw_material_id`, `s`.`supplier_id` AS `supplier_id`, `s`.`name` AS `supplier_name`, `s`.`highland_fresh_material_category` AS `highland_fresh_material_category`, `rm`.`raw_material_id` AS `raw_material_id`, `rm`.`name` AS `raw_material_name`, `rm`.`category` AS `material_category`, `srm`.`supplier_sku` AS `supplier_sku`, `srm`.`unit_cost` AS `unit_cost`, `srm`.`minimum_order_quantity` AS `minimum_order_quantity`, `srm`.`maximum_order_quantity` AS `maximum_order_quantity`, `srm`.`lead_time_days` AS `lead_time_days`, `srm`.`is_preferred_supplier` AS `is_preferred_supplier`, `srm`.`quality_certification` AS `quality_certification`, `srm`.`last_price_update` AS `last_price_update` FROM ((`supplier_raw_materials` `srm` join `suppliers` `s` on(`srm`.`supplier_id` = `s`.`supplier_id`)) join `raw_materials` `rm` on(`srm`.`raw_material_id` = `rm`.`raw_material_id`)) WHERE `srm`.`highland_fresh_approved` = 1 AND `srm`.`is_active` = 1 AND `s`.`highland_fresh_approved` = 1 AND `s`.`is_active` = 1 AND `rm`.`highland_fresh_approved` = 1 AND `rm`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `inventory_summary_view`
--
DROP TABLE IF EXISTS `inventory_summary_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `inventory_summary_view`  AS SELECT 'Raw Materials' AS `inventory_type`, count(0) AS `total_items`, sum(`raw_materials_inventory_view`.`quantity_on_hand` * `raw_materials_inventory_view`.`standard_cost`) AS `total_value`, count(case when `raw_materials_inventory_view`.`stock_status` = 'REORDER_NEEDED' then 1 end) AS `items_needing_reorder`, count(case when `raw_materials_inventory_view`.`stock_status` = 'OVERSTOCKED' then 1 end) AS `overstocked_items`, avg(`raw_materials_inventory_view`.`quantity_on_hand`) AS `avg_stock_level` FROM `raw_materials_inventory_view`union all select 'Finished Products' AS `inventory_type`,count(0) AS `total_items`,sum(`finished_products_inventory_view`.`inventory_cost_value`) AS `total_value`,count(case when `finished_products_inventory_view`.`stock_status` = 'PRODUCTION_NEEDED' then 1 end) AS `items_needing_reorder`,count(case when `finished_products_inventory_view`.`stock_status` = 'OVERSTOCKED' then 1 end) AS `overstocked_items`,avg(`finished_products_inventory_view`.`quantity_on_hand`) AS `avg_stock_level` from `finished_products_inventory_view`  ;

-- --------------------------------------------------------

--
-- Structure for view `production_planning_view`
--
DROP TABLE IF EXISTS `production_planning_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `production_planning_view`  AS SELECT `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`quantity_on_hand` AS `current_stock`, `p`.`reorder_level` AS `reorder_level`, greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) AS `production_needed`, `pr`.`recipe_id` AS `recipe_id`, `pr`.`batch_size_yield` AS `batch_size_yield`, ceiling(greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) / `pr`.`batch_size_yield`) AS `batches_needed`, `pr`.`production_time_hours` AS `production_time_hours`, ceiling(greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) / `pr`.`batch_size_yield`) * `pr`.`production_time_hours` AS `total_production_time` FROM (`products` `p` join `production_recipes` `pr` on(`p`.`product_id` = `pr`.`finished_product_id`)) WHERE `p`.`is_active` = 1 AND `p`.`quantity_on_hand` <= `p`.`reorder_level` ORDER BY `p`.`reorder_level`- `p`.`quantity_on_hand` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `product_defaults`
--
DROP TABLE IF EXISTS `product_defaults`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `product_defaults`  AS SELECT `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`category_id` AS `category_id`, `pc`.`category_name` AS `category_name`, `u`.`unit_name` AS `unit`, `p`.`price` AS `unit_cost`, `p`.`standard_order_quantity` AS `standard_order_quantity`, `p`.`auto_reorder_quantity` AS `auto_reorder_quantity`, `p`.`min_order_quantity` AS `min_order_quantity`, `p`.`max_order_quantity` AS `max_order_quantity`, `p`.`last_order_quantity` AS `last_order_quantity`, `p`.`avg_monthly_usage` AS `avg_monthly_usage`, `p`.`quantity_on_hand` AS `quantity_on_hand`, `p`.`reorder_level` AS `reorder_level`, CASE WHEN `p`.`quantity_on_hand` <= `p`.`reorder_level` THEN 'Low Stock' WHEN `p`.`quantity_on_hand` <= `p`.`reorder_level` * 1.5 THEN 'Medium Stock' ELSE 'Good Stock' END AS `stock_status`, CASE WHEN `p`.`quantity_on_hand` <= `p`.`reorder_level` AND `p`.`auto_reorder_quantity` is not null THEN `p`.`auto_reorder_quantity` WHEN `p`.`last_order_quantity` is not null THEN `p`.`last_order_quantity` WHEN `p`.`standard_order_quantity` is not null THEN `p`.`standard_order_quantity` ELSE 1.000 END AS `suggested_quantity` FROM ((`products` `p` left join `product_categories` `pc` on(`p`.`category_id` = `pc`.`category_id`)) left join `units_of_measure` `u` on(`p`.`unit_id` = `u`.`unit_id`)) WHERE `p`.`is_active` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `purchase_orders_simplified`
--
DROP TABLE IF EXISTS `purchase_orders_simplified`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `purchase_orders_simplified`  AS SELECT `po`.`po_id` AS `po_id`, `po`.`po_number` AS `po_number`, `po`.`supplier_id` AS `supplier_id`, `s`.`name` AS `supplier_name`, `po`.`user_id` AS `user_id`, `u`.`username` AS `created_by`, `po`.`total_amount` AS `total_amount`, `po`.`status_id` AS `status_id`, CASE WHEN `ts`.`status_name` = 'PO Draft' THEN 'Draft' WHEN `ts`.`status_name` = 'PO Sent' THEN 'Pending' WHEN `ts`.`status_name` = 'PO Confirmed' THEN 'Confirmed' WHEN `ts`.`status_name` = 'PO Received' THEN 'Received' WHEN `ts`.`status_name` = 'PO Cancelled' THEN 'Cancelled' ELSE `ts`.`status_name` END AS `status_display`, `po`.`order_date` AS `order_date`, `po`.`expected_delivery_date` AS `expected_delivery_date`, `po`.`received_date` AS `received_date`, `po`.`notes` AS `notes`, `po`.`created_at` AS `created_at`, `po`.`updated_at` AS `updated_at`, (select count(0) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_items`, (select sum(`purchase_order_items`.`ordered_quantity`) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_quantity_ordered`, (select sum(`purchase_order_items`.`received_quantity`) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_quantity_received` FROM (((`purchase_orders` `po` left join `suppliers` `s` on(`po`.`supplier_id` = `s`.`supplier_id`)) left join `users` `u` on(`po`.`user_id` = `u`.`user_id`)) left join `transaction_statuses` `ts` on(`po`.`status_id` = `ts`.`status_id`)) WHERE `po`.`status_id` <> 13 ;

-- --------------------------------------------------------

--
-- Structure for view `raw_materials_inventory_view`
--
DROP TABLE IF EXISTS `raw_materials_inventory_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `raw_materials_inventory_view`  AS SELECT `rm`.`raw_material_id` AS `raw_material_id`, `rm`.`name` AS `material_name`, `rm`.`sku` AS `sku`, `rm`.`category` AS `category`, `uom`.`unit_name` AS `unit_of_measure`, `rm`.`quantity_on_hand` AS `quantity_on_hand`, `rm`.`reorder_level` AS `reorder_level`, `rm`.`max_stock_level` AS `max_stock_level`, `rm`.`standard_cost` AS `standard_cost`, `s`.`supplier_type` AS `supplier_category`, `rm`.`storage_requirements` AS `storage_requirements`, CASE WHEN `rm`.`quantity_on_hand` <= `rm`.`reorder_level` THEN 'REORDER_NEEDED' WHEN `rm`.`quantity_on_hand` >= `rm`.`max_stock_level` THEN 'OVERSTOCKED' ELSE 'NORMAL' END AS `stock_status`, `rm`.`quantity_on_hand`* `rm`.`standard_cost` AS `inventory_value`, count(distinct `srm`.`supplier_id`) AS `available_suppliers`, min(`srm`.`unit_cost`) AS `cheapest_supplier_cost`, max(`srm`.`unit_cost`) AS `most_expensive_cost`, group_concat(distinct `s`.`name` separator ', ') AS `supplier_names` FROM (((`raw_materials` `rm` left join `supplier_raw_materials` `srm` on(`rm`.`raw_material_id` = `srm`.`raw_material_id` and `srm`.`is_active` = 1)) left join `suppliers` `s` on(`srm`.`supplier_id` = `s`.`supplier_id` and `s`.`is_active` = 1)) left join `units_of_measure` `uom` on(`rm`.`unit_id` = `uom`.`unit_id`)) WHERE `rm`.`is_active` = 1 GROUP BY `rm`.`raw_material_id`, `rm`.`name`, `rm`.`sku`, `rm`.`category`, `uom`.`unit_name`, `rm`.`quantity_on_hand`, `rm`.`reorder_level`, `rm`.`max_stock_level`, `rm`.`standard_cost`, `s`.`supplier_type`, `rm`.`storage_requirements` ;

-- --------------------------------------------------------

--
-- Structure for view `supplier_info_view`
--
DROP TABLE IF EXISTS `supplier_info_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `supplier_info_view`  AS SELECT `s`.`supplier_id` AS `supplier_id`, `s`.`name` AS `name`, `s`.`contact_person` AS `contact_person`, `s`.`email` AS `email`, `s`.`phone_number` AS `phone_number`, `s`.`address` AS `address`, `c`.`city_name` AS `city_name`, `co`.`country_name` AS `country_name`, `pt`.`term_name` AS `payment_terms`, `pt`.`days_to_pay` AS `days_to_pay`, `s`.`credit_limit` AS `credit_limit`, `s`.`is_active` AS `is_active`, `s`.`created_at` AS `created_at`, `s`.`updated_at` AS `updated_at` FROM (((`suppliers` `s` left join `cities` `c` on(`s`.`city_id` = `c`.`city_id`)) left join `countries` `co` on(`s`.`country_id` = `co`.`country_id`)) left join `payment_terms` `pt` on(`s`.`payment_term_id` = `pt`.`payment_term_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_customer_details`
--
DROP TABLE IF EXISTS `v_customer_details`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_customer_details`  AS SELECT `c`.`customer_id` AS `customer_id`, `c`.`customer_number` AS `customer_number`, `c`.`business_name` AS `business_name`, `c`.`contact_person` AS `contact_person`, `c`.`phone` AS `phone`, `c`.`email` AS `email`, `c`.`address` AS `address`, `c`.`credit_limit` AS `credit_limit`, `c`.`payment_mode` AS `payment_mode`, `c`.`tin_number` AS `tin_number`, `ct`.`type_name` AS `customer_type`, `ci`.`city_name` AS `city_name`, `co`.`country_name` AS `country_name`, (select count(0) from `sales` `s` where `s`.`customer_id` = `c`.`customer_id`) AS `total_orders`, (select ifnull(sum(`s`.`total_amount`),0) from `sales` `s` where `s`.`customer_id` = `c`.`customer_id`) AS `total_spent` FROM (((`customers` `c` left join `customer_types` `ct` on(`c`.`customer_type_id` = `ct`.`customer_type_id`)) left join `cities` `ci` on(`c`.`city_id` = `ci`.`city_id`)) left join `countries` `co` on(`ci`.`country_id` = `co`.`country_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_monthly_spoilage_summary`
--
DROP TABLE IF EXISTS `v_monthly_spoilage_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_monthly_spoilage_summary`  AS SELECT year(`spoilage_log`.`spoilage_date`) AS `year`, month(`spoilage_log`.`spoilage_date`) AS `month`, date_format(`spoilage_log`.`spoilage_date`,'%Y-%m') AS `period`, `spoilage_log`.`spoilage_type` AS `spoilage_type`, `spoilage_log`.`source_type` AS `source_type`, count(0) AS `incident_count`, sum(`spoilage_log`.`quantity_spoiled`) AS `total_quantity_spoiled`, sum(`spoilage_log`.`quantity_spoiled` * `spoilage_log`.`unit_cost`) AS `total_loss_value`, sum(case when `spoilage_log`.`fifo_bypassed` = 1 then 1 else 0 end) AS `fifo_bypass_count`, avg(`spoilage_log`.`days_expired`) AS `avg_days_expired` FROM `spoilage_log` GROUP BY year(`spoilage_log`.`spoilage_date`), month(`spoilage_log`.`spoilage_date`), `spoilage_log`.`spoilage_type`, `spoilage_log`.`source_type` ORDER BY year(`spoilage_log`.`spoilage_date`) DESC, month(`spoilage_log`.`spoilage_date`) DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `batch_reservations`
--
ALTER TABLE `batch_reservations`
  ADD PRIMARY KEY (`reservation_id`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_sale_id` (`sale_id`),
  ADD KEY `idx_status` (`reservation_status`),
  ADD KEY `idx_expiry` (`expiry_time`);

--
-- Indexes for table `cities`
--
ALTER TABLE `cities`
  ADD PRIMARY KEY (`city_id`),
  ADD KEY `idx_city_name` (`city_name`),
  ADD KEY `idx_region` (`region`),
  ADD KEY `idx_country_id` (`country_id`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`country_id`),
  ADD UNIQUE KEY `country_code` (`country_code`),
  ADD UNIQUE KEY `country_name` (`country_name`),
  ADD KEY `idx_country_code` (`country_code`),
  ADD KEY `idx_country_name` (`country_name`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `customer_number` (`customer_number`),
  ADD KEY `city_id` (`city_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_customer_number` (`customer_number`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `fk_customers_payment_terms` (`payment_term_id`),
  ADD KEY `fk_customers_customer_types` (`customer_type_id`);

--
-- Indexes for table `customer_order_status`
--
ALTER TABLE `customer_order_status`
  ADD PRIMARY KEY (`status_id`),
  ADD UNIQUE KEY `status_name` (`status_name`);

--
-- Indexes for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `payment_method_id` (`payment_method_id`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `customer_types`
--
ALTER TABLE `customer_types`
  ADD PRIMARY KEY (`customer_type_id`),
  ADD UNIQUE KEY `type_code` (`type_code`);

--
-- Indexes for table `dispatch_audit_log`
--
ALTER TABLE `dispatch_audit_log`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `idx_order_id` (`sales_order_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_dispatched_batch` (`dispatched_batch_id`),
  ADD KEY `idx_fifo_compliant` (`fifo_compliant`),
  ADD KEY `idx_dispatch_date` (`dispatch_date`);

--
-- Indexes for table `farmer_payouts`
--
ALTER TABLE `farmer_payouts`
  ADD PRIMARY KEY (`payout_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  ADD PRIMARY KEY (`adjustment_id`),
  ADD UNIQUE KEY `adjustment_number` (`adjustment_number`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_adjustment_number` (`adjustment_number`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_adjustment_type` (`adjustment_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_reference` (`reference_type`,`reference_id`);

--
-- Indexes for table `low_stock_alerts`
--
ALTER TABLE `low_stock_alerts`
  ADD PRIMARY KEY (`alert_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_raw_material` (`raw_material_id`);

--
-- Indexes for table `milk_daily_collections`
--
ALTER TABLE `milk_daily_collections`
  ADD PRIMARY KEY (`collection_id`),
  ADD UNIQUE KEY `unique_rmr` (`rmr_number`),
  ADD KEY `idx_date` (`collection_date`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `qc_officer_id` (`qc_officer_id`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`payment_method_id`),
  ADD UNIQUE KEY `method_name` (`method_name`),
  ADD KEY `idx_method_name` (`method_name`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `payment_terms`
--
ALTER TABLE `payment_terms`
  ADD PRIMARY KEY (`payment_term_id`),
  ADD UNIQUE KEY `term_code` (`term_code`),
  ADD KEY `idx_term_code` (`term_code`),
  ADD KEY `idx_term_name` (`term_name`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `production_batches`
--
ALTER TABLE `production_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD UNIQUE KEY `batch_number` (`batch_number`),
  ADD KEY `recipe_id` (`recipe_id`),
  ADD KEY `fk_production_batches_product` (`product_id`),
  ADD KEY `idx_expiry_date` (`expiry_date`);

--
-- Indexes for table `production_cost_approvals`
--
ALTER TABLE `production_cost_approvals`
  ADD PRIMARY KEY (`approval_id`),
  ADD KEY `recipe_id` (`recipe_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `reviewed_by` (`reviewed_by`);

--
-- Indexes for table `production_material_usage`
--
ALTER TABLE `production_material_usage`
  ADD PRIMARY KEY (`usage_id`),
  ADD KEY `idx_batch_materials` (`batch_id`),
  ADD KEY `idx_material_usage` (`raw_material_id`);

--
-- Indexes for table `production_recipes`
--
ALTER TABLE `production_recipes`
  ADD PRIMARY KEY (`recipe_id`),
  ADD KEY `finished_product_id` (`finished_product_id`);

--
-- Indexes for table `production_wastage_logs`
--
ALTER TABLE `production_wastage_logs`
  ADD PRIMARY KEY (`wastage_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_sku` (`sku`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_unit_id` (`unit_id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_barcode` (`barcode`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_quantity_reorder` (`quantity_on_hand`,`reorder_level`),
  ADD KEY `idx_expiry_date` (`expiry_date`),
  ADD KEY `idx_milk_source_cooperative` (`milk_source_cooperative`),
  ADD KEY `idx_batch_lot_number` (`batch_lot_number`),
  ADD KEY `idx_production_date` (`production_date`),
  ADD KEY `idx_quality_grade` (`quality_grade`),
  ADD KEY `idx_products_standard_qty` (`standard_order_quantity`),
  ADD KEY `idx_products_expiry_date` (`expiry_date`,`is_active`),
  ADD KEY `idx_products_milk_cooperative` (`milk_source_cooperative`),
  ADD KEY `idx_products_cooperative_active` (`milk_source_cooperative`,`is_active`,`quantity_on_hand`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`),
  ADD KEY `idx_category_name` (`category_name`),
  ADD KEY `idx_parent_category` (`parent_category_id`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`po_id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD UNIQUE KEY `po_number_2` (`po_number`),
  ADD KEY `idx_po_number` (`po_number`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status_id` (`status_id`),
  ADD KEY `idx_order_date` (`order_date`),
  ADD KEY `idx_expected_delivery_date` (`expected_delivery_date`),
  ADD KEY `idx_purchase_type` (`purchase_type`),
  ADD KEY `idx_milk_quality_grade` (`milk_quality_grade`),
  ADD KEY `idx_is_nmfdc_cooperative` (`is_nmfdc_cooperative`),
  ADD KEY `idx_collection_station` (`collection_station`),
  ADD KEY `idx_po_simplified_status` (`status_id`,`order_date`),
  ADD KEY `idx_po_simplified_supplier` (`supplier_id`,`status_id`),
  ADD KEY `idx_po_purchase_type` (`purchase_type`,`milk_quality_grade`),
  ADD KEY `idx_po_nmfdc_cooperative` (`is_nmfdc_cooperative`),
  ADD KEY `idx_po_type_date` (`purchase_type`,`order_date`,`status_id`),
  ADD KEY `idx_po_hf_approved` (`highland_fresh_approved`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`po_item_id`),
  ADD KEY `idx_po_id` (`po_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_expiry_date` (`expiry_date`),
  ADD KEY `idx_batch_number` (`batch_number`),
  ADD KEY `idx_milk_source_cooperative` (`milk_source_cooperative`),
  ADD KEY `idx_quality_grade_received` (`quality_grade_received`),
  ADD KEY `idx_quality_test_passed` (`quality_test_passed`),
  ADD KEY `idx_production_date` (`production_date`),
  ADD KEY `idx_highland_fresh_batch_code` (`highland_fresh_batch_code`),
  ADD KEY `idx_po_items_raw_material` (`raw_material_id`);

--
-- Indexes for table `purchase_requisitions`
--
ALTER TABLE `purchase_requisitions`
  ADD PRIMARY KEY (`requisition_id`),
  ADD UNIQUE KEY `requisition_number` (`requisition_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_requested_by` (`requested_by`),
  ADD KEY `idx_request_date` (`request_date`);

--
-- Indexes for table `purchase_requisition_items`
--
ALTER TABLE `purchase_requisition_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_requisition` (`requisition_id`),
  ADD KEY `idx_raw_material` (`raw_material_id`);

--
-- Indexes for table `raw_materials`
--
ALTER TABLE `raw_materials`
  ADD PRIMARY KEY (`raw_material_id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `fk_raw_materials_unit` (`unit_id`);

--
-- Indexes for table `raw_material_batches`
--
ALTER TABLE `raw_material_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `idx_raw_material_id` (`raw_material_id`),
  ADD KEY `idx_highland_fresh_batch_code` (`highland_fresh_batch_code`),
  ADD KEY `idx_received_date` (`received_date`),
  ADD KEY `idx_expiry_date` (`expiry_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_current_quantity` (`current_quantity`),
  ADD KEY `idx_fifo_order` (`raw_material_id`,`received_date`,`batch_id`),
  ADD KEY `fk_rmb_supplier` (`supplier_id`),
  ADD KEY `fk_rmb_po_item` (`po_item_id`);

--
-- Indexes for table `raw_material_consumption`
--
ALTER TABLE `raw_material_consumption`
  ADD PRIMARY KEY (`consumption_id`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_raw_material_id` (`raw_material_id`),
  ADD KEY `idx_production_batch_id` (`production_batch_id`),
  ADD KEY `idx_consumption_date` (`consumption_date`);

--
-- Indexes for table `raw_material_quality_tests`
--
ALTER TABLE `raw_material_quality_tests`
  ADD PRIMARY KEY (`test_id`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_raw_material_id` (`raw_material_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `raw_material_temperature_log`
--
ALTER TABLE `raw_material_temperature_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_raw_material_id` (`raw_material_id`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_timestamp` (`timestamp`);

--
-- Indexes for table `recipe_raw_materials`
--
ALTER TABLE `recipe_raw_materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_recipe_material` (`recipe_id`,`raw_material_id`),
  ADD KEY `raw_material_id` (`raw_material_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`sale_id`),
  ADD UNIQUE KEY `sale_number` (`sale_number`),
  ADD KEY `idx_highland_fresh_date` (`sale_date`),
  ADD KEY `idx_highland_fresh_customer_type` (`customer_type`),
  ADD KEY `idx_highland_fresh_transaction_type` (`transaction_type`),
  ADD KEY `idx_highland_fresh_cooperative` (`cooperative_member_id`),
  ADD KEY `idx_highland_fresh_traceability` (`traceability_code`),
  ADD KEY `idx_highland_fresh_batch` (`highland_fresh_receipt_number`),
  ADD KEY `idx_sale_number` (`sale_number`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_payment_method_id` (`payment_method_id`),
  ADD KEY `idx_status_id` (`status_id`),
  ADD KEY `idx_sale_date` (`sale_date`),
  ADD KEY `idx_customer_phone` (`customer_phone`),
  ADD KEY `idx_customer_id` (`customer_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`sale_item_id`),
  ADD KEY `idx_sale_id` (`sale_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_status_id` (`status_id`),
  ADD KEY `fk_sale_items_batch` (`batch_id`);

--
-- Indexes for table `spoilage_log`
--
ALTER TABLE `spoilage_log`
  ADD PRIMARY KEY (`spoilage_id`),
  ADD UNIQUE KEY `spoilage_reference` (`spoilage_reference`),
  ADD KEY `idx_spoilage_ref` (`spoilage_reference`),
  ADD KEY `idx_source_type` (`source_type`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_spoilage_type` (`spoilage_type`),
  ADD KEY `idx_spoilage_date` (`spoilage_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_fifo_bypassed` (`fifo_bypassed`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`),
  ADD UNIQUE KEY `cooperative_code` (`cooperative_code`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_contact_person` (`contact_person`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_payment_term_id` (`payment_term_id`),
  ADD KEY `idx_country_id` (`country_id`),
  ADD KEY `idx_city_id` (`city_id`),
  ADD KEY `idx_supplier_type` (`supplier_type`),
  ADD KEY `idx_milk_quality_grade` (`milk_quality_grade`),
  ADD KEY `idx_is_nmfdc_member` (`is_nmfdc_member`),
  ADD KEY `idx_nmfdc_member_since` (`nmfdc_member_since`),
  ADD KEY `idx_established_year` (`established_year`),
  ADD KEY `idx_suppliers_dairy_grade` (`milk_quality_grade`,`is_nmfdc_member`),
  ADD KEY `idx_suppliers_quantity_limits` (`supplier_id`,`enforce_quantity_limits`,`max_single_order_quantity`),
  ADD KEY `idx_suppliers_hf_category` (`highland_fresh_material_category`),
  ADD KEY `idx_suppliers_hf_approved` (`highland_fresh_approved`);

--
-- Indexes for table `supplier_raw_materials`
--
ALTER TABLE `supplier_raw_materials`
  ADD PRIMARY KEY (`supplier_raw_material_id`),
  ADD UNIQUE KEY `unique_supplier_material` (`supplier_id`,`raw_material_id`),
  ADD KEY `idx_supplier_materials_supplier` (`supplier_id`),
  ADD KEY `idx_supplier_materials_material` (`raw_material_id`),
  ADD KEY `idx_supplier_materials_approved` (`highland_fresh_approved`);

--
-- Indexes for table `system_notifications`
--
ALTER TABLE `system_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_type` (`notification_type`),
  ADD KEY `idx_target_role` (`target_role`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD PRIMARY KEY (`tax_rate_id`),
  ADD UNIQUE KEY `rate_code` (`rate_code`),
  ADD KEY `idx_rate_code` (`rate_code`),
  ADD KEY `idx_applicable_to` (`applicable_to`),
  ADD KEY `idx_city_id` (`city_id`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_effective_date` (`effective_date`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `transaction_statuses`
--
ALTER TABLE `transaction_statuses`
  ADD PRIMARY KEY (`status_id`),
  ADD UNIQUE KEY `status_name` (`status_name`),
  ADD KEY `idx_status_name` (`status_name`),
  ADD KEY `idx_status_type` (`status_type`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  ADD PRIMARY KEY (`unit_id`),
  ADD UNIQUE KEY `unit_name` (`unit_name`),
  ADD UNIQUE KEY `unit_abbreviation` (`unit_abbreviation`),
  ADD KEY `idx_unit_name` (`unit_name`),
  ADD KEY `idx_unit_abbreviation` (`unit_abbreviation`),
  ADD KEY `idx_unit_type` (`unit_type`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`),
  ADD KEY `idx_role_name` (`role_name`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `batch_reservations`
--
ALTER TABLE `batch_reservations`
  MODIFY `reservation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `cities`
--
ALTER TABLE `cities`
  MODIFY `city_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `country_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `customer_order_status`
--
ALTER TABLE `customer_order_status`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `customer_payments`
--
ALTER TABLE `customer_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_types`
--
ALTER TABLE `customer_types`
  MODIFY `customer_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `dispatch_audit_log`
--
ALTER TABLE `dispatch_audit_log`
  MODIFY `audit_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `farmer_payouts`
--
ALTER TABLE `farmer_payouts`
  MODIFY `payout_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  MODIFY `adjustment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `low_stock_alerts`
--
ALTER TABLE `low_stock_alerts`
  MODIFY `alert_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `milk_daily_collections`
--
ALTER TABLE `milk_daily_collections`
  MODIFY `collection_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `payment_terms`
--
ALTER TABLE `payment_terms`
  MODIFY `payment_term_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `production_batches`
--
ALTER TABLE `production_batches`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `production_cost_approvals`
--
ALTER TABLE `production_cost_approvals`
  MODIFY `approval_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `production_material_usage`
--
ALTER TABLE `production_material_usage`
  MODIFY `usage_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `production_recipes`
--
ALTER TABLE `production_recipes`
  MODIFY `recipe_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `production_wastage_logs`
--
ALTER TABLE `production_wastage_logs`
  MODIFY `wastage_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `po_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `po_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_requisitions`
--
ALTER TABLE `purchase_requisitions`
  MODIFY `requisition_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `purchase_requisition_items`
--
ALTER TABLE `purchase_requisition_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `raw_materials`
--
ALTER TABLE `raw_materials`
  MODIFY `raw_material_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `raw_material_batches`
--
ALTER TABLE `raw_material_batches`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `raw_material_consumption`
--
ALTER TABLE `raw_material_consumption`
  MODIFY `consumption_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `raw_material_quality_tests`
--
ALTER TABLE `raw_material_quality_tests`
  MODIFY `test_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `raw_material_temperature_log`
--
ALTER TABLE `raw_material_temperature_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recipe_raw_materials`
--
ALTER TABLE `recipe_raw_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `sale_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `spoilage_log`
--
ALTER TABLE `spoilage_log`
  MODIFY `spoilage_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `supplier_raw_materials`
--
ALTER TABLE `supplier_raw_materials`
  MODIFY `supplier_raw_material_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `system_notifications`
--
ALTER TABLE `system_notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tax_rates`
--
ALTER TABLE `tax_rates`
  MODIFY `tax_rate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `transaction_statuses`
--
ALTER TABLE `transaction_statuses`
  MODIFY `status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `units_of_measure`
--
ALTER TABLE `units_of_measure`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cities`
--
ALTER TABLE `cities`
  ADD CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`country_id`) ON UPDATE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`city_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_customers_customer_types` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`customer_type_id`),
  ADD CONSTRAINT `fk_customers_payment_terms` FOREIGN KEY (`payment_term_id`) REFERENCES `payment_terms` (`payment_term_id`);

--
-- Constraints for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`),
  ADD CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`),
  ADD CONSTRAINT `customer_payments_ibfk_4` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `farmer_payouts`
--
ALTER TABLE `farmer_payouts`
  ADD CONSTRAINT `farmer_payouts_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`);

--
-- Constraints for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  ADD CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `inventory_adjustments_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `low_stock_alerts`
--
ALTER TABLE `low_stock_alerts`
  ADD CONSTRAINT `low_stock_alerts_ibfk_1` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE;

--
-- Constraints for table `milk_daily_collections`
--
ALTER TABLE `milk_daily_collections`
  ADD CONSTRAINT `milk_daily_collections_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `milk_daily_collections_ibfk_2` FOREIGN KEY (`qc_officer_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `production_batches`
--
ALTER TABLE `production_batches`
  ADD CONSTRAINT `fk_production_batches_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `production_batches_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `production_recipes` (`recipe_id`);

--
-- Constraints for table `production_cost_approvals`
--
ALTER TABLE `production_cost_approvals`
  ADD CONSTRAINT `production_cost_approvals_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `production_recipes` (`recipe_id`),
  ADD CONSTRAINT `production_cost_approvals_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `production_cost_approvals_ibfk_3` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `production_cost_approvals_ibfk_4` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `production_material_usage`
--
ALTER TABLE `production_material_usage`
  ADD CONSTRAINT `production_material_usage_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`batch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `production_material_usage_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`);

--
-- Constraints for table `production_recipes`
--
ALTER TABLE `production_recipes`
  ADD CONSTRAINT `production_recipes_ibfk_1` FOREIGN KEY (`finished_product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `production_wastage_logs`
--
ALTER TABLE `production_wastage_logs`
  ADD CONSTRAINT `production_wastage_logs_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`batch_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`category_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`unit_id`) ON UPDATE CASCADE;

--
-- Constraints for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `product_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE;

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `fk_po_items_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE;

--
-- Constraints for table `purchase_requisition_items`
--
ALTER TABLE `purchase_requisition_items`
  ADD CONSTRAINT `purchase_requisition_items_ibfk_1` FOREIGN KEY (`requisition_id`) REFERENCES `purchase_requisitions` (`requisition_id`) ON DELETE CASCADE;

--
-- Constraints for table `raw_materials`
--
ALTER TABLE `raw_materials`
  ADD CONSTRAINT `fk_raw_materials_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`unit_id`);

--
-- Constraints for table `raw_material_batches`
--
ALTER TABLE `raw_material_batches`
  ADD CONSTRAINT `fk_rmb_po_item` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items` (`po_item_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rmb_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`),
  ADD CONSTRAINT `fk_rmb_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE SET NULL;

--
-- Constraints for table `raw_material_consumption`
--
ALTER TABLE `raw_material_consumption`
  ADD CONSTRAINT `fk_rmc_batch` FOREIGN KEY (`batch_id`) REFERENCES `raw_material_batches` (`batch_id`),
  ADD CONSTRAINT `fk_rmc_production_batch` FOREIGN KEY (`production_batch_id`) REFERENCES `production_batches` (`batch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_rmc_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`);

--
-- Constraints for table `raw_material_quality_tests`
--
ALTER TABLE `raw_material_quality_tests`
  ADD CONSTRAINT `fk_rmqt_batch` FOREIGN KEY (`batch_id`) REFERENCES `raw_material_batches` (`batch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rmqt_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE;

--
-- Constraints for table `raw_material_temperature_log`
--
ALTER TABLE `raw_material_temperature_log`
  ADD CONSTRAINT `fk_rmtl_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE;

--
-- Constraints for table `recipe_raw_materials`
--
ALTER TABLE `recipe_raw_materials`
  ADD CONSTRAINT `recipe_raw_materials_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `production_recipes` (`recipe_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recipe_raw_materials_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `sales_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE;

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `fk_sale_items_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`batch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `sale_items_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE;

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `fk_suppliers_cities` FOREIGN KEY (`city_id`) REFERENCES `cities` (`city_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_suppliers_countries` FOREIGN KEY (`country_id`) REFERENCES `countries` (`country_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_suppliers_payment_terms` FOREIGN KEY (`payment_term_id`) REFERENCES `payment_terms` (`payment_term_id`) ON UPDATE CASCADE;

--
-- Constraints for table `supplier_raw_materials`
--
ALTER TABLE `supplier_raw_materials`
  ADD CONSTRAINT `fk_supplier_materials_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_supplier_materials_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE;

--
-- Constraints for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD CONSTRAINT `tax_rates_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`city_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tax_rates_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
