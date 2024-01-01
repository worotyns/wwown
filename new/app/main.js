const emojiRequest = fetch("./sctuc.json").then((response) => response.json());

function emojis() {
  return {
    emoji: null,
    isCustomEmoji: false,
    emojiPromise: null,
    emojiMap: {},
    wrap(emojiCode) {
      const skinToneRegex = /::skin-tone-[2-6]|::skin-tone-:d:[2-6]/g;
      const rawEmojiCode = emojiCode.replace(skinToneRegex, "");
      return this.emojiMap[rawEmojiCode] || ":" + emojiCode + ":";
    },
    async init(emojiCode) {
      if (this.emojiPromise) {
        return this.emojiPromise;
      }

      if (!emojiCode) {
        return;
      }

      this.emojiPromise = emojiRequest
        .then((data) => this.emojiMap = data)
        .then(() => {
          const emoji = this.wrap(emojiCode);
          this.isCustomEmoji = emoji.startsWith(":");
          this.emoji = emoji;
        })
        .catch((error) => {
          this.emojiPromise = null;
          console.error("Error fetching emoji data:", error);
        });
    },
  };
}

function queryParamsFromQueryState(state) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    query.set(key, value);
  }
  return "?" + decodeURI(query.toString());
}

function data(query, uri) {
  return {
    __uri: uri,
    __fetchTimeMs: 0,
    __queryParams: query,
    __item: {},
    __resources: new Map(),
    get(path, defaultValue) {
      return this.__item[path] || defaultValue;
    },
    t(key) {
      return this.__resources.get(key) || key;
    },
    async init() {
      const start = Date.now();
      this.__item = {};
      try {
        const response = await fetch(
          this.__uri + queryParamsFromQueryState(this.__queryParams),
        );
        this.__item = await response.json();
        if (this.__item.resources) {
          this.__resources = new Map(this.__item.resources);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        this.__fetchTimeMs = Date.now() - start;
        console.log(`Fetched data in ${this.__fetchTimeMs}ms`);
      }
    },
  };
}

function round(number, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

function timeAgo(date) {
  if (!date) {
    return "never";
  }

  const currentDate = new Date();
  const timestamp = date instanceof Date
    ? date.getTime()
    : new Date(date).getTime();
  const timeDiff = currentDate.getTime() - timestamp;

  const seconds = Math.floor(timeDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks === 1) {
    return "last week";
  } else if (months < 12) {
    return `${months + 1} months ago`;
  } else if (years === 1) {
    return "last year";
  } else {
    return `${years} years ago`;
  }
}

function duration(durationInSeconds) {
  const days = Math.floor(durationInSeconds / (24 * 3600));
  const hours = Math.floor((durationInSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = durationInSeconds % 60;

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0) {
    parts.push(`${seconds}s`);
  }

  if (parts.length === 0) {
    return "0s";
  }

  return parts.join(" ");
}

function date(ts) {
  return new Date(ts).toLocaleString();
}

function normalize(curent, min, max, newMin = 0, newMax = 100) {
  curent = Math.min(Math.max(curent, min), max);
  return ((curent - min) / (max - min)) * (newMax - newMin) + newMin;
}
