require("dotenv").config();
const { Telegraf } = require("telegraf");
const config = require("./config");
const { registerHandlers } = require("./handlers/index");

const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// Register all commands and message handlers
registerHandlers(bot);

// Global error handler
bot.catch((err, ctx) => {
  console.error(`[Bot] Error for ${ctx.updateType}:`, err.message);
});

// Launch
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("[Bot] Telegram bot started");
});

// Graceful shutdown
process.once("SIGTERM", () => {
  console.log("[Bot] SIGTERM received, stopping...");
  bot.stop("SIGTERM");
});

process.once("SIGINT", () => {
  console.log("[Bot] SIGINT received, stopping...");
  bot.stop("SIGINT");
});
