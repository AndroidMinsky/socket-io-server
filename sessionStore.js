const sessions = [];

const saveSession = (sessionData) => {
  const index = sessions.findIndex(
    (session) => session.sessionID === sessionData.sessionID
  );

  if (index === -1) {
    sessions.push(sessionData);
  } else {
    sessions.splice(index, 1, sessionData);
  }
};

const findSession = (sessionID) => {
  const session = sessions.find((session) => session.sessionID === sessionID);
  return session;
};

const deleteSession = (sessionID) => {
  const index = sessions.findIndex(
    (session) => session.sessionID === sessionID
  );
  if (index !== -1) sessions.splice(index, 1);
};

const getUsers = (room) => sessions.filter((session) => session.room === room);

module.exports = { saveSession, findSession, deleteSession, getUsers };
