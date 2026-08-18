const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'data', 'bot_state.json');

function defaultState() {
  return {
    globalEnabled: true,
    mutedChats: [], // array of jids where bot should NOT auto-reply
  };
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    saveState(defaultState());
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isGlobalEnabled() {
  return loadState().globalEnabled;
}

function setGlobalEnabled(enabled) {
  const state = loadState();
  state.globalEnabled = enabled;
  saveState(state);
}

function isChatMuted(jid) {
  return loadState().mutedChats.includes(jid);
}

function muteChat(jid) {
  const state = loadState();
  if (!state.mutedChats.includes(jid)) {
    state.mutedChats.push(jid);
    saveState(state);
  }
}

function unmuteChat(jid) {
  const state = loadState();
  state.mutedChats = state.mutedChats.filter((j) => j !== jid);
  saveState(state);
}

// Master check: should the bot respond in this chat?
function shouldRespond(jid) {
  const state = loadState();
  if (!state.globalEnabled) return false;
  if (state.mutedChats.includes(jid)) return false;
  return true;
}

module.exports = {
  isGlobalEnabled,
  setGlobalEnabled,
  isChatMuted,
  muteChat,
  unmuteChat,
  shouldRespond,
};
