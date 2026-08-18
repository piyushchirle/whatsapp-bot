require('dotenv').config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./lib/handler');

const AUTH_DIR = './auth_info';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, // we handle QR manually below
    browser: ['JarvisBot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n[QR] Scan this with WhatsApp > Linked Devices:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        '[connection] closed. Reconnecting:',
        shouldReconnect,
        'code:',
        statusCode
      );
      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      } else {
        console.log('[connection] Logged out. Delete ./auth_info and rescan QR.');
      }
    } else if (connection === 'open') {
      console.log('[connection] ✅ Bot is online.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        await handleMessage(sock, msg);
      } catch (err) {
        console.error('[handleMessage] Error:', err);
      }
    }
  });
}

startBot().catch((err) => {
  console.error('[fatal] Failed to start bot:', err);
  process.exit(1);
});
