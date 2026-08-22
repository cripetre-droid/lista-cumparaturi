<?php
/**
 * Functii comune: configurare, CORS, JSON, baza de date, autentificare.
 */

declare(strict_types=1);

mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Bucharest');

// In productie nu afisam erorile in raspuns (ar sparge JSON-ul si ar da informatii).
ini_set('display_errors', '0');
error_reporting(E_ALL);

function cfg(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            json_out(['error' => 'server_neconfigurat'], 500);
        }
        $cfg = require $file;
    }
    return $cfg;
}

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    json_out(['error' => $msg], $code);
}

/** Trimite antetele CORS si raspunde la preflight. */
function cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = cfg()['allowed_origins'] ?? [];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Max-Age: 86400');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if ($origin !== '' && !in_array($origin, $allowed, true)) {
        fail('origine_neautorizata', 403);
    }
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = cfg();
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_name']);
        try {
            $pdo = new PDO($dsn, $c['db_user'], $c['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            error_log('DB: ' . $e->getMessage());
            json_out(['error' => 'baza_de_date_indisponibila'], 500);
        }
    }
    return $pdo;
}

/** Corpul cererii, decodat din JSON. */
function body(): array
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input') ?: '';
        $b = json_decode($raw, true);
        if (!is_array($b)) {
            $b = [];
        }
    }
    return $b;
}

function param(string $key, $default = null)
{
    $b = body();
    if (array_key_exists($key, $b)) {
        return $b[$key];
    }
    if (isset($_GET[$key])) {
        return $_GET[$key];
    }
    return $default;
}

function now_ms(): int
{
    return (int) round(microtime(true) * 1000);
}

function new_id(): string
{
    return bin2hex(random_bytes(16));
}

function bearer_token(): string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) {
                $h = $v;
                break;
            }
        }
    }
    if (stripos($h, 'Bearer ') === 0) {
        return trim(substr($h, 7));
    }
    return (string) param('token', '');
}

/** Returneaza utilizatorul curent sau null. */
function current_user(): ?array
{
    $token = bearer_token();
    if ($token === '') {
        return null;
    }
    $hash = hash('sha256', $token);
    $st = db()->prepare(
        'SELECT u.id, u.email, u.name FROM tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = ? AND t.expires_at > ?'
    );
    $st->execute([$hash, now_ms()]);
    $row = $st->fetch();
    if (!$row) {
        return null;
    }
    // prelungim valabilitatea, dar nu la fiecare cerere (max o data pe zi)
    $upd = db()->prepare('UPDATE tokens SET last_used = ?, expires_at = ? WHERE token_hash = ? AND last_used < ?');
    $upd->execute([now_ms(), now_ms() + 180 * 86400000, $hash, now_ms() - 86400000]);
    return $row;
}

function require_user(): array
{
    $u = current_user();
    if (!$u) {
        fail('neautentificat', 401);
    }
    return $u;
}

/** Verifica daca utilizatorul are acces la lista (proprietar sau membru). */
function user_can_access_list(string $userId, string $listId): bool
{
    $st = db()->prepare(
        'SELECT 1 FROM lists l
         LEFT JOIN list_members m ON m.list_id = l.id AND m.user_id = ?
         WHERE l.id = ? AND (l.owner_id = ? OR m.user_id IS NOT NULL) LIMIT 1'
    );
    $st->execute([$userId, $listId, $userId]);
    return (bool) $st->fetchColumn();
}

/** Toate id-urile de liste la care are acces utilizatorul. */
function accessible_list_ids(string $userId): array
{
    $st = db()->prepare(
        'SELECT id FROM lists WHERE owner_id = ?
         UNION SELECT list_id FROM list_members WHERE user_id = ?'
    );
    $st->execute([$userId, $userId]);
    return array_column($st->fetchAll(), 'id');
}

/** Normalizeaza un nume pentru cautare/istoric: litere mici, fara diacritice. */
function norm_name(string $s): string
{
    $s = mb_strtolower(trim($s));
    $from = ['ă', 'â', 'î', 'ș', 'ş', 'ț', 'ţ'];
    $to   = ['a', 'a', 'i', 's', 's', 't', 't'];
    $s = str_replace($from, $to, $s);
    return preg_replace('/\s+/', ' ', $s) ?? $s;
}

function clean_text($v, int $max = 200): string
{
    if (!is_string($v)) {
        $v = (string) $v;
    }
    $v = str_replace(["\r", "\n", "\t"], ' ', $v);
    $v = trim(preg_replace('/\s+/u', ' ', $v) ?? $v);
    return mb_substr($v, 0, $max);
}
