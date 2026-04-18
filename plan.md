# 🗺️ reinvy-telegram — Implementation Plan

> **Tipe:** Interface Project — Telegram Bot Adapter  
> **Posisi:** Depends on `@reinvy/sdk`. TIDAK langsung ke Core.  
> **Referensi:** [Root plan.md](../plan.md) | [PRD](prd.md)

---

## Status Progres

| Fase | Deskripsi         | Status         |
| ---- | ----------------- | -------------- |
| 10   | Full Telegram Bot | ⬜ Not Started |

---

## Prerequisites

- `reinvy-core` selesai Fase 6 (Core complete)
- `reinvy-sdk` selesai Fase 7 dan sudah di-`npm link` atau di-install via `file:`

---

## Fase 10 — Full Telegram Bot

**Test saat selesai:**

- `/start` → welcome message
- `/chat halo!` atau kirim pesan langsung → AI reply dalam Markdown
- `/reset` → konfirmasi memory cleared
- `/config` → lihat/ubah config
- `/usage` → statistik token

### Struktur Folder Target

```
reinvy-telegram/
├── src/
│   ├── bot/
│   │   ├── index.js
│   │   ├── commands/
│   │   │   ├── start.command.js
│   │   │   ├── chat.command.js
│   │   │   ├── reset.command.js
│   │   │   ├── config.command.js
│   │   │   └── usage.command.js
│   │   └── middlewares/
│   │       └── userIdentify.js
│   ├── adapters/
│   │   └── reinvy.adapter.js
│   ├── formatters/
│   │   └── telegram.formatter.js
│   └── config/
│       └── config.js
├── app.js
├── Dockerfile
├── .env.example
└── package.json
```

### Checklist

#### Setup

- [ ] Hapus express-generator scaffold (bin/, public/, routes/)
- [ ] Update `package.json`:

  ```json
  {
    "name": "reinvy-telegram",
    "version": "1.0.0",
    "scripts": {
      "start": "node app.js",
      "dev": "nodemon app.js"
    },
    "dependencies": {
      "telegraf": "^4.16.0",
      "@reinvy/sdk": "file:../reinvy-sdk",
      "dotenv": "^16.0.0",
      "winston": "^3.0.0",
      "zod": "^3.0.0"
    },
    "devDependencies": {
      "nodemon": "^3.0.0"
    }
  }
  ```

- [ ] `.env.example`:

  ```
  TELEGRAM_BOT_TOKEN=
  REINVY_CORE_URL=http://localhost:3000
  REINVY_SERVICE_KEY=tele_devkey123
  NODE_ENV=development
  # Untuk production, aktifkan webhook:
  # WEBHOOK_URL=https://yourdomain.com/telegram/webhook
  # WEBHOOK_PORT=8443
  ```

- [ ] `src/config/config.js` — Zod validation:
  ```js
  // Required: TELEGRAM_BOT_TOKEN, REINVY_CORE_URL, REINVY_SERVICE_KEY
  // Optional: WEBHOOK_URL, WEBHOOK_PORT (opsional, untuk production), NODE_ENV
  ```

#### Adapter

- [ ] `src/adapters/reinvy.adapter.js`:
  ```js
  const { ReinvyClient } = require("@reinvy/sdk");
  const client = new ReinvyClient({
    baseUrl: config.REINVY_CORE_URL,
    serviceKey: config.REINVY_SERVICE_KEY,
    source: "telegram",
  });
  module.exports = client;
  ```

#### Formatter

- [ ] `src/formatters/telegram.formatter.js`:
  ```js
  // escapeMarkdownV2(text) → escape special chars: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // formatChatReply({ reply, model_used, tokens }) → string Telegram MarkdownV2:
  //   reply text + footer "\n\n_Model: model | Tokens: total_"
  //
  // formatUsage({ total_requests, total_tokens, estimated_cost_usd, period }) → MarkdownV2 string
  // formatConfig(config) → MarkdownV2 string
  // formatError(message) → string plain text (error tidak perlu formatting fancy)
  ```

#### Middlewares

- [ ] `src/bot/middlewares/userIdentify.js`:
  ```js
  // Telegraf middleware function
  // ctx.reinvyUserId = `tg_${ctx.from.id}`
  // Selalu attach sebelum semua command handlers
  ```

#### Command Handlers

- [ ] `src/bot/commands/start.command.js`:

  ```js
  // Handler untuk /start
  // Reply dengan welcome message:
  //   "Halo! Saya Reinvy AI 🤖
  //   Cara pakai:
  //   • Kirim pesan langsung untuk chat
  //   • /chat [pesan] — chat dengan AI
  //   • /reset — hapus riwayat percakapan
  //   • /config — lihat & ubah konfigurasi
  //   • /usage — statistik penggunaan token"
  ```

- [ ] `src/bot/commands/chat.command.js`:

  ```js
  // Handler untuk /chat [pesan]
  // 1. await ctx.sendChatAction('typing')
  // 2. Ambil pesan dari ctx.message.text.split(' ').slice(1).join(' ')
  // 3. Jika kosong → reply "Gunakan: /chat [pesan kamu]"
  // 4. const res = await reinvyAdapter.chat({ user_id: ctx.reinvyUserId, message })
  // 5. ctx.reply(formatter.formatChatReply(res.data), { parse_mode: 'MarkdownV2' })
  // 6. try/catch → ctx.reply(formatter.formatError(err))
  ```

- [ ] `src/bot/commands/reset.command.js`:

  ```js
  // Handler untuk /reset
  // await reinvyAdapter.deleteMemory(ctx.reinvyUserId)
  // ctx.reply('✅ Riwayat percakapan berhasil dihapus!')
  ```

- [ ] `src/bot/commands/config.command.js`:

  ```js
  // Handler untuk /config
  // Tanpa argumen → tampilkan config saat ini
  // Dengan argumen:
  //   /config model <model_name>        → updateConfig({ model })
  //   /config personality <type>        → updateConfig({ personality })
  //   /config language <lang>           → updateConfig({ language })
  //   /config max_context <number>      → updateConfig({ max_context: parseInt(n) })
  // Response: konfirmasi perubahan atau tampilkan config
  ```

- [ ] `src/bot/commands/usage.command.js`:
  ```js
  // Handler untuk /usage
  // const res = await reinvyAdapter.getUsage(ctx.reinvyUserId)
  // ctx.reply(formatter.formatUsage(res.data), { parse_mode: 'MarkdownV2' })
  ```

#### Direct Message Handler

- [ ] `src/bot/index.js` — tambahkan handler untuk pesan non-command:
  ```js
  // bot.on('text', async (ctx) => {
  //   // Jangan proses jika ini adalah command (starts with /)
  //   if (ctx.message.text.startsWith('/')) return
  //   // Proses sebagai chat
  //   await ctx.sendChatAction('typing')
  //   const res = await reinvyAdapter.chat({ user_id: ctx.reinvyUserId, message: ctx.message.text })
  //   ctx.reply(formatter.formatChatReply(res.data), { parse_mode: 'MarkdownV2' })
  // })
  ```

#### Bot Init

- [ ] `src/bot/index.js`:

  ```js
  const { Telegraf } = require("telegraf");
  const config = require("../config/config");

  const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

  // Middleware chain (urutan penting):
  bot.use(userIdentifyMiddleware);

  // Command handlers
  bot.command("start", startHandler);
  bot.command("chat", chatHandler);
  bot.command("reset", resetHandler);
  bot.command("config", configHandler);
  bot.command("usage", usageHandler);

  // Direct message handler
  bot.on("text", directMessageHandler);

  // Error handler global
  bot.catch((err, ctx) => {
    logger.error("Bot error", { error: err.message, update: ctx.update });
    ctx.reply("Maaf, terjadi kesalahan. Coba lagi nanti.").catch(() => {});
  });

  module.exports = bot;
  ```

#### App Entry Point

- [ ] `app.js`:

  ```js
  require("dotenv").config();
  const config = require("./src/config/config");
  const bot = require("./src/bot/index");
  const logger = require("./src/utils/logger"); // opsional, buat utils/logger.js

  // Development: long polling
  // Production: webhook (jika WEBHOOK_URL di-set)
  if (config.WEBHOOK_URL) {
    bot.launch({
      webhook: {
        domain: config.WEBHOOK_URL,
        port: config.WEBHOOK_PORT || 8443,
      },
    });
    logger.info(`Bot started in webhook mode: ${config.WEBHOOK_URL}`);
  } else {
    bot.launch();
    logger.info("Bot started in polling mode");
  }

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
  ```

#### Dockerfile

- [ ] `Dockerfile`:
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev
  COPY . .
  CMD ["node", "app.js"]
  ```

---

## Catatan Platform-Specific

### Telegram User ID → reinvy user_id mapping

- Format: `tg_${ctx.from.id}`
- `ctx.from.id` adalah numeric ID yang permanen dan unik

### Polling vs Webhook

- **Polling** (default dev): bot.launch() — Telegraf auto-poll, tidak perlu domain
- **Webhook** (production): butuh HTTPS domain, lebih efisien untuk traffic tinggi
- **Penting**: hanya satu mode yang boleh aktif pada satu waktu per bot token

### MarkdownV2 Escaping

- Telegram MarkdownV2 sangat strict — semua special chars harus di-escape
- Selalu gunakan `escapeMarkdownV2()` untuk konten dinamis dari user/AI
- Jika formatting gagal, fallback ke plain text

### Group Chat

- Bot bisa dipakai di group chat, tapi user_id tetap per-user (bukan per-group)
- Di group, bot hanya merespons jika di-mention atau ada command yang spesifik ke bot
- Untuk saat ini: default hanya merespons command dan DM
