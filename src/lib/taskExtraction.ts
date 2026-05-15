export interface NameCandidate {
  id: string;
  name: string;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string) => normalizeText(value).split(" ").filter(Boolean);

const levenshteinDistance = (left: string, right: string) => {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
};

const scoreCandidate = (mentionedName: string, candidateName: string) => {
  const normalizedMentioned = normalizeText(mentionedName);
  const normalizedCandidate = normalizeText(candidateName);

  if (!normalizedMentioned || !normalizedCandidate) return 0;
  if (normalizedMentioned === normalizedCandidate) return 1;
  if (normalizedMentioned.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedMentioned)) {
    return 0.95;
  }

  const mentionTokens = tokenize(normalizedMentioned);
  const candidateTokens = tokenize(normalizedCandidate);
  const overlap = mentionTokens.filter(token => candidateTokens.includes(token)).length;
  const tokenScore = overlap / Math.max(mentionTokens.length, candidateTokens.length);

  const partialMatches = mentionTokens.filter(token =>
    token.length > 2 && candidateTokens.some(candidateToken => candidateToken.startsWith(token) || token.startsWith(candidateToken))
  ).length;
  const partialScore = partialMatches / Math.max(mentionTokens.length, candidateTokens.length);

  const distance = levenshteinDistance(normalizedMentioned, normalizedCandidate);
  const editScore = 1 - distance / Math.max(normalizedMentioned.length, normalizedCandidate.length);

  return Math.max(tokenScore, partialScore, editScore);
};

export function resolveSuggestedAssignee<T extends NameCandidate>(
  mentionedName: string,
  candidates: T[]
): T | null {
  let bestCandidate: T | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreCandidate(mentionedName, candidate.name);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= 0.68 ? bestCandidate : null;
}

const weekdayLookup: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const applyRelativeDate = (baseDate: Date, normalizedText: string) => {
  const result = new Date(baseDate);
  result.setSeconds(0, 0);

  if (/day after tomorrow/.test(normalizedText)) {
    result.setDate(result.getDate() + 2);
    return result;
  }

  if (/tomorrow/.test(normalizedText)) {
    result.setDate(result.getDate() + 1);
    return result;
  }

  if (/today/.test(normalizedText)) {
    return result;
  }

  const inDaysMatch = normalizedText.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    result.setDate(result.getDate() + Number(inDaysMatch[1]));
    return result;
  }

  const inWeeksMatch = normalizedText.match(/in\s+(\d+)\s+weeks?/);
  if (inWeeksMatch) {
    result.setDate(result.getDate() + Number(inWeeksMatch[1]) * 7);
    return result;
  }

  const nextWeekMatch = normalizedText.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextWeekMatch) {
    const weekday = weekdayLookup[nextWeekMatch[1]];
    const currentDay = result.getDay();
    let dayOffset = weekday - currentDay;
    if (dayOffset <= 0) dayOffset += 7;
    result.setDate(result.getDate() + dayOffset + 7);
    return result;
  }

  const weekdayMatch = normalizedText.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const weekday = weekdayLookup[weekdayMatch[1]];
    const currentDay = result.getDay();
    let dayOffset = weekday - currentDay;
    if (dayOffset < 0) dayOffset += 7;
    if (/next\s+/.test(normalizedText) && dayOffset === 0) {
      dayOffset = 7;
    }
    result.setDate(result.getDate() + dayOffset);
    return result;
  }

  const directDate = new Date(normalizedText);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  return null;
};

const parseTimeFromText = (normalizedText: string) => {
  const timeMatch = normalizedText.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]) % 12;
    const minutes = Number(timeMatch[2] || "0");
    const meridiem = timeMatch[3].replace(/\./g, "");
    return {
      hours: meridiem === "pm" ? hours + 12 : hours,
      minutes,
    };
  }

  if (/\bnoon\b/.test(normalizedText)) {
    return { hours: 12, minutes: 0 };
  }

  if (/\bmidnight\b/.test(normalizedText)) {
    return { hours: 0, minutes: 0 };
  }

  return null;
};

export function parseSuggestedDeadline(value: string, baseDate: Date = new Date()) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const normalizedText = normalizeText(trimmedValue);
  const parsedDate = applyRelativeDate(baseDate, normalizedText);
  const time = parseTimeFromText(normalizedText);

  if (parsedDate) {
    if (time) {
      parsedDate.setHours(time.hours, time.minutes, 0, 0);
    } else if (/\b(tomorrow|today|next\s+|in\s+\d+\s+(?:days?|weeks?))\b/.test(normalizedText)) {
      parsedDate.setHours(9, 0, 0, 0);
    }
    return parsedDate;
  }

  const directDate = new Date(trimmedValue);
  if (!Number.isNaN(directDate.getTime())) {
    if (time) {
      directDate.setHours(time.hours, time.minutes, 0, 0);
    }
    return directDate;
  }

  return null;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function toDateTimeLocalInputValue(date: Date | null | undefined) {
  if (!date) return "";

  const localDate = new Date(date);
  return [
    localDate.getFullYear(),
    pad(localDate.getMonth() + 1),
    pad(localDate.getDate()),
  ].join("-") + `T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
}
