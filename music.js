"use strict";
/**
 * music.js — YouTube Music Player v2
 * Uses @discordjs/voice + play-dl
 * Safe: if packages missing, returns friendly error
 */

let voice, playdl;
try {
  voice  = require("@discordjs/voice");
  playdl = require("play-dl");
} catch (e) {
  voice  = null;
  playdl = null;
}

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const MISSING = "❌ **Music packages la'yihiin!**\nServer-kaaga ku run: `npm install` dabadeed bot dib u bilow.";

const queues = new Map();

function isYT(s) {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/.test(s);
}
function fmtDur(sec) {
  if (!sec) return "Live";
  return Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");
}

function npEmbed(song, qLen) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("🎵 Now Playing")
    .setDescription("**[" + song.title + "](" + song.url + ")**")
    .setThumbnail(song.thumb)
    .addFields(
      { name: "⏱️ Mudada",   value: song.dur,             inline: true },
      { name: "👤 Codsaday", value: "<@" + song.by + ">", inline: true },
      { name: "📋 Queue",    value: qLen + " hees",        inline: true },
    )
    .setFooter({ text: "somali77 Music 🎶" })
    .setTimestamp();
}

function mkBtns(paused) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pr")
      .setLabel(paused ? "▶️ Resume" : "⏸️ Pause")
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("music_skip").setLabel("⏭️ Skip").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_stop").setLabel("⏹️ Stop").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("music_queue").setLabel("📋 Queue").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("music_np").setLabel("🎵 Info").setStyle(ButtonStyle.Secondary),
  );
}

async function doPlay(guildId, textCh) {
  const sv = queues.get(guildId);
  if (!sv || !sv.songs.length) {
    if (sv) {
      setTimeout(() => {
        const s2 = queues.get(guildId);
        if (!s2 || !s2.songs.length) {
          try { s2 && s2.connection && s2.connection.destroy(); } catch (_) {}
          queues.delete(guildId);
          textCh.send("👋 Queue dhammaatay — voice ka baxay.").catch(() => {});
        }
      }, 30000);
    }
    return;
  }

  const song = sv.songs[0];
  let stream;
  try {
    stream = await playdl.stream(song.url, { quality: 2 });
  } catch (e) {
    textCh.send("❌ Load kari waayay: **" + song.title + "**").catch(() => {});
    sv.songs.shift();
    return doPlay(guildId, textCh);
  }

  const resource = voice.createAudioResource(stream.stream, { inputType: stream.type });
  sv.player.play(resource);

  const embed   = npEmbed(song, sv.songs.length - 1);
  const buttons = mkBtns(false);

  if (sv.npMsg) {
    sv.npMsg = await sv.npMsg.edit({ embeds: [embed], components: [buttons] }).catch(
      () => textCh.send({ embeds: [embed], components: [buttons] })
    );
  } else {
    sv.npMsg = await textCh.send({ embeds: [embed], components: [buttons] });
  }
}

async function handlePlay(message, args) {
  if (!voice || !playdl) return message.reply(MISSING);

  const query = args.join(" ").trim();
  if (!query) return message.reply("❌ `!play <YouTube link ama magaca heesta>`");

  const voiceCh = message.member && message.member.voice && message.member.voice.channel;
  if (!voiceCh) return message.reply("❌ **Voice channel** ku biir marka hore!");

  let url = query;
  if (!isYT(query)) {
    const sm = await message.reply("🔍 Baadhaya...").catch(() => null);
    try {
      const res = await playdl.search(query, { limit: 1, source: { youtube: "video" } });
      if (sm) sm.delete().catch(() => {});
      if (!res || !res.length) return message.reply("❌ Wax lama helin: " + query);
      url = res[0].url;
    } catch (e) {
      if (sm) sm.delete().catch(() => {});
      return message.reply("❌ Search khalad: " + e.message);
    }
  }

  let info;
  try {
    const vi = await playdl.video_info(url);
    const v  = vi.video_details;
    const th = v.thumbnails || [];
    info = {
      title: v.title  || "Magac la'aan",
      url:   v.url,
      thumb: th.length ? th[th.length - 1].url : "",
      dur:   fmtDur(v.durationInSec),
      by:    message.author.id,
    };
  } catch (e) {
    return message.reply("❌ Video info la heli waayay: " + e.message);
  }

  let sv = queues.get(message.guild.id);
  if (!sv) {
    const connection = voice.joinVoiceChannel({
      channelId:      voiceCh.id,
      guildId:        message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
      selfDeaf:       true,
    });
    const player = voice.createAudioPlayer({
      behaviors: { noSubscriber: voice.NoSubscriberBehavior.Pause },
    });
    connection.subscribe(player);
    sv = { songs: [], player, connection, npMsg: null };
    queues.set(message.guild.id, sv);

    player.on(voice.AudioPlayerStatus.Idle, () => {
      const s = queues.get(message.guild.id);
      if (s) { s.songs.shift(); doPlay(message.guild.id, message.channel); }
    });
    player.on("error", (e) => {
      console.error("Music error: " + e.message);
      const s = queues.get(message.guild.id);
      if (s) { s.songs.shift(); doPlay(message.guild.id, message.channel); }
    });
    connection.on(voice.VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          voice.entersState(connection, voice.VoiceConnectionStatus.Signalling, 5000),
          voice.entersState(connection, voice.VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch (_) { connection.destroy(); queues.delete(message.guild.id); }
    });
  }

  sv.songs.push(info);

  if (sv.songs.length === 1) {
    await doPlay(message.guild.id, message.channel);
  } else {
    await message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x5865f2)
          .setTitle("📋 Queue-ga La Daray")
          .setDescription("**[" + info.title + "](" + info.url + ")**")
          .addFields(
            { name: "⏱️ Mudada",   value: info.dur,              inline: true },
            { name: "📋 Tartanka", value: "#" + sv.songs.length, inline: true },
          )
          .setThumbnail(info.thumb).setTimestamp(),
      ],
    });
  }
}

async function handlePause(message) {
  if (!voice) return message.reply(MISSING);
  const sv = queues.get(message.guild.id);
  if (!sv) return message.reply("❌ Music ma jirto.");
  if (sv.player.state.status === voice.AudioPlayerStatus.Paused) return message.reply("⏸️ Horay waa la joojiyay.");
  sv.player.pause();
  await message.reply("⏸️ **Music waa la joojiyay.**");
  if (sv.npMsg) sv.npMsg.edit({ components: [mkBtns(true)] }).catch(() => {});
}

async function handleResume(message) {
  if (!voice) return message.reply(MISSING);
  const sv = queues.get(message.guild.id);
  if (!sv) return message.reply("❌ Music ma jirto.");
  if (sv.player.state.status !== voice.AudioPlayerStatus.Paused) return message.reply("▶️ Music horay u socotaa.");
  sv.player.unpause();
  await message.reply("▶️ **Music waa sii socotaa.**");
  if (sv.npMsg) sv.npMsg.edit({ components: [mkBtns(false)] }).catch(() => {});
}

async function handleSkip(message) {
  if (!voice) return message.reply(MISSING);
  const sv = queues.get(message.guild.id);
  if (!sv || !sv.songs.length) return message.reply("❌ Queue madhan yahay.");
  await message.reply("⏭️ **Skipped:** " + sv.songs[0].title);
  sv.player.stop();
}

async function handleStop(message) {
  if (!voice) return message.reply(MISSING);
  const sv = queues.get(message.guild.id);
  if (!sv) return message.reply("❌ Music ma jirto.");
  sv.songs = [];
  sv.player.stop();
  sv.connection.destroy();
  queues.delete(message.guild.id);
  await message.reply("⏹️ **Music waa la joojiyay. Voice ka baxay.**");
}

async function handleMusicQueue(message) {
  if (!voice) return message.reply(MISSING);
  const sv = queues.get(message.guild.id);
  if (!sv || !sv.songs.length) return message.reply("📋 Queue madhan yahay.");
  const list = sv.songs.slice(0, 10).map((s, i) =>
    "**" + (i === 0 ? "▶️" : i + ".") + "** [" + s.title + "](" + s.url + ") — `" + s.dur + "`"
  ).join("\n");
  await message.reply({
    embeds: [
      new EmbedBuilder().setColor(0x5865f2).setTitle("📋 Music Queue")
        .setDescription(list)
        .setFooter({ text: sv.songs.length + " heesood" }).setTimestamp(),
    ],
  });
}

async function handleMusicButton(interaction) {
  if (!voice) return interaction.reply({ content: MISSING, ephemeral: true });
  const id = interaction.customId;
  const sv = queues.get(interaction.guild.id);
  if (!sv) return interaction.reply({ content: "❌ Music ma socoto.", ephemeral: true });

  if (id === "music_pr") {
    const paused = sv.player.state.status === voice.AudioPlayerStatus.Paused;
    paused ? sv.player.unpause() : sv.player.pause();
    await interaction.reply({ content: paused ? "▶️ Waa sii socotaa." : "⏸️ Waa la joojiyay.", ephemeral: true });
    if (sv.npMsg) sv.npMsg.edit({ components: [mkBtns(!paused)] }).catch(() => {});
    return;
  }
  if (id === "music_skip") {
    if (!sv.songs.length) return interaction.reply({ content: "❌ Queue madhan.", ephemeral: true });
    await interaction.reply({ content: "⏭️ Skipped: **" + sv.songs[0].title + "**", ephemeral: true });
    sv.player.stop(); return;
  }
  if (id === "music_stop") {
    sv.songs = []; sv.player.stop(); sv.connection.destroy(); queues.delete(interaction.guild.id);
    await interaction.reply({ content: "⏹️ Music waa la joojiyay.", ephemeral: true });
    if (sv.npMsg) sv.npMsg.edit({ components: [] }).catch(() => {}); return;
  }
  if (id === "music_queue") {
    if (!sv.songs.length) return interaction.reply({ content: "📋 Queue madhan.", ephemeral: true });
    const list = sv.songs.slice(0, 10).map((s, i) =>
      "**" + (i === 0 ? "▶️" : i + ".") + "** " + s.title + " — `" + s.dur + "`"
    ).join("\n");
    return interaction.reply({ content: "📋 **Queue:**\n" + list, ephemeral: true });
  }
  if (id === "music_np") {
    if (!sv.songs.length) return interaction.reply({ content: "❌ Hees ma socoto.", ephemeral: true });
    return interaction.reply({ embeds: [npEmbed(sv.songs[0], sv.songs.length - 1)], ephemeral: true });
  }
}

module.exports = { handlePlay, handlePause, handleResume, handleSkip, handleStop, handleMusicQueue, handleMusicButton };
