<?php
// TEMPORARY diagnostic for InfinityFree. Upload to htdocs/public/check2.php
// open https://arunakash.infinityfree.io/check2.php, then DELETE this file.
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

$base = is_dir(__DIR__."/vendor") ? __DIR__ : dirname(__DIR__);
echo "Script dir: " . __DIR__ . "\nProject base: $base\n\n";
echo "PHP version: " . PHP_VERSION . (PHP_VERSION_ID >= 80200 ? "  OK\n" : "  <-- Laravel 12 needs PHP 8.2+\n");

echo "\nExtensions:\n";
foreach (['openssl','pdo','pdo_mysql','mbstring','tokenizer','xml','ctype','json','fileinfo','bcmath','curl','dom'] as $e) {
    echo sprintf("  %-10s %s\n", $e, extension_loaded($e) ? 'yes' : 'MISSING');
}

echo "\nFiles:\n";
foreach (['.env','public/index.php','vendor/autoload.php','vendor/composer/autoload_static.php',
          'vendor/laravel/framework/src/Illuminate/Foundation/Application.php',
          'bootstrap/app.php','bootstrap/cache/packages.php','bootstrap/cache/services.php',
          'routes/api.php'] as $f) {
    echo sprintf("  %-70s %s\n", $f, file_exists("$base/$f") ? 'found' : 'MISSING');
}

echo "\nWritable dirs:\n";
foreach (['storage','storage/logs','storage/framework','storage/framework/cache','storage/framework/cache/data',
          'storage/framework/sessions','storage/framework/views','bootstrap/cache'] as $d) {
    $p = "$base/$d";
    echo sprintf("  %-35s %s\n", $d, !is_dir($p) ? 'MISSING' : (is_writable($p) ? 'writable' : 'NOT writable'));
}

echo "\nDatabase (.env values):\n";
$env = @file_get_contents("$base/.env");
$get = function ($k) use ($env) { return preg_match("/^$k=(.*)$/m", (string)$env, $m) ? trim($m[1], " \"'\r") : null; };
$conn = $get('DB_CONNECTION');
echo "  DB_CONNECTION=$conn DB_HOST=" . $get('DB_HOST') . " DB_DATABASE=" . $get('DB_DATABASE') . " DB_USERNAME=" . $get('DB_USERNAME') . "\n";
if ($conn === 'mysql') {
    try {
        new PDO("mysql:host=".$get('DB_HOST').";port=".($get('DB_PORT') ?: 3306).";dbname=".$get('DB_DATABASE'),
                $get('DB_USERNAME'), $get('DB_PASSWORD'), [PDO::ATTR_TIMEOUT => 5]);
        echo "  MySQL connection: OK\n";
    } catch (Throwable $e) {
        echo "  MySQL connection FAILED: " . $e->getMessage() . "\n";
    }
}

echo "\nBooting Laravel...\n";
try {
    require "$base/vendor/autoload.php";
    $app = require "$base/bootstrap/app.php";
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $req = Illuminate\Http\Request::create('/api/v1/health', 'GET');
    $res = $kernel->handle($req);
    echo "  /api/v1/health -> HTTP " . $res->getStatusCode() . "\n  " . substr($res->getContent(), 0, 1500) . "\n";
} catch (Throwable $e) {
    echo "  ERROR: " . get_class($e) . ": " . $e->getMessage() . "\n  at " . $e->getFile() . ':' . $e->getLine() . "\n";
}

echo "\nLast lines of storage/logs/laravel.log:\n";
$log = @file("$base/storage/logs/laravel.log");
echo $log ? implode('', array_slice($log, -15)) : "  (no log)\n";
