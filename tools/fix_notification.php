<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$pdo->exec('UPDATE system_notifications SET reference_id = 13 WHERE notification_id = 1');
echo "Fixed notification 1 reference_id to 13 (Linx Ink)\n";
