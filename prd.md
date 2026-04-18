# 📄 PRD: `reinvy-telegram`

> **Bagian dari:** Reinvy AI Systems Ecosystem
> **Tipe:** Interface Project — Telegram Bot Adapter
> **Versi:** 2.0.0
> **Last Updated:** April 2026
> **Referensi Utama:** Lihat root [`prd.md`](../prd.md) §7 untuk konteks ekosistem lengkap.

---

## 1. Repo Overview

`reinvy-telegram` adalah **tangan** ekosistem Reinvy yang menjangkau platform Telegram. Repo ini bertanggung jawab atas semua interaksi bot dengan user Telegram — menerima commands dan pesan langsung, meneruskan ke Core via SDK, dan memformat respons kembali sesuai format Telegram.

### Posisi dalam Ekosistem

```
User Telegram
    │
    │  /commands & Direct Messages
    ▼
reinvy-telegram  (Bot Adapter)
    │
    │  @reinvy/sdk  (HTTP ke reinvy-core)
    ▼
reinvy-core  (AI Engine — proses semua logika AI)
```

**Dependency position:**

- **Depends on:** `@reinvy/sdk` (versi `^1.0.0`)
- **Does NOT depend on:** `reinvy-core` secara langsung, database, Redis

---

## 2. Scope

### Yang TERMASUK Tanggung Jawab Repo Ini

| Area                                | Detail                                                               |
| ----------------------------------- | -------------------------------------------------------------------- |
| Telegram Bot Initialization         | Bot init via Telegraf, webhook atau long polling setup               |
| Command Handling                    | `/start`, `/chat`, `/reset`, `/config`, `/usage`                     |
| Direct Message Handling             | User bisa chat langsung tanpa command `/chat`                        |
| User ID Mapping                     | Map Telegram `chat.id` ke `reinvy user_id` dengan prefix `telegram_` |
| Output Formatting (Core → Telegram) | Format reply menjadi Telegram Markdown atau HTML                     |
| Error Messaging ke User             | Terjemahkan SDK errors ke pesan ramah untuk user Telegram            |
| Platform-specific UX                | Typing action, inline keyboard untuk konfirmasi                      |

### Yang TIDAK Termasuk Tanggung Jawab Repo Ini

| Yang Dikecualikan                           | Keterangan                                  |
| ------------------------------------------- | ------------------------------------------- |
| Logika AI, pemilihan model, prompt building | Tanggung jawab `reinvy-core`                |
| Penyimpanan conversation history            | Tanggung jawab `reinvy-core` via PostgreSQL |
| Akses langsung ke database atau Redis       | ❌ Dilarang keras                           |
| Public REST API endpoints                   | Tanggung jawab `reinvy-gateway`             |
| Konfigurasi LLM provider                    | Tanggung jawab `reinvy-core`                |

---

## 3. Tech Stack

| Layer            | Teknologi   | Keterangan                                          |
| ---------------- | ----------- | --------------------------------------------------- |
| Runtime          | Node.js 20+ |                                                     |
| Telegram Library | Telegraf v4 | Command routing, context, middleware chain          |
| SDK              | @reinvy/sdk | Komunikasi ke reinvy-core                           |
| Framework        | Express.js  | Untuk webhook mode (production) dan health endpoint |
| Containerization | Docker      |                                                     |

---

## 4. Folder Structure

```
reinvy-telegram/
├── src/
│   ├── bot/
│   │   ├── index.js                   # Telegraf init, webhook atau polling setup
│   │   ├── commands/
│   │   │   ├── start.command.js       # /start — perkenalan bot
│   │   │   ├── chat.command.js        # /chat [pesan]
│   │   │   ├── reset.command.js       # /reset
│   │   │   ├── config.command.js      # /config — lihat & ubah konfigurasi
│   │   │   └── usage.command.js       # /usage — statistik token
│   │   └── middlewares/
│   │       └── userIdentify.js        # Map Telegram user ke reinvy user_id
│   ├── adapters/
│   │   └── reinvy.adapter.js          # Inisialisasi ReinvyClient, wrapper method
│   ├── formatters/
│   │   └── telegram.formatter.js      # Format reply Core → Telegram Markdown/HTML
│   └── config/
│       └── config.js                  # Load & validasi ENV variables
├── app.js
├── package.json
├── Dockerfile
├── .env.example
└── README.md
```

---

## 5. Telegram Commands

### Command Overview

| Command            | Deskripsi                                        | Mode         |
| ------------------ | ------------------------------------------------ | ------------ |
| `/start`           | Perkenalan bot & panduan singkat cara pakai      | Semua mode   |
| `/chat [pesan]`    | Chat dengan AI (atau kirim pesan langsung)       | Semua mode   |
| `/reset`           | Reset conversation memory                        | Semua mode   |
| `/config`          | Lihat & ubah konfigurasi AI (model, personality) | Semua mode   |
| `/usage`           | Lihat statistik penggunaan token bulan ini       | Semua mode   |
| _(pesan langsung)_ | Pesan tanpa prefix command juga diteruskan ke AI | Private chat |

---

### `/start`

**Behavior:**

1. Kirim pesan sambutan yang memperkenalkan Reinvy
2. Tampilkan daftar command yang tersedia
3. Tidak memanggil SDK — murni pesan statis

**Contoh output:**

```
👋 Halo! Saya Reinvy, asisten AI kamu di Telegram.

Cara pakai:
• Kirim pesan langsung untuk chat dengan AI
• /chat [pesan] — chat dengan AI
• /reset — reset conversation memory
• /config — lihat & ubah pengaturan AI
• /usage — lihat statistik penggunaan
```

---

### `/chat [pesan]` & Direct Message

**Behavior:**

1. Kirim "typing..." action ke Telegram (visual feedback)
2. Panggil `client.chat({ user_id, message })`
3. Format reply dengan `telegram.formatter.js`
4. Kirim sebagai Telegram Markdown

**`user_id` mapping:**

```
Telegram chat.id: 987654321
→ reinvy user_id: "telegram_987654321"
```

Format `telegram_<telegram_chat_id>` memastikan tidak ada collision dengan user dari platform lain.

**Direct message handling:** Pesan yang dikirim ke bot di private chat (bukan group) tanpa prefix command juga diteruskan ke AI — user tidak perlu menulis `/chat` setiap saat.

---

### `/reset`

**Behavior:**

1. Kirim inline keyboard konfirmasi (tombol "✅ Ya, reset" dan "❌ Batal")
2. Jika user pilih Ya: panggil `client.deleteMemory(user_id)`
3. Kirim pesan sukses: "Memory berhasil direset. Kita mulai percakapan baru!"
4. Jika user pilih Batal: edit pesan menjadi "Reset dibatalkan."

---

### `/config`

**Behavior:**

1. Panggil `client.getConfig(user_id)` — tampilkan config saat ini
2. Tampilkan inline keyboard untuk pilih apa yang ingin diubah:
   - 🤖 Ganti Model
   - 🎭 Ganti Personality
3. Subflow ganti model: tampilkan list model tersedia
4. Subflow ganti personality: tampilkan list personality

**Personality yang tersedia:**

| Value      | Label Ditampilkan ke User Telegram |
| ---------- | ---------------------------------- |
| `friendly` | 😊 Friendly — santai dan ramah     |
| `formal`   | 💼 Formal — profesional            |
| `expert`   | 🧠 Expert — teknis dan mendalam    |
| `concise`  | ⚡ Concise — singkat dan padat     |

---

### `/usage`

**Behavior:**

1. Panggil `client.getUsage(user_id)`
2. Format sebagai pesan teks Markdown:

```
📊 *Statistik Penggunaanmu — April 2026*

🔤 Total Tokens: 15,420
📨 Total Requests: 87
💰 Estimasi Biaya: $0.0231
```

---

## 6. Adapters

### `src/adapters/reinvy.adapter.js`

Inisialisasi tunggal `ReinvyClient` yang di-share ke semua command handler:

```js
const { ReinvyClient } = require("@reinvy/sdk");

const client = new ReinvyClient({
  baseUrl: process.env.REINVY_CORE_URL,
  serviceKey: process.env.REINVY_SERVICE_KEY,
  source: "telegram",
});

module.exports = client;
```

**User ID Convention:**

```js
function toReinvyUserId(telegramChatId) {
  return `telegram_${telegramChatId}`;
}
```

Konvensi ini harus konsisten di seluruh command handler dan `userIdentify.js` middleware.

---

### `src/bot/middlewares/userIdentify.js`

Middleware Telegraf yang berjalan sebelum semua command — menambahkan `reinvyUserId` ke Telegraf context:

```js
// ctx.reinvyUserId tersedia di semua command handler setelah middleware ini
bot.use(userIdentifyMiddleware);
```

---

## 7. Formatters

### `src/formatters/telegram.formatter.js`

Tanggung jawab: transformasi response Core menjadi format Telegram yang tepat.

**Aturan formatting:**

| Kondisi                                | Format Output                                                |
| -------------------------------------- | ------------------------------------------------------------ |
| Reply singkat (≤ 500 karakter)         | Plain text                                                   |
| Reply panjang (> 500 karakter)         | Telegram Markdown (bold untuk header, code block untuk kode) |
| Reply mengandung kode                  | Selalu gunakan code block `` ` `` atau ` ``` `               |
| Reply > 4096 karakter (Telegram limit) | Split menjadi multiple message                               |

**Telegram Markdown rules:**

- `*bold*` untuk penekanan
- `` `inline code` `` untuk kode pendek
- ` ```language\n...\n``` ` untuk blok kode
- Escape karakter spesial Telegram: `. ( ) - _ # !` jika tidak dalam format

---

## 8. Deployment Mode: Webhook vs Long Polling

| Mode         | Kapan Digunakan     | Keterangan                                          |
| ------------ | ------------------- | --------------------------------------------------- |
| Long Polling | Development / local | Tidak butuh domain publik; Telegraf handle otomatis |
| Webhook      | Production          | Lebih efisien; butuh HTTPS endpoint yang accessible |

**Konfigurasi otomatis:**

```js
if (process.env.WEBHOOK_URL) {
  // Production: gunakan webhook
  app.use(bot.webhookCallback("/telegram-webhook"));
  bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/telegram-webhook`);
} else {
  // Development: gunakan long polling
  bot.launch();
}
```

---

## 9. Error Handling Strategy

Setiap error dari SDK diterjemahkan ke pesan ramah untuk user Telegram:

| Error SDK               | Pesan ke User Telegram                                    |
| ----------------------- | --------------------------------------------------------- |
| `ReinvyRateLimitError`  | "⏳ Terlalu banyak pesan! Tunggu sebentar dan coba lagi." |
| `ReinvyNetworkError`    | "🔌 Reinvy sedang tidak bisa dihubungi. Coba lagi nanti." |
| `ReinvyAuthError`       | "⚙️ Ada masalah konfigurasi bot. Hubungi admin."          |
| `ReinvyValidationError` | "❌ Pesanmu tidak bisa diproses. Coba ubah kata-katanya." |
| `ReinvyServerError`     | "⚠️ Terjadi kesalahan di server AI. Coba lagi nanti."     |

---

## 10. Security Responsibilities

| Area                   | Implementasi                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| User ID Isolation      | Setiap Telegram user punya `user_id` unik dengan prefix `telegram_`  |
| No Direct DB Access    | Semua akses data melalui `@reinvy/sdk`                               |
| Service Key Protection | `REINVY_SERVICE_KEY` disimpan di ENV, tidak pernah di-log            |
| Bot Token Protection   | `TELEGRAM_BOT_TOKEN` disimpan di ENV                                 |
| Webhook Security       | Validasi secret path webhook untuk mencegah request palsu            |
| Group Chat Scope       | Di group chat, bot hanya merespon jika di-mention atau pakai command |

---

## 11. Testing Strategy

| Jenis Test       | Target                                                   | Tool                 |
| ---------------- | -------------------------------------------------------- | -------------------- |
| Unit Test        | `telegram.formatter.js` — semua format case              | Jest                 |
| Unit Test        | Command handler logic (mock SDK + mock Telegraf context) | Jest                 |
| Unit Test        | `userIdentify.js` middleware                             | Jest                 |
| Unit Test        | Error handler — semua SDK error ter-handle               | Jest                 |
| Integration Test | Bot command flow → SDK mock → response format            | Jest + Telegraf mock |

**Target coverage:** ≥ 75% untuk semua file di `src/`.

---

## 12. Deployment Notes

```yaml
# Dari docker-compose.yml ekosistem — lihat root prd.md §13.1
reinvy-telegram:
  build: ./reinvy-telegram
  networks: [reinvy-network]
  restart: unless-stopped
  environment:
    - TELEGRAM_BOT_TOKEN=
    - REINVY_CORE_URL=http://reinvy-core:3000
    - REINVY_SERVICE_KEY=tele_xxx
    - WEBHOOK_URL= # Kosongkan untuk dev (long polling)
  depends_on: [reinvy-core]
```

**Catatan Scaling:**

- 1 bot token = 1 instance (limitasi Telegram Bot API)
- Untuk horizontal scaling: gunakan webhook mode + load balancer, tapi tetap satu bot token
- Scaling interface project ini tidak mempengaruhi reinvy-core

---

## 13. Environment Variables

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=

# Webhook (kosongkan untuk development / long polling mode)
WEBHOOK_URL=

# Reinvy Core (via SDK)
REINVY_CORE_URL=http://reinvy-core:3000
REINVY_SERVICE_KEY=tele_xxxxxxxxxxxx

# App
NODE_ENV=production
PORT=3000
```

---

## 14. Roadmap Ownership

Fase dari roadmap ekosistem (root `prd.md` §17) yang menjadi tanggung jawab repo ini:

| Fase    | Item                                                          | Status     |
| ------- | ------------------------------------------------------------- | ---------- |
| Phase 3 | Setup Telegraf bot: command routing                           | ⬜ Todo    |
| Phase 3 | Integrasi dengan reinvy-sdk                                   | ⬜ Todo    |
| Phase 3 | Implementasi `/start`, `/chat`, `/reset`, `/config`, `/usage` | ⬜ Todo    |
| Phase 3 | Webhook mode untuk production                                 | ⬜ Todo    |
| Phase 3 | Docker setup                                                  | ⬜ Todo    |
| Phase 5 | Inline query support (masa depan)                             | 🔜 Planned |
