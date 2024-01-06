const emojiRequest = fetch("./sctuc.json").then((response) => response.json());

function app() {
  return {
    __fromDate:
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
    __toDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0],
    __lastItems: 10,
    __resources: new Map(),
    __resourcesRaw: [],
    t(key) {
      return this.__resources.get(key) || key;
    },

    goto(resource) {
      if (resource.startsWith("C")) {
        return "/channels/" + resource;
      } else if (resource.startsWith("U")) {
        return "/users/" + resource;
      }
    },

    async init() {
      const start = Date.now();
      try {
        const response = await fetch(
          "/api/resources",
        );
        this.__resourcesRaw = await response.json();
        this.__resources = new Map(
          this.__resourcesRaw,
        );
      } catch (error) {
        console.error("Error fetching resources data:", error);
      } finally {
        this.__fetchTimeMs = Date.now() - start;
        console.log(`Fetched resources data in ${this.__fetchTimeMs}ms`);
      }
    },
  };
}

function debounce(func, wait = 750) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

function data(query, path, resId) {
  return {
    __resId: resId,
    __path: path,
    __fetchTimeMs: 0,
    __queryParams: query,
    __item: {},

    bindToAppState($watch) {
      const debouncedCalculate = debounce(() => {
        this.calculate();
      });

      $watch("__fromDate", (__fromDate) => {
        this.__queryParams.from = __fromDate;
        debouncedCalculate();
      });

      $watch("__toDate", (__toDate) => {
        this.__queryParams.to = __toDate;
        debouncedCalculate();
      });

      $watch("__lastItems", (__lastItems) => {
        this.__queryParams.lastItems = __lastItems;
        debouncedCalculate();
      });
    },

    get(path, defaultValue) {
      return this.__item[path] || defaultValue;
    },

    onRouteChange(resId) {
      if (resId !== this.__resId) {
        this.__resId = resId;
        this.calculate();
      }
    },

    getPath() {
      if (this.__resId) {
        return `/api/${this.__path}/${this.__resId}`;
      }
      return `/api/${this.__path}`;
    },

    async calculate() {
      const start = Date.now();
      try {
        const response = await fetch(
          this.getPath() +
            queryParamsFromQueryState(this.__queryParams),
        );
        this.__item = await response.json();
      } catch (error) {
        console.error("Error fetching stats data:", error);
      } finally {
        this.__fetchTimeMs = Date.now() - start;
        console.log(`Fetched stats data in ${this.__fetchTimeMs}ms`);
      }
    },

    async init() {
      this.__item = {};
      return this.calculate();
    },
  };
}

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
