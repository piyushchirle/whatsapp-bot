const { getChatCompletion, MODEL } = require('./aiClient');
const { appendMessage, loadHistory, clearHistory } = require('./memory');
const {
  isGlobalEnabled,
  setGlobalEnabled,
  muteChat,
  unmuteChat,
  shouldRespond,
} = require('./botState');

function getConfig() {
  return {
    REPLY_TO_GROUPS: process.env.REPLY_TO_GROUPS === 'true',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '',
    SYSTEM_PROMPT:
      process.env.SYSTEM_PROMPT ||
      'You are a helpful, concise WhatsApp assistant.',
  };
}

function extractText(msg) {
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    null
  );
}

async function handleMessage(sock, msg) {
  const { REPLY_TO_GROUPS, OWNER_NUMBER, SYSTEM_PROMPT } = getConfig();

  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  const fromMe = msg.key.fromMe; // true only if sent from YOUR linked device (i.e. you, the owner)

  if (!jid) return;

  const isGroup = jid.endsWith('@g.us');
  if (isGroup && !REPLY_TO_GROUPS) return;
  if (jid === 'status@broadcast') return;

  const text = extractText(msg);
  if (!text) return;

  console.log(`[msg] from ${jid} (fromMe: ${fromMe}): ${text}`);

  // Two ways to be recognized as owner:
  // 1) fromMe === true -> message was sent from YOUR own linked WhatsApp account,
  //    no matter which chat it was sent in. This is the primary path when the bot
  //    is linked as a secondary device on your own number.
  // 2) A separate number messaging the bot that matches OWNER_NUMBER in .env
  //    (useful if you want to control the bot remotely from a different number).
  const senderNumber = jid.split('@')[0].split(':')[0];
  const isOwnerViaNumber =
    !fromMe && OWNER_NUMBER !== '' && senderNumber === OWNER_NUMBER;
  const isOwner = fromMe || isOwnerViaNumber;

  if (isOwner) {
    const cmd = text.trim().toLowerCase();

    if (cmd === '/clear') {
      clearHistory(jid);
      await sock.sendMessage(jid, { text: '🧹 Conversation history cleared.' });
      return;
    }
    if (cmd === '/ping') {
      const status = isGlobalEnabled() ? '🟢 ON' : '🔴 OFF';
      await sock.sendMessage(jid, {
        text: `Bot status: ${status}\nModel: ${MODEL}`,
      });
      return;
    }
    if (cmd === '/off') {
      muteChat(jid);
      await sock.sendMessage(jid, { text: '🔇 Bot muted for this chat.' });
      return;
    }
    if (cmd === '/on') {
      unmuteChat(jid);
      await sock.sendMessage(jid, { text: '🔊 Bot unmuted for this chat.' });
      return;
    }
    if (cmd === '/offall') {
      setGlobalEnabled(false);
      await sock.sendMessage(jid, {
        text: '🔴 Bot turned OFF globally. No chats will get auto-replies.',
      });
      return;
    }
    if (cmd === '/onall') {
      setGlobalEnabled(true);
      await sock.sendMessage(jid, { text: '🟢 Bot turned ON globally.' });
      return;
    }

    // fromMe but not a recognized command: this is just you texting someone
    // normally from your own phone. Never let the bot auto-reply to your own
    // outgoing chat messages.
    if (fromMe) return;
  }

  // Master gate: skip AI reply if globally off or this chat is muted
  if (!shouldRespond(jid)) {
    console.log(`[skip] Bot disabled for ${jid} (muted or global off)`);
    return;
  }

  await sock.sendPresenceUpdate('composing', jid);

  const history = loadHistory(jid);
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: text },
  ];

  const reply = await getChatCompletion(apiMessages);

  appendMessage(jid, 'user', text);
  appendMessage(jid, 'assistant', reply);

  await sock.sendPresenceUpdate('paused', jid);
  await sock.sendMessage(jid, { text: reply }, { quoted: msg });
}

module.exports = { handleMessage, extractText };
