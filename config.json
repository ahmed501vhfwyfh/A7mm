const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");

if (!fs.existsSync(configPath)) {
  throw new Error(
    "ما لقيت config.json! سوّي نسخة من config.example.json وسمّها config.json وحط بياناتك فيها."
  );
}

const raw = fs.readFileSync(configPath, "utf-8");
const config = JSON.parse(raw);

if (!config.token || config.token.includes("ضع_التوكن")) {
  throw new Error("لازم تحط توكن البوت الحقيقي بملف config.json قبل التشغيل!");
}

if (!config.clientId || config.clientId.includes("ضع_آيدي")) {
  throw new Error("لازم تحط Application ID (Client ID) حق البوت بملف config.json!");
}

module.exports = {
  token: config.token,
  clientId: config.clientId,
  autoJoinChannelId: config.autoJoinChannelId || "",
  stay247: config.stay247 !== undefined ? config.stay247 : true,
};
