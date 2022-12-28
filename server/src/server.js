const cors = require('cors');
const { instrument } = require('@socket.io/admin-ui');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'https://admin.socket.io'],
    credentials: true,
  },
});

app.use(express.json());
app.use(cors());

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const userIo = io.of('/user');

userIo.on('connection', socket => {
  console.log(`connected to user namespace with username ${socket.username}`);

  socket.on('disconnect', reason => {
    console.log(
      `disconnected to user namespace with username ${socket.username}`
    );
  });
});

userIo.use((socket, next) => {
  if (socket.handshake.auth.token) {
    socket.username = getUsernameFromToken(socket.handshake.auth.token);
    next();
    return;
  }
  next(new Error('Please send token'));
});

function getUsernameFromToken(token) {
  return token;
}

io.on('connection', socket => {
  console.log(`user ${socket.id} connected`);
  socket.broadcast.emit('user-connected', `user ${socket.id} connected`);

  // socket.on('custom-event', (number, string, obj) => {
  //   console.log(number, string, obj);
  // });

  socket.on('send-message', (message, room) => {
    if (room === '') {
      socket.broadcast.emit('receive-message', `${socket.id}: ${message}`);
      // console.log(message);
      return;
    }
    socket.to(room).emit('receive-message', `${socket.id}: ${message}`);
  });

  socket.on('join-room', (room, callback) => {
    socket.join(room);
    callback(`Joined ${room}`);
  });

  socket.on('ping', count => {
    console.log(count);
  });

  socket.on('disconnect', reason => {
    console.log(`user ${socket.id} disconnected, reason ${reason}`);
    socket.broadcast.emit(
      'user-disconnected',
      `user ${socket.id} disconnected`
    );
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

instrument(io, {
  auth: false,
});
