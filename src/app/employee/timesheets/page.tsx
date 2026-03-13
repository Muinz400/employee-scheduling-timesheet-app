"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";

const TEST_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";

type ClockLogRow = {
id: string;
employee_id: string;
clock_in: string | null;
clock_out: string | null;
latitude: number | null;
longitude: number | null;
created_at: string | null;
};

export default function MyTimesheetsPage() {
const [logs, setLogs] = useState<ClockLogRow[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

async function loadLogs() {
setLoading(true);
setError(null);

const { data, error } = await supabase
.from("clock_logs")
.select("id, employee_id, clock_in, clock_out, latitude, longitude, created_at")
.eq("employee_id", TEST_EMPLOYEE_ID)
.order("clock_in", { ascending: false });

if (error) {
setError(error.message);
setLoading(false);
return;
}

setLogs((data ?? []) as ClockLogRow[]);
setLoading(false);
}

useEffect(() => {
loadLogs();
}, []);

const totalHours = useMemo(() => {
return logs.reduce((sum, log) => {
if (!log.clock_in || !log.clock_out) return sum;

const start = new Date(log.clock_in).getTime();
const end = new Date(log.clock_out).getTime();

if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;

return sum + (end - start) / (1000 * 60 * 60);
}, 0);
}, [logs]);

function formatDateTime(value: string | null) {
if (!value) return "—";
return new Date(value).toLocaleString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

function formatHours(clockIn: string | null, clockOut: string | null) {
if (!clockIn) return "—";
if (!clockOut) return "Active";

const start = new Date(clockIn).getTime();
const end = new Date(clockOut).getTime();

if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "—";

const hours = (end - start) / (1000 * 60 * 60);
return hours.toFixed(2);
}

return (
<main>
<h1 style={{ marginBottom: 12 }}>My Timesheets</h1>
<p style={{ opacity: 0.75, marginBottom: 20 }}>
Your worked hours from clock logs appear here.
</p>

<div style={summaryCard}>
<div style={{ fontSize: 12, opacity: 0.7 }}>Total Logged Hours</div>
<div style={{ fontSize: 28, fontWeight: 700 }}>{totalHours.toFixed(2)}</div>
</div>

{error && (
<p style={{ color: "crimson", marginTop: 16, marginBottom: 16 }}>
Error: {error}
</p>
)}

{loading ? (
<p style={{ marginTop: 16 }}>Loading...</p>
) : logs.length === 0 ? (
<p style={{ marginTop: 16 }}>No time records found yet.</p>
) : (
<div style={tableWrap}>
<table style={tableStyle}>
<thead>
<tr>
<th style={thStyle}>Date</th>
<th style={thStyle}>Clock In</th>
<th style={thStyle}>Clock Out</th>
<th style={thStyle}>Hours</th>
<th style={thStyle}>Location</th>
</tr>
</thead>
<tbody>
{logs.map((log) => {
const dateLabel = log.clock_in
? new Date(log.clock_in).toLocaleDateString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
})
: "—";

return (
<tr key={log.id}>
<td style={tdStyle}>{dateLabel}</td>
<td style={tdStyle}>{formatDateTime(log.clock_in)}</td>
<td style={tdStyle}>{formatDateTime(log.clock_out)}</td>
<td style={tdStyle}>{formatHours(log.clock_in, log.clock_out)}</td>
<td style={tdStyle}>
{log.latitude != null && log.longitude != null
? `${Number(log.latitude).toFixed(5)}, ${Number(log.longitude).toFixed(5)}`
: "—"}
</td>
</tr>
);
})}
</tbody>
</table>
</div>
)}
</main>
);
}

const summaryCard: React.CSSProperties = {
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
maxWidth: 260,
};

const tableWrap: React.CSSProperties = {
marginTop: 20,
overflowX: "auto",
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
width: "100%",
borderCollapse: "collapse",
minWidth: 760,
};

const thStyle: React.CSSProperties = {
textAlign: "left",
padding: "12px 14px",
borderBottom: "1px solid #e5e7eb",
background: "#f8fafc",
fontSize: 14,
};

const tdStyle: React.CSSProperties = {
padding: "12px 14px",
borderBottom: "1px solid #f1f5f9",
fontSize: 14,
};



