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

// Barre filas completas del tablero y devuelve cuántas se eliminaron
function arenaSweep(arena) {
    let linesCleared = 0;
    for (let y = arena.length - 1; y >= 0; --y) {
        // Si ninguna celda de esta fila es 0, está completa
        if (arena[y].every(cell => cell !== 0)) {
            arena.splice(y, 1);          // eliminar fila completa
            arena.unshift(new Array(arena[0].length).fill(0)); // agregar fila vacía arriba
            linesCleared++;
            ++y; // revisa la misma posición de nuevo (bajó una)
        }
    }
    console.log('arenaSweep: líneas eliminadas =', linesCleared);
    return linesCleared;
}

io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    // agregar jugador, ahora con pos y matrix vacíos inicialmente
    players.push({ id: socket.id, score: 0, pos: { x: 0, y: 0 }, matrix: null });
    // informar lista de jugadores a todos enviando todos los datos
    io.emit('players', players);

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
        console.log('recibido tablero de', socket.id);
        arena = newArena;

        // El servidor es quien hace el sweep para evitar condiciones de carrera
        const linesCleared = arenaSweep(arena);

        // Enviar el tablero autorizado (ya con filas eliminadas) a todos
        io.emit('updateBoard', arena);

        // Si se eliminaron líneas, notificar al jugador que las completó
        if (linesCleared > 0) {
            console.log('notificando', linesCleared, 'línea(s) eliminada(s) a', socket.id);
            io.to(socket.id).emit('linesCleared', linesCleared);
        }

        // emitir una pieza distinta para cada jugador con medio segundo de diferencia
        players.forEach((p, idx) => {
            const piece = randomPiece();
            setTimeout(() => {
                io.to(p.id).emit('newPiece', piece);
            }, idx * 500);
        });
    });

    socket.on('playerState', (state) => {
        const p = players.find(p => p.id === socket.id);
        if (p) {
            p.pos = state.pos;
            p.matrix = state.matrix;
            // Retransmitir a los otros jugadores
            socket.broadcast.emit('playerUpdate', p);
        }
    });

    socket.on('updateScore', (score) => {
        const p = players.find(p => p.id === socket.id);
        if (p) {
            p.score = score;
            io.emit('players', players);
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado', socket.id);
        const idx = players.findIndex(p => p.id === socket.id);
        if (idx !== -1) {
            players.splice(idx, 1);
            io.emit('players', players);
        }
    });
});

// Escuchar en el puerto provisto por el entorno (Render define `PORT`).
// En producción no forzamos un host; Node escuchará en todas las interfaces.
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});