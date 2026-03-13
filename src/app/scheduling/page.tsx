"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import ShiftCard from "../../components/ShiftCard";
import WeeklySchedule from "../../components/WeeklySchedule";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID;

type Employee = {
id: string;
name: string;
};

type Schedule = {
id: string;
employee_id: string;
work_date: string;
start_time: string | null;
end_time: string | null;
mileage: number | null;
is_outing: boolean | null;
daily_log: string | null;
};

export default function SchedulingPage() {
const [employees, setEmployees] = useState<Employee[]>([]);
const [schedules, setSchedules] = useState<Schedule[]>([]);
const [employeeId, setEmployeeId] = useState("");
const [workDate, setWorkDate] = useState("");
const [startTime, setStartTime] = useState("");
const [endTime, setEndTime] = useState("");
const [mileage, setMileage] = useState("0");
const [isOuting, setIsOuting] = useState(false);
const [dailyLog, setDailyLog] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

async function loadEmployees() {
const { data, error } = await supabase
.from("employees")
.select("id, name")
.eq("org_id", ORG_ID)
.order("name", { ascending: true });

if (error) {
setError(error.message);
return;
}

const rows = (data ?? []) as Employee[];
setEmployees(rows);

if (!employeeId && rows.length > 0) {
setEmployeeId(rows[0].id);
}
}

async function loadSchedules() {
const { data, error } = await supabase
.from("schedules")
.select("*")
.eq("org_id", ORG_ID)
.order("work_date", { ascending: false });

if (error) {
setError(error.message);
return;
}

setSchedules((data ?? []) as Schedule[]);
}

function editShift(s: Schedule) {
setEditingId(s.id);
setEmployeeId(s.employee_id);
setWorkDate(s.work_date);
setStartTime(s.start_time || "");
setEndTime(s.end_time || "");
setMileage(String(s.mileage ?? 0));
setIsOuting(Boolean(s.is_outing));
setDailyLog(s.daily_log || "");
}

function resetForm() {
setEditingId(null);
setWorkDate("");
setStartTime("");
setEndTime("");
setMileage("0");
setIsOuting(false);
setDailyLog("");
}

async function saveSchedule(e: React.FormEvent) {
e.preventDefault();
setError(null);

if (!ORG_ID) {
setError("Missing NEXT_PUBLIC_ORG_ID in .env.local");
return;
}

if (!employeeId) {
setError("Select an employee");
return;
}

if (!workDate) {
setError("Select a work date");
return;
}

const payload = {
org_id: ORG_ID,
employee_id: employeeId,
work_date: workDate,
start_time: startTime || null,
end_time: endTime || null,
mileage: Number(mileage || 0),
is_outing: isOuting,
daily_log: dailyLog.trim() || null,
};

if (editingId) {
const { error } = await supabase
.from("schedules")
.update(payload)
.eq("id", editingId);

if (error) {
setError(error.message);
return;
}
} else {
const { error } = await supabase.from("schedules").insert([payload]);

if (error) {
setError(error.message);
return;
}
}

resetForm();
await loadSchedules();
}

async function deleteShift(id: string) {
const { error } = await supabase.from("schedules").delete().eq("id", id);

if (error) {
setError(error.message);
return;
}

await loadSchedules();
}

useEffect(() => {
loadEmployees();
loadSchedules();
}, []);

return (
<main style={{ padding: 20, maxWidth: 1100 }}>
<h1 style={{ marginBottom: 16 }}>Scheduling</h1>

{error && <p style={{ color: "crimson", marginBottom: 16 }}>Error: {error}</p>}

<div
style={{
display: "grid",
gridTemplateColumns: "minmax(320px, 420px) 1fr",
gap: 20,
alignItems: "start",
}}
>
<section
style={{
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
}}
>
<h2 style={{ marginTop: 0, marginBottom: 12 }}>
{editingId ? "Edit Shift" : "Create Shift"}
</h2>

<form
onSubmit={saveSchedule}
style={{
display: "grid",
gap: 10,
}}
>
<select
value={employeeId}
onChange={(e) => setEmployeeId(e.target.value)}
style={inputStyle}
>
<option value="">Select employee</option>
{employees.map((emp) => (
<option key={emp.id} value={emp.id}>
{emp.name}
</option>
))}
</select>

<input
type="date"
value={workDate}
onChange={(e) => setWorkDate(e.target.value)}
style={inputStyle}
/>

<input
type="time"
value={startTime}
onChange={(e) => setStartTime(e.target.value)}
style={inputStyle}
/>

<input
type="time"
value={endTime}
onChange={(e) => setEndTime(e.target.value)}
style={inputStyle}
/>

<input
type="number"
placeholder="Mileage"
value={mileage}
onChange={(e) => setMileage(e.target.value)}
style={inputStyle}
/>

<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
<input
type="checkbox"
checked={isOuting}
onChange={(e) => setIsOuting(e.target.checked)}
/>
Outing
</label>

<textarea
placeholder="Daily Log"
value={dailyLog}
onChange={(e) => setDailyLog(e.target.value)}
rows={4}
style={inputStyle}
/>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
<button type="submit" className="primary-btn">
{editingId ? "Save Changes" : "Create Shift"}
</button>

{editingId && (
<button type="button" onClick={resetForm} style={secondaryBtnStyle}>
Cancel Edit
</button>
)}
</div>
</form>
</section>

<section
style={{
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
minHeight: 300,
}}
>
<h2 style={{ marginTop: 0, marginBottom: 12 }}>Scheduled Shifts</h2>

{schedules.length === 0 ? (
<p style={{ opacity: 0.75 }}>No scheduled shifts yet.</p>
) : (
<div style={{ display: "grid", gap: 12 }}>
{schedules.map((s) => {
const employee = employees.find((e) => e.id === s.employee_id);

return (
<ShiftCard
key={s.id}
shift={s}
employee={employee}
onEdit={() => editShift(s)}
onDelete={() => deleteShift(s.id)}
/>
);
})}
</div>
)}
</section>
</div>

<WeeklySchedule schedules={schedules} employees={employees} />
</main>
);
}

const inputStyle: React.CSSProperties = {
width: "100%",
padding: "10px 12px",
border: "1px solid #d1d5db",
borderRadius: 8,
background: "white",
};

const secondaryBtnStyle: React.CSSProperties = {
background: "#e5e7eb",
color: "#111827",
border: "none",
padding: "8px 12px",
borderRadius: 8,
cursor: "pointer",
};