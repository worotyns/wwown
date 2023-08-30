const emojiRequest = fetch('./sctuc.json').then((response) => response.json());

function emojis() {
  return {
    emojiPromise: null,
    emojiMap: {},
    wrap(emojiCode) {
      const skinToneRegex = /::skin-tone-[2-6]|::skin-tone-:d:[2-6]/g;
      const rawEmojiCode = emojiCode.replace(skinToneRegex, '');
      return this.emojiMap[rawEmojiCode] || ':'+emojiCode+':';
    },
    async init() {
      if (this.emojiPromise) {
        return this.emojiPromise;
      }

      this.emojiPromise = emojiRequest
        .then(data => this.emojiMap = data)
        .catch((error) => {
          this.fetchPromise = null;
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

  return "?" + decodeURI(query.toString())
}

function data(query) {
  return {
    queryParams: {
      period: 'd',
      ...query,
    },
    items: [],
    item: {},
    async query(url) {
      this.items = [];
      this.item = {};
      try {
        const response = await fetch(url + queryParamsFromQueryState(this.queryParams));
        const body = await response.json();
        Array.isArray(body) ? this.items = body : this.item = body;
      } catch (error) {
        console.error('Error fetching data:', error);
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