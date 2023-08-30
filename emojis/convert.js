const emojis = require('./emoji.json');
const fs = require('fs');

fs.writeFileSync('./sctuc.json', Buffer.from(JSON.stringify(emojis.reduce((result, emoji) => {
    for (let short_name of emoji.short_names) {
        const unicodeCodePoint = parseInt(emoji.unified, 16);
        const emojiCharacter = String.fromCodePoint(unicodeCodePoint);
        result[short_name] = emojiCharacter
    }
    return result;
}, {}))))