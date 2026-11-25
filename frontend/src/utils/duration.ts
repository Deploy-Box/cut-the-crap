export interface DurationMatch {
  text: string;
  seconds: number;
  start: number;
  end: number;
}

const DURATION_PATTERN =
  /(\d+(?:\.\d+)?)\s*((?:hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b)/gi;

export function parseDurationMatches(text: string): DurationMatch[] {
  const matches: DurationMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = DURATION_PATTERN.exec(text)) !== null) {
    const amount = Number.parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();
    let seconds = 0;

    if (unit?.startsWith('h')) seconds = amount * 60 * 60;
    else if (unit?.startsWith('m')) seconds = amount * 60;
    else seconds = amount;

    matches.push({
      text: match[0],
      seconds: Math.round(seconds),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
