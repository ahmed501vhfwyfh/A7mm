package com.musicbot;

import net.dv8tion.jda.api.entities.Guild;
import net.dv8tion.jda.api.entities.channel.concrete.VoiceChannel;
import net.dv8tion.jda.api.events.interaction.command.SlashCommandInteractionEvent;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.managers.AudioManager;

public class CommandListener extends ListenerAdapter {

    private final MusicManager musicManager;

    public CommandListener(MusicManager musicManager) {
        this.musicManager = musicManager;
    }

    @Override
    public void onSlashCommandInteraction(SlashCommandInteractionEvent event) {
        Guild guild = event.getGuild();
        if (guild == null) return;

        switch (event.getName()) {
            case "play" -> handlePlay(event, guild);
            case "skip" -> handleSkip(event, guild);
            case "pause" -> handlePause(event, guild);
            case "resume" -> handleResume(event, guild);
            case "stop" -> handleStop(event, guild);
            case "queue" -> handleQueue(event, guild);
            case "leave" -> handleLeave(event, guild);
        }
    }

    private void handlePlay(SlashCommandInteractionEvent event, Guild guild) {
        var member = event.getMember();
        if (member == null || member.getVoiceState() == null || !member.getVoiceState().inAudioChannel()) {
            event.reply("لازم تكون داخل روم صوتي عشان تستخدم هالأمر ❌").queue();
            return;
        }

        VoiceChannel channel = member.getVoiceState().getChannel().asVoiceChannel();
        AudioManager audioManager = guild.getAudioManager();
        if (!audioManager.isConnected()) {
            audioManager.openAudioConnection(channel);
        }

        String query = event.getOption("query").getAsString();
        event.deferReply().queue();

        musicManager.loadAndPlay(guild, query,
                title -> event.getHook().sendMessage("🎶 تمت الإضافة/التشغيل: **" + title + "**").queue(),
                error -> event.getHook().sendMessage("ما قدرت ألقى الأغنية 😕 (" + error + ")").queue()
        );
    }

    private void handleSkip(SlashCommandInteractionEvent event, Guild guild) {
        GuildMusicManager gm = musicManager.getGuildMusicManager(guild);
        if (gm.player.getPlayingTrack() != null) {
            gm.scheduler.skip();
            event.reply("⏭️ تم تخطي الأغنية").queue();
        } else {
            event.reply("ما فيه أغنية شغالة حالياً").queue();
        }
    }

    private void handlePause(SlashCommandInteractionEvent event, Guild guild) {
        GuildMusicManager gm = musicManager.getGuildMusicManager(guild);
        gm.player.setPaused(true);
        event.reply("⏸️ تم الإيقاف المؤقت").queue();
    }

    private void handleResume(SlashCommandInteractionEvent event, Guild guild) {
        GuildMusicManager gm = musicManager.getGuildMusicManager(guild);
        gm.player.setPaused(false);
        event.reply("▶️ رجع يشتغل").queue();
    }

    private void handleStop(SlashCommandInteractionEvent event, Guild guild) {
        GuildMusicManager gm = musicManager.getGuildMusicManager(guild);
        gm.scheduler.clear();
        gm.player.stopTrack();
        guild.getAudioManager().closeAudioConnection();
        event.reply("⏹️ تم الإيقاف وخروج البوت من الروم").queue();
    }

    private void handleQueue(SlashCommandInteractionEvent event, Guild guild) {
        GuildMusicManager gm = musicManager.getGuildMusicManager(guild);
        if (gm.scheduler.queue.isEmpty()) {
            event.reply("الطابور فاضي 📭").queue();
            return;
        }
        StringBuilder sb = new StringBuilder("📜 **الطابور الحالي:**\n");
        int i = 1;
        for (var track : gm.scheduler.queue) {
            sb.append(i++).append(". ").append(track.getInfo().title).append("\n");
        }
        event.reply(sb.toString()).queue();
    }

    private void handleLeave(SlashCommandInteractionEvent event, Guild guild) {
        AudioManager audioManager = guild.getAudioManager();
        if (audioManager.isConnected()) {
            audioManager.closeAudioConnection();
            event.reply("👋 خرجت من الروم").queue();
        } else {
            event.reply("مو داخل أي روم أصلاً").queue();
        }
    }
}
