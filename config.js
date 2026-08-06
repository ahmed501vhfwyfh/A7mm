const fs = require("fs");
const path = require("path");

function loadFromEnv() {
  if (!process.env.DISCORD_TOKEN) return null;
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    autoJoinChannelId: process.env.AUTO_JOIN_CHANNEL_ID || "",
    stay247: process.env.STAY_247 !== "false", // افتراضياً true إلا لو حطيت "false"
  };
}

function loadFromFile() {
  const configPath = path.join(__dirname, "config.json");
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

// أولوية لـ Environment Variables (تستخدمها منصات الاستضافة زي Railway/Render)
// وإذا مو موجودة، يرجع لملف config.json (للتشغيل على جهازك محلياً)
const config = loadFromEnv() || loadFromFile();

if (!config) {
  throw new Error(
    "ما لقيت إعدادات! إما حط متغيرات البيئة (DISCORD_TOKEN, DISCORD_CLIENT_ID) بلوحة تحكم الاستضافة، " +
      "أو سوّي ملف config.json محلياً من config.example.json."
  );
}

if (!config.token || config.token.includes("ضع_التوكن")) {
  throw new Error("لازم تحط توكن البوت الحقيقي!");
}

if (!config.clientId || config.clientId.includes("ضع_آيدي")) {
  throw new Error("لازم تحط Application ID (Client ID) حق البوت!");
}

module.exports = {
  token: config.token,
  clientId: config.clientId,
  autoJoinChannelId: config.autoJoinChannelId || "",
  stay247: config.stay247 !== undefined ? config.stay247 : true,
};
