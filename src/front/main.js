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
  
  function progressApp() {
    return {
        progress: 0,
        progressTemplate: '',
        refresh() {
            this.progress = 0;
            this.updateProgress();
        },
        updateProgress() {
            const interval = 1000; // Update interval in milliseconds
            const totalDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
            const steps = totalDuration / interval;
            const stepSize = 100 / steps;
            
            let currentStep = 0;
            const updateInterval = setInterval(() => {
                if (currentStep >= steps) {
                    clearInterval(updateInterval);
                    this.progress = 100;
                    window.location.reload()
                } else {
                    this.progress = Math.round(currentStep * stepSize);
                    currentStep++;
                }
                
                this.updateProgressTemplate();
            }, interval);
        },
        updateProgressTemplate() {
            const progressBarLength = Math.floor(this.progress / 2);
            this.progressTemplate = 'refresh: [' + '▓'.repeat(progressBarLength) + '░'.repeat(50 - progressBarLength) + '] ' + this.progress + '%';
        },
        init() {
            this.updateProgress();
        }
    };
}