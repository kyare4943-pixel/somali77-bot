"use strict";

/**
 * weather.js — Race weather system (Qasriga Rob / Duufaanta)
 */

const WEATHERS = [
  {
    id:      "sunny",
    icon:    "☀️",
    name:    "Qorrax",
    speedMod: +0.15,  // +15% speed all
    luckMod:  +0.10,
    msg:     "☀️ **Qorrax fiican!** Fardaha waxay si fiican u orodayaan!",
    color:   0xffd700,
  },
  {
    id:      "rain",
    icon:    "🌧️",
    name:    "Rob",
    speedMod: -0.20, // -20% speed all
    luckMod:  -0.10,
    msg:     "🌧️ **Rob hore!** Jidka waa jiitan yahay — fardaha ayaa gaabiya!",
    color:   0x3498db,
  },
  {
    id:      "heavy_rain",
    icon:    "⛈️",
    name:    "Qasriga Rob",
    speedMod: -0.35,
    luckMod:  -0.20,
    msg:     "⛈️ **QASRIGA ROB!** Duufaan xoog leh — fardaha ayaa aad u gaabinayaan!",
    color:   0x2c3e50,
  },
  {
    id:      "wind",
    icon:    "💨",
    name:    "Dabaylo",
    speedMod: +0.10,
    luckMod:  +0.20,
    msg:     "💨 **Dabayl xoog leh!** Fardaha waxay dambe u dhaqaaqayaan!",
    color:   0x95a5a6,
  },
  {
    id:      "hail",
    icon:    "🌨️",
    name:    "Baraf",
    speedMod: -0.25,
    luckMod:  -0.15,
    msg:     "🌨️ **Baraf dhacaya!** Jidka baraf ayuu ka buuxsanyahay — aad u adagtahay!",
    color:   0xbdc3c7,
  },
  {
    id:      "fog",
    icon:    "🌫️",
    name:    "Ceeryaan",
    speedMod: -0.10,
    luckMod:  +0.30, // foggy = more luck variance
    msg:     "🌫️ **Ceeryaan!** Waxba la ma arki karo — nasiib baa go'aaminaya!",
    color:   0x7f8c8d,
  },
  {
    id:      "clear",
    icon:    "🌤️",
    name:    "Cawsiga",
    speedMod: 0,
    luckMod:  0,
    msg:     "🌤️ **Cawsi fiican** — xaaladdu waa caadi.",
    color:   0x27ae60,
  },
];

// Weight: clear/sunny appear more than storms
const WEATHER_POOL = [
  "clear", "clear", "clear",
  "sunny", "sunny",
  "wind",
  "rain", "rain",
  "heavy_rain",
  "hail",
  "fog",
];

function pickWeather() {
  const id = WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)];
  return WEATHERS.find((w) => w.id === id) || WEATHERS[6]; // fallback clear
}

function applyWeather(speed, luck, weather) {
  return {
    speed: Math.max(50, speed * (1 + weather.speedMod)),
    luck:  Math.max(10, luck  * (1 + weather.luckMod)),
  };
}

module.exports = { WEATHERS, pickWeather, applyWeather };
