rm -f emojis/emoji.json
rm -f emojis/sctuc.json

wget https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json -O emojis/emoji.json
node emojis/convert.js
rm -f frontend/sctuc.json
mv emojis/sctuc.json frontend/sctuc.json