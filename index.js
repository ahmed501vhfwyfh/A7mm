require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------- Player setup ----------
const player = new Player(client);

(async () => {
  try {
    // Load all default extractors (SoundCloud, Spotify metadata, YouTube, etc.)
    await player.extractors.loadDefault();
    console.log('Default extractors loaded:', [...player.extractors.store.keys()]);
  } catch (err) {
    console.error('فشل تحميل المكتبات الافتراضية:', err);
  }

  console.log('المكتبات المسجلة النهائية:', [...player.extractors.store.keys()]);
})();

// ---------- Control panel buttons ----------
function controlRow(paused) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ctrl_pauseresume').setEmoji(paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ctrl_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ctrl_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ctrl_queue').setEmoji('📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ctrl_volume_down').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
  );
}

player.events.on('playerStart', (queue, track) => {
  queue.metadata.channel.send({
    content: `▶️ الآن يشتغل: **${track.title}**`,
    components: [controlRow(false)],
  });
});

player.events.on('audioTrackAdd', (queue, track) => {
  queue.metadata.channel.send(`➕ تمت إضافة: **${track.title}** للقائمة`);
});

player.events.on('emptyQueue', (queue) => {
  queue.metadata.channel.send('✅ انتهت القائمة.');
});

player.events.on('error', (queue, error) => {
  console.error('Player error:', error);
  queue.metadata.channel.send(`❌ صار خطأ: ${error.message}`);
});

player.events.on('playerError', (queue, error) => {
  console.error('PlayerError:', error);
  queue.metadata.channel.send(`❌ خطأ بالتشغيل: ${error.message}`);
});

// ---------- Slash commands ----------
const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('شغّل أغنية أو ضيفها للقائمة')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('اسم الأغنية أو رابط يوتيوب/ساوندكلاود')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('تخطي الأغنية الحالية'),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('إيقاف مؤقت'),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('استئناف التشغيل'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('إيقاف التشغيل ومسح القائمة'),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('عرض قائمة الانتظار'),
  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('عرض الأغنية الحالية'),
  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('ضبط مستوى الصوت (0-100)')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('نسبة الصوت')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)),
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

// ---------- Ready ----------
client.once('ready', async () => {
  console.log(`${client.user.tag} جاهز.`);
  await registerCommands();
  await join247Channel();
});

// ---------- 24/7 auto-join ----------
async function join247Channel() {
  const guildId = process.env.GUILD_ID;
  const channelId = process.env.CHANNEL_ID;

  if (!guildId || !channelId) {
    console.log('GUILD_ID أو CHANNEL_ID غير موجودين، تخطي وضع 24/7.');
    return;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isVoiceBased()) {
      console.log('الروم المحدد ليس روم صوتي أو غير موجود.');
      return;
    }

    // Pick a text channel for status messages (system channel or first available)
    const textChannel = guild.systemChannel
      || guild.channels.cache.find(c => c.isTextBased() && c.viewable);

    const queue = player.nodes.create(guild, {
      metadata: { channel: textChannel },
      selfDeaf: true,
      volume: 80,
      leaveOnEmpty: false,
      leaveOnEnd: false,
      leaveOnStop: false,
    });

    if (!queue.connection) {
      await queue.connect(channel);
    }

    console.log(`تم الاتصال بروم 24/7: ${channel.name}`);
  } catch (err) {
    console.error('فشل الاتصال بروم 24/7:', err);
  }
}

// ---------- Button controls ----------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const queue = player.nodes.get(interaction.guild.id);
  if (!queue) {
    return interaction.reply({ content: 'ما فيه شي يشتغل حاليًا.', ephemeral: true });
  }

  if (!interaction.member.voice.channel) {
    return interaction.reply({ content: 'لازم تكون داخل روم صوتي عشان تتحكم بالبوت.', ephemeral: true });
  }

  try {
    if (interaction.customId === 'ctrl_pauseresume') {
      const paused = queue.node.isPaused();
      queue.node.setPaused(!paused);
      return interaction.reply({ content: paused ? '▶️ تم الاستئناف.' : '⏸️ تم الإيقاف المؤقت.', ephemeral: true });
    }

    if (interaction.customId === 'ctrl_skip') {
      queue.node.skip();
      return interaction.reply({ content: '⏭️ تم التخطي.', ephemeral: true });
    }

    if (interaction.customId === 'ctrl_stop') {
      queue.delete();
      return interaction.reply({ content: '⏹️ تم إيقاف التشغيل ومسح القائمة.', ephemeral: true });
    }

    if (interaction.customId === 'ctrl_queue') {
      if (queue.tracks.size === 0) return interaction.reply({ content: 'القائمة فاضية.', ephemeral: true });
      const tracks = queue.tracks.toArray().slice(0, 10)
        .map((t, i) => `${i + 1}. ${t.title}`)
        .join('\n');
      const embed = new EmbedBuilder().setTitle('قائمة الانتظار').setDescription(tracks).setColor('Random');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === 'ctrl_volume_down') {
      const newVolume = Math.max(0, queue.node.volume - 10);
      queue.node.setVolume(newVolume);
      return interaction.reply({ content: `🔉 مستوى الصوت: ${newVolume}%`, ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: `❌ صار خطأ: ${err.message}`, ephemeral: true });
  }
});

// ---------- Interaction handling ----------
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member, guild, channel } = interaction;

  // Commands that need the user in a voice channel
  const needsVoice = ['play', 'skip', 'pause', 'resume', 'stop', 'volume'];
  if (needsVoice.includes(commandName) && !member.voice.channel) {
    return interaction.reply({ content: 'لازم تكون داخل روم صوتي عشان تستخدم هذا الأمر.', ephemeral: true });
  }

  try {
    if (commandName === 'play') {
      await interaction.deferReply();
      const query = interaction.options.getString('query', true);

      const { track } = await player.play(member.voice.channel, query, {
        nodeOptions: {
          metadata: { channel },
          selfDeaf: true,
          volume: 80,
          leaveOnEmpty: false,
          leaveOnEnd: false,
          leaveOnStop: false,
        },
      });

      return interaction.editReply(`🔎 جارٍ إضافة: **${track.title}**`);
    }

    const queue = player.nodes.get(guild.id);

    if (commandName === 'skip') {
      if (!queue || !queue.isPlaying()) return interaction.reply({ content: 'ما فيه شي يشتغل حاليًا.', ephemeral: true });
      queue.node.skip();
      return interaction.reply('⏭️ تم التخطي.');
    }

    if (commandName === 'pause') {
      if (!queue || !queue.isPlaying()) return interaction.reply({ content: 'ما فيه شي يشتغل حاليًا.', ephemeral: true });
      queue.node.setPaused(true);
      return interaction.reply('⏸️ تم الإيقاف المؤقت.');
    }

    if (commandName === 'resume') {
      if (!queue) return interaction.reply({ content: 'ما فيه قائمة تشغيل حاليًا.', ephemeral: true });
      queue.node.setPaused(false);
      return interaction.reply('▶️ تم الاستئناف.');
    }

    if (commandName === 'stop') {
      if (!queue) return interaction.reply({ content: 'ما فيه قائمة تشغيل حاليًا.', ephemeral: true });
      queue.delete();
      return interaction.reply('⏹️ تم إيقاف التشغيل ومسح القائمة.');
    }

    if (commandName === 'volume') {
      if (!queue) return interaction.reply({ content: 'ما فيه قائمة تشغيل حاليًا.', ephemeral: true });
      const level = interaction.options.getInteger('level', true);
      queue.node.setVolume(level);
      return interaction.reply(`🔊 مستوى الصوت: ${level}%`);
    }

    if (commandName === 'queue') {
      if (!queue || queue.tracks.size === 0) return interaction.reply({ content: 'القائمة فاضية.', ephemeral: true });
      const tracks = queue.tracks.toArray().slice(0, 10)
        .map((t, i) => `${i + 1}. ${t.title}`)
        .join('\n');
      const embed = new EmbedBuilder()
        .setTitle('قائمة الانتظار')
        .setDescription(tracks)
        .setColor('Random');
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'nowplaying') {
      if (!queue || !queue.currentTrack) return interaction.reply({ content: 'ما فيه شي يشتغل حاليًا.', ephemeral: true });
      return interaction.reply(`🎶 الآن يشتغل: **${queue.currentTrack.title}**`);
    }
  } catch (err) {
    console.error(err);
    const msg = `❌ صار خطأ: ${err.message}`;
    if (interaction.deferred || interaction.replied) {
      interaction.editReply(msg);
    } else {
      interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
