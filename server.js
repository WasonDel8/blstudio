const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Decodifica la URL para manejar correctamente caracteres especiales como 'ñ' (%C3%B1)
    const decodedUrl = decodeURIComponent(req.url);

    // Construye la ruta del archivo. Si la URL es '/', sirve 'index.html'.
    // De lo contrario, usa la URL solicitada.
    let filePath = path.join(
        __dirname,
        'publico',
        decodedUrl === '/' ? 'index.html' : decodedUrl
    );

    // Obtiene la extensión del archivo.
    let extname = path.extname(filePath);

    // Si no hay extensión en la URL (ej: /shop), se le añade '.html'.
    if (!extname) {
        filePath += '.html';
    }

    // Determina el tipo de contenido (MIME type) basado en la extensión del archivo.
    let contentType = 'text/html'; // Valor por defecto
    switch (path.extname(filePath)) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
    }

    // Lee el archivo del sistema.
    fs.readFile(filePath, (err, content) => {
        if (err) {
            // Si hay un error, verifica si es porque el archivo no existe (ENOENT).
            if (err.code == 'ENOENT') {
                // Página no encontrada (404).
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404: Archivo no encontrado</h1>', 'utf-8');
            } else {
                // Otro tipo de error del servidor (500).
                res.writeHead(500);
                res.end(`Error del servidor: ${err.code}`);
            }
        } else {
            // Si el archivo se encuentra, sírvelo con el código de estado 200 (OK).
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// El servidor escuchará en el puerto 8080.
const PORT = 8080;

server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));