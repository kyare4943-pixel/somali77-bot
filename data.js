"use strict";

/**
 * data.js — In-memory database
 * Currencies: coins (🪙), goldCoins (💛 Dahab), diamondCoins (💎 Diamond)
 */

const players = new Map();
const warGames = new Map();
const marketListings = new Map(); // listingId → { sellerId, sellerName, item, price, currency, listedAt }
let listingCounter = 1;

function getPlayer(userId, username) {
  if (!players.has(userId)) {
    players.set(userId, {
      userId,
      username: username || "Unknown",
      coins:        500,
      goldCoins:    0,
      diamondCoins: 0,
      horses:  [],
      items:   [],
      inJail:  false,
      jailUntil: null,
      stats: {
        racesWon: 0, racesPlayed: 0,
        warsWon:  0, warsPlayed:  0,
        blackjackWon: 0, blackjackPlayed: 0,
        totalEarned: 0,
      },
    });
  }
  const p = players.get(userId);
  if (username) p.username = username;
  return p;
}

// ── Coins ─────────────────────────────────────────────────────────────────────
function addCoins(userId, username, amount) {
  const p = getPlayer(userId, username);
  p.coins = Math.max(0, p.coins + amount);
  if (amount > 0) p.stats.totalEarned += amount;
  return p.coins;
}
function removeCoins(userId, username, amount) {
  const p = getPlayer(userId, username);
  if (p.coins < amount) return false;
  p.coins -= amount;
  return true;
}

// ── Gold coins (Dahab) ────────────────────────────────────────────────────────
const MAX_PREMIUM = 10000; // raised — diamond items cost 10K
function addGold(userId, username, amount) {
  const p = getPlayer(userId, username);
  p.goldCoins = Math.min(MAX_PREMIUM, p.goldCoins + amount);
  return p.goldCoins;
}
function removeGold(userId, username, amount) {
  const p = getPlayer(userId, username);
  if (p.goldCoins < amount) return false;
  p.goldCoins -= amount;
  return true;
}

// ── Diamond coins ─────────────────────────────────────────────────────────────
function addDiamond(userId, username, amount) {
  const p = getPlayer(userId, username);
  p.diamondCoins = Math.min(MAX_PREMIUM, p.diamondCoins + amount);
  return p.diamondCoins;
}
function removeDiamond(userId, username, amount) {
  const p = getPlayer(userId, username);
  if (p.diamondCoins < amount) return false;
  p.diamondCoins -= amount;
  return true;
}

// ── Items ─────────────────────────────────────────────────────────────────────
function hasItem(userId, itemId) {
  const p = players.get(userId);
  return p ? p.items.some((i) => i.id === itemId) : false;
}
function addItem(userId, username, item) {
  const p = getPlayer(userId, username);
  p.items.push({ ...item, purchasedAt: new Date() });
}
function removeItem(userId, itemId) {
  const p = players.get(userId);
  if (!p) return false;
  const idx = p.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  p.items.splice(idx, 1);
  return true;
}

// ── Horses ────────────────────────────────────────────────────────────────────
function hasHorse(userId, horseId) {
  const p = players.get(userId);
  return p ? p.horses.some((h) => h.id === horseId) : false;
}
function addHorse(userId, username, horse) {
  const p = getPlayer(userId, username);
  p.horses.push({ ...horse, purchasedAt: new Date() });
}
function getActiveHorse(userId) {
  const p = players.get(userId);
  if (!p || !p.horses.length) return null;
  return p.horses.find((h) => h.active) || p.horses[p.horses.length - 1];
}
function setActiveHorse(userId, horseId) {
  const p = players.get(userId);
  if (!p) return false;
  p.horses.forEach((h) => (h.active = h.id === horseId));
  return true;
}

// ── Jail ──────────────────────────────────────────────────────────────────────
function jailPlayer(userId, username, durationMs) {
  const p = getPlayer(userId, username);
  p.inJail = true;
  p.jailUntil = new Date(Date.now() + durationMs);
}
function checkJail(userId) {
  const p = players.get(userId);
  if (!p || !p.inJail) return false;
  if (p.jailUntil && Date.now() >= p.jailUntil.getTime()) {
    p.inJail = false;
    p.jailUntil = null;
    return false;
  }
  return true;
}
function releaseFromJail(userId) {
  const p = players.get(userId);
  if (p) { p.inJail = false; p.jailUntil = null; }
}

// ── Secret steal log (owner-only, no player notification) ─────────────────────
const secretStealLog = [];
function logSecretSteal(targetId, adminId, amount, type) {
  secretStealLog.push({ targetId, adminId, amount, type, at: new Date() });
  // Kept for 48 hours then auto-purge
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  while (secretStealLog.length && secretStealLog[0].at.getTime() < cutoff) secretStealLog.shift();
}
function getSecretStealLog() { return [...secretStealLog]; }

// ── Marketplace ───────────────────────────────────────────────────────────────
function addListing(sellerId, sellerName, item, price, currency) {
  const id = String(listingCounter++);
  marketListings.set(id, {
    id, sellerId, sellerName, item: { ...item }, price, currency,
    listedAt: new Date(),
  });
  return id;
}
function getListing(id) { return marketListings.get(id) || null; }
function removeListing(id) { return marketListings.delete(id); }
function getAllListings() { return Array.from(marketListings.values()); }

module.exports = {
  players, warGames, MAX_PREMIUM,
  getPlayer,
  addCoins, removeCoins,
  addGold,  removeGold,
  addDiamond, removeDiamond,
  hasItem, addItem, removeItem,
  hasHorse, addHorse, getActiveHorse, setActiveHorse,
  jailPlayer, checkJail, releaseFromJail,
  logSecretSteal, getSecretStealLog,
  addListing, getListing, removeListing, getAllListings,
};
