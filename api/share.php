<?php
/**
 * Partajarea unei liste: share.php?a=create|join|members|remove|leave
 */

require __DIR__ . '/lib.php';
cors();

$u  = require_user();
$me = $u['id'];
$a  = (string) ($_GET['a'] ?? '');

function valid_id($v): bool
{
    return is_string($v) && (bool) preg_match('/^[a-f0-9]{32}$/', $v);
}

switch ($a) {
    case 'create': {
        $listId = (string) param('list_id', '');
        if (!valid_id($listId) || !user_can_access_list($me, $listId)) {
            fail('lista_inexistenta', 404);
        }
        // cod scurt, fara caractere care se confunda (0/O, 1/I)
        $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = '';
            for ($i = 0; $i < 7; $i++) {
                $code .= $abc[random_int(0, strlen($abc) - 1)];
            }
            $st = db()->prepare('SELECT 1 FROM share_codes WHERE code = ?');
            $st->execute([$code]);
        } while ($st->fetchColumn());

        $st = db()->prepare('INSERT INTO share_codes (code, list_id, created_by, created_at, expires_at) VALUES (?,?,?,?,?)');
        $st->execute([$code, $listId, $me, now_ms(), now_ms() + 14 * 86400000]);
        json_out(['code' => $code, 'expira' => '14 zile']);
    }

    case 'join': {
        $code = strtoupper(clean_text(param('code', ''), 12));
        $st = db()->prepare('SELECT s.list_id, l.name FROM share_codes s JOIN lists l ON l.id = s.list_id WHERE s.code = ? AND s.expires_at > ? AND l.deleted = 0');
        $st->execute([$code, now_ms()]);
        $row = $st->fetch();
        if (!$row) {
            fail('cod_invalid', 404);
        }
        if (!user_can_access_list($me, $row['list_id'])) {
            $st = db()->prepare('INSERT IGNORE INTO list_members (list_id, user_id, joined_at) VALUES (?,?,?)');
            $st->execute([$row['list_id'], $me, now_ms()]);
            // atingem lista ca sa fie trimisa la urmatoarea sincronizare
            db()->prepare('UPDATE lists SET updated_at = ? WHERE id = ?')->execute([now_ms(), $row['list_id']]);
        }
        json_out(['ok' => true, 'list_id' => $row['list_id'], 'name' => $row['name']]);
    }

    case 'members': {
        $listId = (string) param('list_id', '');
        if (!valid_id($listId) || !user_can_access_list($me, $listId)) {
            fail('lista_inexistenta', 404);
        }
        $st = db()->prepare(
            "SELECT u.id, u.name, u.email, 1 AS owner FROM lists l JOIN users u ON u.id = l.owner_id WHERE l.id = ?
             UNION
             SELECT u.id, u.name, u.email, 0 AS owner FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ?"
        );
        $st->execute([$listId, $listId]);
        json_out(['members' => $st->fetchAll()]);
    }

    case 'remove': {
        $listId = (string) param('list_id', '');
        $userId = (string) param('user_id', '');
        if (!valid_id($listId) || !valid_id($userId)) {
            fail('parametri_invalizi');
        }
        $st = db()->prepare('SELECT owner_id FROM lists WHERE id = ?');
        $st->execute([$listId]);
        if ($st->fetchColumn() !== $me) {
            fail('doar_proprietarul', 403);
        }
        db()->prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')->execute([$listId, $userId]);
        json_out(['ok' => true]);
    }

    case 'leave': {
        $listId = (string) param('list_id', '');
        if (!valid_id($listId)) {
            fail('parametri_invalizi');
        }
        db()->prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')->execute([$listId, $me]);
        json_out(['ok' => true]);
    }

    default:
        fail('actiune_necunoscuta', 404);
}
