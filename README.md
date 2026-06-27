# somali77 Discord Bot v2.0

Discord bot Somali ah oo leh games, shop, iyo war system.

## Features

| Amarka | Sharaxaad |
|--------|-----------|
| 🗑️ Auto Delete Log | Si toos ah u soo bandhiga fariimaha la tirtiray |
| 🎯 `/snipe` | Soo bandhig fariin u dambeysay ee la tirtiray |
| 🛒 `/shop` | Iibso fardaha, hub, difaac, boosters |
| 🎁 `/daily` | 200-299 coins bilaash maalin kasta |
| 💰 `/balance` | Eeg coins, faras, hub iyo stats |
| 🏇 `/race` | Horse race + shop fardaha + boosters |
| ⚔️ `/war @qof` | 2-player RPG battle — hub, difaac, jail, DM alerts |
| 🃏 `/blackjack <bet>` | Card game, raasmaali 10-2000 coins |
| 👮 `/jail @qof` | Police (handcuffs leh) xabsi gali |
| 🔓 `/release @qof` | Police xabsiga ka saar |

## Sida Loo Bilaabo (Replit)

1. **Replit Secrets** ku dar:
   - Key: `DISCORD_BOT_TOKEN`
   - Value: Token-kaaga Discord bot

2. Workflow-ka **Discord Bot** bilow

## Sida Loo Bilaabo (Local / Endercloud)

```bash
cd bot
cp .env.example .env
# .env ku qor token-kaaga
node index.js
```

## Shop System

- **`/daily`** — 200-299 coins bilaash maalin kasta
- **`/shop`** — categories: Fardaha, Boosters, War Items, Police & Special
- **`/balance`** — coins, faras active, hub, stats

### Shop Items

| Qaybta | Items | Faa'iido |
|--------|-------|----------|
| 🐎 Fardaha | Faras Caadi, Faras Xawli, Faras Nasiib, Champion, Shadow | Speed/Luck bonus race-ka |
| ⚡ Boosters | Turbo, Lucky Charm, Stamina Pill, Shield | Race-ka hal goor isticmaal |
| ⚔️ War | Pistol, Rifle, Sniper, Rocket, Armor, Medkit, Grenade | War-ka attack/defense |
| 👮 Police | Handcuffs, Bailout Card, Spy Kit | Xabsi gali, ka bax, spy |

## Horse Race System

1. `/race create` — Samee tartam
2. Join button riix — faraskaaga shop ka heshay ayaa automatic la isticmaalaa
3. Boosters shop ka iibso si orodkaaga u fiicnaado
4. Abaalka: 🥇 300 coins, 🥈 150 coins, 🥉 75 coins

## War System (RPG)

- `/war @opponent` — Caawimaad
- Target-ka waxaa u yimaada DM
- Accept ka dib: Attack, Defend, Heal (medkit), Flee
- **Police** (handcuffs leh) — winner kan xabsi galiyaa loser-ka 10 min
- Abaalka: 300-499 coins winner

## Blackjack

- `/blackjack 100` — Raasmaali 10-2000 coins
- Hit, Stand, Double Down, Surrender
- Blackjack (21 instant): 3:2 payout
