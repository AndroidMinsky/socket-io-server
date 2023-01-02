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

const deletePlayer = (roomID, playerID) => {
  const game = games.find((game) => game.roomID === roomID);
  const index = game.players.findIndex((player) => player.userID === playerID);
  if (index !== -1) game.players.splice(index, 1);
};

module.exports = {
  saveGame,
  getGame,
  deletePlayer,
};
