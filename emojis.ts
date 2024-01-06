const emojisResponse = await fetch(
  "https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json",
);
const emojis = await emojisResponse.json();

const wrappedEmojis = emojis.reduce(
  (result: Record<string, string>, emoji: Record<string, string>) => {
    for (const short_name of emoji.short_names) {
      const unicodeCodePoint = parseInt(emoji.unified, 16);
      const emojiCharacter = String.fromCodePoint(unicodeCodePoint);
      result[short_name] = emojiCharacter;
    }
    return result;
  },
  {},
);

const stringifiedEmojis = JSON.stringify(wrappedEmojis);

const encoder = new TextEncoder();

Deno.writeFileSync(
  "frontend/sctuc.json",
  encoder.encode(stringifiedEmojis),
);
