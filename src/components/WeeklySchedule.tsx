"use client";

import { formatAppTimeRange } from "../lib/time";

type Schedule = {
id: string;
employee_id: string;
house_name: string | null;
work_date: string;
start_time: string | null;
end_time: string | null;
is_outing: boolean | null;
};

type Employee = {
id: string;
name: string;
};

type WeeklyScheduleProps = {
schedules: Schedule[];
employees: Employee[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayLabel(date: string) {
return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
weekday: "short",
});
}

function getWeekStartSunday(date = new Date()) {
const d = new Date(date);
const day = d.getDay();
d.setDate(d.getDate() - day);
d.setHours(0, 0, 0, 0);
return d;
}

function formatShortDate(date: Date) {
return date.toLocaleDateString("en-US", {
month: "short",
day: "numeric",
});
}

export default function WeeklySchedule({
schedules,
employees,
}: WeeklyScheduleProps) {
const houses = Array.from(
new Set(
schedules
.map((s) => s.house_name?.trim())
.filter(Boolean)
)
) as string[];

const weekStart = getWeekStartSunday();
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

function getEmployeeName(employeeId: string) {
return employees.find((e) => e.id === employeeId)?.name ?? "Unknown";
}

function getCellShifts(house: string, day: string) {
return schedules.filter(
(s) =>
(s.house_name ?? "").trim() === house &&
getDayLabel(s.work_date) === day
);
}

function handleExportPdf() {
window.print();
}

return (
<section style={sectionStyle} className="weekly-schedule-print">
<div style={headerRow}>
<div>
<h2 style={titleStyle}>Weekly Schedule</h2>
<p style={subTextStyle}>
{formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
</p>
</div>

<button onClick={handleExportPdf} style={exportBtn}>
Export PDF
</button>
</div>

{houses.length === 0 ? (
<div style={emptyState}>
No scheduled houses yet.
</div>
) : (
<div style={boardWrap}>
<table style={tableStyle}>
<thead>
<tr>
<th style={houseHeaderStyle}>House</th>
{DAYS.map((day) => (
<th key={day} style={dayHeaderStyle}>
{day}
</th>
))}
</tr>
</thead>

<tbody>
{houses.map((house) => (
<tr key={house}>
<td style={houseCellStyle}>{house}</td>

{DAYS.map((day) => {
const cellShifts = getCellShifts(house, day);

return (
<td key={`${house}-${day}`} style={cellStyle}>
{cellShifts.length === 0 ? (
<span style={offTextStyle}>—</span>
) : (
<div style={shiftStackStyle}>
{cellShifts.map((shift) => (
<div key={shift.id} style={shiftPillStyle}>
<div style={shiftNameStyle}>
{getEmployeeName(shift.employee_id)}
</div>
<div style={shiftTimeStyle}>
{formatAppTimeRange(
shift.start_time,
shift.end_time
)}
</div>
{shift.is_outing ? (
<div style={outingBadge}>Outing</div>
) : null}
</div>
))}
</div>
)}
</td>
);
})}
</tr>
))}
</tbody>
</table>
</div>
)}
</section>
);
}

const sectionStyle: React.CSSProperties = {
marginTop: 28,
background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
border: "1px solid #e5e7eb",
borderRadius: 20,
padding: 20,
boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const headerRow: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 12,
marginBottom: 16,
flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
margin: 0,
fontSize: 26,
};

const subTextStyle: React.CSSProperties = {
margin: "6px 0 0 0",
opacity: 0.68,
fontSize: 14,
};

const exportBtn: React.CSSProperties = {
background: "#111827",
color: "white",
border: "none",
padding: "10px 16px",
borderRadius: 10,
cursor: "pointer",
fontWeight: 700,
};

const boardWrap: React.CSSProperties = {
overflowX: "auto",
border: "1px solid #e5e7eb",
borderRadius: 16,
background: "white",
};

const tableStyle: React.CSSProperties = {
width: "100%",
minWidth: 1000,
borderCollapse: "collapse",
};

const houseHeaderStyle: React.CSSProperties = {
textAlign: "left",
padding: "14px 16px",
background: "#f8fafc",
borderBottom: "1px solid #e5e7eb",
minWidth: 180,
fontWeight: 700,
};

const dayHeaderStyle: React.CSSProperties = {
textAlign: "center",
padding: "14px 12px",
background: "#f8fafc",
borderBottom: "1px solid #e5e7eb",
minWidth: 150,
fontWeight: 700,
};

const houseCellStyle: React.CSSProperties = {
padding: "16px",
borderBottom: "1px solid #f1f5f9",
verticalAlign: "top",
fontWeight: 700,
color: "#0f172a",
};

const cellStyle: React.CSSProperties = {
padding: "10px",
borderBottom: "1px solid #f1f5f9",
borderLeft: "1px solid #f8fafc",
verticalAlign: "top",
};

const shiftStackStyle: React.CSSProperties = {
display: "grid",
gap: 8,
};

const shiftPillStyle: React.CSSProperties = {
background: "#eff6ff",
border: "1px solid #bfdbfe",
borderRadius: 12,
padding: "10px",
};

const shiftNameStyle: React.CSSProperties = {
fontWeight: 700,
fontSize: 13,
marginBottom: 4,
};

const shiftTimeStyle: React.CSSProperties = {
fontSize: 12,
color: "#1e3a8a",
};

const outingBadge: React.CSSProperties = {
marginTop: 6,
display: "inline-block",
background: "#ede9fe",
color: "#6d28d9",
borderRadius: 999,
padding: "4px 8px",
fontSize: 11,
fontWeight: 700,
};

const offTextStyle: React.CSSProperties = {
color: "#94a3b8",
fontWeight: 600,
};

const emptyState: React.CSSProperties = {
border: "1px dashed #cbd5e1",
borderRadius: 16,
padding: 24,
textAlign: "center",
color: "#64748b",
};