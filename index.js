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
    return next(new Error("invalid username"));
  }
  if (!room) {
    return next(new Error("invalid room ID"));
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
    return next(new Error("room ID doesn't exist"));
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

  io.in(socket.room).emit("users", getUsers(socket.room));

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // socket.broadcast.emit("user connected", {
  //   userID: socket.userID,
  //   username: socket.username,
  // });

  socket.on("logoff", () => {
    deleteSession(socket.sessionID);
    io.in(socket.room).emit("users", getUsers(socket.room));
  });
});

server.listen(3001, () => console.log("Server Listening"));
