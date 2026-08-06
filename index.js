const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require("./config");
const commandDefinitions = require("./commands/definitions");
const handlers = require("./commands/handlers");
const { getQueueData, connectToChannel, setupPlayerEvents } = require("./musicManager");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", async () => {
  console.log(`✅ البوت شغال باسم: ${client.user.tag}`);

  // تسجيل أوامر Slash
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(config.clientId), {
      body: commandDefinitions,
    });
    console.log("✅ تم تسجيل أوامر Slash");
  } catch (err) {
    console.error("خطأ بتسجيل الأوامر:", err);
  }

  // دخول تلقائي للروم المحدد + مراقبة الاتصال كل 30 ثانية عشان يرجع لو انقطع
  if (config.autoJoinChannelId) {
    setInterval(async () => {
      for (const guild of client.guilds.cache.values()) {
        const data = getQueueData(guild.id);
        if (!data.connection) {
          try {
            const channel = await guild.channels.fetch(config.autoJoinChannelId).catch(() => null);
            if (channel) {
              data.connection = await connectToChannel(channel);
              setupPlayerEvents(guild.id);
              console.log(`🔗 اتصلت (أو رجعت اتصلت) بالروم: ${channel.name}`);
            }
          } catch (err) {
            console.log("تعذر الاتصال بالروم:", err.message);
          }
        }
      }
    }, 30_000);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handler = handlers[interaction.commandName];
  if (!handler) return;

  try {
    await handler(interaction);
  } catch (err) {
    console.error(`خطأ بتنفيذ /${interaction.commandName}:`, err);
    const errorMsg = "صار خطأ غير متوقع 😕";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
});

// تشخيص مؤقت — يطلع طول التوكن بدون كشفه، عشان نتأكد ما فيه مسافات أو نقص
console.log("🔍 فحص التوكن:");
console.log("   الطول:", config.token.length, "حرف");
console.log("   أول 6 أحرف:", config.token.slice(0, 6));
console.log("   آخر 4 أحرف:", config.token.slice(-4));
console.log("   فيه مسافات بالبداية/النهاية؟", config.token !== config.token.trim());

client.login(config.token);
