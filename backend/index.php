<?php

// InfinityFree serves the project root, while Laravel's web entry point is
// kept in public/. Keep the application code outside the web document root
// where possible; this wrapper supports the current htdocs layout.
require __DIR__.'/public/index.php';
