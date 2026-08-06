const { SlashCommandBuilder } = require("discord.js");

module.exports = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("شغّل أغنية أو ضيفها للطابور")
    .addStringOption((option) =>
      option.setName("query").setDescription("اسم الأغنية أو رابط يوتيوب").setRequired(true)
    ),
  new SlashCommandBuilder().setName("skip").setDescription("تخطي الأغنية الحالية"),
  new SlashCommandBuilder().setName("pause").setDescription("إيقاف الأغنية مؤقتاً"),
  new SlashCommandBuilder().setName("resume").setDescription("استكمال التشغيل"),
  new SlashCommandBuilder().setName("stop").setDescription("إيقاف التشغيل ومسح الطابور"),
  new SlashCommandBuilder().setName("queue").setDescription("عرض طابور الأغاني"),
  new SlashCommandBuilder().setName("leave").setDescription("طرد البوت من الروم الصوتي"),
].map((command) => command.toJSON());
