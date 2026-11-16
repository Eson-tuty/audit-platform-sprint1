<?php

return [
    // First month of the fiscal year: 4 = April (e.g. India), 1 = January.
    'fy_start_month' => (int) env('AUDIT_FY_START_MONTH', 4),

    // Open queries whose closure date falls within this many days are listed as "due for retest".
    'retest_window_days' => (int) env('AUDIT_RETEST_WINDOW_DAYS', 7),
];
