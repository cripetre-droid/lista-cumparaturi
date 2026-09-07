<?php
/**
 * Verificare rapida a gazduirii, INAINTE de instalare.
 * Scris intentionat in sintaxa PHP veche, ca sa poata rula si pe PHP 5,
 * si sa poata spune ca versiunea e prea veche.
 *
 *   https://lista.vireo.ro/api/verifica.php
 *
 * Nu afiseaza niciodata parola bazei de date. Se sterge dupa instalare,
 * la fel ca install.php.
 */

header('Content-Type: text/html; charset=utf-8');

$MINIM = '7.1';
$probleme = array();
$randuri  = array();

function rand_html($eticheta, $valoare, $stare) {
    $culori = array('ok' => '#1E8E63', 'rau' => '#C8384A', 'info' => '#14509D');
    $semne  = array('ok' => 'OK', 'rau' => 'PROBLEMA', 'info' => '-');
    return '<tr><td>' . htmlspecialchars($eticheta) . '</td><td><b>' . htmlspecialchars($valoare)
        . '</b></td><td style="color:' . $culori[$stare] . '">' . $semne[$stare] . '</td></tr>';
}

/* ---- versiunea PHP ---- */
$vers = PHP_VERSION;
$verOk = version_compare($vers, $MINIM, '>=');
$randuri[] = rand_html('Versiunea PHP', $vers, $verOk ? 'ok' : 'rau');
if (!$verOk) {
    $probleme[] = 'Aplicatia are nevoie de PHP ' . $MINIM . ' sau mai nou (ideal 8.x). '
        . 'In cPanel: <b>MultiPHP Manager</b> &rarr; bifezi <b>lista.vireo.ro</b> &rarr; alegi <b>PHP 8.2</b> (sau 8.1/8.3) &rarr; Apply.';
}

/* ---- extensii ---- */
$necesare = array(
    'pdo'       => 'obligatorie (legatura cu baza de date)',
    'pdo_mysql' => 'obligatorie (MySQL)',
    'json'      => 'obligatorie',
);
foreach ($necesare as $ext => $rol) {
    $are = extension_loaded($ext);
    $randuri[] = rand_html('Extensia ' . $ext, $are ? 'activa' : 'lipseste', $are ? 'ok' : 'rau');
    if (!$are) {
        $probleme[] = 'Lipseste extensia <b>' . $ext . '</b> (' . $rol . '). In cPanel: <b>Select PHP Version &rarr; Extensions</b>.';
    }
}
$randuri[] = rand_html('Extensia mbstring', extension_loaded('mbstring') ? 'activa' : 'lipseste (avem inlocuitor)',
    extension_loaded('mbstring') ? 'ok' : 'info');

/* ---- unde e configurarea ---- */
$cai = array(
    dirname(dirname(dirname(__FILE__))) . '/lista-config.php',
    dirname(__FILE__) . '/config.php',
);
$config = null;
$caleConfig = '';
foreach ($cai as $cale) {
    if (file_exists($cale)) {
        $caleConfig = $cale;
        $config = include $cale;
        break;
    }
}
$randuri[] = rand_html('Fisierul de configurare', $caleConfig ? $caleConfig : 'negasit', $caleConfig ? 'ok' : 'rau');
if (!$caleConfig) {
    $probleme[] = 'Nu gasesc configurarea. Trebuie sa fie la <b>/home/rvir1227/lista-config.php</b> '
        . '(un etaj deasupra folderului lista) sau la <b>lista/api/config.php</b>.';
}

/* ---- baza de date ---- */
if (is_array($config)) {
    $randuri[] = rand_html('Baza de date (din configurare)', $config['db_name'], 'info');
    $randuri[] = rand_html('Utilizator MySQL', $config['db_user'], 'info');
    if (extension_loaded('pdo_mysql')) {
        try {
            $pdo = new PDO(
                'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4',
                $config['db_user'],
                $config['db_pass']
            );
            $randuri[] = rand_html('Conectarea la baza de date', 'reusita', 'ok');

            $tabele = array();
            $q = $pdo->query('SHOW TABLES');
            while ($r = $q->fetch(PDO::FETCH_NUM)) { $tabele[] = $r[0]; }
            $randuri[] = rand_html('Tabele existente', $tabele ? implode(', ', $tabele) : 'niciunul (normal inainte de instalare)', 'info');
        } catch (Exception $e) {
            $randuri[] = rand_html('Conectarea la baza de date', 'esuata', 'rau');
            $probleme[] = 'Nu ma pot conecta la baza de date: <b>' . htmlspecialchars($e->getMessage()) . '</b><br>'
                . 'Verifica numele bazei, utilizatorul si parola din configurare, si daca utilizatorul e adaugat la baza cu ALL PRIVILEGES.';
        }
    }
}

/* ---- afisare ---- */
$gata = count($probleme) === 0;
?><!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verificare server - Lista de cumparaturi</title>
<style>
  body { font-family: system-ui, Arial, sans-serif; margin: 0; padding: 24px; background: #F2F6FC; color: #0E1B2C; }
  .card { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 14px; padding: 22px 24px; box-shadow: 0 2px 12px rgba(11,46,92,.12); }
  h1 { font-size: 20px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  td { padding: 9px 6px; border-bottom: 1px solid #DDE7F3; vertical-align: top; }
  td:last-child { text-align: right; white-space: nowrap; font-weight: 600; }
  .concluzie { margin-top: 18px; padding: 14px 16px; border-radius: 10px; line-height: 1.55; }
  .bine { background: #E4F5EC; color: #14603F; }
  .rau  { background: #FBE9EC; color: #8E2233; }
  .rau ul { margin: 8px 0 0; padding-left: 20px; }
  .rau li { margin-bottom: 8px; }
  code { background: #EEF5FF; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<div class="card">
  <h1>Verificare server &mdash; Lista de cumpărături</h1>
  <table><?php echo implode("\n", $randuri); ?></table>

  <?php if ($gata) { ?>
    <div class="concluzie bine">
      <b>Totul e în regulă.</b> Poți rula instalarea:<br>
      <code>https://lista.vireo.ro/api/install.php?key=CHEIA_DIN_CONFIGURARE</code><br>
      După instalare, șterge de pe server <b>install.php</b> și <b>verifica.php</b>.
    </div>
  <?php } else { ?>
    <div class="concluzie rau">
      <b>De rezolvat înainte de instalare:</b>
      <ul><?php foreach ($probleme as $p) { echo '<li>' . $p . '</li>'; } ?></ul>
    </div>
  <?php } ?>
</div>
</body>
</html>
