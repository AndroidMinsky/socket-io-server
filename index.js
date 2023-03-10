const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: ["https://socket-io-seven.vercel.app", "http://localhost:3000"],
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
  deleteGame,
  changeActive,
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
      socket.avatar = session.avatar;
      return next();
    }
  }

  // create new session
  const username = socket.handshake.auth.username;
  const room = socket.handshake.auth.room;
  const admin = socket.handshake.auth.admin;
  const avatar = socket.handshake.auth.avatar;
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
    socket.avatar = avatar;
    next();
  } else {
    const err = new Error(`Room "${room}" doesn't exist`);
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
    avatar: socket.avatar,
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

  socket.on("change-active", (userID) => {
    changeActive(socket.room, userID);
    io.in(socket.room).emit("game", getGame(socket.room));
  });

  // socket.on("logoff", () => {
  //   deleteSession(socket.sessionID);
  //   if (socket.admin) {
  //     deleteGame(socket.room);
  //     io.in(socket.room).emit("admin-left");
  //   } else {
  //     const game = getGame(socket.room);
  //     if (game) {
  //       deletePlayer(socket.room, socket.userID);
  //       io.in(socket.room).emit("game", getGame(socket.room));
  //     }
  //   }
  // });

  // socket.on("logoff", (hero) => {
  //   if (hero) {
  //     deleteSession(hero.sessionID);
  //     if (hero.admin) {
  //       deleteGame(hero.room);
  //       io.in(hero.room).emit("admin-left");
  //     } else {
  //       const game = getGame(hero.room);
  //       if (game) {
  //         deletePlayer(hero.room, hero.userID);
  //         io.in(socket.room).emit("game", getGame(socket.room));
  //       }
  //     }
  //   }
  // });

  socket.on("disconnect", (reason) => {
    if (reason === "client namespace disconnect") {
      deleteSession(socket.sessionID);
      if (socket.admin) {
        deleteGame(socket.room);
        io.in(socket.room).emit("admin-left");
      } else {
        const game = getGame(socket.room);
        if (game) {
          deletePlayer(socket.room, socket.userID);
          io.in(socket.room).emit("game", getGame(socket.room));
        }
      }
    }
  });
});

server.listen(3001, () => console.log("Server Listening"));
