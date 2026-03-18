"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";
import { formatAppDate, formatAppTimeRange } from "../../../lib/time";

type ProfileRow = {
id: string;
org_id: string;
role: string;
};

type EmployeeRow = {
id: string;
name: string;
email: string;
};

type ScheduleRow = {
id: string;
employee_id: string;
org_id: string;
work_date: string;
start_time: string | null;
end_time: string | null;
mileage: number | null;
is_outing: boolean | null;
daily_log: string | null;
house_name: string | null;
};

export default function AdminShiftsPage() {
const router = useRouter();

const [authReady, setAuthReady] = useState(false);
const [orgId, setOrgId] = useState<string | null>(null);

const [employees, setEmployees] = useState<EmployeeRow[]>([]);
const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
const [selectedHouse, setSelectedHouse] = useState<string>("all");

const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

async function checkAdminAndLoadData() {
setLoading(true);
setError(null);

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
router.push("/login");
return;
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, org_id, role")
.eq("id", user.id)
.single();

if (profileError || !profile) {
router.push("/login");
return;
}

const adminProfile = profile as ProfileRow;

if (adminProfile.role !== "admin") {
router.push("/employee/clock");
return;
}

setOrgId(adminProfile.org_id);
setAuthReady(true);

await Promise.all([
loadEmployees(adminProfile.org_id),
loadSchedules(adminProfile.org_id),
]);

setLoading(false);
}

async function loadEmployees(activeOrgId: string) {
const { data, error } = await supabase
.from("employees")
.select("id, name, email")
.eq("org_id", activeOrgId)
.order("name", { ascending: true });

if (error) {
setError(error.message);
return;
}

setEmployees((data ?? []) as EmployeeRow[]);
}

async function loadSchedules(activeOrgId: string) {
const { data, error } = await supabase
.from("schedules")
.select(
"id, employee_id, org_id, work_date, start_time, end_time, mileage, is_outing, daily_log, house_name"
)
.eq("org_id", activeOrgId)
.order("work_date", { ascending: false });

if (error) {
setError(error.message);
return;
}

setSchedules((data ?? []) as ScheduleRow[]);
}

useEffect(() => {
void checkAdminAndLoadData();
}, []);

const houses = useMemo(() => {
return Array.from(
new Set(
schedules
.map((s) => s.house_name?.trim())
.filter(Boolean)
)
) as string[];
}, [schedules]);

const filteredSchedules = useMemo(() => {
return schedules.filter((shift) => {
const employeeMatch =
selectedEmployeeId === "all" || shift.employee_id === selectedEmployeeId;

const houseMatch =
selectedHouse === "all" || (shift.house_name ?? "") === selectedHouse;

return employeeMatch && houseMatch;
});
}, [schedules, selectedEmployeeId, selectedHouse]);

function getEmployeeName(employeeId: string) {
return employees.find((emp) => emp.id === employeeId)?.name ?? "Unknown";
}

async function handleSignOut() {
await supabase.auth.signOut();
router.push("/login");
}

if (!authReady && loading) {
return (
<main style={{ maxWidth: 1100, margin: "40px auto", padding: 20 }}>
<p>Loading shifts...</p>
</main>
);
}

return (
<main style={{ maxWidth: 1100, margin: "40px auto", padding: 20 }}>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 8,
gap: 12,
flexWrap: "wrap",
}}
>
<h1 style={{ margin: 0 }}>Admin Shifts</h1>

<button
onClick={handleSignOut}
style={{
padding: "8px 14px",
background: "#111",
color: "white",
border: "none",
borderRadius: 8,
fontWeight: 600,
cursor: "pointer",
fontSize: 13,
}}
>
Sign Out
</button>
</div>

<p style={{ opacity: 0.75, marginBottom: 20 }}>
Review all scheduled employee shifts across houses.
</p>

<div
style={{
display: "flex",
gap: 16,
flexWrap: "wrap",
marginBottom: 20,
}}
>
<div>
<label style={labelStyle}>Employee</label>
<select
value={selectedEmployeeId}
onChange={(e) => setSelectedEmployeeId(e.target.value)}
style={selectStyle}
>
<option value="all">All Employees</option>
{employees.map((employee) => (
<option key={employee.id} value={employee.id}>
{employee.name}
</option>
))}
</select>
</div>

<div>
<label style={labelStyle}>House</label>
<select
value={selectedHouse}
onChange={(e) => setSelectedHouse(e.target.value)}
style={selectStyle}
>
<option value="all">All Houses</option>
{houses.map((house) => (
<option key={house} value={house}>
{house}
</option>
))}
</select>
</div>
</div>

{error && (
<p style={{ color: "crimson", marginBottom: 16 }}>
Error: {error}
</p>
)}

{loading ? (
<p>Loading...</p>
) : filteredSchedules.length === 0 ? (
<p>No scheduled shifts found.</p>
) : (
<div
style={{
overflowX: "auto",
border: "1px solid #e5e7eb",
borderRadius: 12,
background: "white",
}}
>
<table
style={{
width: "100%",
borderCollapse: "collapse",
minWidth: 980,
}}
>
<thead style={{ background: "#f8fafc" }}>
<tr>
<th style={thStyle}>Employee</th>
<th style={thStyle}>House</th>
<th style={thStyle}>Date</th>
<th style={thStyle}>Time</th>
<th style={thStyle}>Mileage</th>
<th style={thStyle}>Outing</th>
<th style={thStyle}>Daily Log</th>
</tr>
</thead>
<tbody>
{filteredSchedules.map((shift) => (
<tr
key={shift.id}
onClick={() => router.push(`/scheduling?edit=${shift.id}`)}
style={{
cursor: "pointer",
transition: "background 0.2s",
}}
onMouseEnter={(e) => {
(e.currentTarget.style.background = "#f9fafb");
}}
onMouseLeave={(e) => {
(e.currentTarget.style.background = "white");
}}
>
<td style={tdStyle}>{getEmployeeName(shift.employee_id)}</td>
<td style={tdStyle}>{shift.house_name || "—"}</td>
<td style={tdStyle}>{formatAppDate(shift.work_date)}</td>
<td style={tdStyle}>
{formatAppTimeRange(shift.start_time, shift.end_time)}
</td>
<td style={tdStyle}>
{shift.mileage != null ? shift.mileage : "—"}
</td>
<td style={tdStyle}>
{shift.is_outing ? "Yes" : "No"}
</td>
<td style={tdStyle}>{shift.daily_log || "—"}</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</main>
);
}

const labelStyle: React.CSSProperties = {
display: "block",
fontSize: 13,
fontWeight: 600,
marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
padding: "10px 12px",
border: "1px solid #d1d5db",
borderRadius: 8,
minWidth: 220,
background: "white",
};

const thStyle: React.CSSProperties = {
textAlign: "left",
padding: "14px 16px",
fontSize: 14,
borderBottom: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
padding: "14px 16px",
borderBottom: "1px solid #e5e7eb",
fontSize: 14,
verticalAlign: "top",
};