const assert = require('node:assert/strict');
const {
  extractIncomingTextMessage,
  parseIncomingTextCommand,
  buildLocalWhatsAppResponse,
} = require('../src/whatsappService');

function run() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15551234567' },
          contacts: [{ profile: { name: 'Ayush Tomar' }, wa_id: '919425669624' }],
          messages: [{
            from: '919425669624',
            id: 'wamid.HBgMOTQxMzQ1NjY5NjI0FQIAEhQxMDEwNTE2ODI0Njk2MjM5NwA=',
            timestamp: '1725600000',
            type: 'text',
            text: { body: 'details' },
          }],
        },
      }],
    }],
  };

  const message = extractIncomingTextMessage(payload);
  assert.ok(message, 'Expected a valid incoming message to be extracted');
  assert.equal(message.from, '919425669624');
  assert.equal(message.type, 'text');
  assert.equal(message.textBody, 'details');
  assert.equal(parseIncomingTextCommand(' My Details '), 'details');
  assert.equal(parseIncomingTextCommand('HELLO'), 'hi');
  assert.equal(parseIncomingTextCommand('help me'), 'help');

  const response = buildLocalWhatsAppResponse({
    member: {
      fullName: 'Ayush Tomar',
      membershipPlan: 'Monthly',
      membershipStartDate: '2026-08-04',
      membershipExpiryDate: '2026-09-03',
      assignedSeat: null,
      status: 'Expired',
    },
    messageText: 'details',
  });

  assert.equal(response.type, 'membership_details');
  assert.equal(response.member.name, 'Ayush Tomar');
  assert.equal(response.member.status, 'Expired');

  console.log('whatsappWebhook.test.js passed');
}

run();
