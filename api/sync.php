<?php
/**
 * Sincronizare bidirectionala.
 *
 * Cerere:  { "since": <ms server, 0 = tot>, "lists": [...], "items": [...], "cards": [...] }
 * Raspuns: { "now": <ms server>, "lists": [...], "items": [...], "cards": [...],
 *            "shared": {...}, "card_shared": {...}, "full": bool }
 *
 * Regula de conflict: ultima scriere ajunsa la server castiga. Momentul (updated_at)
 * este pus de server, ca sa nu depinda de ceasul telefonului (care poate fi gresit).
 */

require __DIR__ . '/lib.php';
cors();

$u  = require_user();
$me = $u['id'];
$now = now_ms();
$since = (int) param('since', 0);
if ($since < 0) {
    $since = 0;
}

$inLists = param('lists', []);
$inItems = param('items', []);
$inCards = param('cards', []);
if (!is_array($inLists)) { $inLists = []; }
if (!is_array($inItems)) { $inItems = []; }
if (!is_array($inCards)) { $inCards = []; }
if (count($inLists) > 500 || count($inItems) > 5000 || count($inCards) > 500) {
    fail('prea_multe_modificari', 413);
}

// inainte de tranzactie: crearea unui tabel in MySQL ar inchide tranzactia
asigura_schema_carduri();

$pdo = db();
$pdo->beginTransaction();

try {

$acc = array_flip(accessible_list_ids($me));

/* ---------- 1. modificarile venite de la client: liste ---------- */
foreach ($inLists as $l) {
    if (!is_array($l) || empty($l['id']) || !preg_match('/^[a-f0-9]{32}$/', (string) $l['id'])) {
        continue;
    }
    $id = $l['id'];
    $st = $pdo->prepare('SELECT owner_id, updated_at FROM lists WHERE id = ?');
    $st->execute([$id]);
    $cur = $st->fetch();

    if (!$cur) {
        // lista noua, creata pe telefon
        $ins = $pdo->prepare(
            'INSERT INTO lists (id, owner_id, name, color, position, updated_at, deleted)
             VALUES (?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $id, $me,
            clean_text($l['name'] ?? 'Lista', 120),
            (int) ($l['color'] ?? 0),
            (float) ($l['position'] ?? 0),
            $now,
            !empty($l['deleted']) ? 1 : 0,
        ]);
        $acc[$id] = true;
        continue;
    }

    if (!isset($acc[$id])) {
        continue; // nu are acces
    }

    if (!empty($l['deleted']) && $cur['owner_id'] !== $me) {
        // un membru care "sterge" lista de fapt o paraseste
        $pdo->prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')->execute([$id, $me]);
        unset($acc[$id]);
        continue;
    }

    $upd = $pdo->prepare('UPDATE lists SET name = ?, color = ?, position = ?, deleted = ?, updated_at = ? WHERE id = ?');
    $upd->execute([
        clean_text($l['name'] ?? 'Lista', 120),
        (int) ($l['color'] ?? 0),
        (float) ($l['position'] ?? 0),
        !empty($l['deleted']) ? 1 : 0,
        $now,
        $id,
    ]);
}

/* ---------- 2. modificarile venite de la client: articole ---------- */
$histSt = $pdo->prepare(
    'INSERT INTO history (user_id, name_norm, name, unit, uses, last_used) VALUES (?,?,?,?,1,?)
     ON DUPLICATE KEY UPDATE uses = uses + 1, name = VALUES(name), unit = VALUES(unit), last_used = VALUES(last_used)'
);

foreach ($inItems as $it) {
    if (!is_array($it) || empty($it['id']) || !preg_match('/^[a-f0-9]{32}$/', (string) $it['id'])) {
        continue;
    }
    $id = $it['id'];
    $listId = (string) ($it['list_id'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $listId) || !isset($acc[$listId])) {
        continue;
    }

    $name = clean_text($it['name'] ?? '', 200);
    if ($name === '') {
        $name = '(fara nume)';
    }
    $qty  = clean_text($it['qty'] ?? '', 20);
    $unit = clean_text($it['unit'] ?? '', 20);
    $note = clean_text($it['note'] ?? '', 200);
    $done = !empty($it['done']) ? 1 : 0;
    $del  = !empty($it['deleted']) ? 1 : 0;
    $pos  = (float) ($it['position'] ?? 0);

    $st = $pdo->prepare('SELECT list_id FROM items WHERE id = ?');
    $st->execute([$id]);
    $listaVeche = $st->fetchColumn();
    if ($listaVeche !== false) {
        // articolul exista deja: trebuie sa avem acces si la lista in care se afla acum,
        // altfel oricine ar putea muta la el un articol al altcuiva
        if (!isset($acc[$listaVeche])) {
            continue;
        }
        $upd = $pdo->prepare(
            'UPDATE items SET list_id = ?, name = ?, qty = ?, unit = ?, note = ?, done = ?, position = ?, deleted = ?, updated_at = ?
             WHERE id = ?'
        );
        $upd->execute([$listId, $name, $qty, $unit, $note, $done, $pos, $del, $now, $id]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO items (id, list_id, name, qty, unit, note, done, position, updated_at, deleted)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([$id, $listId, $name, $qty, $unit, $note, $done, $pos, $now, $del]);
        if (!$del) {
            $histSt->execute([$me, norm_name($name), $name, $unit, $now]);
        }
    }
}


/* ---------- 3. modificarile venite de la client: carduri ---------- */
$accC = array_flip(accessible_card_ids($me));
$formate = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'CODE_93', 'ITF', 'CODABAR',
            'QR_CODE', 'DATA_MATRIX', 'PDF_417', 'AZTEC', 'NUMAI_TEXT'];

foreach ($inCards as $c) {
    if (!is_array($c) || empty($c['id']) || !preg_match('/^[a-f0-9]{32}$/', (string) $c['id'])) {
        continue;
    }
    $id = $c['id'];
    $name   = clean_text($c['name'] ?? '', 80);
    $store  = preg_replace('/[^a-z0-9_-]/', '', (string) ($c['store'] ?? '')) ?? '';
    $color  = preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($c['color'] ?? '')) ? $c['color'] : '';
    // numarul se pastreaza exact (poate avea spatii semnificative doar la QR)
    $number = mb_substr(str_replace([chr(13), chr(10)], ' ', (string) ($c['number'] ?? '')), 0, 120);
    $format = in_array($c['format'] ?? '', $formate, true) ? $c['format'] : 'CODE_128';
    $note   = mb_substr(trim((string) ($c['note'] ?? '')), 0, 500);
    $listId = preg_match('/^[a-f0-9]{32}$/', (string) ($c['list_id'] ?? '')) ? $c['list_id'] : '';
    $del    = !empty($c['deleted']) ? 1 : 0;
    if ($name === '') {
        $name = 'Card';
    }

    $st = $pdo->prepare('SELECT owner_id FROM cards WHERE id = ?');
    $st->execute([$id]);
    $owner = $st->fetchColumn();

    if ($owner === false) {
        $ins = $pdo->prepare(
            'INSERT INTO cards (id, owner_id, store, name, color, number, format, note, list_id, updated_at, deleted)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([$id, $me, $store, $name, $color, $number, $format, $note, $listId, $now, $del]);
        $accC[$id] = true;
        continue;
    }
    if (!isset($accC[$id])) {
        continue;
    }
    if ($del && $owner !== $me) {
        // un membru care "sterge" un card partajat doar renunta la el
        $pdo->prepare('DELETE FROM card_members WHERE card_id = ? AND user_id = ?')->execute([$id, $me]);
        unset($accC[$id]);
        continue;
    }
    $upd = $pdo->prepare(
        'UPDATE cards SET store = ?, name = ?, color = ?, number = ?, format = ?, note = ?, list_id = ?, deleted = ?, updated_at = ?
         WHERE id = ?'
    );
    $upd->execute([$store, $name, $color, $number, $format, $note, $listId, $del, $now, $id]);
}

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('sync: ' . $e->getMessage());
    fail('sincronizare_esuata', 500);
}

/* ---------- 3. ce trimitem inapoi ---------- */
$ids = accessible_list_ids($me);
$out = ['now' => $now, 'lists' => [], 'items' => [], 'full' => $since === 0];

if ($ids) {
    $ph = implode(',', array_fill(0, count($ids), '?'));

    $st = $pdo->prepare("SELECT id, owner_id, name, color, position, updated_at, deleted FROM lists WHERE id IN ($ph) AND updated_at > ?");
    $st->execute(array_merge($ids, [$since]));
    foreach ($st->fetchAll() as $r) {
        $out['lists'][] = [
            'id'         => $r['id'],
            'name'       => $r['name'],
            'color'      => (int) $r['color'],
            'position'   => (float) $r['position'],
            'updated_at' => (int) $r['updated_at'],
            'deleted'    => (int) $r['deleted'],
            'owner'      => $r['owner_id'] === $me ? 1 : 0,
        ];
    }

    $st = $pdo->prepare("SELECT id, list_id, name, qty, unit, note, done, position, updated_at, deleted FROM items WHERE list_id IN ($ph) AND updated_at > ?");
    $st->execute(array_merge($ids, [$since]));
    foreach ($st->fetchAll() as $r) {
        $out['items'][] = [
            'id'         => $r['id'],
            'list_id'    => $r['list_id'],
            'name'       => $r['name'],
            'qty'        => $r['qty'],
            'unit'       => $r['unit'],
            'note'       => $r['note'],
            'done'       => (int) $r['done'],
            'position'   => (float) $r['position'],
            'updated_at' => (int) $r['updated_at'],
            'deleted'    => (int) $r['deleted'],
        ];
    }

    // cate persoane au acces la fiecare lista (pentru iconita de partajare)
    $st = $pdo->prepare("SELECT list_id, COUNT(*) c FROM list_members WHERE list_id IN ($ph) GROUP BY list_id");
    $st->execute($ids);
    $shared = [];
    foreach ($st->fetchAll() as $r) {
        $shared[$r['list_id']] = (int) $r['c'] + 1;
    }
    $out['shared'] = $shared;
}

/* ---------- carduri ---------- */
$cardIds = accessible_card_ids($me);
$out['cards'] = [];
$out['card_shared'] = [];
if ($cardIds) {
    $phc = implode(',', array_fill(0, count($cardIds), '?'));
    $st = $pdo->prepare("SELECT id, owner_id, store, name, color, number, format, note, list_id, updated_at, deleted FROM cards WHERE id IN ($phc) AND updated_at > ?");
    $st->execute(array_merge($cardIds, [$since]));
    foreach ($st->fetchAll() as $r) {
        $out['cards'][] = [
            'id'         => $r['id'],
            'store'      => $r['store'],
            'name'       => $r['name'],
            'color'      => $r['color'],
            'number'     => $r['number'],
            'format'     => $r['format'],
            'note'       => $r['note'],
            'list_id'    => $r['list_id'],
            'updated_at' => (int) $r['updated_at'],
            'deleted'    => (int) $r['deleted'],
            'owner'      => $r['owner_id'] === $me ? 1 : 0,
        ];
    }
    $st = $pdo->prepare("SELECT card_id, COUNT(*) c FROM card_members WHERE card_id IN ($phc) GROUP BY card_id");
    $st->execute($cardIds);
    foreach ($st->fetchAll() as $r) {
        $out['card_shared'][$r['card_id']] = (int) $r['c'] + 1;
    }
}

// la sincronizarea completa spunem clientului ce liste mai exista, ca sa le curete pe cele pierdute
if ($since === 0) {
    $out['all_list_ids'] = $ids;
    $out['all_card_ids'] = $cardIds;
}

// curatenie ocazionala: sterge definitiv ce e sters de peste 60 de zile
if (random_int(1, 50) === 1) {
    $cut = $now - 60 * 86400000;
    $pdo->prepare('DELETE FROM items WHERE deleted = 1 AND updated_at < ?')->execute([$cut]);
    $pdo->prepare('DELETE FROM lists WHERE deleted = 1 AND updated_at < ?')->execute([$cut]);
    $pdo->prepare('DELETE FROM tokens WHERE expires_at < ?')->execute([$now]);
    $pdo->prepare('DELETE FROM share_codes WHERE expires_at < ?')->execute([$now]);
    $pdo->prepare('DELETE FROM cards WHERE deleted = 1 AND updated_at < ?')->execute([$cut]);
    $pdo->prepare('DELETE FROM card_codes WHERE expires_at < ?')->execute([$now]);
}

json_out($out);
