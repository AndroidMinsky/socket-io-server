const games = [];

const saveGame = ({ roomID, players }) => {
  const index = games.findIndex((game) => game.roomID === roomID);

  if (index === -1) {
    games.push({
      roomID,
      players,
      activePlayer: players[0].userID,
      impostor: null,
      word: null,
      started: false,
    });
  } else {
    games.splice(index, 1, { ...games[index], players });
  }
};

const getGame = (roomID) => games.filter((game) => game.roomID === roomID)[0];

const startGame = (roomID) => {
  const game = getGame(roomID);
  game.started = true;
};

const restartGame = (roomID) => {
  const game = getGame(roomID);
  game.word = null;
  game.impostor = null;
};

const endGame = (roomID) => {
  const game = getGame(roomID);
  game.started = false;
};

const nextGame = (roomID) => {
  const game = getGame(roomID);
  game.started = true;
  game.word = null;
  game.impostor = null;
  let index = game.players.findIndex(
    (player) => player.userID === game.activePlayer
  );
  index++;
  if (index < game.players.length) {
    game.activePlayer = game.players[index].userID;
  } else {
    game.activePlayer = game.players[0].userID;
  }
};

const enterWord = (roomID, gameData) => {
  const game = getGame(roomID);
  game.word = gameData.word;
  game.impostor = gameData.impostor.userID;
};

const deletePlayer = (roomID, playerID) => {
  const game = games.find((game) => game.roomID === roomID);
  const index = game.players.findIndex((player) => player.userID === playerID);
  if (index !== -1) game.players.splice(index, 1);
};

module.exports = {
  saveGame,
  getGame,
  deletePlayer,
  startGame,
  enterWord,
  restartGame,
  endGame,
  nextGame,
};