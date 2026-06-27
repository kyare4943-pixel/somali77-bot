"use strict";
/**
 * invite.js — Invite Tracker v1
 * Tracks who invited each member, shows !invites, leaderboard, reset
 */

const { EmbedBuilder } = require("discord.js");

// guildId -> Map<code, { uses, inviterId, inviterTag }>
const inviteCache  = new Map();
// guildId -> { channelId }
const inviteConfig = new Map();
// guildId -> Map<userId, { total, fake, left }>  (in-memory stats)
const inviteStats  = new Map();

// ── Cache guild invites on ready/join ─────────────────────────────────────────
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach((inv) => {
      map.set(inv.code, {
        uses:       inv.uses || 0,
        inviterId:  inv.inviter ? inv.inviter.id   : null,
        inviterTag: inv.inviter ? inv.inviter.tag  : "Unknown",
      });
    });
    inviteCache.set(guild.id, map);
  } catch (e) {
    console.error("cacheGuildInvites: " + e.message);
  }
}

// ── GuildMemberAdd handler ────────────────────────────────────────────────────
async function handleMemberJoin(member) {
  const guild  = member.guild;
  const config = inviteConfig.get(guild.id);
  if (!config) return;

  const channel = guild.channels.cache.get(config.channelId);
  if (!channel) return;

  let inviter    = null;
  let inviterTag = "Unknown 🤷";
  let inviterId  = null;
  let totalInv   = 0;
  let fakeInv    = 0;
  let leftInv    = 0;

  try {
    const newInvites = await guild.invites.fetch();
    const oldCache   = inviteCache.get(guild.id) || new Map();

    // Find which invite gained a use
    let usedCode = null;
    newInvites.forEach((inv) => {
      const old = oldCache.get(inv.code);
      if (old && inv.uses > old.uses) usedCode = inv.code;
      else if (!old && inv.uses > 0)  usedCode = inv.code;
    });

    // Update cache
    const newMap = new Map();
    newInvites.forEach((inv) => {
      newMap.set(inv.code, {
        uses:       inv.uses || 0,
        inviterId:  inv.inviter ? inv.inviter.id   : null,
        inviterTag: inv.inviter ? inv.inviter.tag  : "Unknown",
      });
    });
    inviteCache.set(guild.id, newMap);

    if (usedCode) {
      const usedInv = newMap.get(usedCode) || oldCache.get(usedCode);
      if (usedInv && usedInv.inviterId) {
        inviterId  = usedInv.inviterId;
        inviterTag = usedInv.inviterTag;
        try { inviter = await guild.client.users.fetch(inviterId); } catch (_) {}

        // Count total invites for this person
        newInvites.forEach((inv) => {
          if (inv.inviter && inv.inviter.id === inviterId) totalInv += (inv.uses || 0);
        });

        // Update stats map
        if (!inviteStats.has(guild.id)) inviteStats.set(guild.id, new Map());
        const gStats = inviteStats.get(guild.id);
        const cur = gStats.get(inviterId) || { total: 0, fake: 0, left: 0 };
        cur.total = totalInv;
        gStats.set(inviterId, cur);
        fakeInv = cur.fake;
        leftInv = cur.left;
      }
    }
  } catch (e) {
    console.error("handleMemberJoin invite: " + e.message);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("📥 Member Joined")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: "👤 User",           value: `<@${member.id}> (${member.user.tag})`, inline: false },
      { name: "🎉 Invited By",     value: inviter ? `<@${inviterId}>` : inviterTag, inline: true },
      { name: "📈 Total Invites",  value: String(totalInv),                        inline: true },
      { name: "🆕 Fake Invites",   value: String(fakeInv),                         inline: true },
      { name: "❌ Left Invites",   value: String(leftInv),                         inline: true },
    )
    .setDescription("Welcome to the server!")
    .setTimestamp()
    .setFooter({ text: guild.name });

  await channel.send({ embeds: [embed] }).catch((e) => console.error("invite embed send: " + e.message));
}

// ── GuildMemberRemove — track left invites ────────────────────────────────────
function handleMemberLeave(member) {
  // We can't easily track who invited them after they leave,
  // but we mark the stat for their inviter if stored.
  // For simplicity: iterate inviteStats to find if this member was tracked
  // This is advanced tracking — basic impl for now.
}

// ── !invite / !invites commands ───────────────────────────────────────────────
async function handleInviteCommand(message, args) {
  const sub   = (args[0] || "").toLowerCase();
  const guild = message.guild;

  // ── !invite set #channel (admin only) ──
  if (sub === "set") {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ **Administrator** kaliya ayaa `!invite set` isticmaali kara.");
    }
    const ch = message.mentions.channels.first();
    if (!ch) return message.reply("❌ `!invite set #channel` — channel-ka ku xidh");
    inviteConfig.set(guild.id, { channelId: ch.id });
    await cacheGuildInvites(guild);
    return message.reply(`✅ **Invite Tracker** waxaa lagu dejiyay <#${ch.id}>\nHadda marka qof ku soo biiro, embed ayaa halkaas ka soo baxa.`);
  }

  // ── !invite leaderboard / lb ──
  if (sub === "leaderboard" || sub === "lb") {
    const config = inviteConfig.get(guild.id);
    if (!config) return message.reply("❌ Invite Tracker lama dejin. `!invite set #channel`");

    const gStats = inviteStats.get(guild.id);
    // Also aggregate from invite cache
    const cached = inviteCache.get(guild.id);
    const aggregated = new Map();
    if (cached) {
      cached.forEach((inv) => {
        if (!inv.inviterId) return;
        const cur = aggregated.get(inv.inviterId) || { inviterTag: inv.inviterTag, total: 0 };
        cur.total += inv.uses;
        aggregated.set(inv.inviterId, cur);
      });
    }
    if (gStats) {
      gStats.forEach((stats, uid) => {
        const cur = aggregated.get(uid) || { inviterTag: uid, total: 0 };
        cur.total = Math.max(cur.total, stats.total);
        aggregated.set(uid, cur);
      });
    }

    if (!aggregated.size) {
      return message.reply("📊 Wali invite stats lama soo urursan.");
    }

    const sorted = [...aggregated.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const medals = ["🥇", "🥈", "🥉"];
    const lines  = sorted.map(([uid, d], i) =>
      `${medals[i] || `**${i + 1}.**`} <@${uid}> — **${d.total}** invite`
    );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf39c12)
          .setTitle("🏆 Invite Leaderboard — " + guild.name)
          .setDescription(lines.join("\n") || "Wax invite ah lama helin.")
          .setTimestamp(),
      ],
    });
  }

  // ── !invite reset (admin only) ──
  if (sub === "reset") {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply("❌ **Administrator** kaliya.");
    }
    inviteStats.delete(guild.id);
    await cacheGuildInvites(guild);
    return message.reply("✅ **Invite stats waa la dib u dejiyay!**");
  }

  // ── !invites [@user] — show own or someone's invites ──
  const target = message.mentions.users.first() || message.author;
  const cached = inviteCache.get(guild.id);
  let total = 0;
  if (cached) {
    cached.forEach((inv) => {
      if (inv.inviterId === target.id) total += inv.uses;
    });
  }
  const gStats = inviteStats.get(guild.id);
  const stats  = gStats ? gStats.get(target.id) : null;

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📊 Invite Stats — " + target.username)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "📈 Total Invites", value: String(total),                   inline: true },
          { name: "🆕 Fake Invites",  value: String(stats ? stats.fake : 0), inline: true },
          { name: "❌ Left Invites",  value: String(stats ? stats.left : 0), inline: true },
        )
        .setTimestamp(),
    ],
  });
}

module.exports = { cacheGuildInvites, handleMemberJoin, handleMemberLeave, handleInviteCommand };
