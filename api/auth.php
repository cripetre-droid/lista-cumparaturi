<?php
/**
 * Conturi: inregistrare, autentificare, cine sunt, delogare, schimbare parola.
 * Endpoint: auth.php?a=register|login|me|logout|password|delete
 */

require __DIR__ . '/lib.php';
cors();

$a = (string) ($_GET['a'] ?? '');

function client_ip_bin(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $bin = @inet_pton($ip);
    return $bin === false ? inet_pton('0.0.0.0') : $bin;
}

/** Maxim 10 incercari esuate pe IP in 15 minute. */
function throttle_login(): void
{
    $since = now_ms() - 15 * 60000;
    db()->prepare('DELETE FROM login_attempts WHERE at < ?')->execute([now_ms() - 86400000]);
    $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND at > ?');
    $st->execute([client_ip_bin(), $since]);
    if ((int) $st->fetchColumn() >= 10) {
        fail('prea_multe_incercari', 429);
    }
}

function note_failed_login(string $email): void
{
    $st = db()->prepare('INSERT INTO login_attempts (ip, email, at) VALUES (?, ?, ?)');
    $st->execute([client_ip_bin(), mb_substr($email, 0, 190), now_ms()]);
}

function issue_token(string $userId): string
{
    $token = bin2hex(random_bytes(32));
    $st = db()->prepare('INSERT INTO tokens (token_hash, user_id, created_at, last_used, expires_at) VALUES (?,?,?,?,?)');
    $st->execute([hash('sha256', $token), $userId, now_ms(), now_ms(), now_ms() + 180 * 86400000]);
    return $token;
}

switch ($a) {
    case 'register': {
        throttle_login();
        $c = cfg();
        if (empty($c['allow_signup'])) {
            fail('inregistrari_oprite', 403);
        }
        if (!empty($c['signup_code']) && !hash_equals((string) $c['signup_code'], (string) param('code', ''))) {
            fail('cod_inregistrare_gresit', 403);
        }
        $email = mb_strtolower(clean_text(param('email', ''), 190));
        $pass  = (string) param('password', '');
        $name  = clean_text(param('name', ''), 80);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('email_invalid');
        }
        if (mb_strlen($pass) < 8) {
            fail('parola_prea_scurta');
        }
        $st = db()->prepare('SELECT 1 FROM users WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetchColumn()) {
            note_failed_login($email);
            fail('email_existent', 409);
        }
        $id = new_id();
        $st = db()->prepare('INSERT INTO users (id, email, pass_hash, name, created_at) VALUES (?,?,?,?,?)');
        $st->execute([$id, $email, password_hash($pass, PASSWORD_DEFAULT), $name !== '' ? $name : explode('@', $email)[0], now_ms()]);
        json_out(['token' => issue_token($id), 'user' => ['id' => $id, 'email' => $email, 'name' => $name]]);
    }

    case 'login': {
        throttle_login();
        $email = mb_strtolower(clean_text(param('email', ''), 190));
        $pass  = (string) param('password', '');
        $st = db()->prepare('SELECT id, email, name, pass_hash FROM users WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u || !password_verify($pass, $u['pass_hash'])) {
            note_failed_login($email);
            fail('date_gresite', 401);
        }
        json_out(['token' => issue_token($u['id']), 'user' => ['id' => $u['id'], 'email' => $u['email'], 'name' => $u['name']]]);
    }

    case 'me': {
        $u = require_user();
        json_out(['user' => $u]);
    }

    case 'logout': {
        $token = bearer_token();
        if ($token !== '') {
            db()->prepare('DELETE FROM tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        }
        json_out(['ok' => true]);
    }

    case 'password': {
        $u = require_user();
        $old = (string) param('old_password', '');
        $new = (string) param('new_password', '');
        if (mb_strlen($new) < 8) {
            fail('parola_prea_scurta');
        }
        $st = db()->prepare('SELECT pass_hash FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        if (!password_verify($old, (string) $st->fetchColumn())) {
            fail('parola_veche_gresita', 401);
        }
        db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
        // invalidam celelalte sesiuni
        $keep = hash('sha256', bearer_token());
        db()->prepare('DELETE FROM tokens WHERE user_id = ? AND token_hash <> ?')->execute([$u['id'], $keep]);
        json_out(['ok' => true]);
    }

    case 'delete': {
        // Stergerea definitiva a contului (ceruta si de Google Play).
        // Se confirma cu parola, ca un telefon lasat deblocat sa nu poata sterge contul.
        throttle_login();
        $u = require_user();
        $pass = (string) param('password', '');
        $st = db()->prepare('SELECT pass_hash, email FROM users WHERE id = ?');
        $st->execute([$u['id']]);
        $rand = $st->fetch();
        if (!$rand || !password_verify($pass, $rand['pass_hash'])) {
            note_failed_login($u['email']);
            fail('parola_gresita', 401);
        }

        asigura_schema_carduri();
        $pdo = db();
        $me = $u['id'];
        $pdo->beginTransaction();
        try {
            // Listele si cardurile partajate nu dispar de la ceilalti: trec la cel mai vechi membru.
            $transfera = function (string $tabel, string $tabelMembri, string $col) use ($pdo, $me) {
                $st = $pdo->prepare("SELECT id FROM $tabel WHERE owner_id = ?");
                $st->execute([$me]);
                foreach (array_column($st->fetchAll(), 'id') as $id) {
                    $m = $pdo->prepare("SELECT user_id FROM $tabelMembri WHERE $col = ? AND user_id <> ? ORDER BY joined_at ASC LIMIT 1");
                    $m->execute([$id, $me]);
                    $urmas = $m->fetchColumn();
                    if ($urmas) {
                        $pdo->prepare("UPDATE $tabel SET owner_id = ?, updated_at = ? WHERE id = ?")->execute([$urmas, now_ms(), $id]);
                        $pdo->prepare("DELETE FROM $tabelMembri WHERE $col = ? AND user_id = ?")->execute([$id, $urmas]);
                    }
                }
            };
            $transfera('lists', 'list_members', 'list_id');
            $transfera('cards', 'card_members', 'card_id');

            // restul se sterge in cascada: sesiuni, liste si produse proprii, carduri proprii,
            // apartenenta la liste/carduri partajate, istoricul de sugestii
            $pdo->prepare('DELETE FROM share_codes WHERE created_by = ?')->execute([$me]);
            $pdo->prepare('DELETE FROM card_codes WHERE created_by = ?')->execute([$me]);
            $pdo->prepare('DELETE FROM login_attempts WHERE email = ?')->execute([$rand['email']]);
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$me]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            error_log('stergere cont: ' . $e->getMessage());
            fail('stergere_esuata', 500);
        }
        json_out(['ok' => true]);
    }

    default:
        fail('actiune_necunoscuta', 404);
}
