const crypto = require('node:crypto');

const seedUsers = [
  { username: 'admin', password: 'admin123', role: 'admin' },
];

const sessions = new Map();

function createToken(username) {
  return crypto.randomBytes(24).toString('hex');
}

function login(username, password) {
  const user = seedUsers.find((entry) => entry.username === username && entry.password === password);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const token = createToken(username);
  sessions.set(token, { username: user.username, role: user.role });

  return {
    user: { username: user.username, role: user.role },
    token,
  };
}

function verifyToken(token) {
  if (!token) {
    return null;
  }

  const session = sessions.get(token);
  return session ? { username: session.username, role: session.role } : null;
}

module.exports = {
  login,
  verifyToken,
};
