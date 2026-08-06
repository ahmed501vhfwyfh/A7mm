const { AudioPlayerStatus } = require("@discordjs/voice");
const config = require("../config");
const {
  getQueueData,
  connectToChannel,
  searchSong,
  playNext,
  setupPlayerEvents,
} = require("../musicManager");

async function handlePlay(interaction) {
  const member = interaction.member;
  const voiceChannel = member.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply("لازم تكون داخل روم صوتي عشان تستخدم هالأمر ❌");
    return;
  }

  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const data = getQueueData(guildId);
  data.textChannel = interaction.channel;

  if (!data.connection) {
    try {
      data.connection = await connectToChannel(voiceChannel);
      setupPlayerEvents(guildId);
    } catch (err) {
      await interaction.editReply("ما قدرت أتصل بالروم الصوتي 😕");
      return;
    }
  }

  const query = interaction.options.getString("query");

  try {
    const song = await searchSong(query);
    data.queue.push(song);

    if (!data.playing) {
      await interaction.editReply(`➕ تمت الإضافة: **${song.title}**`);
      playNext(guildId);
    } else {
      await interaction.editReply(`📥 انضافت للطابور: **${song.title}**`);
    }
  } catch (err) {
    await interaction.editReply(`ما قدرت ألقى الأغنية 😕 (${err.message})`);
  }
}

async function handleSkip(interaction) {
  const data = getQueueData(interaction.guild.id);
  if (data.player.state.status === AudioPlayerStatus.Playing) {
    data.player.stop(); // بيشغّل الحدث Idle اللي يشغّل التالي تلقائياً
    await interaction.reply("⏭️ تم تخطي الأغنية");
  } else {
    await interaction.reply("ما فيه أغنية شغالة حالياً");
  }
}

async function handlePause(interaction) {
  const data = getQueueData(interaction.guild.id);
  if (data.player.state.status === AudioPlayerStatus.Playing) {
    data.player.pause();
    await interaction.reply("⏸️ تم الإيقاف المؤقت");
  } else {
    await interaction.reply("ما فيه شي شغال");
  }
}

async function handleResume(interaction) {
  const data = getQueueData(interaction.guild.id);
  if (data.player.state.status === AudioPlayerStatus.Paused) {
    data.player.unpause();
    await interaction.reply("▶️ رجع يشتغل");
  } else {
    await interaction.reply("ما فيه شي متوقف");
  }
}

async function handleStop(interaction) {
  const guildId = interaction.guild.id;
  const data = getQueueData(guildId);
  data.queue = [];
  data.player.stop();

  if (config.stay247) {
    await interaction.reply("⏹️ تم إيقاف التشغيل ومسح الطابور (البوت باقي بالروم)");
  } else if (data.connection) {
    data.connection.destroy();
    data.connection = null;
    await interaction.reply("⏹️ تم الإيقاف وخروج البوت من الروم");
  } else {
    await interaction.reply("⏹️ تم الإيقاف");
  }
}

async function handleQueue(interaction) {
  const data = getQueueData(interaction.guild.id);
  if (data.queue.length === 0) {
    await interaction.reply("الطابور فاضي 📭");
    return;
  }
  const text = data.queue.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
  await interaction.reply(`📜 **الطابور الحالي:**\n${text}`);
}

async function handleLeave(interaction) {
  const guildId = interaction.guild.id;
  const data = getQueueData(guildId);
  if (data.connection) {
    data.connection.destroy();
    data.connection = null;
    data.queue = [];
    await interaction.reply("👋 خرجت من الروم");
  } else {
    await interaction.reply("مو داخل أي روم أصلاً");
  }
}

module.exports = {
  play: handlePlay,
  skip: handleSkip,
  pause: handlePause,
  resume: handleResume,
  stop: handleStop,
  queue: handleQueue,
  leave: handleLeave,
};
