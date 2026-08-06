package com.musicbot;

import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.requests.GatewayIntent;

public class Bot {

    // ضع التوكن حقك هنا (من Discord Developer Portal)
    public static final String TOKEN = "ضع_التوكن_حقك_هنا";

    public static void main(String[] args) throws InterruptedException {
        MusicManager musicManager = new MusicManager();

        JDA jda = JDABuilder.createDefault(TOKEN)
                .enableIntents(GatewayIntent.GUILD_VOICE_STATES)
                .addEventListeners(new CommandListener(musicManager))
                .build();

        jda.awaitReady();

        // تسجيل أوامر Slash
        jda.updateCommands().addCommands(
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("play", "شغّل أغنية أو ضيفها للطابور")
                        .addOption(net.dv8tion.jda.api.interactions.commands.OptionType.STRING, "query", "اسم الأغنية أو رابط يوتيوب", true),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("skip", "تخطي الأغنية الحالية"),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("pause", "إيقاف الأغنية مؤقتاً"),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("resume", "استكمال التشغيل"),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("stop", "إيقاف التشغيل ومسح الطابور"),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("queue", "عرض طابور الأغاني"),
                net.dv8tion.jda.api.interactions.commands.build.Commands.slash("leave", "طرد البوت من الروم الصوتي")
        ).queue();

        System.out.println("✅ البوت شغال باسم: " + jda.getSelfUser().getName());
    }
}
