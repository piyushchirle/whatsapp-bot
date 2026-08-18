# WhatsApp AI Bot — Termux + OpenCode Zen (Nemotron-3-Ultra)

Runs fully on your Android phone via Termux. No PC, no cloud server needed.

## 1. Termux setup (one-time)

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs-lts git -y
```

Verify:
```bash
node -v   # should be v18+ or v20+/v22+
npm -v
```

Give Termux storage access + disable battery optimization for Termux (important — Android kills background apps otherwise):
```bash
termux-setup-storage
```
Then manually: **Phone Settings > Apps > Termux > Battery > Unrestricted**.

## 2. Get the project onto your phone

Transfer this `wa-bot` folder to your phone (via `termux-setup-storage` + copy into `~/storage/shared/`, or `git clone` if you push it to a repo, or `scp`/cable transfer). Then:

```bash
cd ~
cp -r /path/to/wa-bot ~/wa-bot   # adjust source path
cd ~/wa-bot
npm install
```

## 3. Configure your API key

```bash
cp .env.example .env
nano .env
```

Fill in:
```
OPENCODE_API_KEY=sk-xxxxxxxxxxxx
OWNER_NUMBER=91XXXXXXXXXX      # your own WhatsApp number, no +, no spaces
```

Save with `Ctrl+O`, Enter, `Ctrl+X`.

## 4. First run — pair with WhatsApp

```bash
node index.js
```

A QR code will print in the terminal. On your phone:
**WhatsApp > Settings > Linked Devices > Link a Device** → scan the QR shown in Termux.

Once connected you'll see:
```
[connection] ✅ Bot is online. Model: nemotron-3-ultra-free
```

Session is saved in `./auth_info/` — you won't need to rescan on future restarts unless you log out or delete that folder.

## 5. Test it

From another phone/number, message the WhatsApp account you linked. The bot replies using Nemotron-3-Ultra.

Admin-only commands (send from your own `OWNER_NUMBER`):
- `/ping` — check bot is alive + which model
- `/clear` — wipe conversation memory for that chat

## 6. Keep it running in the background on your phone

**Option A — quick background (survives terminal close, not reboot):**
```bash
npm run bg
tail -f bot.log      # watch logs
```
Stop it: `kill $(cat bot.pid)`

**Option B — proper persistence with `pm2` (recommended):**
```bash
npm install -g pm2
pm2 start index.js --name wa-bot
pm2 save
pm2 logs wa-bot
```

**Option C — auto-start Termux on boot** (needs Termux:Boot app from F-Droid):
1. Install `Termux:Boot` from F-Droid (not Play Store — Play Store version is outdated).
2. `mkdir -p ~/.termux/boot`
3. Create `~/.termux/boot/start-wa-bot.sh`:
   ```bash
   #!/data/data/com.termux/files/usr/bin/bash
   cd ~/wa-bot && pm2 resurrect
   ```
4. `chmod +x ~/.termux/boot/start-wa-bot.sh`

Also acquire a wakelock so Android doesn't deep-sleep Termux:
```bash
termux-wake-lock
```
Run this once per session (or put it in your boot script).

## 7. Switching models

Free models available on your OpenCode Zen key:
- `big-pickle`
- `mimo-v2.5-free`
- `laguna-s-2.1-free`
- `nemotron-3-ultra-free` (default, set in `.env`)
- `deepseek-v4-flash-free`

Change `OPENCODE_MODEL` in `.env` and restart the bot to A/B test quality/speed.

## 8. Project structure

```
wa-bot/
├── index.js           # main bot: WhatsApp connection + message routing
├── lib/
│   ├── aiClient.js     # OpenCode Zen API wrapper (OpenAI-compatible)
│   └── memory.js       # per-chat JSON conversation history
├── auth_info/          # Baileys session (auto-created, don't commit)
├── data/chats/         # per-chat memory files (auto-created)
├── .env                # your secrets (don't commit)
└── package.json
```

## Troubleshooting

- **QR expires before scanning**: rerun `node index.js`, QR refreshes automatically if it times out.
- **"Connection closed" loop**: usually stale `auth_info/`. Delete it (`rm -rf auth_info`) and rescan.
- **Bot stops replying after phone screen locks**: you skipped the battery optimization step or `termux-wake-lock`.
- **API errors in logs**: check `OPENCODE_API_KEY` is correct and the model name matches exactly (case-sensitive, e.g. `nemotron-3-ultra-free`, not `nemorron-3-ultra`).
- **Group replies not working**: set `REPLY_TO_GROUPS=true` in `.env` — off by default to avoid spamming groups.
