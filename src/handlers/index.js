const reinvy = require("../reinvyClient");

/**
 * Escape special Markdown v2 characters for Telegram.
 * @param {string} text
 * @returns {string}
 */
function escapeMd(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Register all bot commands and handlers.
 * @param {import('telegraf').Telegraf} bot
 */
function registerHandlers(bot) {
  // /start
  bot.start(async (ctx) => {
    await ctx.reply(
      "Halo! Saya Reinvy AI 🤖\n\nKamu bisa langsung kirim pesan ke saya, atau gunakan perintah:\n" +
        "/chat <pesan> — Chat dengan AI\n" +
        "/clear — Hapus riwayat percakapan\n" +
        "/config — Lihat/ubah preferensi\n" +
        "/usage — Lihat statistik penggunaan",
    );
  });

  // /help
  bot.help(async (ctx) => {
    await ctx.reply(
      "📋 *Perintah yang tersedia:*\n\n" +
        "• /chat <pesan> — Chat dengan Reinvy AI\n" +
        "• /clear — Hapus riwayat percakapan\n" +
        "• /config — Lihat atau ubah preferensi AI\n" +
        "• /usage — Statistik penggunaan token\n\n" +
        "Atau kirim pesan langsung di chat ini!",
      { parse_mode: "Markdown" },
    );
  });

  // /chat <message>
  bot.command("chat", async (ctx) => {
    const message = ctx.message.text.replace(/^\/chat\s*/i, "").trim();
    if (!message) {
      return ctx.reply("Gunakan: /chat <pesanmu>");
    }
    await handleChat(ctx, message);
  });

  // /clear
  bot.command("clear", async (ctx) => {
    const user_id = String(ctx.from.id);
    const source = "telegram";
    try {
      await reinvy.clearMemory({ user_id, source });
      await ctx.reply(
        "✅ Riwayat percakapanmu telah dihapus. Mulai percakapan baru!",
      );
    } catch (err) {
      console.error("[/clear] Error:", err.message);
      await ctx.reply("Gagal menghapus riwayat. Coba lagi nanti.");
    }
  });

  // /config [key value]
  bot.command("config", async (ctx) => {
    const user_id = String(ctx.from.id);
    const source = "telegram";
    const args = ctx.message.text
      .replace(/^\/config\s*/i, "")
      .trim()
      .split(/\s+/);

    // If no args, show current config
    if (!args[0] || args[0] === "") {
      try {
        const cfg = await reinvy.getConfig({ user_id, source });
        await ctx.reply(
          `⚙️ *Konfigurasi kamu:*\n• Kepribadian: ${cfg.personality}\n• Bahasa: ${cfg.language}\n• Konteks: ${cfg.max_context} pesan\n• Model: \`${cfg.model}\``,
          { parse_mode: "Markdown" },
        );
      } catch (err) {
        await ctx.reply("Gagal memuat konfigurasi.");
      }
      return;
    }

    // /config personality friendly
    const [key, value] = args;
    const allowed = {
      personality: ["friendly", "formal", "expert", "concise"],
      language: null,
    };
    const updateData = {};

    if (key === "personality") {
      if (!["friendly", "formal", "expert", "concise"].includes(value)) {
        return ctx.reply(
          "Nilai personality yang valid: friendly, formal, expert, concise",
        );
      }
      updateData.personality = value;
    } else if (key === "language") {
      updateData.language = value;
    } else if (key === "max_context") {
      const n = parseInt(value);
      if (isNaN(n) || n < 1 || n > 50)
        return ctx.reply("max_context harus antara 1-50");
      updateData.max_context = n;
    } else {
      return ctx.reply("Key yang valid: personality, language, max_context");
    }

    try {
      const updated = await reinvy.setConfig({
        user_id,
        source,
        ...updateData,
      });
      await ctx.reply(`✅ ${key} diperbarui ke: ${value}`);
    } catch (err) {
      await ctx.reply("Gagal memperbarui konfigurasi.");
    }
  });

  // /usage
  bot.command("usage", async (ctx) => {
    const user_id = String(ctx.from.id);
    try {
      const usage = await reinvy.getUsage({ user_id });
      await ctx.reply(
        `📊 *Penggunaan bulan ini (${usage.period}):*\n• Total request: ${usage.total_requests}\n• Total token: ${usage.total_tokens.toLocaleString()}\n• Estimasi biaya: $${usage.estimated_cost_usd}`,
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      await ctx.reply("Gagal memuat statistik penggunaan.");
    }
  });

  // Handle plain text messages (DM/group with text)
  bot.on("text", async (ctx) => {
    // Skip commands
    if (ctx.message.text.startsWith("/")) return;
    await handleChat(ctx, ctx.message.text);
  });
}

/**
 * Core chat handler.
 */
async function handleChat(ctx, message) {
  const user_id = String(ctx.from.id);
  const source = "telegram";

  try {
    // Show "typing…" indicator
    await ctx.sendChatAction("typing");

    const result = await reinvy.chat({ user_id, source, message });

    // Telegram message limit ~4096 chars
    const reply =
      result.reply.length > 4000
        ? result.reply.slice(0, 4000) + "..."
        : result.reply;

    await ctx.reply(reply);
  } catch (err) {
    console.error("[handleChat] Error:", err.message, err.code);
    const msg =
      err.code === "RATE_LIMIT_EXCEEDED"
        ? "Terlalu banyak permintaan. Coba lagi sebentar."
        : "Maaf, terjadi kesalahan. Coba lagi nanti.";
    await ctx.reply(msg);
  }
}

module.exports = { registerHandlers };
