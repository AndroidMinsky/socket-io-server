const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const {
  saveSession,
  findSession,
  deleteSession,
  getUsers,
  getRooms,
} = require("./sessionStore");
const {
  saveGame,
  getGame,
  deletePlayer,
  startGame,
  enterWord,
  restartGame,
  endGame,
  nextGame,
} = require("./gameStore");

io.use((socket, next) => {
  // find existing session
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      socket.room = session.room;
      socket.admin = session.admin;
      return next();
    }
  }

  // create new session
  const username = socket.handshake.auth.username;
  const room = socket.handshake.auth.room;
  const admin = socket.handshake.auth.admin;
  if (!username) {
    const err = new Error("no username");
    next(err);
    return;
  }
  if (!room) {
    const err = new Error("no room ID");
    next(err);
    return;
  }
  const rooms = getRooms();
  if (admin || rooms.includes(room)) {
    socket.sessionID = randomId();
    socket.userID = randomId();
    socket.username = username;
    socket.room = room;
    socket.admin = admin;
    next();
  } else {
    const err = new Error(`room ${room} ID doesn't exist`);
    next(err);
    return;
  }
  next();
});

io.on("connection", (socket) => {
  saveSession({
    sessionID: socket.sessionID,
    userID: socket.userID,
    username: socket.username,
    room: socket.room,
    admin: socket.admin,
  });

  socket.join(socket.room);

  saveGame({
    roomID: socket.room,
    players: getUsers(socket.room),
  });

  io.in(socket.room).emit("game", getGame(socket.room));

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // socket.broadcast.emit("user connected", {
  //   userID: socket.userID,
  //   username: socket.username,
  // });

  socket.on("start", (roomID) => {
    startGame(roomID);
    io.in(roomID).emit("game", getGame(roomID));
  });

  socket.on("restart", (roomID) => {
    restartGame(roomID);
    io.in(roomID).emit("game", getGame(roomID));
  });

  socket.on("end", (roomID) => {
    endGame(roomID);
    io.in(roomID).emit("game", getGame(roomID));
  });

  socket.on("next", (roomID) => {
    nextGame(roomID);
    io.in(roomID).emit("game", getGame(roomID));
  });

  socket.on("word", (gameData) => {
    enterWord(socket.room, gameData);
    io.in(socket.room).emit("game", getGame(socket.room));
  });

  socket.on("logoff", () => {
    deleteSession(socket.sessionID);
    deletePlayer(socket.room, socket.userID);
    io.in(socket.room).emit("game", getGame(socket.room));
  });
});

server.listen(3001, () => console.log("Server Listening"));
