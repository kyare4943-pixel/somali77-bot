import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  VoiceChannel,
  GuildMember,
} from "discord.js";
import { db } from "@workspace/db";
import { invitesTable, gameStatsTable, botSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

const tempVoiceChannels = new Map<string, string>();
const inviteCache = new Map<string, number>();

async function getSettings(guildId: string) {
  const rows = await db.select().from(botSettingsTable).limit(1);
  return rows[0] ?? {
    prefix: "!",
    language: "en",
    logsChannelId: null,
    welcomeChannelId: null,
    voiceEnabled: false,
    voiceCategoryId: null,
    voiceChannelId: null,
    voiceDefaultName: "🎮 {user}'s Channel",
  };
}

client.once("ready", async () => {
  logger.info({ tag: client.user?.tag }, "Discord bot ready");

  const existing = await db.select().from(botSettingsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(botSettingsTable).values({
      prefix: "!",
      language: "en",
      voiceEnabled: false,
      voiceDefaultName: "🎮 {user}'s Channel",
    });
  }

  const gameExisting = await db.select().from(gameStatsTable).limit(1);
  if (gameExisting.length === 0) {
    await db.insert(gameStatsTable).values({
      totalGames: 0,
      hackerWins: 0,
      defenderWins: 0,
      activePlayers: 0,
    });
  }

  for (const [, guild] of client.guilds.cache) {
    try {
      const invites = await guild.invites.fetch();
      invites.forEach((inv) => {
        inviteCache.set(inv.code, inv.uses ?? 0);
      });
    } catch (e) {
      logger.warn({ guildId: guild.id }, "Could not cache invites");
    }
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const settings = await getSettings(newState.guild.id);
  if (!settings.voiceEnabled || !settings.voiceChannelId) return;

  if (newState.channelId === settings.voiceChannelId && newState.member) {
    const member = newState.member;
    const guild = newState.guild;
    const channelName = settings.voiceDefaultName.replace("{user}", member.displayName);

    try {
      const created = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: settings.voiceCategoryId ?? undefined,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers,
            ],
          },
        ],
      });

      tempVoiceChannels.set(created.id, member.id);
      await member.voice.setChannel(created);

      if (settings.logsChannelId) {
        const logCh = guild.channels.cache.get(settings.logsChannelId) as TextChannel | undefined;
        if (logCh) {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🎙️ Voice Channel Created")
            .setDescription(`${member} created **${channelName}**`)
            .setTimestamp();
          logCh.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (e) {
      logger.error({ err: e }, "Failed to create temp voice channel");
    }
  }

  if (oldState.channelId && tempVoiceChannels.has(oldState.channelId)) {
    const ch = oldState.channel as VoiceChannel | null;
    if (ch && ch.members.size === 0) {
      tempVoiceChannels.delete(oldState.channelId);
      ch.delete().catch(() => {});
    }
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const newInvites = await guild.invites.fetch();
    let inviterTag: GuildMember | null = null;
    let inviterCode = "";

    for (const [code, inv] of newInvites) {
      const oldUses = inviteCache.get(code) ?? 0;
      if ((inv.uses ?? 0) > oldUses) {
        inviteCache.set(code, inv.uses ?? 0);
        if (inv.inviter) {
          const settings = await getSettings(guild.id);
          const existing = await db
            .select()
            .from(invitesTable)
            .where(eq(invitesTable.userId, inv.inviter.id));

          if (existing.length > 0) {
            await db
              .update(invitesTable)
              .set({ total: existing[0].total + 1, username: inv.inviter.username })
              .where(eq(invitesTable.userId, inv.inviter.id));
          } else {
            await db.insert(invitesTable).values({
              userId: inv.inviter.id,
              username: inv.inviter.username,
              avatarUrl: inv.inviter.displayAvatarURL(),
              total: 1,
              fake: 0,
              left: 0,
            });
          }

          const updatedRows = await db
            .select()
            .from(invitesTable)
            .where(eq(invitesTable.userId, inv.inviter.id));
          const updated = updatedRows[0];

          if (settings.welcomeChannelId || settings.logsChannelId) {
            const channelId = settings.welcomeChannelId ?? settings.logsChannelId ?? "";
            const ch = guild.channels.cache.get(channelId) as TextChannel | undefined;
            if (ch) {
              const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle("📥 Member Joined")
                .addFields(
                  { name: "👤 User", value: `${member}`, inline: true },
                  { name: "🎉 Invited By", value: `<@${inv.inviter.id}>`, inline: true },
                  { name: "📈 Total Invites", value: `${updated?.total ?? 1}`, inline: true },
                  { name: "🆕 Fake Invites", value: `${updated?.fake ?? 0}`, inline: true },
                  { name: "❌ Left Invites", value: `${updated?.left ?? 0}`, inline: true },
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: "Welcome to the server!" })
                .setTimestamp();
              ch.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }
        break;
      }
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to track invite");
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const existing = await db
      .select()
      .from(invitesTable)
      .where(eq(invitesTable.userId, member.id));

    if (existing.length === 0) return;

    await db
      .update(invitesTable)
      .set({ left: existing[0].left + 1 })
      .where(eq(invitesTable.userId, member.id));
  } catch (e) {}
});

export type GamePhase = "lobby" | "roles" | "planning" | "discussion" | "voting" | "bomb" | "ended";

interface GameSession {
  phase: GamePhase;
  players: Map<string, { role: "hacker" | "defender"; alive: boolean }>;
  hackerTarget: string | null;
  channelId: string;
  guildId: string;
  votes: Map<string, string>;
  timeoutId?: ReturnType<typeof setTimeout>;
}

const gameSessions = new Map<string, GameSession>();

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId } = interaction;
  if (!guildId) return;

  if (commandName === "join") {
    let session = gameSessions.get(guildId);
    if (!session) {
      session = {
        phase: "lobby",
        players: new Map(),
        hackerTarget: null,
        channelId: interaction.channelId,
        guildId,
        votes: new Map(),
      };
      gameSessions.set(guildId, session);
    }

    if (session.phase !== "lobby") {
      await interaction.reply({ content: "❌ Ciyaar hadda socota. Sugso!", ephemeral: true });
      return;
    }

    if (session.players.has(interaction.user.id)) {
      await interaction.reply({ content: "✅ Horay baad u galeen!", ephemeral: true });
      return;
    }

    session.players.set(interaction.user.id, { role: "defender", alive: true });
    await interaction.reply({
      content: `✅ **${interaction.user.username}** waxay galeen lobby! (${session.players.size} ciyaartoy)`,
    });
  }

  if (commandName === "leave") {
    const session = gameSessions.get(guildId);
    if (!session || session.phase !== "lobby") {
      await interaction.reply({ content: "❌ Ma jirto lobby la geli karo.", ephemeral: true });
      return;
    }
    session.players.delete(interaction.user.id);
    await interaction.reply({ content: `👋 **${interaction.user.username}** ayaa ka baxay lobby.` });
  }

  if (commandName === "start") {
    const session = gameSessions.get(guildId);
    if (!session || session.phase !== "lobby") {
      await interaction.reply({ content: "❌ Lobby ma jirto.", ephemeral: true });
      return;
    }
    if (session.players.size < 4) {
      await interaction.reply({ content: "❌ Ugu yaraan 4 qof ayaa loo baahanyahay.", ephemeral: true });
      return;
    }

    const playerIds = Array.from(session.players.keys());
    const hackerCount = Math.max(1, Math.floor(playerIds.length / 5));
    const shuffled = playerIds.sort(() => Math.random() - 0.5);
    const hackers = new Set(shuffled.slice(0, hackerCount));

    for (const [uid, p] of session.players) {
      p.role = hackers.has(uid) ? "hacker" : "defender";
    }

    session.phase = "planning";

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("💣 Hacker Wars — Bilaabmay!")
          .setDescription(
            `**${session.players.size}** qof waxay ku jiraan ciyaarta.\n\n` +
            `**${hackerCount}** Hacker(s) ah oo si qarsoodi ah loo doortay.\n\n` +
            `Qof walba fariin qarsoodi ah ayuu helayaa doorkooda!`
          )
          .setTimestamp(),
      ],
    });

    for (const [uid, p] of session.players) {
      try {
        const user = await client.users.fetch(uid);
        const roleEmbed = new EmbedBuilder()
          .setColor(p.role === "hacker" ? 0xed4245 : 0x57f287)
          .setTitle(p.role === "hacker" ? "💻 Adiga waxaad tahay HACKER!" : "🛡️ Adiga waxaad tahay DEFENDER!")
          .setDescription(
            p.role === "hacker"
              ? "Kala hadal defenders-ka si aadan u muuqan. Bamka qaax!"
              : "Soo hel hackers-ka! Codeey si aad uga saartiid."
          );
        await user.send({ embeds: [roleEmbed] });
      } catch (e) {}
    }

    setTimeout(async () => {
      if (session.phase !== "planning") return;
      session.phase = "discussion";
      const ch = client.channels.cache.get(session.channelId) as TextChannel | undefined;
      if (ch) {
        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xfee75c)
              .setTitle("💬 Doodda — 2 Daqiiqo!")
              .setDescription("Doodda bilaabma! Ciyaartoydu waxay ku doodaan cidda laga shakisan yahay.\nIsticmaal `/vote @qof` si aad u codeeyso."),
          ],
        });
      }
    }, 60000);
  }

  if (commandName === "vote") {
    const session = gameSessions.get(guildId);
    if (!session || session.phase !== "discussion") {
      await interaction.reply({ content: "❌ Hadda cod ma la bixin karo.", ephemeral: true });
      return;
    }
    const target = interaction.options.getUser("target");
    if (!target) {
      await interaction.reply({ content: "❌ Qof dooro.", ephemeral: true });
      return;
    }
    session.votes.set(interaction.user.id, target.id);
    await interaction.reply({ content: `✅ Waxaad codeysay **${target.username}**.`, ephemeral: true });
  }

  if (commandName === "endvote") {
    const session = gameSessions.get(guildId);
    if (!session || session.phase !== "discussion") {
      await interaction.reply({ content: "❌ Codeyn ma socdaayso.", ephemeral: true });
      return;
    }

    const voteCounts = new Map<string, number>();
    for (const [, targetId] of session.votes) {
      voteCounts.set(targetId, (voteCounts.get(targetId) ?? 0) + 1);
    }

    let maxVotes = 0;
    let eliminated = "";
    for (const [uid, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminated = uid;
      }
    }

    if (eliminated) {
      const p = session.players.get(eliminated);
      if (p) p.alive = false;
      const wasHacker = p?.role === "hacker";
      const aliveHackers = Array.from(session.players.values()).filter(
        (x) => x.alive && x.role === "hacker"
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(wasHacker ? 0x57f287 : 0xed4245)
            .setTitle(wasHacker ? "✅ Hacker la helay!" : "❌ Qof caadi ah la saaray!")
            .setDescription(
              `<@${eliminated}> waxaa laga saaray. Doorkooda: **${p?.role ?? "?"}**\n\n` +
              (aliveHackers.length === 0
                ? "🛡️ **Defenders way guuleysteen! Hackers oo dhan la saaray!**"
                : `💣 **${aliveHackers.length} Hacker(s) wali nool.** Bamku waxay isku dayayaan!`)
            ),
        ],
      });

      if (aliveHackers.length === 0) {
        session.phase = "ended";
        gameSessions.delete(guildId);
        await db.update(gameStatsTable).set({
          defenderWins: 1,
          totalGames: 1,
        }).where(eq(gameStatsTable.id, 1));
      } else {
        session.phase = "bomb";
        session.votes.clear();
      }
    }
  }

  if (commandName === "kick") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "❌ Awood kuma lihid.", ephemeral: true });
      return;
    }
    const targetUser = interaction.options.getUser("target");
    if (!targetUser) {
      await interaction.reply({ content: "❌ User ma la helin.", ephemeral: true });
      return;
    }
    const target = interaction.guild?.members.cache.get(targetUser.id);
    if (!target) {
      await interaction.reply({ content: "❌ Member server-ka kuma jirto.", ephemeral: true });
      return;
    }
    await target.kick("Dashboard kick");
    await interaction.reply({ content: `✅ **${targetUser.username}** waa laga saaray server-ka.` });
  }
});

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — Discord bot not started");
    return;
  }

  try {
    await client.login(token);
  } catch (e) {
    logger.error({ err: e }, "Failed to login Discord bot");
  }
}

export function getActiveTempChannels() {
  return Array.from(tempVoiceChannels.entries()).map(([id, ownerId]) => {
    const ch = client.channels.cache.get(id) as VoiceChannel | null;
    return {
      id,
      name: ch?.name ?? "Unknown",
      ownerId,
      memberCount: ch?.members.size ?? 0,
    };
  });
}
