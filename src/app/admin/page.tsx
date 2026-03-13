"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../supabaseClient";

type ClockLogRow = {
id: string;
employee_id: string;
clock_in: string | null;
clock_out: string | null;
latitude: number | null;
longitude: number | null;
created_at: string | null;
};

type EmployeeRow = {
id: string;
name: string;
email: string | null;
};

export default function AdminPage() {
const [logs, setLogs] = useState<ClockLogRow[]>([]);
const [employees, setEmployees] = useState<EmployeeRow[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

async function loadData() {
setLoading(true);
setError(null);

const [logsResult, employeesResult] = await Promise.all([
supabase
.from("clock_logs")
.select("id, employee_id, clock_in, clock_out, latitude, longitude, created_at")
.order("clock_in", { ascending: false }),

supabase
.from("employees")
.select("id, name, email")
.order("name", { ascending: true }),
]);

if (logsResult.error) {
setError(logsResult.error.message);
setLoading(false);
return;
}

if (employeesResult.error) {
setError(employeesResult.error.message);
setLoading(false);
return;
}

setLogs((logsResult.data ?? []) as ClockLogRow[]);
setEmployees((employeesResult.data ?? []) as EmployeeRow[]);
setLoading(false);
}

useEffect(() => {
loadData();

const interval = setInterval(() => {
loadData();
}, 5000);

return () => clearInterval(interval);
}, []);

const employeeNameById = useMemo(() => {
const map: Record<string, string> = {};

for (const employee of employees) {
map[employee.id] = employee.name;
}

return map;
}, [employees]);

const activeLogs = useMemo(() => {
return logs.filter((log) => log.clock_in && !log.clock_out);
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

const start = new Date(clockIn).getTime();
const end = clockOut ? new Date(clockOut).getTime() : Date.now();

if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "—";

return ((end - start) / (1000 * 60 * 60)).toFixed(2);
}

function getEmployeeName(employeeId: string) {
return employeeNameById[employeeId] ?? "Unknown Employee";
}

return (
<main>
<h1 style={{ marginBottom: 12 }}>Admin Dashboard</h1>
<p style={{ opacity: 0.8, marginBottom: 24 }}>
Manage operations across the company.
</p>

<div style={gridStyle}>
<DashboardCard
title="Employees"
description="Manage staff accounts and information."
href="/employees"
/>
<DashboardCard
title="Scheduling"
description="Create and manage employee shifts."
href="/scheduling"
/>
<DashboardCard
title="Timesheets"
description="Review and approve worked hours."
href="/timesheets"
/>
<DashboardCard
title="Payroll"
description="Calculate wages and export payroll."
href="/payroll"
/>
</div>

<section style={sectionStyle}>
<div style={sectionHeaderStyle}>
<div>
<h2 style={{ margin: 0 }}>Live Clock Monitor</h2>
<p style={{ margin: "6px 0 0", opacity: 0.7 }}>
Active and recent employee clock activity.
</p>
</div>

<button type="button" onClick={loadData} className="primary-btn">
Refresh
</button>
</div>

<div style={summaryRowStyle}>
<div style={summaryCardStyle}>
<div style={{ fontSize: 12, opacity: 0.7 }}>Active Employees</div>
<div style={{ fontSize: 28, fontWeight: 700 }}>{activeLogs.length}</div>
</div>

<div style={summaryCardStyle}>
<div style={{ fontSize: 12, opacity: 0.7 }}>Total Records</div>
<div style={{ fontSize: 28, fontWeight: 700 }}>{logs.length}</div>
</div>
</div>

{error && (
<p style={{ color: "crimson", marginTop: 16, marginBottom: 16 }}>
Error: {error}
</p>
)}

{loading ? (
<p style={{ marginTop: 16 }}>Loading clock activity...</p>
) : logs.length === 0 ? (
<p style={{ marginTop: 16 }}>No clock activity yet.</p>
) : (
<div style={tableWrapStyle}>
<table style={tableStyle}>
<thead>
<tr>
<th style={thStyle}>Employee</th>
<th style={thStyle}>Clock In</th>
<th style={thStyle}>Clock Out</th>
<th style={thStyle}>Hours</th>
<th style={thStyle}>Status</th>
<th style={thStyle}>Location</th>
</tr>
</thead>
<tbody>
{logs.map((log) => (
<tr key={log.id}>
<td style={tdStyle}>{getEmployeeName(log.employee_id)}</td>
<td style={tdStyle}>{formatDateTime(log.clock_in)}</td>
<td style={tdStyle}>{formatDateTime(log.clock_out)}</td>
<td style={tdStyle}>{formatHours(log.clock_in, log.clock_out)}</td>
<td style={tdStyle}>
<span
style={{
...statusPillStyle,
background: log.clock_out ? "#e5e7eb" : "#dcfce7",
color: log.clock_out ? "#111827" : "#166534",
}}
>
{log.clock_out ? "Completed" : "Clocked In"}
</span>
</td>
<td style={tdStyle}>
{log.latitude != null && log.longitude != null
? `${Number(log.latitude).toFixed(5)}, ${Number(log.longitude).toFixed(5)}`
: "—"}
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</section>
</main>
);
}

function DashboardCard({
title,
description,
href,
}: {
title: string;
description: string;
href: string;
}) {
return (
<Link href={href} style={cardStyle}>
<div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
<div style={{ opacity: 0.75 }}>{description}</div>
</Link>
);
}

const gridStyle: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
gap: 16,
marginBottom: 28,
};

const cardStyle: React.CSSProperties = {
display: "block",
padding: 20,
border: "1px solid #e5e7eb",
borderRadius: 12,
background: "white",
textDecoration: "none",
color: "#111827",
};

const sectionStyle: React.CSSProperties = {
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
};

const sectionHeaderStyle: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 16,
flexWrap: "wrap",
marginBottom: 16,
};

const summaryRowStyle: React.CSSProperties = {
display: "flex",
gap: 16,
flexWrap: "wrap",
marginBottom: 16,
};

const summaryCardStyle: React.CSSProperties = {
background: "#f8fafc",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
minWidth: 180,
};

const tableWrapStyle: React.CSSProperties = {
overflowX: "auto",
border: "1px solid #e5e7eb",
borderRadius: 12,
};

const tableStyle: React.CSSProperties = {
width: "100%",
borderCollapse: "collapse",
minWidth: 900,
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

const statusPillStyle: React.CSSProperties = {
display: "inline-block",
padding: "6px 10px",
borderRadius: 999,
fontSize: 12,
fontWeight: 700,
};

