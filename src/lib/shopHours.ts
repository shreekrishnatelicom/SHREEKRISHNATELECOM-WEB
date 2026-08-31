export interface ShopHoursSettings {
  isOpen?: boolean;
  autoStatus?: boolean;
  openTime?: string;  // e.g. "08:00"
  closeTime?: string; // e.g. "21:00"
  openDays?: string;  // e.g. "Mon - Sun"
}

export function formatTime12h(time24: string): string {
  if (!time24) return "8:00 AM";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr || "8", 10);
  const m = mStr ? mStr.padStart(2, "0") : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function parseTimeToMinutes(timeStr: string, defaultMinutes: number): number {
  if (!timeStr) return defaultMinutes;
  const parts = timeStr.split(":");
  if (parts.length < 2) return defaultMinutes;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultMinutes;
  return h * 60 + m;
}

export function getISTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (5.5 * 3600000));
}

export function isDayOpen(dayNameOrIndex: number | string, openDaysStr: string = "Mon - Sun"): boolean {
  const dayMap: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };

  const dayIndex = typeof dayNameOrIndex === "number" 
    ? dayNameOrIndex 
    : dayMap[dayNameOrIndex.toLowerCase()] ?? 1;

  const normalized = openDaysStr.toLowerCase().trim();

  // If Mon - Sun or Mon-Sun or Everyday
  if (normalized.includes("mon - sun") || normalized.includes("mon-sun") || normalized.includes("everyday") || normalized.includes("all days")) {
    return true;
  }

  // If Mon - Sat or Mon-Sat (Sunday closed)
  if (normalized.includes("mon - sat") || normalized.includes("mon-sat")) {
    return dayIndex !== 0; // 0 is Sunday
  }

  // Check if day name is explicitly listed
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const currentDayKey = dayNames[dayIndex];
  return normalized.includes(currentDayKey);
}

export function getComputedShopStatus(settings?: ShopHoursSettings | null): {
  isOpen: boolean;
  isAuto: boolean;
  statusText: string;
  hoursText: string;
  daysText: string;
} {
  const autoStatus = settings?.autoStatus ?? true;
  const openTimeStr = settings?.openTime || "08:00";
  const closeTimeStr = settings?.closeTime || "21:00";
  const openDaysStr = settings?.openDays || "Mon - Sun";
  const manualIsOpen = settings?.isOpen ?? true;

  const hoursText = `${formatTime12h(openTimeStr)} – ${formatTime12h(closeTimeStr)}`;
  const daysText = openDaysStr;

  if (!autoStatus) {
    // Manual mode
    return {
      isOpen: manualIsOpen,
      isAuto: false,
      statusText: manualIsOpen ? `OPEN (${hoursText})` : "CLOSED (Manual Override)",
      hoursText,
      daysText,
    };
  }

  // Auto Mode: check current time in IST
  const istNow = getISTDate();
  const currentDayIndex = istNow.getDay(); // 0 = Sun
  const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

  const openMinutes = parseTimeToMinutes(openTimeStr, 8 * 60);  // Default 8:00 AM
  const closeMinutes = parseTimeToMinutes(closeTimeStr, 21 * 60); // Default 9:00 PM

  const dayIsOpen = isDayOpen(currentDayIndex, openDaysStr);
  const timeIsOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  const calculatedIsOpen = dayIsOpen && timeIsOpen;

  let statusText = "";
  if (calculatedIsOpen) {
    statusText = `OPEN NOW (${hoursText})`;
  } else if (!dayIsOpen) {
    statusText = `CLOSED TODAY (${daysText})`;
  } else if (currentMinutes < openMinutes) {
    statusText = `CLOSED (Opens at ${formatTime12h(openTimeStr)})`;
  } else {
    statusText = `CLOSED (Reopens tomorrow at ${formatTime12h(openTimeStr)})`;
  }

  return {
    isOpen: calculatedIsOpen,
    isAuto: true,
    statusText,
    hoursText,
    daysText,
  };
}
