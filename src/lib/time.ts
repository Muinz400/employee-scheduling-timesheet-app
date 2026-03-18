export const APP_TIMEZONE = "America/Los_Angeles";

function normalizeUtcValue(value: string | null) {
if (!value) return null;

const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(value);
return hasTimezone ? value : `${value}Z`;
}

export function formatAppDate(value: string | null) {
const normalized = normalizeUtcValue(value);
if (!normalized) return "—";

return new Date(normalized).toLocaleDateString("en-US", {
weekday: "short",
month: "short",
day: "numeric",
year: "numeric",
timeZone: APP_TIMEZONE,
});
}

export function formatAppDateTime(value: string | null) {
const normalized = normalizeUtcValue(value);
if (!normalized) return "—";

return new Date(normalized).toLocaleString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
timeZone: APP_TIMEZONE,
});
}

export function formatAppTime(time: string | null) {
if (!time) return "—";

return new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
hour: "numeric",
minute: "2-digit",
});
}

export function formatAppTimeRange(start: string | null, end: string | null) {
if (!start || !end) return "—";
return `${formatAppTime(start)} - ${formatAppTime(end)}`;
}

export function getAppDateKey(value: string | null) {
const normalized = normalizeUtcValue(value);
if (!normalized) return "unknown";

return new Intl.DateTimeFormat("en-CA", {
timeZone: APP_TIMEZONE,
year: "numeric",
month: "2-digit",
day: "2-digit",
}).format(new Date(normalized));
}
