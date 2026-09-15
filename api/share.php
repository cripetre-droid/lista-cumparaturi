<?php
/**
 * Partajarea unei liste sau a unui card de fidelitate.
 *
 *   share.php?a=create|members|remove|leave     cu { list_id } sau { card_id }
 *   share.php?a=join                            cu { code }  (merge pentru ambele)
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

// "card" daca s-a trimis card_id, altfel "list"
$cardId = (string) param('card_id', '');
$listId = (string) param('list_id', '');
$eCard  = $cardId !== '';

// codurile de invitatie sunt unice in ambele tabele, deci avem nevoie de schema cardurilor oricum
asigura_schema_carduri();

switch ($a) {
    case 'create': {
        $code = cod_invitatie_nou();
        if ($eCard) {
            if (!valid_id($cardId) || !user_can_access_card($me, $cardId)) {
                fail('card_inexistent', 404);
            }
            $st = db()->prepare('INSERT INTO card_codes (code, card_id, created_by, created_at, expires_at) VALUES (?,?,?,?,?)');
            $st->execute([$code, $cardId, $me, now_ms(), now_ms() + 14 * 86400000]);
        } else {
            if (!valid_id($listId) || !user_can_access_list($me, $listId)) {
                fail('lista_inexistenta', 404);
            }
            $st = db()->prepare('INSERT INTO share_codes (code, list_id, created_by, created_at, expires_at) VALUES (?,?,?,?,?)');
            $st->execute([$code, $listId, $me, now_ms(), now_ms() + 14 * 86400000]);
        }
        json_out(['code' => $code, 'expira' => '14 zile']);
    }

    case 'join': {
        $code = strtoupper(clean_text(param('code', ''), 12));

        // 1. cod de lista?
        $st = db()->prepare('SELECT s.list_id, l.name FROM share_codes s JOIN lists l ON l.id = s.list_id WHERE s.code = ? AND s.expires_at > ? AND l.deleted = 0');
        $st->execute([$code, now_ms()]);
        $row = $st->fetch();
        if ($row) {
            if (!user_can_access_list($me, $row['list_id'])) {
                db()->prepare('INSERT IGNORE INTO list_members (list_id, user_id, joined_at) VALUES (?,?,?)')
                    ->execute([$row['list_id'], $me, now_ms()]);
                // atingem lista ca sa fie trimisa la urmatoarea sincronizare
                db()->prepare('UPDATE lists SET updated_at = ? WHERE id = ?')->execute([now_ms(), $row['list_id']]);
            }
            json_out(['ok' => true, 'kind' => 'list', 'list_id' => $row['list_id'], 'name' => $row['name']]);
        }

        // 2. cod de card?
        $st = db()->prepare('SELECT s.card_id, c.name FROM card_codes s JOIN cards c ON c.id = s.card_id WHERE s.code = ? AND s.expires_at > ? AND c.deleted = 0');
        $st->execute([$code, now_ms()]);
        $row = $st->fetch();
        if ($row) {
            if (!user_can_access_card($me, $row['card_id'])) {
                db()->prepare('INSERT IGNORE INTO card_members (card_id, user_id, joined_at) VALUES (?,?,?)')
                    ->execute([$row['card_id'], $me, now_ms()]);
                db()->prepare('UPDATE cards SET updated_at = ? WHERE id = ?')->execute([now_ms(), $row['card_id']]);
            }
            json_out(['ok' => true, 'kind' => 'card', 'card_id' => $row['card_id'], 'name' => $row['name']]);
        }

        fail('cod_invalid', 404);
    }

    case 'members': {
        if ($eCard) {
            if (!valid_id($cardId) || !user_can_access_card($me, $cardId)) {
                fail('card_inexistent', 404);
            }
            $st = db()->prepare(
                "SELECT u.id, u.name, u.email, 1 AS owner FROM cards c JOIN users u ON u.id = c.owner_id WHERE c.id = ?
                 UNION
                 SELECT u.id, u.name, u.email, 0 AS owner FROM card_members m JOIN users u ON u.id = m.user_id WHERE m.card_id = ?"
            );
            $st->execute([$cardId, $cardId]);
        } else {
            if (!valid_id($listId) || !user_can_access_list($me, $listId)) {
                fail('lista_inexistenta', 404);
            }
            $st = db()->prepare(
                "SELECT u.id, u.name, u.email, 1 AS owner FROM lists l JOIN users u ON u.id = l.owner_id WHERE l.id = ?
                 UNION
                 SELECT u.id, u.name, u.email, 0 AS owner FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ?"
            );
            $st->execute([$listId, $listId]);
        }
        json_out(['members' => $st->fetchAll()]);
    }

    case 'remove': {
        $userId = (string) param('user_id', '');
        if (!valid_id($userId) || !valid_id($eCard ? $cardId : $listId)) {
            fail('parametri_invalizi');
        }
        $st = db()->prepare($eCard ? 'SELECT owner_id FROM cards WHERE id = ?' : 'SELECT owner_id FROM lists WHERE id = ?');
        $st->execute([$eCard ? $cardId : $listId]);
        if ($st->fetchColumn() !== $me) {
            fail('doar_proprietarul', 403);
        }
        if ($eCard) {
            db()->prepare('DELETE FROM card_members WHERE card_id = ? AND user_id = ?')->execute([$cardId, $userId]);
            db()->prepare('UPDATE cards SET updated_at = ? WHERE id = ?')->execute([now_ms(), $cardId]);
        } else {
            db()->prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')->execute([$listId, $userId]);
        }
        json_out(['ok' => true]);
    }

    case 'leave': {
        if (!valid_id($eCard ? $cardId : $listId)) {
            fail('parametri_invalizi');
        }
        if ($eCard) {
            db()->prepare('DELETE FROM card_members WHERE card_id = ? AND user_id = ?')->execute([$cardId, $me]);
        } else {
            db()->prepare('DELETE FROM list_members WHERE list_id = ? AND user_id = ?')->execute([$listId, $me]);
        }
        json_out(['ok' => true]);
    }

    default:
        fail('actiune_necunoscuta', 404);
}
