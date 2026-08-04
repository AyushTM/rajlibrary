const assert = require('node:assert/strict');
const { login } = require('../src/authService');

function run() {
  const result = login('admin', 'admin123');

  assert.equal(result.user.username, 'admin');
  assert.ok(result.token, 'Expected a token to be issued');

  console.log('auth.test.js passed');
}

run();
