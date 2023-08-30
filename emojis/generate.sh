rm -f emojis/emoji.json
rm -f emojis/sctuc.json
rm -f src/front/sctuc.json

wget https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json -O emojis/emoji.json
node emojis/convert.js
mv emojis/sctuc.json src/front/sctuc.json