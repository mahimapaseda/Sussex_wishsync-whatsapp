const assert = require('assert');
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

  console.log('\n==========================================');
  console.log('ALL WHATSAPP SINGLE-SEND TESTS PASSED!');
  console.log('==========================================\n');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

