const assert = require('assert');
const EventEmitter = require('events');
const {
  dispatchWishMessage,
  extractMessageId
} = require('../src/services/whatsappClient');

async function runTests() {
  console.log('==========================================');
  console.log('WishSync WhatsApp Single-Send Test Suite');
  console.log('==========================================');

  // 1. Image + caption sends exactly one media message
  {
    const calls = [];
    const fakeClient = {
      async sendMessage(chatId, content, options) {
        calls.push({ chatId, content, options });
        return { id: { _serialized: 'true_94779147251@c.us_ABC123' } };
      }
    };
    const fakeMedia = { mimetype: 'image/jpeg', data: 'base64data' };
    const res = await dispatchWishMessage(fakeClient, '94779147251@c.us', 'Happy Birthday!', {
      isImageEnabled: true,
      media: fakeMedia,
      filePath: 'birthday-card.jpeg'
    });

    assert.strictEqual(calls.length, 1, 'Expected exactly one client.sendMessage call');
    assert.strictEqual(calls[0].content, fakeMedia);
    assert.strictEqual(calls[0].options.caption, 'Happy Birthday!');
    assert.strictEqual(calls[0].options.sendSeen, false);
    assert.strictEqual(res.usedImage, true);
    assert.strictEqual(extractMessageId(res.sentMsg), 'true_94779147251@c.us_ABC123');
    console.log('  ✓ Image + caption dispatches exactly 1 WhatsApp message');
  }

  // 2. Partial Message object without .id still extracts an ID and sends only once
  {
    const calls = [];
    const fakeClient = {
      async sendMessage(chatId, content, options) {
        calls.push({ chatId, content, options });
        return { ack: 1 };
      }
    };
    const fakeMedia = { mimetype: 'image/jpeg', data: 'base64data' };
    const res = await dispatchWishMessage(fakeClient, '94779147251@c.us', 'Happy Birthday!', {
      isImageEnabled: true,
      media: fakeMedia,
      filePath: 'birthday-card.jpeg'
    });

    assert.strictEqual(calls.length, 1, 'Must never send a fallback text message');
    assert.strictEqual(res.usedImage, true);
    assert.ok(extractMessageId(res.sentMsg), 'Should produce a fallback serialized ID when .id is absent');
    console.log('  ✓ Minimal Message object without .id does not trigger text fallback');
  }

  // 3. Post-send throw does NOT fall back to a duplicate plain-text message
  {
    const calls = [];
    const fakeClient = {
      async sendMessage(chatId, content, options) {
        calls.push({ chatId, content, options });
        throw new Error('Evaluation failed: getMessageModel');
      }
    };
    const fakeMedia = { mimetype: 'image/jpeg', data: 'base64data' };

    await assert.rejects(
      () => dispatchWishMessage(fakeClient, '94779147251@c.us', 'Happy Birthday!', {
        isImageEnabled: true,
        media: fakeMedia,
        filePath: 'birthday-card.jpeg'
      }),
      /Evaluation failed: getMessageModel/
    );
    assert.strictEqual(calls.length, 1, 'Must NEVER send plain-text after image send failed/threw');
    assert.strictEqual(calls[0].content, fakeMedia);
    console.log('  ✓ Thrown error during image send never sends a duplicate plain-text message');
  }

  // 4. Plain text sends once when greeting image is explicitly disabled
  {
    const calls = [];
    const fakeClient = {
      async sendMessage(chatId, content, options) {
        calls.push({ chatId, content, options });
        return { id: 'msg-text-1' };
      }
    };
    const res = await dispatchWishMessage(fakeClient, '94779147251@c.us', 'Happy Birthday!', {
      isImageEnabled: false,
      media: null,
      filePath: null
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].content, 'Happy Birthday!');
    assert.strictEqual(calls[0].options.sendSeen, false);
    assert.strictEqual(res.usedImage, false);
    assert.strictEqual(extractMessageId(res.sentMsg), 'msg-text-1');
    console.log('  ✓ Disabled image config dispatches plain text once');
  }

  // 5. Undefined return from sendMessage recovers via message_create event (no false error toast)
  {
    const fakeClient = new EventEmitter();
    let calls = 0;
    fakeClient.sendMessage = async (chatId) => {
      calls++;
      fakeClient.emit('message_create', {
        fromMe: true,
        to: chatId,
        id: { _serialized: 'true_94770114407@c.us_EVT1' }
      });
      return undefined;
    };
    const res = await dispatchWishMessage(fakeClient, '94770114407@c.us', 'Happy Birthday!', {
      isImageEnabled: true,
      media: { mimetype: 'image/jpeg', data: 'base64data' },
      filePath: 'birthday-card.jpeg'
    });

    assert.strictEqual(calls, 1);
    assert.strictEqual(extractMessageId(res.sentMsg), 'true_94770114407@c.us_EVT1');
    console.log('  ✓ Undefined sendMessage return recovered via message_create event');
  }

  // 6. Undefined return from sendMessage recovers via pupPage outgoing store check
  {
    let calls = 0;
    const fakeClient = {
      pupPage: {
        async evaluate() {
          return { chatFound: true, confirmed: true, messageId: 'true_94770114407@c.us_DOM1' };
        }
      },
      async sendMessage() {
        calls++;
        return undefined;
      }
    };
    const res = await dispatchWishMessage(fakeClient, '94770114407@c.us', 'Happy Birthday!', {
      isImageEnabled: true,
      media: { mimetype: 'image/jpeg', data: 'base64data' },
      filePath: 'birthday-card.jpeg'
    });

    assert.strictEqual(calls, 1);
    assert.strictEqual(extractMessageId(res.sentMsg), 'true_94770114407@c.us_DOM1');
    console.log('  ✓ Undefined sendMessage return recovered via pupPage verification');
  }

  // 7. Undefined return when chat truly does not exist still leaves sentMsg null
  {
    const fakeClient = {
      pupPage: {
        async evaluate() {
          return { chatFound: false, confirmed: false, messageId: null };
        }
      },
      async sendMessage() {
        return undefined;
      }
    };
    const res = await dispatchWishMessage(fakeClient, '94770114407@c.us', 'Happy Birthday!', {
      isImageEnabled: true,
      media: { mimetype: 'image/jpeg', data: 'base64data' },
      filePath: 'birthday-card.jpeg'
    });

    assert.strictEqual(Boolean(res.sentMsg), false);
    console.log('  ✓ Unsent missing-chat return stays falsy and does not falsely mark delivered');
  }

  console.log('\n==========================================');
  console.log('ALL WHATSAPP SINGLE-SEND TESTS PASSED!');
  console.log('==========================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

