/**
 * Formats a number to FCFA currency string, e.g. "12 000 FCFA"
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

/**
 * Formats an ISO date string in Africa/Douala timezone
 */
export function formatDoualaDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Douala',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDoualaDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Douala',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Checks if a given ISO string is within "Today" in Africa/Douala
 */
export function isTodayInDouala(isoString: string): boolean {
  try {
    const targetDate = new Date(isoString);
    const now = new Date();

    const getParts = (d: Date) => {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Douala',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      return formatter.format(d);
    };

    return getParts(targetDate) === getParts(now);
  } catch {
    return false;
  }
}

/**
 * Checks if a date falls in the current calendar week (Monday to Sunday) in Africa/Douala
 */
export function isThisWeekInDouala(isoString: string): boolean {
  try {
    const targetDate = new Date(isoString);
    const now = new Date();

    // Convert both to Douala calendar dates
    const toDoualaMidnight = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Douala',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(d);

      const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
      const month = parseInt(parts.find(p => p.type === 'month')!.value, 10) - 1;
      const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

      return new Date(Date.UTC(year, month, day));
    };

    const targetDouala = toDoualaMidnight(targetDate);
    const nowDouala = toDoualaMidnight(now);

    // Monday is start of week
    const dayOfWeek = nowDouala.getUTCDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    
    const monday = new Date(nowDouala);
    monday.setUTCDate(nowDouala.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    return targetDouala.getTime() >= monday.getTime() && targetDouala.getTime() <= sunday.getTime();
  } catch {
    return false;
  }
}

/**
 * Checks if a date falls in the current month in Africa/Douala
 */
export function isThisMonthInDouala(isoString: string): boolean {
  try {
    const targetDate = new Date(isoString);
    const now = new Date();

    const getMonthYear = (d: Date) => {
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Douala',
        year: 'numeric',
        month: 'numeric',
      });
      return formatter.format(d);
    };

    return getMonthYear(targetDate) === getMonthYear(now);
  } catch {
    return false;
  }
}

/**
 * Compresses an image file in browser to maximum 800px width/height and quality 0.75
 * Resulting base64 string is typically 30KB - 70KB, perfect for mobile network & Firestore!
 */
export async function compressImageFile(file: File, maxDimension = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Prefer webp, fallback to jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Strips all undefined properties from an object so Firestore never rejects payloads
 */
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as Partial<T>;
}

