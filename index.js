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

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  console.log(sessionID);
  if (sessionID) {
    // find existing session
    const session = sessionStore.findSession(sessionID);
    console.log(session);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = socket.id;
      socket.username = session.username;
      return next();
    }
  }

  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  // create new session
  socket.sessionID = randomId();
  socket.userID = socket.id;
  socket.username = username;
  next();
});

io.on("connection", (socket) => {
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  socket.on("createroom", (roomID) => {
    socket.join(roomID);
    console.log(`room ${roomID} was created`);
  });

  // socket.on("joinroom", (roomID) => {
  //   socket.join(roomID);

  //   io.of("/").adapter.on("join-room", (room, id) => {
  //     console.log(`socket ${id} has joined room ${room}`);
  //     console.log(io.of("/").adapter.rooms);
  //   });
  // });

  // const rooms = io.of("/").adapter.rooms;
  // const sids = io.of("/").adapter.sids;

  // console.log(rooms, sids);

  // const users = [];
  // for (let [id, socket] of io.of("/").sockets) {
  //   users.push({
  //     userID: id,
  //     username: socket.username,
  //   });
  // }
  // socket.emit("users", users);

  const users = [];
  const sessions = sessionStore.findAllSessions();
  sessions.forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
    });
  });
  socket.emit("users", users);

  socket.broadcast.emit("user connected", {
    userID: socket.id,
    username: socket.username,
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user disconnected", {
      userID: socket.id,
    });

    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: false,
    });
  });
});

server.listen(3001, () => console.log("Server Listening"));
