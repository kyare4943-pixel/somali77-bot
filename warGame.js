"use strict";

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("./data");

/**
 * warGame.js — 2-player war/duel system
 * Features: HP, weapons, armor, police faction, jail, DM alerts
 */

const WAR_SESSIONS = new Map(); // guildId → { ...session }

const BASE_HP      = 100;
const JAIL_DURATION = 10 * 60 * 1000; // 10 minutes jail
const WAR_TIMEOUT   = 5 * 60 * 1000;  // 5 min to accept

// Factions
const FACTION = { CIVILIAN: "civilian", POLICE: "police", SPY: "spy" };

function getWeaponAttack(userId) {
  const p = db.getPlayer(userId);
  const weapon = p.items.filter((i) => i.type === "weapon").sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
  return weapon ? (weapon.attack || 0) : 0;
}

function getArmorDefense(userId) {
  const p = db.getPlayer(userId);
  const armor = p.items.filter((i) => i.type === "armor").sort((a, b) => (b.defense || 0) - (a.defense || 0))[0];
  return armor ? (armor.defense || 0) : 0;
}

function getFaction(userId) {
  const p = db.getPlayer(userId);
  if (p.items.some((i) => i.id === "spy_kit"))     return FACTION.SPY;
  if (p.items.some((i) => i.id === "handcuffs"))   return FACTION.POLICE;
  return FACTION.CIVILIAN;
}

function factionLabel(faction) {
  if (faction === FACTION.POLICE) return "👮 Police";
  if (faction === FACTION.SPY)    return "🕵️ Spy";
  return "👤 Civilian";
}

// ── Build war embed ───────────────────────────────────────────────────────────
function buildWarEmbed(session, phase = "ongoing") {
  const { p1, p2 } = session;

  function hpBar(hp) {
    const filled = Math.max(0, Math.round(hp / 10));
    return "🟩".repeat(filled) + "🟥".repeat(10 - filled) + ` (${hp}/100)`;
  }

  let color = 0xe74c3c;
  let title = "⚔️ WAR — Socda!";
  if (phase === "waiting") { color = 0xf39c12; title = "⚔️ War Caawimaad Sugaysa"; }
  if (phase === "win_p1")  { color = 0x2ecc71; title = `🏆 ${p1.username} Ayaa Guulaystay!`; }
  if (phase === "win_p2")  { color = 0x2ecc71; title = `🏆 ${p2.username} Ayaa Guulaystay!`; }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: "somali77 War Game" });

  if (phase === "waiting") {
    embed.setDescription(
      `**${p1.username}** waxay u cawimayaan **${p2 ? p2.username : "..."}** inay war ku gashadaan!\n\n` +
      `<@${p2 ? p2.userId : "?"}> — **Accept** ama **Decline** riix!`
    );
  } else {
    embed.addFields(
      { name: `${factionLabel(getFaction(p1.userId))} ${p1.username}`, value: hpBar(p1.hp) + `\n🔫 +${p1.attack} | 🛡️ +${p1.defense}`, inline: true },
      { name: "\u200b", value: "⚔️", inline: true },
      { name: `${factionLabel(getFaction(p2.userId))} ${p2.username}`, value: hpBar(p2.hp) + `\n🔫 +${p2.attack} | 🛡️ +${p2.defense}`, inline: true },
    );
    if (session.log && session.log.length > 0) {
      embed.addFields({ name: "📢 Dhacdada Ugu Dambeysay", value: session.log.slice(-3).join("\n"), inline: false });
    }
    embed.addFields({ name: "🎯 Taladaada", value: `**${session.currentTurn === p1.userId ? p1.username : p2.username}** gacanta ku jirta`, inline: false });
  }

  return embed;
}

function buildWarButtons(session, forUserId) {
  const isMyTurn = session.currentTurn === forUserId;
  const p        = forUserId === session.p1.userId ? session.p1 : session.p2;
  const hasMedkit = db.getPlayer(forUserId).items.some((i) => i.id === "medkit");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`war_attack_${session.guildId}`)
      .setLabel("🔫 Weerar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!isMyTurn),
    new ButtonBuilder()
      .setCustomId(`war_defend_${session.guildId}`)
      .setLabel("🛡️ Difaac")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isMyTurn),
    new ButtonBuilder()
      .setCustomId(`war_heal_${session.guildId}`)
      .setLabel("💉 Daawo")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!isMyTurn || !hasMedkit),
    new ButtonBuilder()
      .setCustomId(`war_flee_${session.guildId}`)
      .setLabel("🏃 Cararid")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!isMyTurn),
  );

  return [row];
}

function buildAcceptButtons(guildId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`war_accept_${guildId}`).setLabel("✅ Accept").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`war_decline_${guildId}`).setLabel("❌ Decline").setStyle(ButtonStyle.Danger),
  );
  return [row];
}

// ── Send DM alert ─────────────────────────────────────────────────────────────
async function sendDM(client, userId, embed) {
  try {
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [embed] });
  } catch (_) { /* DM closed */ }
}

// ── Challenge ─────────────────────────────────────────────────────────────────
async function handleWarChallenge(ctx, targetUser, client) {
  const guildId    = ctx.guildId;
  const challengerId = ctx.user ? ctx.user.id : ctx.author.id;
  const challengerName = ctx.user ? ctx.user.username : ctx.author.username;

  if (WAR_SESSIONS.has(guildId)) {
    return ctx.reply({ content: "❌ War hore ayaa socda guild-kan!", ephemeral: true });
  }
  if (!targetUser || targetUser.bot) {
    return ctx.reply({ content: "❌ Bot-ka lama dagaalami karo.", ephemeral: true });
  }
  if (targetUser.id === challengerId) {
    return ctx.reply({ content: "❌ Naftaada lama dagaalami karo!", ephemeral: true });
  }

  // Check jail
  if (db.checkJail(challengerId)) {
    return ctx.reply({ content: "❌ Xabsiga ayaad ku jirtaa! Ma dagaalami kartid.", ephemeral: true });
  }

  const p1 = db.getPlayer(challengerId, challengerName);
  const session = {
    guildId,
    state:        "waiting",
    p1: {
      userId:   challengerId,
      username: challengerName,
      hp:       BASE_HP,
      attack:   getWeaponAttack(challengerId),
      defense:  getArmorDefense(challengerId),
      defending: false,
    },
    p2: {
      userId:   targetUser.id,
      username: targetUser.username,
      hp:       BASE_HP,
      attack:   getWeaponAttack(targetUser.id),
      defense:  getArmorDefense(targetUser.id),
      defending: false,
    },
    currentTurn: challengerId,
    log:         [],
    message:     null,
    channel:     ctx.channel,
    client,
  };

  WAR_SESSIONS.set(guildId, session);

  // Auto-cleanup if no accept
  setTimeout(() => {
    if (WAR_SESSIONS.get(guildId)?.state === "waiting") {
      WAR_SESSIONS.delete(guildId);
    }
  }, WAR_TIMEOUT);

  const embed = buildWarEmbed(session, "waiting");
  const components = buildAcceptButtons(guildId);
  const sent = await ctx.reply({ embeds: [embed], components, fetchReply: true });
  session.message = sent;

  // DM the challenged player
  const dmEmbed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("⚔️ War Challenge!")
    .setDescription(`**${challengerName}** waxay kugu cawimayaan war! Channel-ka soo aad si aad u aqbasho ama diiddo.`)
    .setTimestamp();
  await sendDM(client, targetUser.id, dmEmbed);
}

// ── Accept/Decline ────────────────────────────────────────────────────────────
async function handleWarAccept(interaction) {
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;
  const session = WAR_SESSIONS.get(guildId);

  if (!session || session.state !== "waiting") {
    return interaction.reply({ content: "❌ War ma jiro ama waa bilaabmay.", ephemeral: true });
  }
  if (userId !== session.p2.userId) {
    return interaction.reply({ content: "❌ Kuwan kuu ah ma aha!", ephemeral: true });
  }

  session.state = "ongoing";
  db.getPlayer(session.p1.userId, session.p1.username).stats.warsPlayed++;
  db.getPlayer(session.p2.userId, session.p2.username).stats.warsPlayed++;

  const embed = buildWarEmbed(session, "ongoing");
  const components = buildWarButtons(session, session.p1.userId);

  await interaction.update({ embeds: [embed], components });

  // DM both players
  const startEmbed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("⚔️ War Bilaabmay!")
    .setDescription(`War-ka **${session.p1.username}** vs **${session.p2.username}** waa bilaabmay!\n**${session.p1.username}** ayaa hore u socda.`)
    .setTimestamp();
  await sendDM(session.client, session.p1.userId, startEmbed);
  await sendDM(session.client, session.p2.userId, startEmbed);
}

async function handleWarDecline(interaction) {
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;
  const session = WAR_SESSIONS.get(guildId);

  if (!session) return interaction.reply({ content: "❌ War ma jiro.", ephemeral: true });
  if (userId !== session.p2.userId && userId !== session.p1.userId) {
    return interaction.reply({ content: "❌ War-kan kuuguma aha.", ephemeral: true });
  }

  WAR_SESSIONS.delete(guildId);
  return interaction.update({
    embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle("❌ War La Diiday").setDescription(`**${session.p2.username}** waxay diideen war-ka.`).setTimestamp()],
    components: [],
  });
}

// ── War actions ───────────────────────────────────────────────────────────────
function calcDamage(attacker, defender) {
  const base    = 10 + Math.floor(Math.random() * 15); // 10–24 base
  const bonus   = attacker.attack;
  const reduced = Math.max(0, base + bonus - defender.defense);
  return { raw: base + bonus, reduced, blocked: defender.defending ? Math.floor(reduced * 0.5) : 0 };
}

async function endWar(session, winnerId) {
  const guildId = session.guildId;
  WAR_SESSIONS.delete(guildId);

  const winner = winnerId === session.p1.userId ? session.p1 : session.p2;
  const loser  = winnerId === session.p1.userId ? session.p2 : session.p1;

  const reward   = 300 + Math.floor(Math.random() * 200);
  const phase    = winnerId === session.p1.userId ? "win_p1" : "win_p2";

  db.addCoins(winner.userId, winner.username, reward);
  db.getPlayer(winner.userId, winner.username).stats.warsWon++;

  // Police can jail the loser
  const winnerFaction = getFaction(winner.userId);
  let jailMsg = "";
  if (winnerFaction === FACTION.POLICE) {
    db.jailPlayer(loser.userId, loser.username, JAIL_DURATION);
    jailMsg = `\n👮 **Police** ayaa **${loser.username}** xabsiga gashay 10 daqiiqo!`;
  }

  const embed = buildWarEmbed(session, phase);
  embed.addFields({ name: "🏆 Abaalka", value: `**${winner.username}** waxay heshay **${reward} 🪙**${jailMsg}`, inline: false });

  try {
    await session.message.edit({ embeds: [embed], components: [] });
  } catch (_) {}

  // DM winner
  const winDM = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🏆 War Guulaystay!")
    .setDescription(`War-ka waxaad ku guulaystay! Waxaad heshay **${reward} 🪙** coins!${jailMsg}`)
    .setTimestamp();
  await sendDM(session.client, winner.userId, winDM);

  // DM loser
  const loseDM = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("💀 War Lumisay!")
    .setDescription(`War-ka waxaad ku lumisay **${winner.username}**!${winnerFaction === FACTION.POLICE ? "\n👮 Xabsiga ayaad ku jirtaa 10 daqiiqo!" : ""}`)
    .setTimestamp();
  await sendDM(session.client, loser.userId, loseDM);
}

async function handleWarAction(interaction) {
  const id      = interaction.customId;
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;
  const session = WAR_SESSIONS.get(guildId);

  if (!session || session.state !== "ongoing") {
    return interaction.reply({ content: "❌ War ma jiro.", ephemeral: true });
  }
  if (session.currentTurn !== userId) {
    return interaction.reply({ content: "❌ Taladaadu ma aha hadda!", ephemeral: true });
  }

  const attacker = userId === session.p1.userId ? session.p1 : session.p2;
  const defender = userId === session.p1.userId ? session.p2 : session.p1;

  // Reset defender's defending state at start of attacker's turn
  attacker.defending = false;

  const action = id.replace(`_${guildId}`, "").replace("war_", "");

  if (action === "attack") {
    const dmg = calcDamage(attacker, defender);
    const actualDmg = defender.defending ? Math.max(0, dmg.reduced - dmg.blocked) : dmg.reduced;
    defender.hp = Math.max(0, defender.hp - actualDmg);
    const shieldNote = defender.defending ? ` (🛡️ ${dmg.blocked} blocked)` : "";
    session.log.push(`🔫 **${attacker.username}** waxay wareershay **${actualDmg} dmg** ➜ **${defender.username}**${shieldNote}`);
    defender.defending = false;
  } else if (action === "defend") {
    attacker.defending = true;
    session.log.push(`🛡️ **${attacker.username}** ayaa difaaca qaaday (50% dmg reduction next hit)`);
  } else if (action === "heal") {
    const hasMedkit = db.getPlayer(userId).items.some((i) => i.id === "medkit");
    if (!hasMedkit) {
      return interaction.reply({ content: "❌ Medkit ma lihid!", ephemeral: true });
    }
    db.removeItem(userId, "medkit");
    const healAmt = 40;
    attacker.hp = Math.min(BASE_HP, attacker.hp + healAmt);
    session.log.push(`💉 **${attacker.username}** ayaa daaweyste isticmaalay! +${healAmt} HP`);
  } else if (action === "flee") {
    session.log.push(`🏃 **${attacker.username}** ayaa carartay!`);
    await endWar(session, defender.userId);
    return interaction.deferUpdate();
  }

  // Check win condition
  if (defender.hp <= 0) {
    await endWar(session, attacker.userId);
    return interaction.deferUpdate();
  }

  // Switch turn
  session.currentTurn = defender.userId;

  const embed = buildWarEmbed(session, "ongoing");
  const components = buildWarButtons(session, defender.userId);
  return interaction.update({ embeds: [embed], components });
}

// ── Button dispatcher ─────────────────────────────────────────────────────────
async function handleWarButton(interaction, client) {
  const id = interaction.customId;
  if (!id.startsWith("war_")) return;

  if (id.startsWith("war_accept_"))  return handleWarAccept(interaction);
  if (id.startsWith("war_decline_")) return handleWarDecline(interaction);
  if (id.startsWith("war_attack_") ||
      id.startsWith("war_defend_") ||
      id.startsWith("war_heal_")   ||
      id.startsWith("war_flee_"))   return handleWarAction(interaction);
}

module.exports = { handleWarChallenge, handleWarButton };
