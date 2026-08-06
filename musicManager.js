const {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const play = require("play-dl");

// كل سيرفر عنده كائن خاص فيه: { connection, player, queue, textChannel }
const guildQueues = new Map();

function getQueueData(guildId) {
  if (!guildQueues.has(guildId)) {
    guildQueues.set(guildId, {
      connection: null,
      player: createAudioPlayer(),
      queue: [], // كل عنصر: { title, url }
      textChannel: null,
      playing: false,
    });
  }
  return guildQueues.get(guildId);
}

async function connectToChannel(voiceChannel) {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (err) {
    connection.destroy();
    throw err;
  }

  return connection;
}

async function searchSong(query) {
  let url;
  if (play.yt_validate(query) === "video") {
    url = query;
  } else {
    const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
    if (!results || results.length === 0) {
      throw new Error("ما لقيت نتائج للبحث");
    }
    url = results[0].url;
  }

  const info = await play.video_basic_info(url);
  return {
    title: info.video_details.title,
    url: info.video_details.url,
  };
}

async function playNext(guildId) {
  const data = getQueueData(guildId);

  if (data.queue.length === 0) {
    data.playing = false;
    return;
  }

  const song = data.queue.shift();
  data.playing = true;

  try {
    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    data.player.play(resource);

    if (data.textChannel) {
      data.textChannel.send(`🎶 الحين يشتغل: **${song.title}**`);
    }
  } catch (err) {
    if (data.textChannel) {
      data.textChannel.send(`⚠️ صار خطأ بتشغيل **${song.title}**، أتخطاها...`);
    }
    playNext(guildId);
  }
}

function setupPlayerEvents(guildId) {
  const data = getQueueData(guildId);

  data.player.removeAllListeners();
  data.player.on(AudioPlayerStatus.Idle, () => {
    playNext(guildId);
  });
  data.player.on("error", (error) => {
    console.error(`خطأ بالمشغل (سيرفر ${guildId}):`, error.message);
    playNext(guildId);
  });

  if (data.connection) {
    data.connection.subscribe(data.player);
  }
}

module.exports = {
  guildQueues,
  getQueueData,
  connectToChannel,
  searchSong,
  playNext,
  setupPlayerEvents,
};
