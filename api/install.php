<?php
/**
 * Creeaza tabelele. Se ruleaza o singura data:
 *   https://vireo.ro/lista/api/install.php?key=CHEIA_DIN_CONFIG
 * Dupa instalare, sterge fisierul de pe server.
 */

require __DIR__ . '/lib.php';

$key = (string) ($_GET['key'] ?? '');
if ($key === '' || !hash_equals((string) cfg()['install_key'], $key)) {
    fail('cheie_gresita', 403);
}

$sql = [
    "CREATE TABLE IF NOT EXISTS users (
        id CHAR(32) NOT NULL PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        pass_hash VARCHAR(255) NOT NULL,
        name VARCHAR(80) NOT NULL DEFAULT '',
        created_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS tokens (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id CHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        last_used BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        INDEX (user_id),
        CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS lists (
        id CHAR(32) NOT NULL PRIMARY KEY,
        owner_id CHAR(32) NOT NULL,
        name VARCHAR(120) NOT NULL,
        color TINYINT NOT NULL DEFAULT 0,
        position DOUBLE NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        deleted TINYINT NOT NULL DEFAULT 0,
        INDEX (owner_id),
        INDEX (updated_at),
        CONSTRAINT fk_lists_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS list_members (
        list_id CHAR(32) NOT NULL,
        user_id CHAR(32) NOT NULL,
        joined_at BIGINT NOT NULL,
        PRIMARY KEY (list_id, user_id),
        INDEX (user_id),
        CONSTRAINT fk_lm_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE,
        CONSTRAINT fk_lm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS items (
        id CHAR(32) NOT NULL PRIMARY KEY,
        list_id CHAR(32) NOT NULL,
        name VARCHAR(200) NOT NULL,
        qty VARCHAR(20) NOT NULL DEFAULT '',
        unit VARCHAR(20) NOT NULL DEFAULT '',
        note VARCHAR(200) NOT NULL DEFAULT '',
        done TINYINT NOT NULL DEFAULT 0,
        position DOUBLE NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        deleted TINYINT NOT NULL DEFAULT 0,
        INDEX (list_id),
        INDEX (updated_at),
        CONSTRAINT fk_items_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS history (
        user_id CHAR(32) NOT NULL,
        name_norm VARCHAR(190) NOT NULL,
        name VARCHAR(200) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT '',
        uses INT NOT NULL DEFAULT 1,
        last_used BIGINT NOT NULL,
        PRIMARY KEY (user_id, name_norm),
        INDEX (user_id, uses),
        CONSTRAINT fk_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS share_codes (
        code VARCHAR(12) NOT NULL PRIMARY KEY,
        list_id CHAR(32) NOT NULL,
        created_by CHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        INDEX (list_id),
        CONSTRAINT fk_share_list FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ip VARBINARY(16) NOT NULL,
        email VARCHAR(190) NOT NULL DEFAULT '',
        at BIGINT NOT NULL,
        INDEX (ip, at),
        INDEX (at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

$done = [];
foreach ($sql as $q) {
    db()->exec($q);
    preg_match('/EXISTS (\w+)/', $q, $m);
    $done[] = $m[1] ?? '?';
}

$folosit = '(necunoscut)';
foreach (fisiere_config() as $f) {
    if (is_file($f)) { $folosit = $f; break; }
}

json_out([
    'ok'           => true,
    'tabele'       => $done,
    'configurarea' => $folosit,
    'mesaj'        => 'Instalare reusita. Sterge install.php de pe server.',
]);
