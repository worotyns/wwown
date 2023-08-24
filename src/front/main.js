function data() {
    return {
        items: [],
        async load(url) {
            this.items = [];
            try {
                const response = await fetch(url);
                this.items = await response.json();
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
  