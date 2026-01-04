-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: highland_fresh_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cities` (
  `city_id` int(11) NOT NULL AUTO_INCREMENT,
  `city_name` varchar(100) NOT NULL,
  `region` varchar(100) DEFAULT NULL,
  `country_id` int(11) NOT NULL DEFAULT 1,
  `postal_code_pattern` varchar(20) DEFAULT NULL COMMENT 'Common postal code pattern for this city',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`city_id`),
  KEY `idx_city_name` (`city_name`),
  KEY `idx_region` (`region`),
  KEY `idx_country_id` (`country_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `cities_ibfk_1` FOREIGN KEY (`country_id`) REFERENCES `countries` (`country_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cities`
--

LOCK TABLES `cities` WRITE;
/*!40000 ALTER TABLE `cities` DISABLE KEYS */;
INSERT INTO `cities` VALUES (1,'Manila','NCR',1,'1000-1099',1,'2025-08-01 18:01:04'),(2,'Quezon City','NCR',1,'1100-1199',1,'2025-08-01 18:01:04'),(3,'Makati City','NCR',1,'1200-1299',1,'2025-08-01 18:01:04'),(4,'Pasig City','NCR',1,'1600-1699',1,'2025-08-01 18:01:04'),(5,'Taguig City','NCR',1,'1630-1639',1,'2025-08-01 18:01:04'),(6,'Marikina City','NCR',1,'1800-1899',1,'2025-08-01 18:01:04'),(7,'Las Pi├▒as City','NCR',1,'1740-1749',1,'2025-08-01 18:01:04'),(8,'Muntinlupa City','NCR',1,'1770-1789',1,'2025-08-01 18:01:04'),(9,'Para├▒aque City','NCR',1,'1700-1719',1,'2025-08-01 18:01:04'),(10,'Pasay City','NCR',1,'1300-1309',1,'2025-08-01 18:01:04'),(11,'Caloocan City','NCR',1,'1400-1499',1,'2025-08-01 18:01:04'),(12,'Malabon City','NCR',1,'1470-1479',1,'2025-08-01 18:01:04'),(13,'Navotas City','NCR',1,'1485',1,'2025-08-01 18:01:04'),(14,'Valenzuela City','NCR',1,'1440-1449',1,'2025-08-01 18:01:04'),(15,'San Juan City','NCR',1,'1500-1509',1,'2025-08-01 18:01:04'),(16,'Mandaluyong City','NCR',1,'1550-1559',1,'2025-08-01 18:01:04'),(17,'Cebu City','Central Visayas',1,'6000',1,'2025-08-01 18:01:04'),(18,'Davao City','Davao Region',1,'8000',1,'2025-08-01 18:01:04'),(19,'Antipolo City','CALABARZON',1,'1870',1,'2025-08-01 18:01:04'),(20,'Cagayan de Oro','Northern Mindanao',1,'9000',1,'2025-08-01 18:01:04'),(21,'Zamboanga City','Zamboanga Peninsula',1,'7000',1,'2025-08-01 18:01:04'),(22,'Iloilo City','Western Visayas',1,'5000',1,'2025-08-01 18:01:04'),(23,'Bacolod City','Western Visayas',1,'6100',1,'2025-08-01 18:01:04'),(24,'General Santos','SOCCSKSARGEN',1,'9500',1,'2025-08-01 18:01:04'),(25,'Baguio City','Cordillera Administrative Region',1,'2600',1,'2025-08-01 18:01:04');
/*!40000 ALTER TABLE `cities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `countries` (
  `country_id` int(11) NOT NULL AUTO_INCREMENT,
  `country_code` varchar(3) NOT NULL COMMENT 'ISO 3166-1 alpha-3 code',
  `country_name` varchar(100) NOT NULL,
  `phone_prefix` varchar(10) NOT NULL COMMENT 'International dialing code',
  `currency_code` varchar(3) NOT NULL COMMENT 'ISO 4217 currency code',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`country_id`),
  UNIQUE KEY `country_code` (`country_code`),
  UNIQUE KEY `country_name` (`country_name`),
  KEY `idx_country_code` (`country_code`),
  KEY `idx_country_name` (`country_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `countries`
--

LOCK TABLES `countries` WRITE;
/*!40000 ALTER TABLE `countries` DISABLE KEYS */;
INSERT INTO `countries` VALUES (1,'PHL','Philippines','+63','PHP',1,'2025-08-01 18:01:03'),(2,'USA','United States','+1','USD',1,'2025-08-01 18:01:03'),(3,'CAN','Canada','+1','CAD',1,'2025-08-01 18:01:03'),(4,'JPN','Japan','+81','JPY',1,'2025-08-01 18:01:03'),(5,'SGP','Singapore','+65','SGD',1,'2025-08-01 18:01:03'),(6,'HKG','Hong Kong','+852','HKD',1,'2025-08-01 18:01:03'),(7,'TWN','Taiwan','+886','TWD',1,'2025-08-01 18:01:03'),(8,'KOR','South Korea','+82','KRW',1,'2025-08-01 18:01:03'),(9,'CHN','China','+86','CNY',1,'2025-08-01 18:01:03'),(10,'THA','Thailand','+66','THB',1,'2025-08-01 18:01:03');
/*!40000 ALTER TABLE `countries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `finished_products_inventory_view`
--

DROP TABLE IF EXISTS `finished_products_inventory_view`;
/*!50001 DROP VIEW IF EXISTS `finished_products_inventory_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `finished_products_inventory_view` AS SELECT
 1 AS `product_id`,
  1 AS `product_name`,
  1 AS `sku`,
  1 AS `category_name`,
  1 AS `unit_name`,
  1 AS `quantity_on_hand`,
  1 AS `reorder_level`,
  1 AS `max_stock_level`,
  1 AS `selling_price`,
  1 AS `production_cost`,
  1 AS `stock_status`,
  1 AS `inventory_retail_value`,
  1 AS `inventory_cost_value`,
  1 AS `profit_per_unit`,
  1 AS `profit_margin_percent`,
  1 AS `quality_grade`,
  1 AS `expiry_date`,
  1 AS `days_until_expiry`,
  1 AS `expiry_status` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `highland_fresh_cooperatives`
--

DROP TABLE IF EXISTS `highland_fresh_cooperatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `highland_fresh_cooperatives` (
  `cooperative_id` int(11) NOT NULL AUTO_INCREMENT,
  `cooperative_name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `region` varchar(100) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `established_year` int(4) DEFAULT NULL,
  `member_farmers_count` int(11) DEFAULT NULL,
  `cattle_count` int(11) DEFAULT NULL,
  `daily_milk_capacity_liters` decimal(10,2) DEFAULT NULL,
  `cattle_breeds` text DEFAULT NULL COMMENT 'Types of cattle breeds (Holstein-Sahiwal, Holstein-Jersey, etc.)',
  `specialization` text DEFAULT NULL COMMENT 'What the cooperative specializes in',
  `nmfdc_member_since` date DEFAULT NULL COMMENT 'When they joined NMFDC',
  `is_active` tinyint(1) DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cooperative_id`),
  UNIQUE KEY `cooperative_name` (`cooperative_name`),
  KEY `idx_cooperative_name` (`cooperative_name`),
  KEY `idx_location` (`location`),
  KEY `idx_region` (`region`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_nmfdc_member_since` (`nmfdc_member_since`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `highland_fresh_cooperatives`
--

LOCK TABLES `highland_fresh_cooperatives` WRITE;
/*!40000 ALTER TABLE `highland_fresh_cooperatives` DISABLE KEYS */;
INSERT INTO `highland_fresh_cooperatives` VALUES (1,'Dalwangan Dairy Cooperative','Dalwangan, Bukidnon','Northern Mindanao','Maria Santos','+63-917-1234567','maria@dalwangandairy.coop',1985,35,88,800.00,'Holstein-Sahiwal, Holstein-Jersey crossbred','Quality raw milk production with advanced cold storage','1987-03-15',1,'One of the founding members of NMFDC, delivers 800L daily','2025-08-01 17:58:27','2025-08-01 17:58:27'),(2,'Misamis Oriental Dairy Cooperative','Claveria, Misamis Oriental','Northern Mindanao','Roberto Cruz','+63-918-2345678','roberto@misorientaldairy.coop',1989,28,65,650.00,'Holstein-Sahiwal crossbred','Specialized in consistent quality milk supply','1989-08-22',1,'Strong focus on Holstein-Sahiwal crossbreeding program','2025-08-01 17:58:27','2025-08-01 17:58:27'),(3,'Bukidnon Dairy Cooperative','Valencia City, Bukidnon','Northern Mindanao','Carlos Mendoza','+63-919-3456789','carlos@bukidnondairy.coop',1988,42,95,950.00,'Holstein-Jersey from New Zealand','Premium quality raw milk production','1988-01-10',1,'Known for New Zealand Holstein-Jersey genetics','2025-08-01 17:58:27','2025-08-01 17:58:27'),(4,'Cagayan de Oro Dairy Alliance','Gusa, Cagayan de Oro City','Northern Mindanao','Ana Rodriguez','+63-920-4567890','ana@cdodairyalliance.coop',1991,18,45,380.00,'Holstein-Sahiwal crossbred','Alliance of small urban dairy farms','1992-05-18',1,'Urban dairy farming alliance serving CDO area','2025-08-01 17:58:27','2025-08-01 17:58:27'),(5,'Malaybalay Cheese Artisans','Malaybalay City, Bukidnon','Northern Mindanao','Jose Valencia','+63-921-5678901','jose@malaybalaycheese.coop',1987,25,72,720.00,'Holstein-Jersey crossbred','Artisanal cheese production and premium milk','1987-11-03',1,'Specializes in artisanal Gouda (Queso de Oro) production','2025-08-01 17:58:27','2025-08-01 17:58:27'),(6,'Iligan Dairy Cooperative','Iligan City, Lanao del Norte','Northern Mindanao','Rosa Fernandez','+63-922-6789012','rosa@iligandairy.coop',1990,32,78,750.00,'Holstein-Sahiwal crossbred','Quality milk production and cooperative development','1991-02-14',1,'NMFDC member cooperative from Iligan area','2025-08-01 17:58:27','2025-08-01 17:58:27');
/*!40000 ALTER TABLE `highland_fresh_cooperatives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `highland_fresh_milk_deliveries`
--

DROP TABLE IF EXISTS `highland_fresh_milk_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `highland_fresh_milk_deliveries` (
  `delivery_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL COMMENT 'Reference to dairy cooperative/farm',
  `delivery_date` date NOT NULL,
  `delivery_time` time DEFAULT NULL,
  `milk_quantity_liters` decimal(10,2) NOT NULL CHECK (`milk_quantity_liters` > 0),
  `temperature_celsius` decimal(4,1) DEFAULT NULL COMMENT 'Milk temperature at delivery',
  `quality_grade` enum('Grade A','Grade B','Grade C') DEFAULT 'Grade A',
  `fat_content_percent` decimal(4,2) DEFAULT NULL COMMENT 'Milk fat content percentage',
  `protein_content_percent` decimal(4,2) DEFAULT NULL COMMENT 'Protein content percentage',
  `somatic_cell_count` int(11) DEFAULT NULL COMMENT 'Quality indicator',
  `bacterial_count` int(11) DEFAULT NULL COMMENT 'Bacterial count for quality control',
  `ph_level` decimal(3,2) DEFAULT NULL COMMENT 'pH level of milk',
  `delivery_truck_id` varchar(20) DEFAULT NULL COMMENT 'Truck/vehicle identification',
  `driver_name` varchar(100) DEFAULT NULL,
  `collection_station` varchar(255) DEFAULT NULL COMMENT 'Which collection station the milk came from',
  `batch_number` varchar(50) DEFAULT NULL COMMENT 'Cooperative batch identifier',
  `unit_price_per_liter` decimal(8,2) DEFAULT NULL COMMENT 'Price paid per liter',
  `total_amount` decimal(10,2) DEFAULT NULL COMMENT 'Total payment for this delivery',
  `payment_status` enum('Pending','Paid','Overdue') DEFAULT 'Pending',
  `quality_approved` tinyint(1) DEFAULT 1 COMMENT 'Was the milk quality approved',
  `rejection_reason` text DEFAULT NULL COMMENT 'If rejected, reason for rejection',
  `received_by_user_id` int(11) DEFAULT NULL COMMENT 'NMFDC employee who received the delivery',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`delivery_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_quality_grade` (`quality_grade`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_quality_approved` (`quality_approved`),
  KEY `idx_batch_number` (`batch_number`),
  KEY `idx_received_by_user` (`received_by_user_id`),
  KEY `idx_delivery_date_supplier` (`delivery_date`,`supplier_id`),
  KEY `idx_highland_deliveries_date` (`delivery_date`,`supplier_id`),
  CONSTRAINT `fk_milk_delivery_received_by` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_milk_delivery_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `highland_fresh_milk_deliveries`
--

LOCK TABLES `highland_fresh_milk_deliveries` WRITE;
/*!40000 ALTER TABLE `highland_fresh_milk_deliveries` DISABLE KEYS */;
INSERT INTO `highland_fresh_milk_deliveries` VALUES (1,1,'2025-08-20','06:00:00',800.00,4.2,'Grade A',3.85,3.25,180000,15000,6.75,'DDC-TRUCK-01','Pedro Santos','Dalwangan Cold Storage Station','DDC-20250820-001',32.50,26000.00,'Paid',1,NULL,1,'Daily morning delivery from Dalwangan - excellent quality','2025-08-20 06:15:00','2025-08-20 08:30:00'),(2,2,'2025-08-20','06:30:00',650.00,3.8,'Grade A',3.90,3.30,175000,12000,6.70,'MODC-TRUCK-01','Roberto Velasco','Claveria Collection Center','MODC-20250820-001',32.00,20800.00,'Paid',1,NULL,1,'Misamis Oriental delivery - Holstein-Sahiwal milk','2025-08-20 06:45:00','2025-08-20 09:15:00'),(3,3,'2025-08-20','07:00:00',950.00,4.0,'Grade A',4.10,3.40,165000,10000,6.80,'BDC-TRUCK-01','Carlos Magsaysay','Valencia Central Station','BDC-20250820-001',34.00,32300.00,'Paid',1,NULL,1,'Premium quality milk from Holstein-Jersey cattle','2025-08-20 07:15:00','2025-08-20 10:00:00'),(4,4,'2025-08-20','08:00:00',380.00,5.5,'Grade B',3.75,3.15,220000,25000,6.60,'CDODA-TRUCK-01','Juan Martinez','Gusa Collection Point','CDODA-20250820-001',30.00,11400.00,'Pending',1,NULL,1,'Urban farm alliance delivery - slightly higher temperature','2025-08-20 08:15:00','2025-08-20 08:15:00'),(5,1,'2025-08-21','06:00:00',820.00,4.1,'Grade A',3.88,3.28,185000,14000,6.78,'DDC-TRUCK-01','Pedro Santos','Dalwangan Cold Storage Station','DDC-20250821-001',32.50,26650.00,'Paid',1,NULL,1,'Daily delivery - consistent quality from Dalwangan','2025-08-21 06:15:00','2025-08-21 08:45:00'),(6,5,'2025-08-19','09:00:00',720.00,3.9,'Grade A',4.20,3.50,160000,8000,6.85,'MCA-TRUCK-01','Jose Martinez','Malaybalay Cheese Center','MCA-20250819-001',35.00,25200.00,'Paid',1,NULL,1,'Weekly delivery for cheese production - premium Holstein-Jersey milk','2025-08-19 09:15:00','2025-08-20 14:30:00');
/*!40000 ALTER TABLE `highland_fresh_milk_deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `highland_fresh_raw_materials_view`
--

DROP TABLE IF EXISTS `highland_fresh_raw_materials_view`;
/*!50001 DROP VIEW IF EXISTS `highland_fresh_raw_materials_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `highland_fresh_raw_materials_view` AS SELECT
 1 AS `raw_material_id`,
  1 AS `name`,
  1 AS `sku`,
  1 AS `category`,
  1 AS `unit_id`,
  1 AS `unit_name`,
  1 AS `standard_cost`,
  1 AS `quantity_on_hand`,
  1 AS `reorder_level`,
  1 AS `quality_grade`,
  1 AS `highland_fresh_approved`,
  1 AS `requires_quality_test`,
  1 AS `storage_temp_min`,
  1 AS `storage_temp_max`,
  1 AS `shelf_life_days`,
  1 AS `description` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `highland_fresh_supplier_materials_view`
--

DROP TABLE IF EXISTS `highland_fresh_supplier_materials_view`;
/*!50001 DROP VIEW IF EXISTS `highland_fresh_supplier_materials_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `highland_fresh_supplier_materials_view` AS SELECT
 1 AS `supplier_raw_material_id`,
  1 AS `supplier_id`,
  1 AS `supplier_name`,
  1 AS `highland_fresh_material_category`,
  1 AS `raw_material_id`,
  1 AS `raw_material_name`,
  1 AS `material_category`,
  1 AS `supplier_sku`,
  1 AS `unit_cost`,
  1 AS `minimum_order_quantity`,
  1 AS `maximum_order_quantity`,
  1 AS `lead_time_days`,
  1 AS `is_preferred_supplier`,
  1 AS `quality_certification`,
  1 AS `last_price_update` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `highland_fresh_suppliers_view`
--

DROP TABLE IF EXISTS `highland_fresh_suppliers_view`;
/*!50001 DROP VIEW IF EXISTS `highland_fresh_suppliers_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `highland_fresh_suppliers_view` AS SELECT
 1 AS `supplier_id`,
  1 AS `name`,
  1 AS `contact_person`,
  1 AS `email`,
  1 AS `phone_number`,
  1 AS `supplier_type`,
  1 AS `highland_fresh_material_category`,
  1 AS `highland_fresh_approved`,
  1 AS `highland_fresh_approval_date`,
  1 AS `highland_fresh_certifications`,
  1 AS `highland_fresh_restrictions`,
  1 AS `is_nmfdc_member`,
  1 AS `nmfdc_member_since`,
  1 AS `daily_milk_capacity_liters`,
  1 AS `milk_quality_grade` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `inventory_adjustments`
--

DROP TABLE IF EXISTS `inventory_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_adjustments` (
  `adjustment_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`adjustment_id`),
  UNIQUE KEY `adjustment_number` (`adjustment_number`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_adjustment_number` (`adjustment_number`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_adjustment_type` (`adjustment_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `inventory_adjustments_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustments`
--

LOCK TABLES `inventory_adjustments` WRITE;
/*!40000 ALTER TABLE `inventory_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `inventory_summary_view`
--

DROP TABLE IF EXISTS `inventory_summary_view`;
/*!50001 DROP VIEW IF EXISTS `inventory_summary_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `inventory_summary_view` AS SELECT
 1 AS `inventory_type`,
  1 AS `total_items`,
  1 AS `total_value`,
  1 AS `items_needing_reorder`,
  1 AS `overstocked_items`,
  1 AS `avg_stock_level` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_methods` (
  `payment_method_id` int(11) NOT NULL AUTO_INCREMENT,
  `method_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `requires_change` tinyint(1) DEFAULT 0 COMMENT 'Whether this payment method can provide change',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payment_method_id`),
  UNIQUE KEY `method_name` (`method_name`),
  KEY `idx_method_name` (`method_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (1,'Cash','Cash payment',1,1,'2025-08-01 17:58:26'),(2,'Credit Card','Credit card payment',1,0,'2025-08-01 17:58:26'),(3,'Debit Card','Debit card payment',1,0,'2025-08-01 17:58:26'),(4,'GCash','GCash mobile payment',1,0,'2025-08-01 17:58:26'),(5,'Maya','Maya (formerly PayMaya) payment',1,0,'2025-08-01 17:58:26'),(6,'Bank Transfer','Bank transfer payment',1,0,'2025-08-01 17:58:26'),(7,'Check','Check payment',1,0,'2025-08-01 17:58:26');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_terms`
--

DROP TABLE IF EXISTS `payment_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_terms` (
  `payment_term_id` int(11) NOT NULL AUTO_INCREMENT,
  `term_code` varchar(20) NOT NULL COMMENT 'Short code like NET30, NET15, COD',
  `term_name` varchar(100) NOT NULL,
  `days_to_pay` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of days to pay, 0 for immediate',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`payment_term_id`),
  UNIQUE KEY `term_code` (`term_code`),
  KEY `idx_term_code` (`term_code`),
  KEY `idx_term_name` (`term_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_terms`
--

LOCK TABLES `payment_terms` WRITE;
/*!40000 ALTER TABLE `payment_terms` DISABLE KEYS */;
INSERT INTO `payment_terms` VALUES (1,'COD','Cash on Delivery',0,'Payment due upon delivery',1,'2025-08-01 18:01:04'),(2,'NET7','Net 7 Days',7,'Payment due within 7 days of invoice',1,'2025-08-01 18:01:04'),(3,'NET15','Net 15 Days',15,'Payment due within 15 days of invoice',1,'2025-08-01 18:01:04'),(4,'NET21','Net 21 Days',21,'Payment due within 21 days of invoice',1,'2025-08-01 18:01:04'),(5,'NET30','Net 30 Days',30,'Payment due within 30 days of invoice',1,'2025-08-01 18:01:04'),(6,'NET45','Net 45 Days',45,'Payment due within 45 days of invoice',1,'2025-08-01 18:01:04'),(7,'NET60','Net 60 Days',60,'Payment due within 60 days of invoice',1,'2025-08-01 18:01:04'),(8,'PREPAID','Prepaid',-1,'Payment required before delivery',1,'2025-08-01 18:01:04'),(9,'2/10-NET30','2% 10 Days, Net 30',30,'2% discount if paid within 10 days, otherwise due in 30 days',1,'2025-08-01 18:01:04');
/*!40000 ALTER TABLE `payment_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attribute_values`
--

DROP TABLE IF EXISTS `product_attribute_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_attribute_values` (
  `value_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `attribute_id` int(11) NOT NULL,
  `attribute_value` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`value_id`),
  UNIQUE KEY `unique_product_attribute` (`product_id`,`attribute_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_attribute_id` (`attribute_id`),
  CONSTRAINT `product_attribute_values_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `product_attribute_values_ibfk_2` FOREIGN KEY (`attribute_id`) REFERENCES `product_attributes` (`attribute_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attribute_values`
--

LOCK TABLES `product_attribute_values` WRITE;
/*!40000 ALTER TABLE `product_attribute_values` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_attribute_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attributes`
--

DROP TABLE IF EXISTS `product_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_attributes` (
  `attribute_id` int(11) NOT NULL AUTO_INCREMENT,
  `attribute_name` varchar(100) NOT NULL,
  `attribute_type` enum('Text','Number','Date','Boolean','List') NOT NULL,
  `category_id` int(11) DEFAULT NULL COMMENT 'NULL means applies to all categories',
  `is_required` tinyint(1) DEFAULT 0,
  `default_value` text DEFAULT NULL,
  `allowed_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'For List type attributes' CHECK (json_valid(`allowed_values`)),
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`attribute_id`),
  UNIQUE KEY `attribute_name` (`attribute_name`),
  KEY `idx_attribute_name` (`attribute_name`),
  KEY `idx_attribute_type` (`attribute_type`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `product_attributes_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`category_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attributes`
--

LOCK TABLES `product_attributes` WRITE;
/*!40000 ALTER TABLE `product_attributes` DISABLE KEYS */;
INSERT INTO `product_attributes` VALUES (1,'Brand','Text',NULL,0,NULL,NULL,1,1,'2025-08-01 18:01:04'),(2,'Expiry Date','Date',1,0,NULL,NULL,2,1,'2025-08-01 18:01:04'),(3,'Origin Country','List',2,0,NULL,'[\"Philippines\", \"USA\", \"Australia\", \"New Zealand\", \"China\", \"Vietnam\", \"Thailand\"]',3,1,'2025-08-01 18:01:04'),(4,'Organic Certified','Boolean',2,0,NULL,NULL,4,1,'2025-08-01 18:01:04'),(5,'Cut Type','List',3,0,NULL,'[\"Whole\", \"Sliced\", \"Diced\", \"Ground\", \"Fillet\"]',5,1,'2025-08-01 18:01:04'),(6,'Storage Temperature','List',NULL,0,NULL,'[\"Room Temperature\", \"Refrigerated\", \"Frozen\"]',6,1,'2025-08-01 18:01:04');
/*!40000 ALTER TABLE `product_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `parent_category_id` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`),
  KEY `idx_category_name` (`category_name`),
  KEY `idx_parent_category` (`parent_category_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `product_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES (1,'Highland Fresh Dairy','Highland Fresh dairy products made from 100% local cow milk',NULL,1,'2025-08-01 17:58:26'),(2,'Liquid Milk','Fresh milk and flavored milk products',1,1,'2025-08-01 17:58:26'),(3,'Cheese Products','Artisanal cheeses including Highland Fresh specialties',1,1,'2025-08-01 17:58:26'),(4,'Dairy Desserts','Yogurt and cultured milk products',1,1,'2025-08-01 17:58:26'),(5,'Butter & Creamery','Butter and other creamery by-products',1,1,'2025-08-01 17:58:26'),(6,'Fresh Milk - Plain','Plain fresh whole milk',2,1,'2025-08-01 17:58:27'),(7,'Flavored Milk','Sweet and fruit flavored milk drinks',2,1,'2025-08-01 17:58:27'),(8,'Milk Bottles & Containers','Bottled milk products for retail',2,1,'2025-08-01 17:58:27'),(9,'Gouda Cheese','Highland Fresh Gouda cheese (Queso de Oro)',3,1,'2025-08-01 17:58:27'),(10,'White Cheese','Fresh white cheese varieties',3,1,'2025-08-01 17:58:27'),(11,'Aged Cheese','Matured cheese products from the plant',3,1,'2025-08-01 17:58:27'),(12,'Plain Yogurt','Natural yogurt products',4,1,'2025-08-01 17:58:27'),(13,'Flavored Yogurt','Fruit and sweet flavored yogurts',4,1,'2025-08-01 17:58:27'),(14,'Cultured Milk','Fermented milk beverages',4,1,'2025-08-01 17:58:27'),(15,'Fresh Butter','Highland Fresh butter products',5,1,'2025-08-01 17:58:27'),(16,'Specialty Creamery','Other dairy by-products and cream',5,1,'2025-08-01 17:58:27'),(114,'Basta','Test',NULL,1,'2025-08-23 04:57:49');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `product_defaults`
--

DROP TABLE IF EXISTS `product_defaults`;
/*!50001 DROP VIEW IF EXISTS `product_defaults`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `product_defaults` AS SELECT
 1 AS `product_id`,
  1 AS `product_name`,
  1 AS `category_id`,
  1 AS `category_name`,
  1 AS `unit`,
  1 AS `unit_cost`,
  1 AS `standard_order_quantity`,
  1 AS `auto_reorder_quantity`,
  1 AS `min_order_quantity`,
  1 AS `max_order_quantity`,
  1 AS `last_order_quantity`,
  1 AS `avg_monthly_usage`,
  1 AS `quantity_on_hand`,
  1 AS `reorder_level`,
  1 AS `stock_status`,
  1 AS `suggested_quantity` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `production_batches`
--

DROP TABLE IF EXISTS `production_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_batches` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_number` varchar(50) NOT NULL,
  `recipe_id` int(11) NOT NULL,
  `batch_size` decimal(10,3) NOT NULL,
  `production_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `status` enum('Planned','In Progress','Quality Control','Completed','Failed') DEFAULT 'Planned',
  `quality_grade` enum('Economy','Standard','Premium') DEFAULT 'Standard',
  `yield_quantity` decimal(10,3) DEFAULT NULL,
  `waste_quantity` decimal(10,3) DEFAULT 0.000,
  `production_cost` decimal(10,2) DEFAULT NULL,
  `quality_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `batch_number` (`batch_number`),
  KEY `recipe_id` (`recipe_id`),
  CONSTRAINT `production_batches_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `production_recipes` (`recipe_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_batches`
--

LOCK TABLES `production_batches` WRITE;
/*!40000 ALTER TABLE `production_batches` DISABLE KEYS */;
INSERT INTO `production_batches` VALUES (1,'BATCH-20250827-1215',1,23.000,'2025-08-28','00:36:47',NULL,'Basta','Planned','Premium',NULL,0.000,NULL,NULL,'2025-08-27 16:36:47','2025-08-27 16:36:47'),(2,'BATCH-20250827-4451',1,2323.000,'2025-08-28','00:38:58',NULL,'Basta','Planned','Premium',NULL,0.000,NULL,NULL,'2025-08-27 16:38:58','2025-08-27 16:38:58'),(3,'BATCH-20250827-5362',2,23232.000,'2025-08-28','00:39:22',NULL,'Ikaw Bahala','Planned','Premium',NULL,0.000,NULL,NULL,'2025-08-27 16:39:22','2025-08-27 16:39:22'),(4,'BATCH-20250827-7173',1,23.000,'2025-08-28','13:01:36',NULL,'Basta','In Progress','Economy',NULL,0.000,NULL,NULL,'2025-08-27 16:50:10','2025-08-28 05:01:36'),(5,'BATCH-20250827-5739',3,23.000,'2025-08-28','13:01:15','13:01:21','Brendo','Completed','Premium',1.000,0.000,0.00,'','2025-08-27 17:14:25','2025-08-28 05:01:21'),(6,'BATCH-20250827-8938',1,23.000,'2025-08-28','12:59:20','13:00:59','Ngek','Completed','Premium',20.000,0.000,0.00,'','2025-08-27 17:23:10','2025-08-28 05:00:59'),(7,'BATCH-20250828-7140',1,23.000,'2025-08-28','12:47:23','12:51:57','Basta','Completed','Premium',10.000,10.000,0.00,'Basta','2025-08-28 04:45:11','2025-08-28 04:51:57');
/*!40000 ALTER TABLE `production_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `production_planning_view`
--

DROP TABLE IF EXISTS `production_planning_view`;
/*!50001 DROP VIEW IF EXISTS `production_planning_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `production_planning_view` AS SELECT
 1 AS `product_id`,
  1 AS `product_name`,
  1 AS `current_stock`,
  1 AS `reorder_level`,
  1 AS `production_needed`,
  1 AS `recipe_id`,
  1 AS `batch_size_yield`,
  1 AS `batches_needed`,
  1 AS `production_time_hours`,
  1 AS `total_production_time` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `production_recipes`
--

DROP TABLE IF EXISTS `production_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_recipes` (
  `recipe_id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`recipe_id`),
  KEY `finished_product_id` (`finished_product_id`),
  CONSTRAINT `production_recipes_ibfk_1` FOREIGN KEY (`finished_product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_recipes`
--

LOCK TABLES `production_recipes` WRITE;
/*!40000 ALTER TABLE `production_recipes` DISABLE KEYS */;
INSERT INTO `production_recipes` VALUES (1,2,'Highland Fresh Chocolate Milk 500ml Production Recipe',200.000,3.00,'Medium','1. Test raw milk quality. 2. Blend milk with chocolate flavoring and sugar. 3. Pasteurize mixture at 72┬░C. 4. Cool to 4┬░C. 5. Fill into 500ml bottles. 6. Apply labels and seal. 7. Quality taste test.',NULL,1,'2025-08-27 15:50:04','2025-08-27 15:50:04'),(2,1,'Highland Fresh Milk 1L Production Recipe',100.000,2.50,'Easy','1. Test raw milk quality and temperature. 2. Pasteurize at 72┬░C for 15 seconds. 3. Cool to 4┬░C. 4. Fill into sterilized 1L bottles. 5. Apply Highland Fresh labels and caps. 6. Quality control check. 7. Refrigerate immediately.',NULL,1,'2025-08-27 15:50:04','2025-08-27 15:50:04'),(3,6,'Highland Fresh Strawberry Yogurt 500g Production Recipe',50.000,8.50,'Medium','1. Prepare plain yogurt base (see plain yogurt recipe). 2. Add strawberry flavoring during final mixing. 3. Ensure even distribution. 4. Package in tubs. 5. Quality control for flavor balance. 6. Refrigerate.',NULL,1,'2025-08-27 15:50:04','2025-08-27 15:50:04'),(4,4,'Highland Fresh White Cheese 200g Production Recipe',25.000,24.00,'Hard','1. Heat milk to 32┬░C. 2. Add cheese cultures and rennet. 3. Form curds (2-3 hours). 4. Drain whey. 5. Press curds. 6. Salt and age for 12 hours minimum. 7. Package in tubs. 8. Quality control for texture and taste.',NULL,1,'2025-08-27 15:50:04','2025-08-27 15:50:04'),(5,5,'Highland Fresh Yogurt Plain 500g Production Recipe',50.000,8.00,'Medium','1. Heat milk to 85┬░C and cool to 45┬░C. 2. Add yogurt cultures. 3. Incubate at 42┬░C for 4-6 hours. 4. Cool to 4┬░C. 5. Package in tubs. 6. Quality control for taste and consistency. 7. Refrigerate.',NULL,1,'2025-08-27 15:50:04','2025-08-27 15:50:04');
/*!40000 ALTER TABLE `production_recipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `avg_monthly_usage` decimal(10,3) DEFAULT NULL COMMENT 'Average monthly usage for forecasting',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_sku` (`sku`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_unit_id` (`unit_id`),
  KEY `idx_name` (`name`),
  KEY `idx_barcode` (`barcode`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_quantity_reorder` (`quantity_on_hand`,`reorder_level`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_milk_source_cooperative` (`milk_source_cooperative`),
  KEY `idx_batch_lot_number` (`batch_lot_number`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_quality_grade` (`quality_grade`),
  KEY `idx_products_standard_qty` (`standard_order_quantity`),
  KEY `idx_products_expiry_date` (`expiry_date`,`is_active`),
  KEY `idx_products_milk_cooperative` (`milk_source_cooperative`),
  KEY `idx_products_cooperative_active` (`milk_source_cooperative`,`is_active`,`quantity_on_hand`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`category_id`) ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`unit_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Highland Fresh Milk 1L','HF-MILK-001',6,8,175.00,140.00,150.000,10.000,100.000,'HF001001','Highland Fresh 100% pure cow milk, 1 liter bottle','2025-09-15','Dalwangan Dairy Cooperative','HF-20250820-001','2025-08-20',2.0,6.0,'Premium',1,'2025-08-01 17:58:26','2025-08-27 15:52:04',500.000,1000.000,100.000,2000.000,NULL,15000.000),(2,'Highland Fresh Chocolate Milk 500ml','HF-CHOC-002',7,8,95.00,75.00,110.000,8.000,50.000,'HF002001','Highland Fresh chocolate flavored milk, 500ml bottle','2025-09-10','Bukidnon Dairy Cooperative','HF-20250818-002','2025-08-18',2.0,6.0,'Standard',1,'2025-08-01 17:58:27','2025-08-28 05:01:00',500.000,1000.000,100.000,2000.000,NULL,15000.000),(3,'Highland Fresh Queso de Oro 250g','HF-GOUDA-003',9,1,285.00,225.00,34.000,5.000,30.000,'HF003001','Highland Fresh artisanal Gouda cheese (Queso de Oro), aged 3 months','2025-12-15','Malaybalay Cheese Artisans','HF-20250815-003','2025-08-15',8.0,12.0,'Premium',1,'2025-08-01 17:58:27','2025-08-27 15:28:04',10.000,15.000,1.000,NULL,NULL,NULL),(4,'Highland Fresh White Cheese 200g','HF-WHITE-004',10,1,165.00,135.00,30.000,8.000,40.000,'HF004001','Highland Fresh fresh white cheese, soft and creamy','2025-09-30','Misamis Oriental Dairy Cooperative','HF-20250819-004','2025-08-19',4.0,8.0,'Standard',1,'2025-08-01 17:58:27','2025-08-27 15:52:04',12.000,24.000,1.000,NULL,NULL,NULL),(5,'Highland Fresh Yogurt Plain 500g','HF-YOGURT-005',12,1,125.00,95.00,60.000,6.000,35.000,'HF005001','Highland Fresh natural plain yogurt, rich and creamy','2025-09-05','Dalwangan Dairy Cooperative','HF-20250817-005','2025-08-17',2.0,6.0,'Premium',1,'2025-08-01 17:58:27','2025-08-27 15:52:04',15.000,18.000,1.000,NULL,NULL,NULL),(6,'Highland Fresh Strawberry Yogurt 500g','HF-STRWYOG-006',13,1,135.00,105.00,41.000,5.000,30.000,'HF006001','Highland Fresh strawberry flavored yogurt with real fruit pieces','2025-09-08','Bukidnon Dairy Cooperative','HF-20250816-006','2025-08-16',2.0,6.0,'Standard',1,'2025-08-01 17:58:27','2025-08-28 05:01:21',15.000,15.000,1.000,NULL,NULL,NULL),(7,'Highland Fresh Butter 250g','HF-BUTTER-007',15,1,195.00,155.00,23.000,4.000,20.000,'HF007001','Highland Fresh creamy butter, made from fresh cream','2025-08-29','Cagayan de Oro Dairy Alliance','HF-20250814-007','2025-08-14',4.0,8.0,'Premium',1,'2025-08-01 17:58:27','2025-08-27 15:28:04',8.000,12.000,1.000,NULL,NULL,NULL),(8,'Highland Fresh Mango Milk 500ml','HF-MANGO-008',7,8,105.00,85.00,405.000,10.000,45.000,'HF008001','Highland Fresh tropical mango flavored milk drink','2025-09-12','Iligan Dairy Cooperative','HF-20250818-008','2025-08-18',2.0,6.0,'Standard',1,'2025-08-01 17:58:27','2025-08-27 15:00:36',500.000,1000.000,100.000,2000.000,NULL,15000.000),(9,'Highland Fresh Cultured Milk 350ml','HF-CULTURE-009',14,8,75.00,55.00,332.000,12.000,60.000,'HF009001','Highland Fresh fermented cultured milk beverage, probiotic','2025-09-06','Dalwangan Dairy Cooperative','HF-20250819-009','2025-08-19',2.0,6.0,'Premium',1,'2025-08-01 17:58:27','2025-08-27 15:24:21',500.000,1000.000,100.000,2000.000,NULL,15000.000),(75,'Basta','23232',15,7,23.00,0.00,30.000,1.000,NULL,'23232','2323','2025-08-29',NULL,NULL,NULL,NULL,NULL,'Standard',1,'2025-08-23 05:10:40','2025-08-27 15:28:04',2.000,3.000,1.000,NULL,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `po_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `po_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `ordered_quantity` decimal(10,3) NOT NULL CHECK (`ordered_quantity` > 0),
  `received_quantity` decimal(10,3) DEFAULT 0.000 CHECK (`received_quantity` >= 0),
  `unit_cost` decimal(10,2) NOT NULL CHECK (`unit_cost` > 0),
  `line_total` decimal(10,2) NOT NULL CHECK (`line_total` >= 0),
  `expiry_date` date DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL COMMENT 'Highland Fresh: Cooperative batch identifier',
  `milk_source_cooperative` varchar(255) DEFAULT NULL COMMENT 'Highland Fresh: Which cooperative provided this milk',
  `quality_grade_received` enum('Grade A','Grade B','Grade C') DEFAULT NULL COMMENT 'Highland Fresh: Actual quality grade received',
  `temperature_on_receipt` decimal(4,1) DEFAULT NULL COMMENT 'Highland Fresh: Temperature when received (┬░C)',
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
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`po_item_id`),
  KEY `idx_po_id` (`po_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_batch_number` (`batch_number`),
  KEY `idx_milk_source_cooperative` (`milk_source_cooperative`),
  KEY `idx_quality_grade_received` (`quality_grade_received`),
  KEY `idx_quality_test_passed` (`quality_test_passed`),
  KEY `idx_production_date` (`production_date`),
  KEY `idx_highland_fresh_batch_code` (`highland_fresh_batch_code`),
  KEY `idx_po_items_raw_material` (`raw_material_id`),
  CONSTRAINT `fk_po_items_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_po_item_type` CHECK (`product_id` is not null and `raw_material_id` is null or `product_id` is null and `raw_material_id` is not null)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (1,1,1,800.000,800.000,32.50,26000.00,NULL,'DDC-20250821-001','DDC-20250821-001','Dalwangan Dairy Cooperative','Grade A',4.2,3.85,3.25,1,'Excellent quality - all parameters within spec',NULL,'Dalwangan Cold Storage Station','DDC-TRUCK-01','Pedro Santos','HF-20250821-001','2025-08-21 06:15:00',0,NULL,'manual',NULL,NULL,NULL),(2,2,1,950.000,950.000,34.00,32300.00,NULL,'BDC-20250821-001','BDC-20250821-001','Bukidnon Dairy Cooperative','Grade A',4.0,4.10,3.40,1,'Premium quality Holstein-Jersey milk - exceeds standards',NULL,'Valencia Central Station','BDC-TRUCK-01','Carlos Magsaysay','HF-20250821-002','2025-08-21 07:15:00',0,NULL,'manual',NULL,NULL,NULL),(3,3,3,24.000,24.000,1050.00,25200.00,'2025-12-15','MCA-20250819-001','MCA-20250819-001','Malaybalay Cheese Artisans','Grade A',3.9,4.20,3.50,1,'Perfect for artisanal cheese - high fat and protein content','2025-08-15','Malaybalay Cheese Center','MCA-TRUCK-01','Jose Martinez','HF-20250819-QDO-001','2025-08-19 09:15:00',0,NULL,'manual',NULL,NULL,NULL),(4,6,75,2.000,2.000,23.00,46.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250823-006-075','2025-08-23 05:15:27',0,NULL,'manual',NULL,NULL,NULL),(5,6,7,2.000,2.000,195.00,390.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250823-006-007','2025-08-23 05:15:27',0,NULL,'manual',NULL,NULL,NULL),(6,7,75,1.000,1.000,23.00,23.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250823-007-075','2025-08-23 09:57:32',0,NULL,'manual',NULL,NULL,NULL),(7,7,7,1.000,1.000,195.00,195.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250823-007-007','2025-08-23 09:57:32',0,NULL,'manual',NULL,NULL,NULL),(8,7,1,1.000,1.000,175.00,175.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250823-007-001','2025-08-23 09:57:32',0,NULL,'manual',NULL,NULL,NULL),(9,9,4,12.000,0.000,165.00,1980.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250825-009-004','2025-08-25 05:46:21',0,NULL,'manual',NULL,NULL,NULL),(10,9,5,15.000,0.000,125.00,1875.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250825-009-005','2025-08-25 05:46:22',0,NULL,'manual',NULL,NULL,NULL),(11,10,8,30000.000,0.000,105.00,3150000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-010-008','2025-08-27 10:41:14',0,NULL,'manual',NULL,NULL,NULL),(12,11,8,8.000,8.000,105.00,840.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-011-008','2025-08-27 14:01:39',0,NULL,'manual',NULL,NULL,NULL),(13,13,1,304.000,304.000,175.00,53200.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-013-001','2025-08-27 14:50:18',0,NULL,'manual',NULL,NULL,NULL),(14,13,3,8.000,8.000,285.00,2280.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-013-003','2025-08-27 14:50:18',0,NULL,'manual',NULL,NULL,NULL),(15,13,9,304.000,304.000,75.00,22800.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-013-009','2025-08-27 14:50:18',0,NULL,'manual',NULL,NULL,NULL),(16,13,4,9.000,9.000,165.00,1485.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-013-004','2025-08-27 14:50:18',0,NULL,'manual',NULL,NULL,NULL),(17,14,3,8.000,8.000,285.00,2280.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-014-003','2025-08-27 14:53:47',0,NULL,'manual',NULL,NULL,NULL),(18,14,4,9.000,9.000,165.00,1485.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-014-004','2025-08-27 14:53:47',0,NULL,'manual',NULL,NULL,NULL),(19,15,8,375.000,375.000,105.00,39375.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-015-008','2025-08-27 15:00:08',0,NULL,'manual',NULL,NULL,NULL),(20,15,1,375.000,375.000,175.00,65625.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-015-001','2025-08-27 15:00:08',0,NULL,'manual',NULL,NULL,NULL),(21,15,4,9.000,9.000,165.00,1485.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-015-004','2025-08-27 15:00:08',0,NULL,'manual',NULL,NULL,NULL),(22,16,7,6.000,6.000,195.00,1170.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-016-007','2025-08-27 15:25:43',0,NULL,'manual',NULL,NULL,NULL),(23,16,75,2.000,2.000,23.00,46.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-016-075','2025-08-27 15:25:43',0,NULL,'manual',NULL,NULL,NULL),(24,17,3,8.000,8.000,285.00,2280.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-017-003','2025-08-27 15:27:49',0,NULL,'manual',NULL,NULL,NULL),(25,17,4,9.000,9.000,165.00,1485.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-017-004','2025-08-27 15:27:49',0,NULL,'manual',NULL,NULL,NULL),(26,17,5,12.000,12.000,125.00,1500.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-017-005','2025-08-27 15:27:49',0,NULL,'manual',NULL,NULL,NULL),(27,17,75,2.000,2.000,23.00,46.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-017-075','2025-08-27 15:27:49',0,NULL,'manual',NULL,NULL,NULL),(28,17,7,6.000,6.000,195.00,1170.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250827-017-007','2025-08-27 15:27:49',0,NULL,'manual',NULL,NULL,NULL),(29,18,4,150.000,0.000,38.05,5707.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-018-004','2025-08-28 02:45:53',0,NULL,'manual',NULL,NULL,NULL),(30,18,1,150.000,0.000,19.67,2950.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-018-001','2025-08-28 02:45:53',0,NULL,'manual',NULL,NULL,NULL),(31,19,1,150.000,0.000,19.67,2950.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-019-001','2025-08-28 02:49:12',0,NULL,'manual',NULL,NULL,NULL),(32,19,2,150.000,0.000,17.67,2650.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-019-002','2025-08-28 02:49:12',0,NULL,'manual',NULL,NULL,NULL),(33,20,2,150.000,0.000,17.67,2650.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-020-002','2025-08-28 02:49:38',0,NULL,'manual',NULL,NULL,NULL),(34,21,4,150.000,0.000,38.05,5707.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-021-004','2025-08-28 02:52:59',0,NULL,'manual',NULL,NULL,NULL),(35,35,NULL,150.000,150.000,46.00,6900.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-035-RM001','2025-08-28 04:28:34',0,NULL,'manual',1,NULL,NULL),(36,35,NULL,150.000,150.000,41.00,6150.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250828-035-RM002','2025-08-28 04:28:34',0,NULL,'manual',2,NULL,NULL),(37,36,NULL,200.000,200.000,44.00,8800.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250905-036-RM001','2025-09-05 15:12:49',0,NULL,'manual',1,NULL,NULL),(38,37,NULL,200.000,200.000,175.00,35000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250905-037-RM004','2025-09-05 17:32:44',0,NULL,'manual',4,NULL,NULL),(39,37,NULL,200.000,200.000,44.50,8900.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250905-037-RM001','2025-09-05 17:32:44',0,NULL,'manual',1,NULL,NULL),(40,38,NULL,200.000,0.000,45.00,9000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-038-RM001','2025-09-06 05:39:59',0,NULL,'manual',1,NULL,NULL),(41,38,NULL,200.000,0.000,40.00,8000.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-038-RM002','2025-09-06 05:39:59',0,NULL,'manual',2,NULL,NULL),(42,39,NULL,10.000,0.000,5.50,55.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-039-RM001','2025-09-06 05:54:31',0,NULL,'manual',1,NULL,NULL),(43,40,NULL,200.000,200.000,108.56,21712.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-040-RM016','2025-09-06 05:54:35',0,NULL,'manual',16,NULL,NULL),(44,41,NULL,20.000,20.000,3.50,70.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-041-RM001','2025-09-06 05:54:56',0,NULL,'manual',1,NULL,NULL),(45,42,NULL,100.000,100.000,0.25,25.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-042-RM002','2025-09-06 05:54:56',0,NULL,'manual',2,NULL,NULL),(46,43,NULL,5.000,5.000,15.00,75.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-043-RM003','2025-09-06 05:54:56',0,NULL,'manual',3,NULL,NULL),(47,44,NULL,200.000,200.000,160.33,32066.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-044-RM017','2025-09-06 05:58:15',0,NULL,'manual',17,NULL,NULL),(48,45,NULL,1.000,1.000,180.00,180.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-045-RM004','2025-09-06 09:54:14',0,NULL,'manual',4,NULL,NULL),(49,46,NULL,200.000,200.000,107.75,21550.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250906-046-RM014','2025-09-06 09:57:05',0,NULL,'manual',14,NULL,NULL),(50,47,NULL,1.000,1.000,45.50,45.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250912-047-RM001','2025-09-12 10:19:04',0,NULL,'manual',1,NULL,NULL),(51,47,NULL,1.000,1.000,40.50,40.50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'HF-20250912-047-RM002','2025-09-12 10:19:04',0,NULL,'manual',2,NULL,NULL);
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER IF NOT EXISTS `prevent_highland_fresh_product_purchase_insert`
  BEFORE INSERT ON `purchase_order_items`
  FOR EACH ROW
BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER IF NOT EXISTS `prevent_highland_fresh_product_purchase_update`
  BEFORE UPDATE ON `purchase_order_items`
  FOR EACH ROW
BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `po_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `highland_fresh_validation_notes` text DEFAULT NULL,
  PRIMARY KEY (`po_id`),
  UNIQUE KEY `po_number` (`po_number`),
  UNIQUE KEY `po_number_2` (`po_number`),
  KEY `idx_po_number` (`po_number`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_expected_delivery_date` (`expected_delivery_date`),
  KEY `idx_purchase_type` (`purchase_type`),
  KEY `idx_milk_quality_grade` (`milk_quality_grade`),
  KEY `idx_is_nmfdc_cooperative` (`is_nmfdc_cooperative`),
  KEY `idx_collection_station` (`collection_station`),
  KEY `idx_po_simplified_status` (`status_id`,`order_date`),
  KEY `idx_po_simplified_supplier` (`supplier_id`,`status_id`),
  KEY `idx_po_purchase_type` (`purchase_type`,`milk_quality_grade`),
  KEY `idx_po_nmfdc_cooperative` (`is_nmfdc_cooperative`),
  KEY `idx_po_type_date` (`purchase_type`,`order_date`,`status_id`),
  KEY `idx_po_hf_approved` (`highland_fresh_approved`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (1,'HF-PO-20250820-001',1,1,26000.00,1,'2025-08-20 05:00:00','2025-08-21','2025-08-21 06:15:00','raw_milk','Grade A',2.0,6.0,'06:00:00',1,'Fat content min 3.5%, Protein min 3.2%, SCC max 200,000','Dalwangan Cold Storage Station','Batch must include morning collection only','Daily raw milk procurement from Dalwangan Cooperative - 800L capacity','2025-08-20 05:00:00','2025-08-21 08:30:00',NULL,NULL,0,NULL),(2,'HF-PO-20250820-002',3,1,32300.00,1,'2025-08-20 05:30:00','2025-08-21','2025-08-21 07:15:00','raw_milk','Grade A',2.0,6.0,'07:00:00',1,'Premium Holstein-Jersey milk, Fat content min 4.0%, Protein min 3.4%','Valencia Central Station','Premium quality batch for cheese production','Premium raw milk from Bukidnon Cooperative - Holstein-Jersey cattle','2025-08-20 05:30:00','2025-08-21 10:00:00',NULL,NULL,0,NULL),(3,'HF-PO-20250819-003',5,1,25200.00,1,'2025-08-19 08:00:00','2025-08-19','2025-08-19 09:15:00','raw_milk','Grade A',4.0,8.0,'09:00:00',1,'Artisanal cheese quality milk, Fat content min 4.2%, Protein min 3.5%','Malaybalay Cheese Center','Weekly batch for Queso de Oro production','Weekly procurement for cheese production from Malaybalay Cheese Artisans','2025-08-19 08:00:00','2025-08-20 14:30:00',NULL,NULL,0,NULL),(4,'HF-PO-20250818-004',7,1,15750.00,2,'2025-08-18 10:00:00','2025-08-25',NULL,'packaging',NULL,NULL,NULL,NULL,0,'1L milk bottles (1000 units), 500ml bottles (500 units), Highland Fresh labels',NULL,'Include Highland Fresh branding on all labels','Weekly packaging supplies for Highland Fresh bottled products','2025-08-18 10:00:00','2025-08-18 10:00:00',NULL,NULL,0,NULL),(5,'HF-PO-20250817-005',8,1,12000.00,2,'2025-08-17 14:00:00','2025-08-24',NULL,'general',NULL,NULL,NULL,NULL,0,'Premium cattle feed for Holstein crossbred cattle',NULL,'Nutritional supplements included','Cattle feed for NMFDC member cooperatives','2025-08-17 14:00:00','2025-08-17 14:00:00',NULL,NULL,0,NULL),(6,'HF-PO-20250823-001',9,1,436.00,75,'2025-08-23 05:15:27','2025-09-02','2025-08-23 10:14:44','raw_milk','Grade A',2.0,6.0,NULL,0,NULL,NULL,NULL,'Basta','2025-08-23 05:15:27','2025-08-27 11:47:53',NULL,NULL,0,NULL),(7,'HF-PO-20250823-824',4,1,393.00,75,'2025-08-23 09:57:32','2025-08-29','2025-08-23 10:03:46','raw_milk',NULL,2.0,6.0,NULL,0,NULL,NULL,NULL,'this is a Testing','2025-08-23 09:57:32','2025-08-27 11:47:53',NULL,NULL,0,NULL),(9,'HF-PO-20250825-001',3,9,3855.00,74,'2025-08-25 05:46:21','2025-08-26',NULL,'raw_milk','Grade A',2.0,6.0,NULL,0,NULL,NULL,NULL,'Basta','2025-08-25 05:46:21','2025-08-27 11:47:53',NULL,NULL,0,NULL),(10,'HF-PO-20250827-001',9,1,3150000.00,74,'2025-08-27 10:41:14',NULL,NULL,'raw_milk',NULL,2.0,6.0,NULL,0,NULL,NULL,NULL,NULL,'2025-08-27 10:41:14','2025-08-27 11:47:53',NULL,NULL,0,NULL),(11,'HF-PO-20250827-828',9,1,840.00,14,'2025-08-27 14:01:39',NULL,'2025-08-27 14:45:59','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-27 14:01:39','2025-08-27 14:45:59',NULL,NULL,0,NULL),(13,'HF-PO-20250827-015420',4,1,79765.00,14,'2025-08-27 14:50:18',NULL,'2025-08-27 15:24:21','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-27 14:50:18','2025-08-27 15:24:21',NULL,NULL,0,NULL),(14,'HF-PO-20250827-479117',7,1,3765.00,14,'2025-08-27 14:53:47',NULL,'2025-08-27 15:19:36','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-27 14:53:47','2025-08-27 15:19:36',NULL,NULL,0,NULL),(15,'HF-PO-20250827-129446',3,1,106485.00,14,'2025-08-27 15:00:08',NULL,'2025-08-27 15:00:36','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'Basta','2025-08-27 15:00:08','2025-08-27 15:00:36',NULL,NULL,0,NULL),(16,'HF-PO-20250827-443522',6,1,1216.00,14,'2025-08-27 15:25:43',NULL,'2025-08-27 15:25:49','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-27 15:25:43','2025-08-27 15:25:49',NULL,NULL,0,NULL),(17,'HF-PO-20250827-033449',1,1,6481.00,14,'2025-08-27 15:27:49',NULL,'2025-08-27 15:28:04','general',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-27 15:27:49','2025-08-27 15:28:04',NULL,NULL,0,NULL),(18,'HF-PO-20250828-996849',1,1,8658.00,11,'2025-08-28 02:45:53',NULL,NULL,'raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-28 02:45:53','2025-08-28 02:45:53',NULL,NULL,0,NULL),(19,'HF-PO-20250828-114649',1,1,5601.00,11,'2025-08-28 02:49:12',NULL,NULL,'raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-28 02:49:12','2025-08-28 02:49:12',NULL,NULL,0,NULL),(20,'HF-PO-20250828-756383',1,1,2650.50,11,'2025-08-28 02:49:38',NULL,NULL,'raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-28 02:49:38','2025-08-28 02:49:38',NULL,NULL,0,NULL),(21,'HF-PO-20250828-374721',1,1,5707.50,11,'2025-08-28 02:52:59',NULL,NULL,'raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-28 02:52:59','2025-08-28 02:52:59',NULL,NULL,0,NULL),(35,'HF-PO-20250828-224873',4,1,13050.00,14,'2025-08-28 04:28:34',NULL,'2025-08-28 04:28:47','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'','2025-08-28 04:28:34','2025-08-28 04:28:47',NULL,NULL,0,NULL),(36,'HF-PO-20250905-463326',5,1,8800.00,14,'2025-09-05 15:12:49',NULL,'2025-09-05 15:25:00','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-05 15:12:49','2025-09-05 15:25:00',NULL,NULL,0,NULL),(37,'HF-PO-20250905-222278',3,1,43900.00,14,'2025-09-05 17:32:44',NULL,'2025-09-06 04:43:36','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-05 17:32:44','2025-09-06 04:43:36',NULL,NULL,0,NULL),(38,'HF-PO-20250906-225970',1,1,17000.00,11,'2025-09-06 05:39:59',NULL,NULL,'raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-06 05:39:59','2025-09-06 05:39:59',NULL,NULL,0,NULL),(39,'HF-PO-20250906-634369',1,1,55.00,11,'2025-09-06 05:54:31','2025-09-15',NULL,'general_materials',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'Test purchase order','2025-09-06 05:54:31','2025-09-06 05:54:31',NULL,NULL,0,NULL),(40,'HF-PO-20250906-694506',8,1,21712.00,14,'2025-09-06 05:54:35',NULL,'2025-09-06 05:57:46','general_materials',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-06 05:54:35','2025-09-06 05:57:46',NULL,NULL,0,NULL),(41,'HF-PO-20250906-704313',1,1,70.00,14,'2025-09-06 05:54:56','2025-09-15','2025-09-06 05:57:36','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'Test raw milk order','2025-09-06 05:54:56','2025-09-06 05:57:36',NULL,NULL,0,NULL),(42,'HF-PO-20250906-053588',2,1,25.00,14,'2025-09-06 05:54:56','2025-09-15','2025-09-06 05:57:39','packaging_materials',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'Test packaging order','2025-09-06 05:54:56','2025-09-06 05:57:39',NULL,NULL,0,NULL),(43,'HF-PO-20250906-674425',3,1,75.00,14,'2025-09-06 05:54:56','2025-09-15','2025-09-06 05:57:42','bacterial_cultures',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'Test cultures order','2025-09-06 05:54:56','2025-09-06 05:57:42',NULL,NULL,0,NULL),(44,'HF-PO-20250906-812927',8,1,32066.00,14,'2025-09-06 05:58:15',NULL,'2025-09-06 05:58:21','general_materials',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-06 05:58:15','2025-09-06 05:58:21',NULL,NULL,0,NULL),(45,'HF-PO-20250906-387415',1,1,180.00,14,'2025-09-06 09:54:14',NULL,'2025-09-06 09:54:18','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-06 09:54:14','2025-09-06 09:54:18',NULL,NULL,0,NULL),(46,'HF-PO-20250906-146865',8,1,21550.00,14,'2025-09-06 09:57:05',NULL,'2025-09-06 09:57:10','general_materials',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-06 09:57:05','2025-09-06 09:57:10',NULL,NULL,0,NULL),(47,'HF-PO-20250912-229104',2,1,86.00,14,'2025-09-12 10:19:04',NULL,'2025-09-12 10:19:07','raw_milk',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,'2025-09-12 10:19:04','2025-09-12 10:19:07',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER tr_po_auto_receive_quantities

                AFTER UPDATE ON purchase_orders

                FOR EACH ROW

            BEGIN

                IF NEW.status_id = 14 AND OLD.status_id != 14 THEN

                    UPDATE purchase_order_items 

                    SET received_quantity = ordered_quantity

                    WHERE po_id = NEW.po_id;

                END IF;

            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary table structure for view `purchase_orders_simplified`
--

DROP TABLE IF EXISTS `purchase_orders_simplified`;
/*!50001 DROP VIEW IF EXISTS `purchase_orders_simplified`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `purchase_orders_simplified` AS SELECT
 1 AS `po_id`,
  1 AS `po_number`,
  1 AS `supplier_id`,
  1 AS `supplier_name`,
  1 AS `user_id`,
  1 AS `created_by`,
  1 AS `total_amount`,
  1 AS `status_id`,
  1 AS `status_display`,
  1 AS `order_date`,
  1 AS `expected_delivery_date`,
  1 AS `received_date`,
  1 AS `notes`,
  1 AS `created_at`,
  1 AS `updated_at`,
  1 AS `total_items`,
  1 AS `total_quantity_ordered`,
  1 AS `total_quantity_received` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `raw_material_suppliers`
--

DROP TABLE IF EXISTS `raw_material_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `raw_material_suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `supplier_sku` varchar(50) DEFAULT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `minimum_order_quantity` decimal(10,3) DEFAULT 1.000,
  `lead_time_days` int(11) DEFAULT 7,
  `is_preferred` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_supplier_material` (`supplier_id`,`raw_material_id`),
  KEY `raw_material_id` (`raw_material_id`),
  CONSTRAINT `raw_material_suppliers_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE,
  CONSTRAINT `raw_material_suppliers_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `raw_material_suppliers`
--

LOCK TABLES `raw_material_suppliers` WRITE;
/*!40000 ALTER TABLE `raw_material_suppliers` DISABLE KEYS */;
INSERT INTO `raw_material_suppliers` VALUES (1,1,1,'DAL-Raw Milk Grade A',19.67,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(2,1,2,'DAL-Raw Milk Grade B',17.67,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(3,1,3,'DAL-Raw Milk Grade C',11.86,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(4,1,4,'DAL-Fresh Cream',38.05,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(5,2,1,'MIS-Raw Milk Grade A',20.34,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(6,2,2,'MIS-Raw Milk Grade B',17.55,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(7,2,3,'MIS-Raw Milk Grade C',14.88,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(8,2,4,'MIS-Fresh Cream',54.45,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(9,3,1,'BUK-Raw Milk Grade A',20.52,50.000,1,1,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(10,3,2,'BUK-Raw Milk Grade B',13.50,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(11,3,3,'BUK-Raw Milk Grade C',11.88,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(12,3,4,'BUK-Fresh Cream',52.20,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(13,4,1,'CAG-Raw Milk Grade A',17.10,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(14,4,2,'CAG-Raw Milk Grade B',17.85,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(15,4,3,'CAG-Raw Milk Grade C',11.64,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(16,4,4,'CAG-Fresh Cream',52.65,50.000,1,0,1,'2025-08-27 15:48:38','2025-08-27 15:48:38'),(17,5,1,'MAL-Raw Milk Grade A',16.74,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(18,5,2,'MAL-Raw Milk Grade B',17.85,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(19,5,3,'MAL-Raw Milk Grade C',11.04,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(20,5,4,'MAL-Fresh Cream',41.40,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(21,6,1,'ILI-Raw Milk Grade A',18.61,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(22,6,2,'ILI-Raw Milk Grade B',16.83,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(23,6,3,'ILI-Raw Milk Grade C',12.41,50.000,1,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(24,6,4,'ILI-Fresh Cream',60.89,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(25,7,5,'HIG-PET Bottles 1L',10.46,100.000,3,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(26,7,6,'HIG-PET Bottles 500ml',6.44,100.000,3,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(27,7,7,'HIG-Highland Fresh Labels 1L',2.37,100.000,3,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(28,7,8,'HIG-Highland Fresh Labels 500ml',2.09,100.000,3,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(29,7,9,'HIG-Plastic Caps',1.43,100.000,3,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(30,7,10,'HIG-Cheese Packaging Tubs 250g',11.64,100.000,3,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(31,8,11,'MIN-Dairy Cultures (Yogurt)',67.50,5.000,7,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(32,8,12,'MIN-Dairy Cultures (Cheese)',96.05,5.000,7,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(33,8,13,'MIN-Chocolate Flavoring',122.50,5.000,7,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(34,8,14,'MIN-Strawberry Flavoring',106.95,5.000,7,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(35,8,15,'MIN-Mango Flavoring',163.35,5.000,7,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(36,8,16,'MIN-Sugar (Food Grade)',47.70,5.000,7,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(37,8,17,'MIN-Salt (Food Grade)',23.50,5.000,7,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(38,9,1,'BRI-Raw Milk Grade A',18.72,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(39,9,2,'BRI-Raw Milk Grade B',12.75,50.000,1,1,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(40,9,3,'BRI-Raw Milk Grade C',10.68,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39'),(41,9,4,'BRI-Fresh Cream',56.25,50.000,1,0,1,'2025-08-27 15:48:39','2025-08-27 15:48:39');
/*!40000 ALTER TABLE `raw_material_suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `raw_materials`
--

DROP TABLE IF EXISTS `raw_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `raw_materials` (
  `raw_material_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `supplier_category` enum('Dairy Cooperative','Packaging Supplier','Ingredient Supplier') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`raw_material_id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_raw_materials_unit` (`unit_id`),
  CONSTRAINT `fk_raw_materials_unit` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`unit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `raw_materials`
--

LOCK TABLES `raw_materials` WRITE;
/*!40000 ALTER TABLE `raw_materials` DISABLE KEYS */;
INSERT INTO `raw_materials` VALUES (1,'Raw Milk Grade A','RM-MILK-A','Raw Milk',5,18.00,1071.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'High-grade pasteurized milk from Grade A farms. Temperature 4┬░C max.','Dairy Cooperative',1,'2025-08-27 15:47:25','2025-09-12 10:19:07'),(2,'Raw Milk Grade B','RM-MILK-B','Raw Milk',5,15.00,551.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Standard quality milk from certified farms. Temperature 4┬░C max.','Dairy Cooperative',1,'2025-08-27 15:47:25','2025-09-12 10:19:07'),(3,'Raw Milk Grade C','RM-MILK-C','Raw Milk',5,12.00,205.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Economy grade milk suitable for processing. Temperature 4┬░C max.','Dairy Cooperative',1,'2025-08-27 15:47:25','2025-09-06 05:57:42'),(4,'Fresh Cream','RM-CREAM','Raw Milk',5,45.00,301.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'High-fat cream separated from Grade A milk. 35% fat content minimum.','Dairy Cooperative',1,'2025-08-27 15:47:25','2025-09-06 09:54:18'),(5,'PET Bottles 1L','RM-BOTTLE-1L','Bottle',8,8.50,1000.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade PET bottles for milk products with safety caps.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(6,'PET Bottles 500ml','RM-BOTTLE-500ML','Bottle',8,6.25,1500.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade PET bottles for flavored milk products.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(7,'Highland Fresh Labels 1L','RM-LABEL-1L','Label',8,2.75,800.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Waterproof Highland Fresh branded labels for 1L bottles.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(8,'Highland Fresh Labels 500ml','RM-LABEL-500ML','Label',8,2.25,1200.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Waterproof Highland Fresh branded labels for 500ml bottles.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(9,'Plastic Caps','RM-CAPS','Cap',8,1.50,2000.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade plastic caps with tamper-evident seals.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(10,'Cheese Packaging Tubs 250g','RM-TUB-250G','Container',8,12.00,500.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade plastic tubs for cheese products with lids.','Packaging Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(11,'Dairy Cultures (Yogurt)','RM-CULTURE-YOG','Starter Culture',1,75.00,50.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Live bacterial cultures for yogurt fermentation. Refrigerated storage required.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(12,'Dairy Cultures (Cheese)','RM-CULTURE-CHEESE','Starter Culture',1,85.00,30.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Specialized cultures for cheese aging and flavor development.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(13,'Chocolate Flavoring','RM-FLAVOR-CHOC','Flavor Additive',5,125.00,25.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Natural chocolate flavoring concentrate for milk products.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(14,'Strawberry Flavoring','RM-FLAVOR-STRAW','Flavor Additive',5,115.00,220.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Natural strawberry flavoring concentrate with coloring.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-09-06 09:57:10'),(15,'Mango Flavoring','RM-FLAVOR-MANGO','Flavor Additive',5,135.00,15.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Natural mango flavoring concentrate for tropical milk products.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-08-28 03:06:33'),(16,'Sugar (Food Grade)','RM-SUGAR','Sweetener',1,45.00,300.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade cane sugar for flavored milk products.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-09-06 05:57:46'),(17,'Salt (Food Grade)','RM-SALT','Preservative',1,25.00,275.000,100.000,100.000,1000.000,NULL,NULL,NULL,NULL,NULL,'Standard',NULL,1,1,'Food-grade salt for cheese production and preservation.','Ingredient Supplier',1,'2025-08-27 15:47:25','2025-09-06 05:58:21');
/*!40000 ALTER TABLE `raw_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `raw_materials_inventory_view`
--

DROP TABLE IF EXISTS `raw_materials_inventory_view`;
/*!50001 DROP VIEW IF EXISTS `raw_materials_inventory_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `raw_materials_inventory_view` AS SELECT
 1 AS `raw_material_id`,
  1 AS `material_name`,
  1 AS `sku`,
  1 AS `category`,
  1 AS `unit_of_measure`,
  1 AS `quantity_on_hand`,
  1 AS `reorder_level`,
  1 AS `max_stock_level`,
  1 AS `standard_cost`,
  1 AS `supplier_category`,
  1 AS `storage_requirements`,
  1 AS `stock_status`,
  1 AS `inventory_value`,
  1 AS `available_suppliers`,
  1 AS `cheapest_supplier_cost`,
  1 AS `most_expensive_cost`,
  1 AS `supplier_names` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `recipe_raw_materials`
--

DROP TABLE IF EXISTS `recipe_raw_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recipe_raw_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipe_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `quantity_required` decimal(10,3) NOT NULL,
  `processing_notes` varchar(255) DEFAULT NULL,
  `is_critical` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_recipe_material` (`recipe_id`,`raw_material_id`),
  KEY `raw_material_id` (`raw_material_id`),
  CONSTRAINT `recipe_raw_materials_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `production_recipes` (`recipe_id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_raw_materials_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipe_raw_materials`
--

LOCK TABLES `recipe_raw_materials` WRITE;
/*!40000 ALTER TABLE `recipe_raw_materials` DISABLE KEYS */;
INSERT INTO `recipe_raw_materials` VALUES (1,1,1,190.000,'High-grade milk for flavoring',1,'2025-08-27 15:50:04'),(2,1,13,2.500,'Natural chocolate extract',1,'2025-08-27 15:50:04'),(3,1,16,8.000,'Dissolved completely',1,'2025-08-27 15:50:04'),(4,1,6,200.000,'Food-grade bottles',1,'2025-08-27 15:50:04'),(5,1,8,200.000,'Chocolate milk branding',1,'2025-08-27 15:50:04'),(6,1,9,200.000,'Secure sealing',1,'2025-08-27 15:50:04'),(7,2,1,102.000,'2% processing loss allowance',1,'2025-08-27 15:50:04'),(8,2,5,100.000,'Pre-sterilized bottles',1,'2025-08-27 15:50:04'),(9,2,7,100.000,'Waterproof application',1,'2025-08-27 15:50:04'),(10,2,9,100.000,'Tamper-evident sealing',1,'2025-08-27 15:50:04'),(11,3,1,48.000,'Reduced milk for flavoring space',1,'2025-08-27 15:50:04'),(12,3,11,1.000,'Live bacterial cultures',1,'2025-08-27 15:50:04'),(13,3,14,2.000,'Natural strawberry extract',1,'2025-08-27 15:50:04'),(14,3,16,3.000,'Sweetening for fruit flavor',1,'2025-08-27 15:50:04'),(15,3,10,100.000,'2 tubs per 500g serving',1,'2025-08-27 15:50:04'),(16,4,1,40.000,'High milk-to-cheese ratio',1,'2025-08-27 15:50:04'),(17,4,12,1.000,'Specialized cheese cultures',1,'2025-08-27 15:50:04'),(18,4,17,2.000,'For curing and preservation',1,'2025-08-27 15:50:04'),(19,4,10,25.000,'200g portions in 250g tubs',1,'2025-08-27 15:50:04'),(20,5,1,51.000,'Premium milk for fermentation',1,'2025-08-27 15:50:05'),(21,5,11,1.000,'Live bacterial cultures',1,'2025-08-27 15:50:05'),(22,5,10,100.000,'2 tubs per 500g serving',1,'2025-08-27 15:50:05');
/*!40000 ALTER TABLE `recipe_raw_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_items`
--

DROP TABLE IF EXISTS `return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `return_items` (
  `return_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `return_id` int(11) NOT NULL,
  `sale_item_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `returned_quantity` decimal(10,3) NOT NULL CHECK (`returned_quantity` > 0),
  `unit_price` decimal(10,2) NOT NULL CHECK (`unit_price` > 0),
  `return_amount` decimal(10,2) NOT NULL CHECK (`return_amount` >= 0),
  `condition_type` enum('Good','Damaged','Expired') DEFAULT 'Good',
  `restock_eligible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`return_item_id`),
  KEY `idx_return_id` (`return_id`),
  KEY `idx_sale_item_id` (`sale_item_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_condition` (`condition_type`),
  CONSTRAINT `return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `returns` (`return_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `return_items_ibfk_2` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`sale_item_id`) ON UPDATE CASCADE,
  CONSTRAINT `return_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_items`
--

LOCK TABLES `return_items` WRITE;
/*!40000 ALTER TABLE `return_items` DISABLE KEYS */;
INSERT INTO `return_items` VALUES (1,1,9,2,1.000,95.00,95.00,'Damaged',0,'2025-08-23 05:17:01'),(2,1,10,9,1.000,75.00,75.00,'Expired',0,'2025-08-23 05:17:01');
/*!40000 ALTER TABLE `return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `returns` (
  `return_id` int(11) NOT NULL AUTO_INCREMENT,
  `return_number` varchar(20) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'User processing the return',
  `total_return_amount` decimal(10,2) NOT NULL CHECK (`total_return_amount` >= 0),
  `reason` varchar(500) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL COMMENT 'Manager/Admin who approved the return',
  `return_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`return_id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `idx_return_number` (`return_number`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_return_date` (`return_date`),
  KEY `idx_approved_by` (`approved_by`),
  CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON UPDATE CASCADE,
  CONSTRAINT `returns_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `returns_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE,
  CONSTRAINT `returns_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `returns`
--

LOCK TABLES `returns` WRITE;
/*!40000 ALTER TABLE `returns` DISABLE KEYS */;
INSERT INTO `returns` VALUES (1,'RET20250001',5,1,170.00,'Defective Product',6,NULL,'2025-08-23 05:17:01','2025-08-23 05:17:01');
/*!40000 ALTER TABLE `returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_items` (
  `sale_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,3) NOT NULL CHECK (`quantity` > 0),
  `unit_price` decimal(10,2) NOT NULL CHECK (`unit_price` > 0),
  `discount_percent` decimal(5,2) DEFAULT 0.00 CHECK (`discount_percent` >= 0 and `discount_percent` <= 100),
  `discount_amount` decimal(10,2) DEFAULT 0.00 CHECK (`discount_amount` >= 0),
  `line_total` decimal(10,2) NOT NULL CHECK (`line_total` >= 0),
  `status_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`sale_item_id`),
  KEY `idx_sale_id` (`sale_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_status_id` (`status_id`),
  CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `sale_items_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES (1,1,6,1.000,135.00,0.00,0.00,135.00,2,'2025-08-22 14:03:01'),(2,1,3,1.000,285.00,0.00,0.00,285.00,2,'2025-08-22 14:03:01'),(3,2,2,1.000,95.00,0.00,0.00,95.00,2,'2025-08-22 14:29:36'),(4,2,9,1.000,75.00,0.00,0.00,75.00,2,'2025-08-22 14:29:36'),(5,2,6,1.000,135.00,0.00,0.00,135.00,2,'2025-08-22 14:29:36'),(6,2,3,1.000,285.00,0.00,0.00,285.00,2,'2025-08-22 14:29:36'),(7,3,2,1.000,95.00,0.00,0.00,95.00,2,'2025-08-23 04:18:01'),(8,4,2,1.000,95.00,0.00,0.00,95.00,2,'2025-08-23 04:51:45'),(9,5,2,1.000,95.00,0.00,0.00,95.00,2,'2025-08-23 05:16:03'),(10,5,9,1.000,75.00,0.00,0.00,75.00,2,'2025-08-23 05:16:03'),(11,6,2,2.000,95.00,0.00,0.00,190.00,2,'2025-08-23 05:29:22');
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL AUTO_INCREMENT,
  `sale_number` varchar(20) NOT NULL,
  `user_id` int(11) NOT NULL,
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
  `status_id` int(11) NOT NULL,
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
  PRIMARY KEY (`sale_id`),
  UNIQUE KEY `sale_number` (`sale_number`),
  KEY `idx_highland_fresh_date` (`sale_date`),
  KEY `idx_highland_fresh_customer_type` (`customer_type`),
  KEY `idx_highland_fresh_transaction_type` (`transaction_type`),
  KEY `idx_highland_fresh_cooperative` (`cooperative_member_id`),
  KEY `idx_highland_fresh_traceability` (`traceability_code`),
  KEY `idx_highland_fresh_batch` (`highland_fresh_receipt_number`),
  KEY `idx_sale_number` (`sale_number`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_payment_method_id` (`payment_method_id`),
  KEY `idx_status_id` (`status_id`),
  KEY `idx_sale_date` (`sale_date`),
  KEY `idx_customer_phone` (`customer_phone`),
  CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`payment_method_id`) ON UPDATE CASCADE,
  CONSTRAINT `sales_ibfk_3` FOREIGN KEY (`status_id`) REFERENCES `transaction_statuses` (`status_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Highland Fresh Dairy Sales - Enhanced for NMFDC Operations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,'SALE20250001',1,NULL,NULL,NULL,'Walk-in',NULL,420.00,0.1200,50.40,0.00,0.00,0.00,470.40,1,2,470.40,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Highland Fresh POS Sale','2025-08-22 14:03:01','2025-08-22 14:03:01','2025-08-22 14:03:01'),(2,'SALE20250002',1,NULL,NULL,NULL,'Walk-in',NULL,590.00,0.1200,70.80,0.00,0.00,0.00,660.80,1,2,660.80,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Walk-in POS Sale','2025-08-22 14:29:36','2025-08-22 14:29:36','2025-08-22 14:29:36'),(3,'SALE20250003',1,NULL,NULL,NULL,'Walk-in',NULL,95.00,0.1200,11.40,0.00,0.00,0.00,106.40,1,2,106.40,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Walk-in POS Sale','2025-08-23 04:18:01','2025-08-23 04:18:01','2025-08-23 04:18:01'),(4,'SALE20250004',1,NULL,NULL,NULL,'Walk-in',NULL,95.00,0.1200,11.40,0.00,0.00,0.00,106.40,1,2,106.40,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Walk-in POS Sale','2025-08-23 04:51:45','2025-08-23 04:51:45','2025-08-23 04:51:45'),(5,'SALE20250005',1,NULL,NULL,NULL,'Walk-in',NULL,170.00,0.1200,20.40,0.00,0.00,0.00,190.40,1,2,190.40,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Walk-in POS Sale','2025-08-23 05:16:03','2025-08-23 05:16:03','2025-08-23 05:16:03'),(6,'SALE20250006',8,NULL,NULL,NULL,'Walk-in',NULL,190.00,0.1200,22.80,0.00,0.00,0.00,212.80,1,2,212.80,0.00,'Retail Sale',0,NULL,NULL,NULL,0,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Walk-in POS Sale','2025-08-23 05:29:22','2025-08-23 05:29:22','2025-08-23 05:29:22');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_contacts`
--

DROP TABLE IF EXISTS `supplier_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_contacts` (
  `contact_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `contact_type` enum('Primary','Billing','Ordering','Emergency','Other') DEFAULT 'Primary',
  `contact_name` varchar(255) NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`contact_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_contact_type` (`contact_type`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `supplier_contacts_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_contacts`
--

LOCK TABLES `supplier_contacts` WRITE;
/*!40000 ALTER TABLE `supplier_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `supplier_info_view`
--

DROP TABLE IF EXISTS `supplier_info_view`;
/*!50001 DROP VIEW IF EXISTS `supplier_info_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `supplier_info_view` AS SELECT
 1 AS `supplier_id`,
  1 AS `name`,
  1 AS `contact_person`,
  1 AS `email`,
  1 AS `phone_number`,
  1 AS `address`,
  1 AS `city_name`,
  1 AS `country_name`,
  1 AS `payment_terms`,
  1 AS `days_to_pay`,
  1 AS `credit_limit`,
  1 AS `is_active`,
  1 AS `created_at`,
  1 AS `updated_at` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `supplier_products`
--

DROP TABLE IF EXISTS `supplier_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_products` (
  `supplier_product_id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `supplier_sku` varchar(50) DEFAULT NULL,
  `lead_time_days` int(11) DEFAULT 7,
  `minimum_order_quantity` decimal(10,3) DEFAULT 1.000,
  `unit_cost` decimal(10,2) NOT NULL,
  `is_preferred` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `default_order_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Default quantity when ordering from this supplier',
  `bulk_discount_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Minimum quantity for bulk pricing',
  PRIMARY KEY (`supplier_product_id`),
  UNIQUE KEY `unique_supplier_product` (`supplier_id`,`product_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_is_preferred` (`is_preferred`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_supplier_products_default_qty` (`default_order_quantity`),
  CONSTRAINT `supplier_products_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `supplier_products_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_products`
--

LOCK TABLES `supplier_products` WRITE;
/*!40000 ALTER TABLE `supplier_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_raw_materials`
--

DROP TABLE IF EXISTS `supplier_raw_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_raw_materials` (
  `supplier_raw_material_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`supplier_raw_material_id`),
  UNIQUE KEY `unique_supplier_material` (`supplier_id`,`raw_material_id`),
  KEY `idx_supplier_materials_supplier` (`supplier_id`),
  KEY `idx_supplier_materials_material` (`raw_material_id`),
  KEY `idx_supplier_materials_approved` (`highland_fresh_approved`),
  CONSTRAINT `fk_supplier_materials_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`raw_material_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_supplier_materials_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_raw_materials`
--

LOCK TABLES `supplier_raw_materials` WRITE;
/*!40000 ALTER TABLE `supplier_raw_materials` DISABLE KEYS */;
INSERT INTO `supplier_raw_materials` VALUES (1,1,1,'DDC-MILK-A',1,100.000,NULL,45.00,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(2,1,2,'DDC-MILK-B',1,80.000,NULL,40.00,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(3,1,4,'DDC-CREAM',2,20.000,NULL,180.00,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(4,2,1,'MODC-MILK-A',1,80.000,NULL,45.50,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(5,2,2,'MODC-MILK-B',1,60.000,NULL,40.50,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(6,3,1,'BDC-MILK-A',1,120.000,NULL,44.50,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(7,3,2,'BDC-MILK-B',1,100.000,NULL,39.50,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(8,3,4,'BDC-CREAM',2,25.000,NULL,175.00,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(9,7,5,'HFPS-BTL-1L',5,500.000,NULL,8.50,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(10,7,6,'HFPS-BTL-500ML',5,400.000,NULL,5.75,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(11,7,7,'HFPS-LABEL-1L',7,2000.000,NULL,2.75,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(12,7,8,'HFPS-LABEL-500ML',7,1500.000,NULL,2.25,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(13,7,9,'HFPS-CAPS',5,1000.000,NULL,1.50,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(14,4,1,'CDC-MILK-A',2,90.000,NULL,46.00,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(15,4,2,'CDC-MILK-B',2,70.000,NULL,41.00,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(16,5,1,'LDC-MILK-A',3,110.000,NULL,44.00,0,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(17,6,11,'CFS-CULT-YOG',7,10.000,NULL,450.00,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(18,6,12,'CFS-CULT-CHEESE',7,8.000,NULL,480.00,1,1,NULL,NULL,1,'2025-08-28 03:17:40','2025-08-28 03:17:40'),(19,1,3,'RM-MILK-C-SUP1',1,129.000,NULL,12.04,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(20,2,3,'RM-MILK-C-SUP2',2,86.000,NULL,11.00,0,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(21,3,3,'RM-MILK-C-SUP3',3,172.000,NULL,12.90,0,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(22,4,3,'RM-MILK-C-SUP4',1,73.000,NULL,10.71,0,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(23,7,10,'RM-TUB-250G-SUP7',3,436.000,NULL,11.01,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(24,8,13,'RM-FLAVOR-CHOC-SUP8',10,63.000,NULL,155.23,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(25,8,15,'RM-FLAVOR-MANGO-SUP8',13,32.000,NULL,125.34,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(26,8,17,'RM-SALT-SUP8',12,11.000,NULL,160.33,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(27,8,14,'RM-FLAVOR-STRAW-SUP8',6,43.000,NULL,107.75,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01'),(28,8,16,'RM-SUGAR-SUP8',7,77.000,NULL,108.56,1,0,NULL,NULL,1,'2025-08-28 06:43:01','2025-08-28 06:43:01');
/*!40000 ALTER TABLE `supplier_raw_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `city_id` int(11) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Philippines',
  `country_id` int(11) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT 'Net 30',
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
  `highland_fresh_restrictions` text DEFAULT NULL,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `cooperative_code` (`cooperative_code`),
  KEY `idx_name` (`name`),
  KEY `idx_email` (`email`),
  KEY `idx_contact_person` (`contact_person`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_payment_term_id` (`payment_term_id`),
  KEY `idx_country_id` (`country_id`),
  KEY `idx_city_id` (`city_id`),
  KEY `idx_supplier_type` (`supplier_type`),
  KEY `idx_milk_quality_grade` (`milk_quality_grade`),
  KEY `idx_is_nmfdc_member` (`is_nmfdc_member`),
  KEY `idx_nmfdc_member_since` (`nmfdc_member_since`),
  KEY `idx_established_year` (`established_year`),
  KEY `idx_suppliers_dairy_grade` (`milk_quality_grade`,`is_nmfdc_member`),
  KEY `idx_suppliers_quantity_limits` (`supplier_id`,`enforce_quantity_limits`,`max_single_order_quantity`),
  KEY `idx_suppliers_hf_category` (`highland_fresh_material_category`),
  KEY `idx_suppliers_hf_approved` (`highland_fresh_approved`),
  CONSTRAINT `fk_suppliers_cities` FOREIGN KEY (`city_id`) REFERENCES `cities` (`city_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_suppliers_countries` FOREIGN KEY (`country_id`) REFERENCES `countries` (`country_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_suppliers_payment_terms` FOREIGN KEY (`payment_term_id`) REFERENCES `payment_terms` (`payment_term_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'Dalwangan Dairy Cooperative','Maria Santos','maria@dalwangandairy.coop','+63-917-1234567','Dalwangan, Bukidnon','Malaybalay',2,'8700','Philippines',1,'COOP-001-2020','Net 15',3,50000.00,'Dairy Cooperative','DDC-001',800.00,88,'Grade A',1985,'Barangay Dalwangan Cold Storage Station, Malaybalay City, Bukidnon',1,'1987-03-15','Holstein-Sahiwal, Holstein-Jersey crossbred','Quality raw milk production with advanced cold storage',1,'Primary dairy cooperative with 88 cows, delivers 800L daily chilled milk. One of the founding members of NMFDC.','2025-08-01 17:58:26','2025-08-28 03:06:33',800.00,640.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(2,'Misamis Oriental Dairy Cooperative','Roberto Cruz','roberto@misorientaldairy.coop','+63-918-2345678','Claveria, Misamis Oriental','Cagayan de Oro',20,'9000','Philippines',1,'COOP-002-2019','Net 30',5,75000.00,'Dairy Cooperative','MODC-002',650.00,65,'Grade A',1989,'Claveria Municipal Collection Center, Misamis Oriental',1,'1989-08-22','Holstein-Sahiwal crossbred','Specialized in consistent quality milk supply',1,'Member cooperative of NMFDC, specializes in Holstein-Sahiwal crossbred cattle. Strong focus on crossbreeding program.','2025-08-01 18:07:25','2025-08-28 03:06:33',650.00,520.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(3,'Bukidnon Dairy Cooperative','Carlos Mendoza','carlos@bukidnondairy.coop','+63-919-3456789','Valencia City, Bukidnon','Valencia',2,'8709','Philippines',1,'COOP-003-2018','Net 15',3,60000.00,'Dairy Cooperative','BDC-003',950.00,95,'Grade A',1988,'Valencia City Central Collection Station, Bukidnon',1,'1988-01-10','Holstein-Jersey from New Zealand','Premium quality raw milk production',1,'Highland Fresh milk source, specializes in quality raw milk production. Known for New Zealand Holstein-Jersey genetics.','2025-08-01 17:58:26','2025-08-28 03:06:33',950.00,760.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(4,'Cagayan de Oro Dairy Alliance','Ana Rodriguez','ana@cdodairyalliance.coop','+63-920-4567890','Gusa, Cagayan de Oro City','Cagayan de Oro',20,'9000','Philippines',1,'COOP-004-2021','Net 30',5,40000.00,'Dairy Cooperative','CDODA-004',380.00,45,'Grade B',1991,'Gusa Barangay Collection Point, Cagayan de Oro City',1,'1992-05-18','Holstein-Sahiwal crossbred','Alliance of small urban dairy farms',1,'Alliance of small dairy farms in CDO area. Urban dairy farming alliance serving CDO area.','2025-08-01 18:07:25','2025-08-28 03:06:33',380.00,304.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(5,'Malaybalay Cheese Artisans','Jose Valencia','jose@malaybalaycheese.coop','+63-921-5678901','Malaybalay City, Bukidnon','Malaybalay',2,'8700','Philippines',1,'COOP-005-2017','Net 15',3,30000.00,'Dairy Cooperative','MCA-005',720.00,72,'Grade A',1987,'Malaybalay Artisan Cheese Processing Center, Bukidnon',1,'1987-11-03','Holstein-Jersey crossbred','Artisanal cheese production and premium milk',1,'Specializes in artisanal cheese production using Holstein-Jersey crossbred milk. Known for Gouda (Queso de Oro) production.','2025-08-01 17:58:26','2025-08-28 03:06:33',720.00,576.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(6,'Iligan Dairy Cooperative','Rosa Fernandez','rosa@iligandairy.coop','+63-922-6789012','Iligan City, Lanao del Norte','Iligan City',2,'9200','Philippines',1,'COOP-006-2020','Net 30',5,35000.00,'Dairy Cooperative','IDC-006',750.00,78,'Grade A',1990,'Iligan City Central Milk Collection Facility, Lanao del Norte',1,'1991-02-14','Holstein-Sahiwal crossbred','Quality milk production and cooperative development',1,'NMFDC member cooperative from Iligan area. Focus on cooperative development and farmer training.','2025-08-01 18:07:25','2025-08-28 03:06:33',750.00,600.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}'),(7,'Highland Fresh Packaging Supplies','Miguel Torres','miguel@hfpackaging.com','+63-917-7890123','789 Industrial Ave','El Salvador City',2,'9003','Philippines',1,'SUP-007-2019','Net 30',5,25000.00,'Packaging Supplier',NULL,NULL,NULL,NULL,2015,'789 Industrial Avenue Warehouse, El Salvador City, Misamis Oriental',0,NULL,NULL,'Bottles, labels, and packaging materials for Highland Fresh products',1,'Supplier of bottles, labels, and packaging materials for Highland Fresh products. Strategic partner for product packaging.','2025-08-01 18:07:25','2025-08-28 03:06:33',1000.00,500.00,'units',1,'packaging_supplier',1,'2025-01-01','{\"FDA Food Contact Approval\": true, \"BPA-Free Certification\": true, \"Food Grade Packaging\": true}','{\"allowed_materials\": [\"Bottle\", \"Container\", \"Label\", \"Cap\", \"Seal\"], \"temperature_range\": \"Ambient\", \"food_grade_required\": true}'),(8,'Mindanao Dairy Feed Supply','Carmen Reyes','carmen@mindanaofeed.com','+63-918-8901234','Butuan City, Agusan del Norte','Butuan City',2,'8600','Philippines',1,'SUP-008-2020','Net 30',5,20000.00,'Ingredient Supplier',NULL,NULL,NULL,NULL,2010,NULL,0,NULL,NULL,'Premium cattle feed and nutritional supplements',1,'Supplier of high-quality cattle feed and nutritional supplements for Highland Fresh dairy cooperatives.','2025-08-01 18:07:25','2025-08-28 03:06:33',1000.00,500.00,'units',1,'ingredient_supplier',1,'2025-01-01','{\"Laboratory Grade Standards\": true}','{\"allowed_materials\": [\"Bacterial Culture\", \"Flavor Additive\", \"Starter Culture\", \"Rennet\"], \"temperature_controlled\": true}'),(9,'BrianApiTesting','BastaKatongSiKuan','ragasibrian2@gmail.com','09078734040','Phase 1 Area 2 MacanhanCarmen',NULL,20,'9000','Philippines',1,'29323i','Net 30',3,0.00,'Dairy Cooperative','DDC-01201-2',10.00,50,'Grade A',2001,'Basta',1,NULL,NULL,NULL,1,NULL,'2025-08-23 05:14:18','2025-08-28 03:06:33',10.00,8.00,'liters',1,'dairy_cooperative',1,'2025-01-01','{\"HACCP\": true, \"Good Manufacturing Practices\": true, \"Dairy Safety Certification\": true}','{\"allowed_materials\": [\"Raw Milk\", \"Cream\"], \"temperature_range\": \"2-6Γö¼ΓûæC\", \"quality_grades\": [\"Grade A\", \"Grade B\", \"Grade C\"]}');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_rates`
--

DROP TABLE IF EXISTS `tax_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tax_rates` (
  `tax_rate_id` int(11) NOT NULL AUTO_INCREMENT,
  `rate_code` varchar(20) NOT NULL,
  `rate_name` varchar(100) NOT NULL,
  `rate_percentage` decimal(5,4) NOT NULL COMMENT 'Tax rate as decimal (0.12 for 12%)',
  `applicable_to` enum('Sale','Purchase','Both') DEFAULT 'Both',
  `city_id` int(11) DEFAULT NULL COMMENT 'Specific to a city, NULL for national',
  `category_id` int(11) DEFAULT NULL COMMENT 'Specific to product category, NULL for all',
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL COMMENT 'NULL for indefinite',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`tax_rate_id`),
  UNIQUE KEY `rate_code` (`rate_code`),
  KEY `idx_rate_code` (`rate_code`),
  KEY `idx_applicable_to` (`applicable_to`),
  KEY `idx_city_id` (`city_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `tax_rates_ibfk_1` FOREIGN KEY (`city_id`) REFERENCES `cities` (`city_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tax_rates_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_rates`
--

LOCK TABLES `tax_rates` WRITE;
/*!40000 ALTER TABLE `tax_rates` DISABLE KEYS */;
INSERT INTO `tax_rates` VALUES (1,'VAT_STD','Standard VAT Rate',0.1200,'Both',NULL,NULL,'2020-01-01',NULL,1,'2025-08-01 18:01:04'),(2,'VAT_ZERO','Zero-Rated VAT',0.0000,'Both',NULL,NULL,'2020-01-01',NULL,1,'2025-08-01 18:01:04'),(3,'VAT_EXEMPT','VAT Exempt',0.0000,'Both',NULL,NULL,'2020-01-01',NULL,1,'2025-08-01 18:01:04'),(4,'WT_COR','Withholding Tax - Corporation',0.0200,'Purchase',NULL,NULL,'2020-01-01',NULL,1,'2025-08-01 18:01:04'),(5,'WT_IND','Withholding Tax - Individual',0.0100,'Purchase',NULL,NULL,'2020-01-01',NULL,1,'2025-08-01 18:01:04');
/*!40000 ALTER TABLE `tax_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_statuses`
--

DROP TABLE IF EXISTS `transaction_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction_statuses` (
  `status_id` int(11) NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status_type` enum('Sale','Return','Purchase','General') DEFAULT 'General',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `status_name` (`status_name`),
  KEY `idx_status_name` (`status_name`),
  KEY `idx_status_type` (`status_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_statuses`
--

LOCK TABLES `transaction_statuses` WRITE;
/*!40000 ALTER TABLE `transaction_statuses` DISABLE KEYS */;
INSERT INTO `transaction_statuses` VALUES (1,'Pending','Transaction is pending completion','Sale',1,'2025-08-01 17:58:26'),(2,'Completed','Transaction completed successfully','Sale',1,'2025-08-01 17:58:26'),(3,'Cancelled','Transaction was cancelled','Sale',1,'2025-08-01 17:58:26'),(4,'Refunded','Transaction was refunded','Sale',1,'2025-08-01 17:58:26'),(5,'Partially Refunded','Transaction was partially refunded','Sale',1,'2025-08-01 17:58:26'),(6,'Return Pending','Return is pending approval','Return',1,'2025-08-01 17:58:26'),(7,'Return Approved','Return has been approved','Return',1,'2025-08-01 17:58:26'),(8,'Return Rejected','Return has been rejected','Return',1,'2025-08-01 17:58:26'),(9,'Return Completed','Return has been completed','Return',1,'2025-08-01 17:58:26'),(10,'PO Draft','Purchase order is in draft status','Purchase',1,'2025-08-01 17:58:26'),(11,'PO Sent','Purchase order sent to supplier','Purchase',1,'2025-08-01 17:58:26'),(12,'PO Confirmed','Purchase order confirmed by supplier','Purchase',1,'2025-08-01 17:58:26'),(13,'PO Partially Received (DEPRECATED)','DEPRECATED - This status is no longer used. Suppliers always deliver full orders.','Purchase',0,'2025-08-01 17:58:26'),(14,'PO Received','Purchase order fully received','Purchase',1,'2025-08-01 17:58:26'),(15,'PO Cancelled','Purchase order cancelled','Purchase',1,'2025-08-01 17:58:26'),(16,'Active','Record is active','General',1,'2025-08-01 17:58:26'),(17,'Inactive','Record is inactive','General',1,'2025-08-01 17:58:26'),(18,'Deleted','Record is marked as deleted','General',1,'2025-08-01 17:58:26'),(74,'Sent','Purchase order sent to supplier','Purchase',1,'2025-08-27 11:47:53'),(75,'Received','Purchase order fully received and completed','Purchase',1,'2025-08-27 11:47:53');
/*!40000 ALTER TABLE `transaction_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `units_of_measure`
--

DROP TABLE IF EXISTS `units_of_measure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `units_of_measure` (
  `unit_id` int(11) NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(20) NOT NULL,
  `unit_abbreviation` varchar(10) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `unit_type` enum('Weight','Volume','Count','Length') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`unit_id`),
  UNIQUE KEY `unit_name` (`unit_name`),
  UNIQUE KEY `unit_abbreviation` (`unit_abbreviation`),
  KEY `idx_unit_name` (`unit_name`),
  KEY `idx_unit_abbreviation` (`unit_abbreviation`),
  KEY `idx_unit_type` (`unit_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `units_of_measure`
--

LOCK TABLES `units_of_measure` WRITE;
/*!40000 ALTER TABLE `units_of_measure` DISABLE KEYS */;
INSERT INTO `units_of_measure` VALUES (1,'Kilogram','kg','Kilogram weight measurement','Weight',1,'2025-08-01 17:58:26'),(2,'Gram','g','Gram weight measurement','Weight',1,'2025-08-01 17:58:26'),(3,'Pound','lb','Pound weight measurement','Weight',1,'2025-08-01 17:58:26'),(4,'Ounce','oz','Ounce weight measurement','Weight',1,'2025-08-01 17:58:26'),(5,'Liter','L','Liter volume measurement','Volume',1,'2025-08-01 17:58:26'),(6,'Milliliter','mL','Milliliter volume measurement','Volume',1,'2025-08-01 17:58:26'),(7,'Gallon','gal','Gallon volume measurement','Volume',1,'2025-08-01 17:58:26'),(8,'Piece','pc','Individual piece or item','Count',1,'2025-08-01 17:58:26'),(9,'Dozen','doz','Twelve pieces','Count',1,'2025-08-01 17:58:26'),(10,'Pack','pk','Package or pack','Count',1,'2025-08-01 17:58:26'),(11,'Box','box','Box container','Count',1,'2025-08-01 17:58:26'),(12,'Case','case','Case container','Count',1,'2025-08-01 17:58:26');
/*!40000 ALTER TABLE `units_of_measure` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON object storing role permissions' CHECK (json_valid(`permissions`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`),
  KEY `idx_role_name` (`role_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,'Admin','System administrator with full access','{\"users\": \"full\", \"products\": \"full\", \"suppliers\": \"full\", \"sales\": \"full\", \"reports\": \"full\", \"settings\": \"full\"}',1,'2025-08-01 17:58:26'),(2,'Manager','Store manager with limited admin access','{\"users\": \"read\", \"products\": \"full\", \"suppliers\": \"full\", \"sales\": \"full\", \"reports\": \"full\", \"settings\": \"read\"}',1,'2025-08-01 17:58:26'),(3,'Cashier','Point of sale operator','{\"users\": \"none\", \"products\": \"read\", \"suppliers\": \"none\", \"sales\": \"create\", \"reports\": \"none\", \"settings\": \"none\"}',1,'2025-08-01 17:58:26'),(4,'Inventory','Inventory management specialist','{\"users\": \"none\", \"products\": \"full\", \"suppliers\": \"read\", \"sales\": \"read\", \"reports\": \"limited\", \"settings\": \"none\"}',1,'2025-08-01 17:58:26'),(18,'Production Manager','Manages production batches, recipes, and raw material conversion','{\"users\":\"read\",\"products\":\"read\",\"suppliers\":\"read\",\"sales\":\"none\",\"reports\":\"limited\",\"settings\":\"none\",\"production\":\"full\"}',1,'2025-08-27 17:07:21');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role_id` (`role_id`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2y$10$jqhwP2qWBaWU9YPvdI24oeVYkh9ykAdQE6VosigEGf0ObA/n6DH/q',1,'System','Administrator','admin@highlandfresh.com',NULL,1,'2025-08-25 02:57:50','2025-08-01 17:58:26','2025-08-25 02:57:50'),(8,'cashier','$2y$10$5N4bHWH.1.bk.9vwlm9ykO5CcWxnHB4AuuJfqsDfulOJcYZwOXJh2',3,'brian','ragasi','ragasibrian2@gmail.com',NULL,1,'2025-08-23 05:32:31','2025-08-22 14:31:13','2025-08-23 05:32:31'),(9,'inventory','$2y$10$dkC2g/sxr.1RNX2hXGdFx.JLVaclbiSK3uOAnk5zRNBkAtcpCULai',4,'brian','ragasi','ragasibrian2@gmail.com',NULL,1,'2025-08-25 02:53:57','2025-08-23 05:17:57','2025-08-25 04:01:43'),(10,'production','$2y$10$jZp8X8vEz4HAvFteHMeo3OIwm5zTfIq5lzc.Sk.98nB6OPq19W8G6',18,'brian','ragasi','ragasibrian2@gmail.com',NULL,1,NULL,'2025-08-27 17:13:34','2025-08-27 17:13:34');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `finished_products_inventory_view`
--

/*!50001 DROP VIEW IF EXISTS `finished_products_inventory_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `finished_products_inventory_view` AS select `p`.`product_id` AS `product_id`,`p`.`name` AS `product_name`,`p`.`sku` AS `sku`,`pc`.`category_name` AS `category_name`,`uom`.`unit_name` AS `unit_name`,`p`.`quantity_on_hand` AS `quantity_on_hand`,`p`.`reorder_level` AS `reorder_level`,`p`.`max_stock_level` AS `max_stock_level`,`p`.`price` AS `selling_price`,`p`.`cost` AS `production_cost`,case when `p`.`quantity_on_hand` <= `p`.`reorder_level` then 'PRODUCTION_NEEDED' when `p`.`quantity_on_hand` >= `p`.`max_stock_level` then 'OVERSTOCKED' else 'NORMAL' end AS `stock_status`,`p`.`quantity_on_hand` * `p`.`price` AS `inventory_retail_value`,`p`.`quantity_on_hand` * `p`.`cost` AS `inventory_cost_value`,`p`.`price` - `p`.`cost` AS `profit_per_unit`,(`p`.`price` - `p`.`cost`) / `p`.`price` * 100 AS `profit_margin_percent`,`p`.`quality_grade` AS `quality_grade`,`p`.`expiry_date` AS `expiry_date`,to_days(`p`.`expiry_date`) - to_days(curdate()) AS `days_until_expiry`,case when `p`.`expiry_date` <= curdate() + interval 3 day then 'URGENT' when `p`.`expiry_date` <= curdate() + interval 7 day then 'WARNING' else 'OK' end AS `expiry_status` from ((`products` `p` left join `product_categories` `pc` on(`p`.`category_id` = `pc`.`category_id`)) left join `units_of_measure` `uom` on(`p`.`unit_id` = `uom`.`unit_id`)) where `p`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `highland_fresh_raw_materials_view`
--

/*!50001 DROP VIEW IF EXISTS `highland_fresh_raw_materials_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `highland_fresh_raw_materials_view` AS select `rm`.`raw_material_id` AS `raw_material_id`,`rm`.`name` AS `name`,`rm`.`sku` AS `sku`,`rm`.`category` AS `category`,`rm`.`unit_id` AS `unit_id`,`uom`.`unit_name` AS `unit_name`,`rm`.`standard_cost` AS `standard_cost`,`rm`.`quantity_on_hand` AS `quantity_on_hand`,`rm`.`reorder_level` AS `reorder_level`,`rm`.`quality_grade` AS `quality_grade`,`rm`.`highland_fresh_approved` AS `highland_fresh_approved`,`rm`.`requires_quality_test` AS `requires_quality_test`,`rm`.`storage_temp_min` AS `storage_temp_min`,`rm`.`storage_temp_max` AS `storage_temp_max`,`rm`.`shelf_life_days` AS `shelf_life_days`,`rm`.`description` AS `description` from (`raw_materials` `rm` left join `units_of_measure` `uom` on(`rm`.`unit_id` = `uom`.`unit_id`)) where `rm`.`highland_fresh_approved` = 1 and `rm`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `highland_fresh_supplier_materials_view`
--

/*!50001 DROP VIEW IF EXISTS `highland_fresh_supplier_materials_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `highland_fresh_supplier_materials_view` AS select `srm`.`supplier_raw_material_id` AS `supplier_raw_material_id`,`s`.`supplier_id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`s`.`highland_fresh_material_category` AS `highland_fresh_material_category`,`rm`.`raw_material_id` AS `raw_material_id`,`rm`.`name` AS `raw_material_name`,`rm`.`category` AS `material_category`,`srm`.`supplier_sku` AS `supplier_sku`,`srm`.`unit_cost` AS `unit_cost`,`srm`.`minimum_order_quantity` AS `minimum_order_quantity`,`srm`.`maximum_order_quantity` AS `maximum_order_quantity`,`srm`.`lead_time_days` AS `lead_time_days`,`srm`.`is_preferred_supplier` AS `is_preferred_supplier`,`srm`.`quality_certification` AS `quality_certification`,`srm`.`last_price_update` AS `last_price_update` from ((`supplier_raw_materials` `srm` join `suppliers` `s` on(`srm`.`supplier_id` = `s`.`supplier_id`)) join `raw_materials` `rm` on(`srm`.`raw_material_id` = `rm`.`raw_material_id`)) where `srm`.`highland_fresh_approved` = 1 and `srm`.`is_active` = 1 and `s`.`highland_fresh_approved` = 1 and `s`.`is_active` = 1 and `rm`.`highland_fresh_approved` = 1 and `rm`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `highland_fresh_suppliers_view`
--

/*!50001 DROP VIEW IF EXISTS `highland_fresh_suppliers_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `highland_fresh_suppliers_view` AS select `s`.`supplier_id` AS `supplier_id`,`s`.`name` AS `name`,`s`.`contact_person` AS `contact_person`,`s`.`email` AS `email`,`s`.`phone_number` AS `phone_number`,`s`.`supplier_type` AS `supplier_type`,`s`.`highland_fresh_material_category` AS `highland_fresh_material_category`,`s`.`highland_fresh_approved` AS `highland_fresh_approved`,`s`.`highland_fresh_approval_date` AS `highland_fresh_approval_date`,`s`.`highland_fresh_certifications` AS `highland_fresh_certifications`,`s`.`highland_fresh_restrictions` AS `highland_fresh_restrictions`,`s`.`is_nmfdc_member` AS `is_nmfdc_member`,`s`.`nmfdc_member_since` AS `nmfdc_member_since`,`s`.`daily_milk_capacity_liters` AS `daily_milk_capacity_liters`,`s`.`milk_quality_grade` AS `milk_quality_grade` from `suppliers` `s` where `s`.`highland_fresh_approved` = 1 and `s`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `inventory_summary_view`
--

/*!50001 DROP VIEW IF EXISTS `inventory_summary_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `inventory_summary_view` AS select 'Raw Materials' AS `inventory_type`,count(0) AS `total_items`,sum(`raw_materials_inventory_view`.`quantity_on_hand` * `raw_materials_inventory_view`.`standard_cost`) AS `total_value`,count(case when `raw_materials_inventory_view`.`stock_status` = 'REORDER_NEEDED' then 1 end) AS `items_needing_reorder`,count(case when `raw_materials_inventory_view`.`stock_status` = 'OVERSTOCKED' then 1 end) AS `overstocked_items`,avg(`raw_materials_inventory_view`.`quantity_on_hand`) AS `avg_stock_level` from `raw_materials_inventory_view` union all select 'Finished Products' AS `inventory_type`,count(0) AS `total_items`,sum(`finished_products_inventory_view`.`inventory_cost_value`) AS `total_value`,count(case when `finished_products_inventory_view`.`stock_status` = 'PRODUCTION_NEEDED' then 1 end) AS `items_needing_reorder`,count(case when `finished_products_inventory_view`.`stock_status` = 'OVERSTOCKED' then 1 end) AS `overstocked_items`,avg(`finished_products_inventory_view`.`quantity_on_hand`) AS `avg_stock_level` from `finished_products_inventory_view` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `product_defaults`
--

/*!50001 DROP VIEW IF EXISTS `product_defaults`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `product_defaults` AS select `p`.`product_id` AS `product_id`,`p`.`name` AS `product_name`,`p`.`category_id` AS `category_id`,`pc`.`category_name` AS `category_name`,`u`.`unit_name` AS `unit`,`p`.`price` AS `unit_cost`,`p`.`standard_order_quantity` AS `standard_order_quantity`,`p`.`auto_reorder_quantity` AS `auto_reorder_quantity`,`p`.`min_order_quantity` AS `min_order_quantity`,`p`.`max_order_quantity` AS `max_order_quantity`,`p`.`last_order_quantity` AS `last_order_quantity`,`p`.`avg_monthly_usage` AS `avg_monthly_usage`,`p`.`quantity_on_hand` AS `quantity_on_hand`,`p`.`reorder_level` AS `reorder_level`,case when `p`.`quantity_on_hand` <= `p`.`reorder_level` then 'Low Stock' when `p`.`quantity_on_hand` <= `p`.`reorder_level` * 1.5 then 'Medium Stock' else 'Good Stock' end AS `stock_status`,case when `p`.`quantity_on_hand` <= `p`.`reorder_level` and `p`.`auto_reorder_quantity` is not null then `p`.`auto_reorder_quantity` when `p`.`last_order_quantity` is not null then `p`.`last_order_quantity` when `p`.`standard_order_quantity` is not null then `p`.`standard_order_quantity` else 1.000 end AS `suggested_quantity` from ((`products` `p` left join `product_categories` `pc` on(`p`.`category_id` = `pc`.`category_id`)) left join `units_of_measure` `u` on(`p`.`unit_id` = `u`.`unit_id`)) where `p`.`is_active` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `production_planning_view`
--

/*!50001 DROP VIEW IF EXISTS `production_planning_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `production_planning_view` AS select `p`.`product_id` AS `product_id`,`p`.`name` AS `product_name`,`p`.`quantity_on_hand` AS `current_stock`,`p`.`reorder_level` AS `reorder_level`,greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) AS `production_needed`,`pr`.`recipe_id` AS `recipe_id`,`pr`.`batch_size_yield` AS `batch_size_yield`,ceiling(greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) / `pr`.`batch_size_yield`) AS `batches_needed`,`pr`.`production_time_hours` AS `production_time_hours`,ceiling(greatest(0,`p`.`reorder_level` - `p`.`quantity_on_hand`) / `pr`.`batch_size_yield`) * `pr`.`production_time_hours` AS `total_production_time` from (`products` `p` join `production_recipes` `pr` on(`p`.`product_id` = `pr`.`finished_product_id`)) where `p`.`is_active` = 1 and `p`.`quantity_on_hand` <= `p`.`reorder_level` order by `p`.`reorder_level` - `p`.`quantity_on_hand` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `purchase_orders_simplified`
--

/*!50001 DROP VIEW IF EXISTS `purchase_orders_simplified`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `purchase_orders_simplified` AS select `po`.`po_id` AS `po_id`,`po`.`po_number` AS `po_number`,`po`.`supplier_id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`po`.`user_id` AS `user_id`,`u`.`username` AS `created_by`,`po`.`total_amount` AS `total_amount`,`po`.`status_id` AS `status_id`,case when `ts`.`status_name` = 'PO Draft' then 'Draft' when `ts`.`status_name` = 'PO Sent' then 'Pending' when `ts`.`status_name` = 'PO Confirmed' then 'Confirmed' when `ts`.`status_name` = 'PO Received' then 'Received' when `ts`.`status_name` = 'PO Cancelled' then 'Cancelled' else `ts`.`status_name` end AS `status_display`,`po`.`order_date` AS `order_date`,`po`.`expected_delivery_date` AS `expected_delivery_date`,`po`.`received_date` AS `received_date`,`po`.`notes` AS `notes`,`po`.`created_at` AS `created_at`,`po`.`updated_at` AS `updated_at`,(select count(0) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_items`,(select sum(`purchase_order_items`.`ordered_quantity`) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_quantity_ordered`,(select sum(`purchase_order_items`.`received_quantity`) from `purchase_order_items` where `purchase_order_items`.`po_id` = `po`.`po_id`) AS `total_quantity_received` from (((`purchase_orders` `po` left join `suppliers` `s` on(`po`.`supplier_id` = `s`.`supplier_id`)) left join `users` `u` on(`po`.`user_id` = `u`.`user_id`)) left join `transaction_statuses` `ts` on(`po`.`status_id` = `ts`.`status_id`)) where `po`.`status_id` <> 13 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `raw_materials_inventory_view`
--

/*!50001 DROP VIEW IF EXISTS `raw_materials_inventory_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `raw_materials_inventory_view` AS select `rm`.`raw_material_id` AS `raw_material_id`,`rm`.`name` AS `material_name`,`rm`.`sku` AS `sku`,`rm`.`category` AS `category`,`uom`.`unit_name` AS `unit_of_measure`,`rm`.`quantity_on_hand` AS `quantity_on_hand`,`rm`.`reorder_level` AS `reorder_level`,`rm`.`max_stock_level` AS `max_stock_level`,`rm`.`standard_cost` AS `standard_cost`,`s`.`supplier_type` AS `supplier_category`,`rm`.`storage_requirements` AS `storage_requirements`,case when `rm`.`quantity_on_hand` <= `rm`.`reorder_level` then 'REORDER_NEEDED' when `rm`.`quantity_on_hand` >= `rm`.`max_stock_level` then 'OVERSTOCKED' else 'NORMAL' end AS `stock_status`,`rm`.`quantity_on_hand` * `rm`.`standard_cost` AS `inventory_value`,count(distinct `srm`.`supplier_id`) AS `available_suppliers`,min(`srm`.`unit_cost`) AS `cheapest_supplier_cost`,max(`srm`.`unit_cost`) AS `most_expensive_cost`,group_concat(distinct `s`.`name` separator ', ') AS `supplier_names` from (((`raw_materials` `rm` left join `supplier_raw_materials` `srm` on(`rm`.`raw_material_id` = `srm`.`raw_material_id` and `srm`.`is_active` = 1)) left join `suppliers` `s` on(`srm`.`supplier_id` = `s`.`supplier_id` and `s`.`is_active` = 1)) left join `units_of_measure` `uom` on(`rm`.`unit_id` = `uom`.`unit_id`)) where `rm`.`is_active` = 1 group by `rm`.`raw_material_id`,`rm`.`name`,`rm`.`sku`,`rm`.`category`,`uom`.`unit_name`,`rm`.`quantity_on_hand`,`rm`.`reorder_level`,`rm`.`max_stock_level`,`rm`.`standard_cost`,`s`.`supplier_type`,`rm`.`storage_requirements` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `supplier_info_view`
--

/*!50001 DROP VIEW IF EXISTS `supplier_info_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `supplier_info_view` AS select `s`.`supplier_id` AS `supplier_id`,`s`.`name` AS `name`,`s`.`contact_person` AS `contact_person`,`s`.`email` AS `email`,`s`.`phone_number` AS `phone_number`,`s`.`address` AS `address`,`c`.`city_name` AS `city_name`,`co`.`country_name` AS `country_name`,`pt`.`term_name` AS `payment_terms`,`pt`.`days_to_pay` AS `days_to_pay`,`s`.`credit_limit` AS `credit_limit`,`s`.`is_active` AS `is_active`,`s`.`created_at` AS `created_at`,`s`.`updated_at` AS `updated_at` from (((`suppliers` `s` left join `cities` `c` on(`s`.`city` = `c`.`city_name`)) left join `countries` `co` on(`c`.`country_id` = `co`.`country_id`)) left join `payment_terms` `pt` on(`s`.`payment_terms` = `pt`.`term_code`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-19 20:52:51
