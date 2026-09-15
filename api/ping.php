<?php
/**
 * Intrebarea ieftina: "s-a schimbat ceva de cand am vorbit ultima data?"
 *
 * Aplicatia o pune des (la cateva secunde). De aceea aici se face o singura
 * interogare si se raspunde cu cateva zeci de octeti. Sincronizarea propriu-zisa
 * (sync.php, care e mult mai scumpa) se cheama doar cand raspunsul spune ca
 * exista intr-adevar ceva nou.
 *
 * Raspuns: { "now": <ms server>, "ultim": <ms ultimei modificari vizibile mie> }
 */

require __DIR__ . '/lib.php';
cors();

$u  = require_user();
$me = $u['id'];

$st = db()->prepare(
    'SELECT MAX(u) AS ultim FROM (
        SELECT MAX(l.updated_at) AS u
          FROM lists l
          LEFT JOIN list_members m ON m.list_id = l.id AND m.user_id = ?
         WHERE l.owner_id = ? OR m.user_id IS NOT NULL
        UNION ALL
        SELECT MAX(i.updated_at) AS u
          FROM items i
          JOIN lists l ON l.id = i.list_id
          LEFT JOIN list_members m ON m.list_id = l.id AND m.user_id = ?
         WHERE l.owner_id = ? OR m.user_id IS NOT NULL
     ) t'
);
$st->execute([$me, $me, $me, $me]);
$ultim = (int) $st->fetchColumn();

// cardurile: tabelul poate lipsi pe un server inca neactualizat
try {
    $st = db()->prepare(
        'SELECT MAX(c.updated_at)
           FROM cards c
           LEFT JOIN card_members m ON m.card_id = c.id AND m.user_id = ?
          WHERE c.owner_id = ? OR m.user_id IS NOT NULL'
    );
    $st->execute([$me, $me]);
    $ultim = max($ultim, (int) $st->fetchColumn());
} catch (PDOException $e) {
    // fara carduri inca - nimic de raportat
}

json_out([
    'now'   => now_ms(),
    'ultim' => $ultim,
]);
