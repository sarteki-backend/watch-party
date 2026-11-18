const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        videoUrl: 'https://youtube.com',
        isPlaying: false,
        timestamp: 0,
        updatedAt: Date.now(),
        users: new Map(),
      });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { id: socket.id, username });

    let currentTimestamp = room.timestamp;
    if (room.isPlaying) {
      currentTimestamp += (Date.now() - room.updatedAt) / 1000;
    }

    socket.emit('sync_state', {
      videoUrl: room.videoUrl,
      isPlaying: room.isPlaying,
      timestamp: currentTimestamp,
    });

    io.to(roomId).emit('users_update', Array.from(room.users.values()));
  });

  socket.on('player_action', ({ roomId, action, timestamp, videoUrl }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.updatedAt = Date.now();

    switch (action) {
      case 'PLAY':
        room.isPlaying = true;
        room.timestamp = timestamp;
        break;
      case 'PAUSE':
        room.isPlaying = false;
        room.timestamp = timestamp;
        break;
      case 'SEEK':
        room.timestamp = timestamp;
        break;
      case 'CHANGE_URL':
        room.videoUrl = videoUrl;
        room.isPlaying = false;
        room.timestamp = 0;
        break;
    }

    socket.to(roomId).emit('player_sync', {
      action,
      timestamp: room.timestamp,
      videoUrl: room.videoUrl,
    });
  });

  socket.on('send_message', ({ roomId, username, text }) => {
    io.to(roomId).emit('receive_message', {
      id: Date.now().toString(),
      username,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.users.delete(socket.id);

        if (room.users.size === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('users_update', Array.from(room.users.values()));
        }
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`WebSocket сервер запущен на порту ${PORT}`);
});
