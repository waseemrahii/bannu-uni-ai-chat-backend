// utils/timeHelper.js
export const formatClassStatus = (classDate, startTime, endTime) => {
  const now = new Date();

  // 🧭 Parse base date (same day)
  const start = new Date(classDate);
  const end = new Date(classDate);

  // 🔹 Convert "10:00 AM" / "12:30 PM" → 24h format
  const parseTime = (t) => {
    if (!t) return [0, 0];
    const match = t.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
    if (!match) return [0, 0];
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]) || 0;
    const meridian = (match[3] || "").toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return [hours, minutes];
  };

  const [startH, startM] = parseTime(startTime);
  const [endH, endM] = parseTime(endTime);

  start.setHours(startH, startM, 0, 0);
  end.setHours(endH, endM, 0, 0);

  // 🧮 Compare times
  if (now < start) {
    const mins = Math.floor((start - now) / 60000);
    if (mins < 1) return "starts in a moment";
    if (mins < 60) return `starts in ${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `starts in ${hours} hr${hours > 1 ? "s" : ""}${
      rem ? ` ${rem} min` : ""
    }`;
  } else if (now >= start && now <= end) {
    const minsLeft = Math.floor((end - now) / 60000);
    return `in progress (${minsLeft} min left)`;
  } else {
    const minsAgo = Math.floor((now - end) / 60000);
    if (minsAgo < 2) return "just finished";
    if (minsAgo < 60) return `finished ${minsAgo} min ago`;
    const hours = Math.floor(minsAgo / 60);
    return `finished ${hours} hr${hours > 1 ? "s" : ""} ago`;
  }
};
