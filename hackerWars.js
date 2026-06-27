"use strict";

/**
 * hackerWars.js — Hacker Wars mini-game
 *
 * Slash commands:
 *   /hacker join      — Lobby ku biir
 *   /hacker leave     — Lobby ka bax
 *   /hacker start     — Bilow ciyaarta (admin/owner)
 *   /hacker endvote   — Dhamee codeynta (admin/owner)
 *   /bomb             — Hackers: bamka dhig (bomb phase)
 *   /defuse <code>    — Defenders: bamka biir tir
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const PHASE = { LOBBY: "lobby", PLANNING: "planning", DISCUSSION: "discussion", BOMB: "bomb", ENDED: "ended" };

const sessions = new Map(); // guildId → session

function getSession(guildId) { return sessions.get(guildId); }

// ── Vote Buttons ──────────────────────────────────────────────────────────────
async function sendVoteButtons(client, session) {
  const ch = client.channels.cache.get(session.channelId);
  if (!ch) return;

  const alivePlayers = [...session.players.entries()].filter(([, p]) => p.alive);
  const rows = [];
  let row = new ActionRowBuilder();
  let count = 0;

  for (const [uid] of alivePlayers) {
    let username = "Unknown";
    try { username = (await client.users.fetch(uid)).username; } catch (_) {}
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("hw_vote_" + uid)
        .setLabel("⚡ " + username)
        .setStyle(ButtonStyle.Danger)
    );
    count++;
    if (count % 5 === 0) { rows.push(row); row = new ActionRowBuilder(); }
  }
  if (count % 5 !== 0) rows.push(row);

  await ch.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🗳️ CODEYNTA — BILAABMAY!")
        .setDescription(
          "**Qofka aad shaki ku qabto dhufo badhanka!**\n" +
          "Qof walba hal cod ayuu leeyahay. Haddaad beddesho, coddaadii hore ayaa beddelma.\n" +
          "👥 " + alivePlayers.length + " qof nool"
        )
        .setTimestamp(),
    ],
    components: rows.slice(0, 5),
  });
}

// ── /hacker join ─────────────────────────────────────────────────────────────
async function handleJoin(interaction) {
  const guildId = interaction.guildId;
  let session = sessions.get(guildId);
  if (!session) {
    session = { phase: PHASE.LOBBY, players: new Map(), votes: new Map(), channelId: interaction.channelId, guildId, bombCode: null, bombMsg: null, bombTimer: null, bombInterval: null };
    sessions.set(guildId, session);
  }
  if (session.phase !== PHASE.LOBBY)
    return interaction.reply({ content: "❌ Ciyaar hadda socota. Sugso waana dhammaanaysaa!", ephemeral: true });
  if (session.players.has(interaction.user.id))
    return interaction.reply({ content: "✅ Horay baad u galeen lobby-ga!", ephemeral: true });

  session.players.set(interaction.user.id, { role: "defender", alive: true });
  return interaction.reply({
    content: "✅ **" + interaction.user.username + "** waxay galeen lobby! (" + session.players.size + " ciyaartoy)\n💡 Admin: `/hacker start` (ugu yaraan 4 qof)",
  });
}

// ── /hacker leave ────────────────────────────────────────────────────────────
async function handleLeave(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.phase !== PHASE.LOBBY)
    return interaction.reply({ content: "❌ Ma jirto lobby la geli karo.", ephemeral: true });
  session.players.delete(interaction.user.id);
  return interaction.reply({ content: "👋 **" + interaction.user.username + "** ayaa ka baxay lobby." });
}

// ── /hacker start ────────────────────────────────────────────────────────────
async function handleStart(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.phase !== PHASE.LOBBY)
    return interaction.reply({ content: "❌ Lobby ma jirto ama horay ayuu u bilaabmay.", ephemeral: true });
  if (session.players.size < 4)
    return interaction.reply({ content: "❌ Ugu yaraan **4 qof** ayaa loo baahanyahay. Hadda: " + session.players.size, ephemeral: true });

  const ids = [...session.players.keys()];
  const hackerCount = Math.max(1, Math.floor(ids.length / 5));
  const hackers = new Set([...ids].sort(() => Math.random() - 0.5).slice(0, hackerCount));
  for (const [uid, p] of session.players) p.role = hackers.has(uid) ? "hacker" : "defender";
  session.phase = PHASE.PLANNING;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("💻 Hacker Wars — Bilaabmay!")
        .setDescription(
          "**" + session.players.size + "** qof waxay ku jiraan ciyaarta.\n" +
          "**" + hackerCount + "** Hacker(s) si qarsoodi ah ayaa loo doortay.\n\n" +
          "📩 Qof walba doorkooda DM ayuu ku helayaa!\n" +
          "⏱️ **60 seconds** planning — kaddib dood + codeyn!"
        )
        .setTimestamp(),
    ],
  });

  // Send roles via DM
  for (const [uid, p] of session.players) {
    try {
      const u = await interaction.client.users.fetch(uid);
      await u.send({
        embeds: [
          new EmbedBuilder()
            .setColor(p.role === "hacker" ? 0xed4245 : 0x57f287)
            .setTitle(p.role === "hacker" ? "💻 Adiga waxaad tahay HACKER!" : "🛡️ Adiga waxaad tahay DEFENDER!")
            .setDescription(
              p.role === "hacker"
                ? "Kala hadal defenders-ka si aadan u muuqan.\nMarkii discussion bilaabmato, codeynta ka bax!\n💡 Bomb phase-ka: `/bomb` ku dhig!"
                : "Soo hel hackers-ka! Codeey si aad uga saartiid.\n💡 Bomb phase-ka: `/defuse <code>` ku biir tir!"
            ),
        ],
      });
    } catch (_) {}
  }

  // Planning → Discussion after 60s
  setTimeout(async () => {
    if (session.phase !== PHASE.PLANNING) return;
    session.phase = PHASE.DISCUSSION;
    const ch = interaction.client.channels.cache.get(session.channelId);
    if (ch) {
      await ch.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xfee75c)
            .setTitle("💬 Doodda — Bilaabmay!")
            .setDescription(
              "Ciyaartoydu waxay ku doodaan cidda laga shakisan yahay.\n" +
              "⬇️ **Hoos u fiiri badhannada codeynta — dhufo qofka aad shaki ku qabto!**"
            ),
        ],
      });
      await sendVoteButtons(interaction.client, session);
    }
  }, 60000);
}

// ── /hacker endvote ──────────────────────────────────────────────────────────
async function handleEndVote(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.phase !== PHASE.DISCUSSION)
    return interaction.reply({ content: "❌ Codeyn ma socdaayso.", ephemeral: true });

  const counts = new Map();
  for (const targetId of session.votes.values())
    counts.set(targetId, (counts.get(targetId) || 0) + 1);

  let maxVotes = 0, eliminated = null;
  for (const [uid, n] of counts) { if (n > maxVotes) { maxVotes = n; eliminated = uid; } }

  if (!eliminated)
    return interaction.reply({ content: "❌ Wax cod ah lama bixin!", ephemeral: true });

  const p = session.players.get(eliminated);
  if (p) p.alive = false;
  const wasHacker = p?.role === "hacker";
  const aliveHackers = [...session.players.values()].filter((x) => x.alive && x.role === "hacker");

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(wasHacker ? 0x57f287 : 0xed4245)
        .setTitle(wasHacker ? "✅ Hacker la helay!" : "❌ Qof caadi ah la saaray!")
        .setDescription(
          "<@" + eliminated + "> waxaa laga saaray. Doorkooda: **" + (p?.role || "?") + "**\n\n" +
          (aliveHackers.length === 0
            ? "🛡️ **DEFENDERS WAY GUULEYSTEEN! Hackers oo dhan la saaray!**"
            : "💣 **" + aliveHackers.length + " Hacker(s) wali nool.** Bomb phase bilaabmaysaa!")
        ),
    ],
  });

  if (aliveHackers.length === 0) {
    session.phase = PHASE.ENDED;
    sessions.delete(interaction.guildId);
  } else {
    session.phase = PHASE.BOMB;
    session.votes.clear();
  }
}

// ── /bomb ─────────────────────────────────────────────────────────────────────
async function handleBomb(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.phase !== PHASE.BOMB)
    return interaction.reply({ content: "❌ Bamka ma dhigi kartid. Waxaa loo baahanyahay bomb phase.", ephemeral: true });
  const player = session.players.get(interaction.user.id);
  if (!player || player.role !== "hacker" || !player.alive)
    return interaction.reply({ content: "❌ Hackers kaliya ayaa bamka dhigi kara!", ephemeral: true });
  if (session.bombCode)
    return interaction.reply({ content: "❌ Bamku horay ayuu u dhacay!", ephemeral: true });

  const code = String(Math.floor(1000 + Math.random() * 9000));
  session.bombCode = code;
  const DURATION = 60;
  let remaining = DURATION;

  const bar = (s) => "🔴 " + "█".repeat(Math.ceil((s / DURATION) * 10)) + "░".repeat(10 - Math.ceil((s / DURATION) * 10));
  const makeEmbed = (s, defused, exploded) =>
    new EmbedBuilder()
      .setColor(defused ? 0x57f287 : exploded ? 0xed4245 : 0xff6b35)
      .setTitle(defused ? "✅ BAMKU WAA LA BIIR TIRAY!" : exploded ? "💥 BAMKU MEESHII BOODAY!" : "💣 BAMKU WAXAA LA DHIGAY!")
      .setDescription(
        defused ? "🛡️ **Defenders way guuleysteen!** Bamkii si xirfad leh ayaa loo biir tiray!" :
        exploded ? "💀 **Hackers way guuleysteen!** Bamkii wuxuu qarxay — la jabiyay!" :
        "⚠️ **Bamka waxaa la dhigay!**\n🔢 Defenders: isticmaal `/defuse <code>`\n⏱️ **" + s + " seconds**\n" + bar(s)
      )
      .setTimestamp();

  await interaction.reply({ content: "💣 Bamka waxaad ku dhigtay channel-ka!", ephemeral: true });

  const ch = interaction.client.channels.cache.get(session.channelId);
  if (!ch) return;
  const msg = await ch.send({ embeds: [makeEmbed(remaining, false, false)] });
  session.bombMsg = msg;

  // DM defenders with code
  for (const [uid, p] of session.players) {
    if (p.role !== "defender" || !p.alive) continue;
    try {
      const u = await interaction.client.users.fetch(uid);
      await u.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff6b35)
            .setTitle("🚨 XAALADDA DEGDEG AH — BAMKA BIIR TIR!")
            .setDescription("💣 **Bamku waxaa la dhigay!**\n🔢 Koodka sirta ah: **`" + code + "`**\n\nDegdeg channel-ka ugu tag:\n`/defuse " + code + "`"),
        ],
      });
    } catch (_) {}
  }

  // Countdown every 10s
  session.bombInterval = setInterval(async () => {
    remaining -= 10;
    if (remaining <= 0 || !session.bombCode) { clearInterval(session.bombInterval); return; }
    try { await msg.edit({ embeds: [makeEmbed(remaining, false, false)] }); } catch (_) {}
  }, 10000);

  // Explode after DURATION
  session.bombTimer = setTimeout(async () => {
    clearInterval(session.bombInterval);
    if (!session.bombCode) return;
    session.bombCode = null;
    session.phase = PHASE.ENDED;
    sessions.delete(interaction.guildId);
    try { await msg.edit({ embeds: [makeEmbed(0, false, true)] }); } catch (_) {}
    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("💥 HACKERS WAY GUULEYSTEEN!")
          .setDescription("Bamkii wuxuu qarxay! Defenders-kii waxay ku guuldareysteen.\n\n🎮 `/hacker join` si aad mar kale u ciyaarto!"),
      ],
    });
  }, DURATION * 1000);
}

// ── /defuse ───────────────────────────────────────────────────────────────────
async function handleDefuse(interaction) {
  const session = sessions.get(interaction.guildId);
  if (!session || session.phase !== PHASE.BOMB || !session.bombCode)
    return interaction.reply({ content: "❌ Hadda biir tir ma jirto.", ephemeral: true });
  const player = session.players.get(interaction.user.id);
  if (!player || player.role !== "defender" || !player.alive)
    return interaction.reply({ content: "❌ Defenders kaliya ayaa bamka biir tiri kara!", ephemeral: true });

  const guess = interaction.options.getString("code", true).trim();
  if (guess !== session.bombCode) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("❌ KOODKA KHALDAN!")
          .setDescription("Koodka `" + guess + "` khaldan! Isku day mar kale — degdeg!"),
      ],
      ephemeral: true,
    });
  }

  // Correct!
  clearTimeout(session.bombTimer);
  clearInterval(session.bombInterval);
  const savedCode = session.bombCode;
  session.bombCode = null;
  session.phase = PHASE.ENDED;

  if (session.bombMsg) {
    try {
      await session.bombMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✅ BAMKU WAA LA BIIR TIRAY!")
            .setDescription("🛡️ <@" + interaction.user.id + "> ayaa bamka si guul leh u biir tiray!\n🎉 **Defenders way guuleysteen!**")
            .setTimestamp(),
        ],
      });
    } catch (_) {}
  }

  sessions.delete(interaction.guildId);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🎉 DEFENDERS WAY GUULEYSTEEN!")
        .setDescription("✅ <@" + interaction.user.id + "> ayaa bamka biir tiray!\n💪 Server-ka waa la badbaadiyay!\n\n🎮 `/hacker join` si aad mar kale u ciyaarto!"),
    ],
  });
}

// ── Vote Button Handler ───────────────────────────────────────────────────────
async function handleVoteButton(interaction) {
  const guildId = interaction.guildId;
  const session = sessions.get(guildId);
  if (!session || session.phase !== PHASE.DISCUSSION)
    return interaction.reply({ content: "❌ Hadda codeyn ma socoto.", ephemeral: true });

  const voterId = interaction.user.id;
  if (!session.players.has(voterId) || !session.players.get(voterId).alive)
    return interaction.reply({ content: "❌ Adigoo nool baad codeyn kartaa.", ephemeral: true });

  const targetId = interaction.customId.replace("hw_vote_", "");
  if (!session.players.has(targetId) || !session.players.get(targetId).alive)
    return interaction.reply({ content: "❌ Qofkaas ciyaarta kuma jiro.", ephemeral: true });

  const alreadyVoted = session.votes.has(voterId);
  session.votes.set(voterId, targetId);

  let targetName = targetId;
  try { targetName = (await interaction.client.users.fetch(targetId)).username; } catch (_) {}

  return interaction.reply({
    content: alreadyVoted
      ? "🔄 Coddaadii waxaa loo beddelay **" + targetName + "**."
      : "✅ Waxaad codeysay **" + targetName + "**.",
    ephemeral: true,
  });
}

// ── Slash command definitions ─────────────────────────────────────────────────
const { SlashCommandBuilder } = require("discord.js");

const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName("hacker")
    .setDescription("Hacker Wars ciyaarta")
    .addSubcommand((s) => s.setName("join").setDescription("Lobby ku biir"))
    .addSubcommand((s) => s.setName("leave").setDescription("Lobby ka bax"))
    .addSubcommand((s) => s.setName("start").setDescription("Bilow ciyaarta (admin)"))
    .addSubcommand((s) => s.setName("endvote").setDescription("Dhamee codeynta (admin)"))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("bomb")
    .setDescription("💣 Bamka dhig! — Hackers kaliya (bomb phase)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("defuse")
    .setDescription("🛡️ Bamka biir tir! — Defenders kaliya")
    .addStringOption((o) => o.setName("code").setDescription("Koodka sirta ah ee bamka").setRequired(true))
    .toJSON(),
];

module.exports = {
  SLASH_COMMANDS,
  handleJoin,
  handleLeave,
  handleStart,
  handleEndVote,
  handleBomb,
  handleDefuse,
  handleVoteButton,
  getSession,
};
