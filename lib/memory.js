const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'chats');
const MAX_TURNS = parseInt(process.env.MAX_HISTORY_TURNS || '10', 10);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function chatFile(jid) {
  const safe = jid.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function loadHistory(jid) {
  const file = chatFile(jid);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function saveHistory(jid, history) {
  // Keep only last MAX_TURNS user+assistant pairs (2x messages)
  const trimmed = history.slice(-MAX_TURNS * 2);
  fs.writeFileSync(chatFile(jid), JSON.stringify(trimmed, null, 2));
}

function appendMessage(jid, role, content) {
  const history = loadHistory(jid);
  history.push({ role, content });
  saveHistory(jid, history);
  return history;
}

function clearHistory(jid) {
  const file = chatFile(jid);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

module.exports = { loadHistory, saveHistory, appendMessage, clearHistory };
