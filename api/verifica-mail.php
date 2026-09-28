<?php
/**
 * Verifica trimiterea e-mailului (pentru "Am uitat parola").
 * Se deschide o singura data, apoi se sterge de pe server:
 *
 *   https://lista.vireo.ro/api/verifica-mail.php?key=CHEIA_DIN_CONFIG&to=adresa@exemplu.ro
 */

require __DIR__ . '/lib.php';
require __DIR__ . '/mail.php';

header('Content-Type: text/plain; charset=utf-8');

$key = (string) ($_GET['key'] ?? '');
if ($key === '' || !hash_equals((string) cfg()['install_key'], $key)) {
    http_response_code(403);
    exit("cheie gresita\n");
}

$c = cfg();
echo "Configurare SMTP\n";
echo "  gazda:      " . ($c['smtp_host'] ?? '(lipseste)') . ':' . ($c['smtp_port'] ?? 587) . "\n";
echo "  utilizator: " . ($c['smtp_user'] ?? '(lipseste)') . "\n";
echo "  parola:     " . (empty($c['smtp_pass']) ? '(lipseste)' : 'pusa (' . strlen((string) $c['smtp_pass']) . ' caractere)') . "\n";
echo "  openssl:    " . (extension_loaded('openssl') ? 'activ' : 'LIPSESTE (TLS nu va merge)') . "\n\n";

$to = trim((string) ($_GET['to'] ?? ''));
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    exit("Adauga &to=adresa@exemplu.ro ca sa trimit un mesaj de proba.\n");
}

$link = adresa_aplicatiei() . 'parola-noua.html#t=' . str_repeat('a', 64);
[$html, $text] = email_resetare('Test', $link);
$inceput = microtime(true);
[$reusit, $explicatie] = trimite_email($to, 'Test — Lista de cumpărături', $html, $text);
$durata = round((microtime(true) - $inceput) * 1000);

echo "Trimitere catre $to\n";
echo "  rezultat: " . ($reusit ? 'REUSIT' : 'ESUAT') . " ($explicatie) in {$durata} ms\n\n";
echo $reusit
    ? "Verifica inbox-ul (si folderul Spam). Daca mesajul a ajuns, sterge acest fisier de pe server.\n"
    : "Sfaturi:\n"
      . "  - casuta din smtp_user trebuie sa existe in cPanel > Email Accounts;\n"
      . "  - parola din smtp_pass e cea a casutei, nu a contului cPanel;\n"
      . "  - incearca portul 465 in loc de 587 (sau invers);\n"
      . "  - daca scrie 'autentificare esuata', reseteaza parola casutei in cPanel.\n";
