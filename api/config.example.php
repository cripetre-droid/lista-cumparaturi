<?php
/**
 * Lista de cumparaturi - configurare server (romarg / cPanel).
 * Copiaza acest fisier ca "config.php" si completeaza datele reale.
 * config.php NU se urca in GitHub (vezi .gitignore).
 */

return [
    // --- baza de date MySQL din cPanel ---
    'db_host' => 'localhost',
    'db_name' => 'utilizat_lista',
    'db_user' => 'utilizat_lista',
    'db_pass' => 'PAROLA_AICI',

    // --- de unde are voie sa apeleze aplicatia (CORS) ---
    // Adauga aici exact originile pe care le folosesti.
    'allowed_origins' => [
        'https://vireo.ro',
        'https://www.vireo.ro',
        'https://USERGITHUB.github.io',
        'http://localhost:8080',
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
