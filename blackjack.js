"use strict";

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("./data");

// ── Deck ──────────────────────────────────────────────────────────────────────
const SUITS  = ["♠️", "♥️", "♦️", "♣️"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function newDeck() {
  const deck = [];
  for (const suit of SUITS) for (const val of VALUES) deck.push({ suit, val });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(val) {
  if (["J", "Q", "K"].includes(val)) return 10;
  if (val === "A") return 11;
  return parseInt(val);
}

function handTotal(hand) {
  let total = 0;
  let aces  = 0;
  for (const c of hand) {
    total += cardValue(c.val);
    if (c.val === "A") aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function handStr(hand, hideSecond = false) {
  return hand.map((c, i) => (hideSecond && i === 1 ? "🂠" : `${c.val}${c.suit}`)).join("  ");
}

// Active BJ sessions per user
const bjSessions = new Map(); // userId → session

const MIN_BET = 10;
const MAX_BET = 2000;

// ── Start game ────────────────────────────────────────────────────────────────
async function startBlackjack(ctx, bet) {
  const userId   = ctx.user ? ctx.user.id : ctx.author.id;
  const username = ctx.user ? ctx.user.username : ctx.author.username;

  if (bjSessions.has(userId)) {
    return ctx.reply({ content: "❌ Ciyaar hore ayaad ku jirtaa! Dhamaystir ama `/bj surrender` isticmaal.", ephemeral: true });
  }

  if (!bet || isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
    return ctx.reply({ content: `❌ Raasmaalka waa inuu u dhexeeyo **${MIN_BET}** — **${MAX_BET}** coins.\nTusaale: \`/blackjack 100\``, ephemeral: true });
  }

  const taken = db.removeCoins(userId, username, bet);
  if (!taken) {
    const p = db.getPlayer(userId, username);
    return ctx.reply({ content: `❌ Lacag kuma filan! Waxaad leedahay **${p.coins} 🪙**`, ephemeral: true });
  }

  const deck = newDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  const session = { userId, username, bet, deck, playerHand, dealerHand, state: "playing", doubled: false };
  bjSessions.set(userId, session);

  db.getPlayer(userId, username).stats.blackjackPlayed++;

  // Check instant blackjack
  if (handTotal(playerHand) === 21) {
    return resolveBlackjack(ctx, session, "blackjack");
  }

  const embed = buildBJEmbed(session, false);
  const components = buildBJButtons(session);
  return ctx.reply({ embeds: [embed], components });
}

// ── Embed ─────────────────────────────────────────────────────────────────────
function buildBJEmbed(session, showDealer, result = null) {
  const playerTotal = handTotal(session.playerHand);
  const dealerTotal = handTotal(session.dealerHand);

  let color = 0x3498db;
  let title = "🃏 Blackjack";
  if (result === "win")        { color = 0x2ecc71; title = "🏆 Adiga ayaa Guulaystay!"; }
  if (result === "lose")       { color = 0xe74c3c; title = "💸 Waxaad Lumisay!"; }
  if (result === "push")       { color = 0xf39c12; title = "🤝 Isu Siman!"; }
  if (result === "blackjack")  { color = 0xffd700; title = "🎰 BLACKJACK! 21!"; }
  if (result === "bust")       { color = 0xe74c3c; title = "💥 Bust! 21+ Ahayd!"; }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`👤 **${session.username}** | Raasmaal: **${session.bet} 🪙**`)
    .addFields(
      { name: `👤 Kaadhaagaaga (${playerTotal})`,          value: handStr(session.playerHand),              inline: false },
      { name: `🤖 Dealer (${showDealer ? dealerTotal : "?"})`, value: handStr(session.dealerHand, !showDealer), inline: false },
    )
    .setTimestamp()
    .setFooter({ text: "somali77 Blackjack" });

  return embed;
}

function buildBJButtons(session) {
  const canDouble = session.playerHand.length === 2;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_hit_${session.userId}`).setLabel("👆 Hit").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_stand_${session.userId}`).setLabel("✋ Stand").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`bj_double_${session.userId}`).setLabel("💰 Double Down").setStyle(ButtonStyle.Success).setDisabled(!canDouble),
    new ButtonBuilder().setCustomId(`bj_surrender_${session.userId}`).setLabel("🏳️ Surrender").setStyle(ButtonStyle.Danger),
  );
  return [row];
}

// ── Resolve ───────────────────────────────────────────────────────────────────
async function resolveBlackjack(ctx, session, outcome) {
  const userId   = session.userId;
  const username = session.username;
  bjSessions.delete(userId);

  let payout = 0;
  let resultMsg = "";

  const playerTotal = handTotal(session.playerHand);
  const dealerTotal = handTotal(session.dealerHand);

  if (outcome === "blackjack") {
    payout = Math.floor(session.bet * 2.5); // 3:2 payout
    resultMsg = `🎰 BLACKJACK! Waxaad heshay **${payout} 🪙** (3:2)!`;
    db.getPlayer(userId, username).stats.blackjackWon++;
  } else if (outcome === "win") {
    payout = session.bet * 2;
    resultMsg = `🏆 Guulaystay! Waxaad heshay **${payout} 🪙**!`;
    db.getPlayer(userId, username).stats.blackjackWon++;
  } else if (outcome === "push") {
    payout = session.bet;
    resultMsg = `🤝 Isu siman! Raasmaalkaaga **${payout} 🪙** ayaa laguu celiyay.`;
  } else if (outcome === "bust") {
    payout = 0;
    resultMsg = `💥 Bust! ${playerTotal} — Waxaad lumisay **${session.bet} 🪙**!`;
  } else if (outcome === "surrender") {
    payout = Math.floor(session.bet / 2);
    resultMsg = `🏳️ Surrender! Kala badh waa laguu celiyay: **${payout} 🪙**`;
  } else { // dealer_bust or lose
    if (outcome === "dealer_bust") {
      payout = session.bet * 2;
      resultMsg = `🎉 Dealer Bust! (${dealerTotal}) Waxaad heshay **${payout} 🪙**!`;
      db.getPlayer(userId, username).stats.blackjackWon++;
    } else {
      payout = 0;
      resultMsg = `💸 Lumisay! Dealer: ${dealerTotal} vs Adiga: ${playerTotal}`;
    }
  }

  if (payout > 0) db.addCoins(userId, username, payout);

  const p  = db.getPlayer(userId, username);
  const embed = buildBJEmbed(session, true, outcome === "push" ? "push" : (payout > 0 ? (outcome === "bust" ? "bust" : "win") : (outcome === "bust" ? "bust" : "lose")));
  embed.addFields({ name: "📢 Natiijo", value: resultMsg, inline: false });
  embed.addFields({ name: "💰 Hadda", value: `${p.coins} 🪙`, inline: true });

  const reply = { embeds: [embed], components: [] };
  try {
    if (ctx.update) await ctx.update(reply);
    else if (ctx.editReply) await ctx.editReply(reply);
    else await ctx.reply(reply);
  } catch (_) {
    try { await ctx.channel.send(reply); } catch (__) {}
  }
}

// ── Hit ───────────────────────────────────────────────────────────────────────
async function handleHit(interaction, session) {
  session.playerHand.push(session.deck.pop());
  const total = handTotal(session.playerHand);

  if (total > 21) {
    return resolveBlackjack(interaction, session, "bust");
  }
  if (total === 21) {
    return handleStand(interaction, session);
  }

  const embed = buildBJEmbed(session, false);
  return interaction.update({ embeds: [embed], components: buildBJButtons(session) });
}

// ── Stand / Dealer plays ──────────────────────────────────────────────────────
async function handleStand(interaction, session) {
  // Dealer draws until 17+
  while (handTotal(session.dealerHand) < 17) {
    session.dealerHand.push(session.deck.pop());
  }

  const playerTotal = handTotal(session.playerHand);
  const dealerTotal = handTotal(session.dealerHand);

  let outcome;
  if (dealerTotal > 21)                outcome = "dealer_bust";
  else if (playerTotal > dealerTotal)  outcome = "win";
  else if (playerTotal === dealerTotal) outcome = "push";
  else                                  outcome = "lose";

  return resolveBlackjack(interaction, session, outcome);
}

// ── Double Down ───────────────────────────────────────────────────────────────
async function handleDouble(interaction, session) {
  const userId   = session.userId;
  const username = session.username;
  const extra    = db.removeCoins(userId, username, session.bet);
  if (!extra) {
    return interaction.reply({ content: `❌ Lacag kuma filan Double Down-ka!`, ephemeral: true });
  }
  session.bet    *= 2;
  session.doubled = true;
  session.playerHand.push(session.deck.pop());
  const total = handTotal(session.playerHand);
  if (total > 21) return resolveBlackjack(interaction, session, "bust");
  return handleStand(interaction, session);
}

// ── Button dispatcher ─────────────────────────────────────────────────────────
async function handleBJButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith("bj_")) return;

  const parts    = id.split("_");
  const action   = parts[1];
  const targetId = parts.slice(2).join("_");

  if (interaction.user.id !== targetId) {
    return interaction.reply({ content: "❌ Kani waa ciyaartaada ma aha!", ephemeral: true });
  }

  const session = bjSessions.get(targetId);
  if (!session) {
    return interaction.reply({ content: "❌ Ciyaartu waa dhamaatay ama ma jirto.", ephemeral: true });
  }

  if (action === "hit")       return handleHit(interaction, session);
  if (action === "stand")     return handleStand(interaction, session);
  if (action === "double")    return handleDouble(interaction, session);
  if (action === "surrender") return resolveBlackjack(interaction, session, "surrender");
}

module.exports = { startBlackjack, handleBJButton };
