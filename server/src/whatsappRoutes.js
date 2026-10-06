const express = require('express');

const {
  findMemberFromWhatsApp,
  handleIncomingWhatsAppMessage,
} = require('./whatsappService');

const router = express.Router();

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    return res.status(200).send(String(challenge || ''));
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
});

router.post('/webhook', (req, res) => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(200).json({ success: true, ignored: true, reason: 'Malformed payload' });
    }

    const message = payload.entry && Array.isArray(payload.entry)
      ? payload.entry.flatMap((entry) => {
          const values = Array.isArray(entry?.changes) ? entry.changes : [];
          return values.map((change) => change && change.value ? change.value : null).filter(Boolean);
        })
      : [];

    const hasStatusOnly = message.some((item) => !item.messages && item.statuses);
    if (hasStatusOnly || !payload.entry || !Array.isArray(payload.entry)) {
      return res.status(200).json({ success: true, ignored: true, reason: 'Status or unrelated webhook event ignored' });
    }

    const result = handleIncomingWhatsAppMessage(payload);

    if (!result.handled) {
      return res.status(200).json({ success: true, ignored: true, reason: result.reason || 'No supported inbound message' });
    }

    return res.status(200).json({
      success: true,
      handled: true,
      response: result.response,
      memberFound: Boolean(result.member),
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return res.status(200).json({ success: true, ignored: true, reason: 'Webhook safely ignored due to malformed payload' });
  }
});

/*
 * Temporary local development endpoint.
 * Remove before production.
 */
router.get('/test/member/:phone', (req, res) => {
  try {
    const member = findMemberFromWhatsApp(req.params.phone);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'No member found with this WhatsApp number',
      });
    }

    return res.json({
      success: true,
      member: {
        id: member.id,
        fullName: member.fullName,
        mobileNumber: member.mobileNumber,
        membershipPlan: member.membershipPlan,
        membershipStartDate: member.membershipStartDate,
        membershipExpiryDate: member.membershipExpiryDate,
        assignedSeat: member.assignedSeat,
        status: member.status,
      },
    });
  } catch (error) {
    console.error('WhatsApp member lookup error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;