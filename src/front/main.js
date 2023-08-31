const emojiRequest = fetch('./sctuc.json').then((response) => response.json());

function emojis() {
  return {
    emoji: null,
    isCustomEmoji: false,
    emojiPromise: null,
    emojiMap: {},
    wrap(emojiCode) {
      const skinToneRegex = /::skin-tone-[2-6]|::skin-tone-:d:[2-6]/g;
      const rawEmojiCode = emojiCode.replace(skinToneRegex, '');
      return this.emojiMap[rawEmojiCode] || ':'+emojiCode+':';
    },
    async init(emojiCode) {
      if (this.emojiPromise) {
        return this.emojiPromise;
      }

      if (!emojiCode) {
        return;
      }

      this.emojiPromise = emojiRequest
        .then(data => this.emojiMap = data)
        .then(() => {
          const emoji = this.wrap(emojiCode);
          this.isCustomEmoji = emoji.startsWith(':');
          this.emoji = emoji;
        })
        .catch((error) => {
          this.emojiPromise = null;
          console.error('Error fetching emoji data:', error)
        })
    }
  };
}

function createDateFromPeriod(period) {
  const now = new Date();

  const regex = /(-?\d+)([dmy])/;
  const match = period.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  let durationInMilliseconds = 0;

  switch (unit) {
    case "d":
      durationInMilliseconds = value * 24 * 60 * 60 * 1000;
      break;
    case "m":
      durationInMilliseconds = value * 31 * 24 * 60 * 60 * 1000;
      break;
    case "y":
      durationInMilliseconds = value * 365 * 24 * 60 * 60 * 1000;
      break;
  }

  return new Date(now.getTime() + durationInMilliseconds);
}

function queryParamsFromQueryState(state) {
  const query = new URLSearchParams()
  
  if (!state.period) {
    state.period = 'd'
  }

  if (typeof state.limit !== 'undefined') {
    query.append('l', state.limit.toString())
  }

  if (typeof state.start !== 'undefined' && typeof state.end !== 'undefined') {
    query.append('t', `${state.start}${state.period},${state.end}${state.period}`)
  } else if (typeof state.end !== 'undefined') {
    query.append('t', `0${state.period},${state.end}`)
  } else if (typeof state.start !== 'undefined') {
    query.append('t', `${state.start}${state.period}`)
  }

  if (typeof state.tzOffset !== 'undefined') {
    query.append('tz', `${state.tzOffset}`)
  }

  return "?" + decodeURI(query.toString())
}

function globalPicker() {
  return {

    absoluteStart: new Date(),
    absoluteEnd: new Date(),

    windowSize: 0,
    daysAgo: 0,

    globalStart: 0,
    globalEnd: 0,

    toAbsolute(days) {
      const date = new Date(Date.now() + days * 24 * 3600 * 1000);
      return date
    },

    isActive(day) {
      return this.absoluteStart < new Date(day) && new Date(day) < this.absoluteEnd;
    },

    recalculateWindow() {
      this.globalEnd = this.daysAgo;
      this.globalStart = this.daysAgo - this.windowSize;
      this.absoluteStart = this.toAbsolute(this.globalStart);
      this.absoluteEnd = this.toAbsolute(this.globalEnd);
    },

    get pickerIsActive() {
      return !!(this.windowSize || this.daysAgo)
    },

    toDayAgo(date1, date2 = new Date()) {
      const timeDiff = Math.abs(date2.getTime() - date1.getTime());
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      return -daysDiff;
    },

    setPickerForDay(day) {
      const end = this.toDayAgo(new Date(day));
      const start = end - 1;

      this.globalEnd = end;
      this.globalStart = start;

      this.absoluteStart = this.toAbsolute(start);
      this.absoluteEnd = this.toAbsolute(end);

      this.windowSize = Math.abs(this.globalStart - this.globalEnd);
      this.daysAgo = this.globalEnd;

      return {
        globalStart: this.globalStart,
        globalEnd: this.globalEnd
      }
    }
  }
}

function data(query, uri) {
  return {
    uri,
    fetchTimeMs: 0,
    queryParams: {
      period: 'd',
      ...query,
    },
    items: [],
    item: {},
    async recalculate($this, $event) {
      $this.queryParams.start = $event.globalStart;
      $this.queryParams.end = $event.globalEnd;
      return this.calculate();
    },
    async calculate() {
      const start = Date.now();
      this.items = [];
      this.item = {};
      try {
        const response = await fetch(this.uri + queryParamsFromQueryState(this.queryParams));
        const body = await response.json();
        Array.isArray(body) ? this.items = body : this.item = body;
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        this.fetchTimeMs = Date.now() - start;
      }
    }
  };
}

function timeAgo(date) {
  const currentDate = new Date();
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
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
    return 'last week';
  } else if (months < 12) {
    return `${months} months ago`;
  } else if (years === 1) {
    return 'last year';
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
    return '0s';
  }

  return parts.join(' ');
}

function date(ts) {
  return new Date(ts).toLocaleString()
}

function onlyDate(ts) {
  return date(ts).split(',')[0];
}