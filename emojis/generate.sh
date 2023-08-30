rm -f emoji.json
rm -f sctuc.json
rm -f ../src/front/sctuc.json

wget https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji.json
node convert.js
mv sctuc.json ../src/front/sctuc.json