<?php
/**
 * Lista de cumparaturi - configurare server (romarg / cPanel).
 *
 * UNDE SE PUNE (in ordinea in care il cauta aplicatia):
 *   1. /home/rvir1227/lista-config.php   <- RECOMANDAT: deasupra folderului public,
 *                                           deci Apache nu-l poate servi in niciun caz;
 *   2. .../lista/api/config.php          <- merge si asa (e blocat din api/.htaccess),
 *                                           dar protectia depinde de PHP si de .htaccess.
 *
 * Copiaza acest fisier la una dintre caile de mai sus si completeaza datele reale.
 * Fisierul cu parole NU se urca in GitHub (vezi .gitignore).
 */

return [
    // --- baza de date MySQL din cPanel ---
    'db_host' => 'localhost',
    'db_name' => 'rvir1227_lista',
    'db_user' => 'rvir1227_lista',
    'db_pass' => 'PAROLA_AICI',

    // --- de unde are voie sa apeleze aplicatia (CORS) ---
    // Adauga aici exact originile pe care le folosesti.
    'allowed_origins' => [
        'https://lista.vireo.ro',
        'https://cripetre-droid.github.io',
        'http://localhost:8787',
    ],

    // --- inregistrare conturi noi ---
    // true  = oricine poate crea cont (lasa-l true doar cat isi fac ai tai conturile)
    // false = inregistrarile sunt oprite
    'allow_signup' => true,
    // Daca vrei sa lasi signup deschis dar protejat, pune aici un cod;
    // gol = fara cod. Codul se cere la inregistrare.
    'signup_code' => '',

    // --- cheie pentru install.php (creare tabele). Schimb-o si sterge install.php dupa instalare ---
    'install_key' => 'schimba-cheia-asta',
];
