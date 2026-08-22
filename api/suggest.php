<?php
/**
 * Sugestii de produse din istoricul propriu: suggest.php?q=lap&limit=8
 * Fara q returneaza cele mai folosite produse.
 */

require __DIR__ . '/lib.php';
cors();

$u = require_user();
$q = norm_name(clean_text($_GET['q'] ?? '', 60));
$limit = max(1, min(30, (int) ($_GET['limit'] ?? 10)));

if ($q === '') {
    $st = db()->prepare('SELECT name, unit, uses FROM history WHERE user_id = ? ORDER BY uses DESC, last_used DESC LIMIT ' . $limit);
    $st->execute([$u['id']]);
} else {
    // intai cele care incep cu textul cautat, apoi cele care il contin
    $st = db()->prepare(
        'SELECT name, unit, uses FROM history
         WHERE user_id = ? AND name_norm LIKE ?
         ORDER BY (name_norm LIKE ?) DESC, uses DESC, last_used DESC
         LIMIT ' . $limit
    );
    $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%';
    $st->execute([$u['id'], $like, str_replace(['%', '_'], ['\%', '\_'], $q) . '%']);
}

json_out(['items' => $st->fetchAll()]);
