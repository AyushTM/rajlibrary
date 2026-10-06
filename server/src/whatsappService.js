const db = require('./db');
const { getMemberByPhone } = require('./memberService');
const { normalizeIndianPhoneNumber } = require('./phoneUtils');

function getFirstMessageFromPayload(payload) {
  if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
    return null;
  }

  for (const entry of payload.entry) {
    if (!entry || !Array.isArray(entry.changes)) {
      continue;
    }

    for (const change of entry.changes) {
      const value = change && change.value;
      if (!value || !Array.isArray(value.messages) || value.messages.length === 0) {
        continue;
      }

      const message = value.messages[0];
      if (!message || message.type !== 'text') {
        continue;
      }

      if (!message.from || !message.id) {
        continue;
      }

      const textBody = message.text && typeof message.text.body === 'string' ? message.text.body.trim() : '';
      if (!textBody) {
        continue;
      }

      return {
        from: message.from,
        id: message.id,
        type: message.type,
        textBody,
        timestamp: message.timestamp || null,
      };
    }
  }

  return null;
}

function parseIncomingTextCommand(rawText) {
  const text = String(rawText || '').trim().toLowerCase();

  if (!text) {
    return 'unknown';
  }

  if (['hi', 'hello', 'hey'].includes(text)) {
    return 'hi';
  }

  if (text.includes('details') || text.includes('membership')) {
    return 'details';
  }

  if (text === 'help' || text.includes('help')) {
    return 'help';
  }

  return 'unknown';
}

function buildLocalWhatsAppResponse({ member, messageText, command }) {
  const normalizedCommand = command || parseIncomingTextCommand(messageText);

  if (normalizedCommand === 'help') {
    return {
      type: 'help',
      message: 'Available commands: hi, hello, hey, details, membership, help',
    };
  }

  if (normalizedCommand === 'hi') {
    return {
      type: 'welcome',
      message: 'Welcome to Raj Digital Library. Reply with "details" or "membership" to see your membership information.',
    };
  }

  if (member) {
    return {
      type: 'membership_details',
      member: {
        name: member.fullName,
        membershipPlan: member.membershipPlan,
        membershipStartDate: member.membershipStartDate,
        membershipExpiryDate: member.membershipExpiryDate,
        assignedSeat: member.assignedSeat,
        status: member.status,
      },
    };
  }

  if (normalizedCommand === 'details' || normalizedCommand === 'unknown') {
    return {
      type: 'unregistered_member',
      message: 'This WhatsApp number is not registered with the library. Please contact the library desk.',
    };
  }

  return {
    type: 'help',
    message: 'Available commands: hi, hello, hey, details, membership, help',
  };
}

function logWhatsAppMessage({
  memberId = null,
  phoneNumber,
  messageType,
  direction,
  status,
  whatsappMessageId = null,
  sentAt = new Date().toISOString(),
}) {
  const normalizedPhone = normalizeIndianPhoneNumber(phoneNumber);

  const result = db.prepare(`
    INSERT INTO whatsapp_messages (
      member_id,
      phone_number,
      message_type,
      direction,
      status,
      whatsapp_message_id,
      sent_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    memberId,
    normalizedPhone || phoneNumber || null,
    messageType,
    direction,
    status,
    whatsappMessageId,
    sentAt,
  );

  return result.lastInsertRowid;
}

function findMemberFromWhatsApp(phoneNumber) {
  return getMemberByPhone(phoneNumber);
}

function extractIncomingTextMessage(payload) {
  return getFirstMessageFromPayload(payload);
}

function handleIncomingWhatsAppMessage(payload) {
  const message = extractIncomingTextMessage(payload);

  if (!message) {
    return {
      handled: false,
      reason: 'No supported incoming text message found',
    };
  }

  const normalizedPhone = normalizeIndianPhoneNumber(message.from) || message.from;
  const member = findMemberFromWhatsApp(normalizedPhone);
  const command = parseIncomingTextCommand(message.textBody);

  const logId = logWhatsAppMessage({
    memberId: member ? member.id : null,
    phoneNumber: normalizedPhone,
    messageType: message.type,
    direction: 'incoming',
    status: 'received',
    whatsappMessageId: message.id,
    sentAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
  });

  return {
    handled: true,
    message,
    member,
    command,
    response: buildLocalWhatsAppResponse({
      member,
      messageText: message.textBody,
      command,
    }),
    logId,
  };
}

function hasReminderBeenSent(memberId, messageType, date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const result = db.prepare(`
    SELECT id
    FROM whatsapp_messages
    WHERE member_id = ?
      AND message_type = ?
      AND direction = 'outgoing'
      AND sent_at >= ?
      AND sent_at < ?
      AND status != 'failed'
    LIMIT 1
  `).get(
    memberId,
    messageType,
    start.toISOString(),
    end.toISOString()
  );

  return Boolean(result);
}

module.exports = {
  logWhatsAppMessage,
  findMemberFromWhatsApp,
  hasReminderBeenSent,
  extractIncomingTextMessage,
  parseIncomingTextCommand,
  buildLocalWhatsAppResponse,
  handleIncomingWhatsAppMessage,
};