import { Emoji } from "../../../domain/common/interfaces.ts";

export function normalizeValue(
  originalValue: number,
  minValue: number,
  maxValue: number,
  newMin: number,
  newMax: number,
) {
  return ((originalValue - minValue) / (maxValue - minValue)) *
      (newMax - newMin) + newMin;
}

export function normalizeEmoji(
  emoji: Emoji,
): Emoji {
  const skinToneRegex = /::skin-tone-[2-6]|::skin-tone-:d:[2-6]/g;
  return emoji.replace(skinToneRegex, "");
}
