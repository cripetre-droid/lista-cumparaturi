<?php
/**
 * Trimiterea e-mailurilor (resetarea parolei).
 *
 * DE CE NU mail(): pe cPanel Romarg, Exim rescrie expeditorul din plic in
 * rvir1227@server-....whmpanels.com, iar Gmail respinge mesajul ("550 Invalid sender").
 * mail() intoarce totusi true, pentru ca mesajul intra in coada. Singura cale sigura
 * e SMTP AUTENTIFICAT: la AUTH, expeditorul e chiar contul autentificat.
 *
 * In lista-config.php:
 *   'smtp_host' => 'localhost',
 *   'smtp_port' => 587,
 *   'smtp_user' => 'lista@vireo.ro',     // casuta reala, creata in cPanel
 *   'smtp_pass' => '...',
 *   'smtp_nume' => 'Lista de cumparaturi',
 */

declare(strict_types=1);

/** Trimite un e-mail. Intoarce [reusit, explicatie]. */
function trimite_email(string $catre, string $subiect, string $html, string $text): array
{
    $c = cfg();
    foreach (['smtp_host', 'smtp_user', 'smtp_pass'] as $k) {
        if (empty($c[$k])) {
            return [false, 'e-mailul nu e configurat pe server (lipseste ' . $k . ')'];
        }
    }
    $port = (int) ($c['smtp_port'] ?? 587);
    $de_la = $c['smtp_user'];
    $nume = $c['smtp_nume'] ?? 'Lista de cumparaturi';

    $granita = '=_' . bin2hex(random_bytes(12));
    $antete = [
        'From: ' . mb_encode_mimeheader($nume, 'UTF-8') . ' <' . $de_la . '>',
        'Reply-To: ' . $de_la,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $granita . '"',
        'Auto-Submitted: auto-generated',
    ];
    $corp = "--$granita\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n" . $text . "\r\n\r\n"
        . "--$granita\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: 8bit\r\n\r\n" . $html . "\r\n\r\n"
        . "--$granita--\r\n";

    return smtp_trimite($c, $catre, mb_encode_mimeheader($subiect, 'UTF-8'), $corp, $antete, $de_la, $port);
}

function smtp_e_local(string $host): bool
{
    return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

/* STREAM_CRYPTO_METHOD_TLS_CLIENT nu include TLS 1.2/1.3 pe unele versiuni de PHP,
   iar serverele actuale refuza 1.0/1.1 - handshake-ul ar cadea fara motiv aparent. */
function smtp_metoda_crypto(): int
{
    $m = STREAM_CRYPTO_METHOD_TLS_CLIENT;
    foreach (['STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT', 'STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT',
              'STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT'] as $c) {
        if (defined($c)) {
            $m |= constant($c);
        }
    }
    return $m;
}

/** Client SMTP minimal: EHLO -> STARTTLS -> AUTH LOGIN -> MAIL/RCPT/DATA. */
function smtp_trimite(array $c, string $catre, string $subiectCodat, string $corp, array $antete, string $deLa, int $port): array
{
    $host = $c['smtp_host'];
    $local = smtp_e_local($host);

    $fp = @stream_socket_client(
        ($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port,
        $errno, $errstr, 20, STREAM_CLIENT_CONNECT,
        stream_context_create(['ssl' => [
            'verify_peer' => !$local, 'verify_peer_name' => !$local,
            'allow_self_signed' => $local, 'SNI_enabled' => !$local,
        ]])
    );
    if (!$fp) {
        return [false, "conectare esuata: $errstr ($errno)"];
    }
    stream_set_timeout($fp, 20);

    $citeste = function () use ($fp) {
        $tot = '';
        while (($linie = fgets($fp, 515)) !== false) {
            $tot .= $linie;
            if (strlen($linie) < 4 || $linie[3] !== '-') break;   // 250- continua, 250 incheie
        }
        return $tot;
    };
    $cod = fn ($r) => (int) substr(ltrim((string) $r), 0, 3);
    $scrie = function (string $s) use ($fp) { fwrite($fp, $s . "\r\n"); };
    $opreste = function (string $mesaj) use ($fp) { @fclose($fp); return [false, $mesaj]; };

    if ($cod($citeste()) !== 220) {
        return $opreste('serverul nu a salutat');
    }
    $ehlo = parse_url('https://' . ($c['allowed_origins'][0] ?? 'lista.vireo.ro'), PHP_URL_HOST) ?: 'lista.vireo.ro';
    $scrie('EHLO ' . $ehlo);
    if ($cod($citeste()) !== 250) {
        return $opreste('EHLO respins');
    }

    if ($port !== 465) {
        $scrie('STARTTLS');
        if ($cod($citeste()) !== 220) {
            return $opreste('STARTTLS respins');
        }
        if (!@stream_socket_enable_crypto($fp, true, smtp_metoda_crypto())) {
            // pe bucla locala traficul nu iese din server; in rest, oprim
            if (!$local) {
                $e = error_get_last();
                return $opreste('criptarea TLS a esuat: ' . ($e['message'] ?? ''));
            }
        }
        $scrie('EHLO ' . $ehlo);
        if ($cod($citeste()) !== 250) {
            return $opreste('EHLO dupa TLS respins');
        }
    }

    $scrie('AUTH LOGIN');
    if ($cod($citeste()) !== 334) {
        return $opreste('serverul nu accepta AUTH LOGIN');
    }
    $scrie(base64_encode($c['smtp_user']));
    if ($cod($citeste()) !== 334) {
        return $opreste('utilizator respins');
    }
    $scrie(base64_encode($c['smtp_pass']));
    $r = $citeste();
    if ($cod($r) !== 235) {
        return $opreste('autentificare esuata: ' . trim($r));
    }

    $scrie('MAIL FROM:<' . $deLa . '>');
    $r = $citeste();
    if ($cod($r) !== 250) {
        return $opreste('MAIL FROM respins: ' . trim($r));
    }
    $scrie('RCPT TO:<' . $catre . '>');
    $r = $citeste();
    if ($cod($r) !== 250 && $cod($r) !== 251) {
        return $opreste('RCPT TO respins: ' . trim($r));
    }
    $scrie('DATA');
    if ($cod($citeste()) !== 354) {
        return $opreste('DATA respins');
    }

    $mesaj = implode("\r\n", array_merge($antete, [
        'To: ' . $catre,
        'Subject: ' . $subiectCodat,
        'Date: ' . date('r'),
    ])) . "\r\n\r\n" . $corp;
    $mesaj = str_replace("\n", "\r\n", str_replace("\r\n", "\n", $mesaj));
    $mesaj = preg_replace('/^\./m', '..', $mesaj);   // linia cu punct ar incheia mesajul

    fwrite($fp, $mesaj . "\r\n.\r\n");
    $r = $citeste();
    $reusit = $cod($r) === 250;
    $scrie('QUIT');
    @fclose($fp);

    return [$reusit, $reusit ? 'trimis' : 'mesaj respins: ' . trim($r)];
}

/** Mesajul de resetare a parolei: acelasi text si in HTML, si simplu. */
function email_resetare(string $nume, string $link): array
{
    $n = htmlspecialchars($nume !== '' ? $nume : 'Salut', ENT_QUOTES, 'UTF-8');
    $l = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    $html = '<!doctype html><html lang="ro"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:#F2F6FC;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F6FC;padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(11,46,92,.10)">'
        . '<tr><td style="background:#14509D;padding:20px 24px;color:#fff;font-size:19px;font-weight:700">Lista de cumpărături</td></tr>'
        . '<tr><td style="padding:24px">'
        . '<p style="margin:0 0 14px;font-size:16px;color:#0E1B2C">' . $n . ',</p>'
        . '<p style="margin:0 0 18px;font-size:16px;color:#0E1B2C;line-height:1.55">Ai cerut o parolă nouă. Apasă butonul de mai jos și alege-ți parola. Linkul e valabil <b>o oră</b> și poate fi folosit o singură dată.</p>'
        . '<p style="margin:0 0 20px"><a href="' . $l . '" style="display:inline-block;background:#1B65C0;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 24px;border-radius:12px">Îmi aleg o parolă nouă</a></p>'
        . '<p style="margin:0 0 6px;font-size:13.5px;color:#5A6B80">Dacă butonul nu merge, copiază adresa:</p>'
        . '<p style="margin:0 0 18px;font-size:13px;color:#1B65C0;word-break:break-all">' . $l . '</p>'
        . '<p style="margin:0;font-size:14px;color:#5A6B80;line-height:1.5">Dacă nu tu ai cerut schimbarea parolei, ignoră mesajul: parola rămâne neschimbată.</p>'
        . '</td></tr>'
        . '<tr><td style="padding:14px 24px;background:#F7FAFF;color:#8494A7;font-size:12.5px">Mesaj automat, nu răspunde la el.</td></tr>'
        . '</table></td></tr></table></body></html>';

    $text = ($nume !== '' ? $nume : 'Salut') . ",\r\n\r\n"
        . "Ai cerut o parolă nouă pentru Lista de cumpărături.\r\n"
        . "Deschide adresa de mai jos și alege-ți parola (valabilă o oră, o singură dată):\r\n\r\n"
        . $link . "\r\n\r\n"
        . "Dacă nu tu ai cerut schimbarea parolei, ignoră mesajul.\r\n";

    return [$html, $text];
}
