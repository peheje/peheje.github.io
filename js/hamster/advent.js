// A jul calendar in the burrow: 24 small doors through December, one more
// each day. Opened doors are remembered in state.secrets, so they travel with
// the carry link. Nothing reminds you to open them.

export const ADVENT_LINES = Object.freeze([
  "The first door. Behind it, a single hazelnut and the smell of cold mornings.",
  "I hung a spruce twig over the bed. It drops needles on me. We are getting used to each other.",
  "Someone small has been in the pantry. Only the raisin is missing. Whoever it is has taste.",
  "I lit the first candle. It is a very short candle, so the waiting will be short too.",
  "A red thread on the doorstep. Not mine. I have wound it on a seed for safekeeping.",
  "Footprints in the flour. Smaller than mine, which I did not think possible.",
  "I left out a thimble of porridge, just in case. It is a tradition. I read about it.",
  "The porridge is gone. The thimble has been washed and put back the wrong way up.",
  "I knitted half a scarf. It is the better half.",
  "The road outside is dark by four. I have put the lantern in the doorway for anyone passing.",
  "Today I heard humming under the floor. It stopped when I hummed back.",
  "A walnut shell on the shelf, carved into a very small boat. I did not carve it.",
  "Lucia tomorrow. I have made a crown of three matchsticks. It is mostly ceremonial.",
  "I walked once around the room with the candle, slowly, for Lucia. The spider watched.",
  "More porridge, more thimble. This time a crumb of thanks was left. A crumb is plenty.",
  "The mole asked what jul is. I said: warm things in the dark, shared. He nodded at once.",
  "I wrapped a seed in a leaf and tied it with the red thread. It is for someone.",
  "Very cold tonight. The kettle and I are keeping each other company.",
  "Tiny red cap, seen in the corner of my eye, by the pantry. Then nothing. Then a giggle.",
  "I have stopped locking the pantry. It seems the friendlier arrangement.",
  "The longest night. I will stay up for a bit of it, so it is not alone.",
  "The light is coming back now. Only a crumb a day, but I am patient with crumbs.",
  "Little juleaften. I have swept, and set out three cups. One for you, one for me, one for the corner.",
  "Glædelig jul. The leaf parcel is gone, and in its place a tiny paper nisse. It is for you. I am fairly sure.",
]);

export const ADVENT_KEEPSAKE = Object.freeze({
  name: "A paper nisse",
  description: "Folded very small, red cap and all. It was left by the pantry on juleaften.",
});

// A fixed jumble, like a real calendar, so the doors are worth looking for.
export const ADVENT_ORDER = Object.freeze([17, 3, 22, 9, 14, 1, 20, 6, 11, 24, 4, 15, 8, 19, 2, 13, 23, 7, 18, 10, 5, 21, 12, 16]);

export function adventKey(year, day) {
  return `advent-${year}-${String(day).padStart(2, "0")}`;
}

// Which doors exist and which may be opened today. Shown only in December.
export function adventToday(date = new Date()) {
  if (date.getMonth() !== 11) return null;
  return { year: date.getFullYear(), openUpTo: Math.min(24, date.getDate()) };
}

export function openAdventDoor(state, day, date = new Date()) {
  const today = adventToday(date);
  if (!today || !Number.isInteger(day) || day < 1 || day > today.openUpTo) return null;
  const key = adventKey(today.year, day);
  const now = date.getTime();
  if (!state.secrets[key]) state.secrets[key] = now;
  if (day === 24) {
    const shelfId = `advent-${today.year}-nisse`;
    if (!state.shelf[shelfId]) state.shelf[shelfId] = { ...ADVENT_KEEPSAKE, at: now };
  }
  return ADVENT_LINES[day - 1];
}
