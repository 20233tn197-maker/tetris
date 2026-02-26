const express = require('express');
const app = express();
const http = require('http').createServer(app);
// Permitir CORS amplio para evitar problemas si clientes se conectan desde otro origen
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});
const path = require('path');

// Servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Estado compartido del juego
let players = [];            // [{id, score}]
let arena = createMatrix(12, 20);
let currentPiece = null;   // pieza global para referencia opcional

function createMatrix(w, h) {
    const matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function randomPiece() {
    const pieces = 'ILJOTSZ';
    return pieces[(pieces.length * Math.random()) | 0];
}

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    // agregar jugador
    players.push({ id: socket.id, score: 0 });
    // informar lista de jugadores a todos
    io.emit('players', players.map(p => ({ id: p.id, score: p.score })));

    // si no hay pieza actual, primera conexión o reinicio
    if (!currentPiece) {
        arena = createMatrix(12, 20);
        currentPiece = randomPiece();
        console.log('iniciando nuevo juego, pieza inicial', currentPiece);
        io.emit('newPiece', currentPiece);
        io.emit('gameStart');
        io.emit('updateBoard', arena);
    } else {
        // sincronizar al nuevo jugador
        socket.emit('updateBoard', arena);
        console.log('enviando pieza actual a nuevo jugador', currentPiece);
        socket.emit('newPiece', currentPiece);
    }

    socket.on('updateBoard', (newArena) => {
        console.log('recibido tablero de', socket.id, 'filas:', Array.isArray(newArena) ? newArena.length : typeof newArena);
        arena = newArena;
        io.emit('updateBoard', arena);
        // emitir una pieza distinta para cada jugador con medio segundo de diferencia
        players.forEach((p, idx) => {
            const piece = randomPiece();
            console.log('programando envío de', piece, 'a', p.id, 'en', idx * 500, 'ms');
            setTimeout(() => {
                io.to(p.id).emit('newPiece', piece);
            }, idx * 500);
        });
    });

    socket.on('updateScore', (score) => {
        const p = players.find(p => p.id === socket.id);
        if (p) {
            p.score = score;
            io.emit('players', players.map(p => ({ id: p.id, score: p.score })));
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado', socket.id);
        const idx = players.findIndex(p => p.id === socket.id);
        if (idx !== -1) {
            players.splice(idx, 1);
            io.emit('players', players.map(p => ({ id: p.id, score: p.score })));
        }
    });
});

// Escuchar en el puerto provisto por el entorno (Render define `PORT`).
// En producción no forzamos un host; Node escuchará en todas las interfaces.
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});