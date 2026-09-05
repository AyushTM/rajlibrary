const db = require('./db');

function resetAllData() {
  db.exec('DELETE FROM payments');
  db.exec('DELETE FROM renewals');
  db.exec('DELETE FROM members');
  db.exec('DELETE FROM sqlite_sequence WHERE name IN (\'members\', \'renewals\', \'payments\')');
  return { status: 'ok' };
}

module.exports = { resetAllData };
