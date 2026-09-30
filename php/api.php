<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

function json_out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function db() {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    return $pdo;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Lista blanca de referentes
const REFERENTES = [
    'Alejandro Torres Peñaloza',
    'Pecho Vallejos Gunar',
    'Wilfredo Paredes Mollo',
    'Juan Vallejos Becerra',
    'Olarte Bascope Alex',
    'Brayan Guevara Torrico',
    'Jose Raul Chambi Ramos',
    'Alexander Jr Mejias Joel',
    'Kevin Yamil Rojas',
];

// Dominios de correo reconocidos
const DOMINIOS_EMAIL = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'yahoo.com', 'yahoo.es', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'gmx.com', 'mail.com',
    'hey.com', 'yandex.com', 'fastmail.com', 'hushmail.com', 'inbox.com',
    'hotmail.es', 'outlook.es', 'live.es', 'edu.pe', 'gmail.com.pe',
];

try {
    $pdo = db();

    // ===== Listar registros =====
    if ($method === 'GET' && $action === 'list') {
        $rows = $pdo->query('SELECT * FROM registros ORDER BY fecha_registro DESC')->fetchAll();
        json_out(['success' => true, 'data' => $rows]);
    }

    // ===== Crear registro (la Ficha N° se asigna automáticamente) =====
    if ($method === 'POST' && $action === 'create') {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];

        $nombre    = trim($in['nombre'] ?? '');
        $celular   = trim($in['celular'] ?? '');
        $email     = trim($in['email'] ?? '');
        $referente = trim($in['referente'] ?? '');

        $errors = [];

        if ($nombre === '') {
            $errors['nombre'] = 'Nombre es obligatorio';
        } elseif (!preg_match("/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{2,120}$/u", $nombre)) {
            $errors['nombre'] = 'Solo letras y espacios (mín. 2)';
        }

        if ($celular === '') {
            $errors['celular'] = 'Celular es obligatorio';
        } elseif (!preg_match('/^[0-9+\s-]{7,25}$/', $celular) || preg_match('/[A-Za-z]/', $celular)) {
            $errors['celular'] = 'Solo números (ej: 987654321)';
        }

        if ($email === '') {
            $errors['email'] = 'Email es obligatorio';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Email no válido';
        } else {
            $dominio = strtolower(substr(strrchr($email, '@'), 1));
            if (!in_array($dominio, DOMINIOS_EMAIL, true)) {
                $errors['email'] = 'Usa un correo válido (Gmail, Hotmail, Outlook, Yahoo, etc.)';
            }
        }

        if ($referente === '') {
            $errors['referente'] = 'Selecciona un referente';
        } elseif (!in_array($referente, REFERENTES, true)) {
            $errors['referente'] = 'Referente no válido';
        }

        if ($errors) json_out(['success' => false, 'errors' => $errors], 422);

        try {
            $pdo->beginTransaction();

            // Temporal único; se reemplaza por la ficha definitiva (0001, 0002, ...)
            $tmp = 'TMP-' . bin2hex(random_bytes(8));
            $stmt = $pdo->prepare(
                'INSERT INTO registros (ficha_nro, nombre, celular, email, referente) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$tmp, $nombre, $celular, $email, $referente]);

            $id = (int)$pdo->lastInsertId();
            $ficha = str_pad((string)$id, 4, '0', STR_PAD_LEFT);
            $pdo->prepare('UPDATE registros SET ficha_nro = ? WHERE id = ?')->execute([$ficha, $id]);

            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($e->getCode() == 23000) {
                json_out(['success' => false, 'errors' => ['ficha_nro' => 'No se pudo asignar la ficha, intenta de nuevo']], 409);
            }
            throw $e;
        }

        json_out(['success' => true, 'id' => $id, 'ficha_nro' => $ficha, 'message' => 'Registro guardado. Ficha N° ' . $ficha], 201);
    }

    // ===== Obtener 1 registro =====
    if ($method === 'GET' && $action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('SELECT * FROM registros WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_out(['success' => false, 'message' => 'Registro no encontrado'], 404);
        json_out(['success' => true, 'data' => $row]);
    }

    // ===== Eliminar registro =====
    if ($method === 'POST' && $action === 'delete') {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = (int)($in['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM registros WHERE id = ?');
        $stmt->execute([$id]);
        json_out(['success' => $stmt->rowCount() > 0, 'message' => 'Registro eliminado']);
    }

    json_out(['success' => false, 'message' => 'Acción no válida'], 400);
} catch (Throwable $e) {
    json_out(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()], 500);
}
