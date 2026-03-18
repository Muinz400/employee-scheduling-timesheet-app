"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";
import { formatAppDate, formatAppDateTime } from "../../../lib/time";

type Employee = {
id: string;
name: string;
};

type Shift = {
id: string;
employee_id: string;
house_name: string | null;
work_date: string;
start_time: string | null;
end_time: string | null;
mileage: number | null;
is_outing: boolean;
daily_log: string | null;
};

function formatTime12(time: string | null) {
    if (!time) return "—";
    
    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    const minutes = minuteStr;
    
    const ampm = hour >= 12 ? "PM" : "AM";
    
    hour = hour % 12;
    if (hour === 0) hour = 12;
    
    return `${hour}:${minutes} ${ampm}`;
    }

export default function EmployeeShiftsPage() {
const router = useRouter();

const [employee, setEmployee] = useState<Employee | null>(null);
const [shifts, setShifts] = useState<Shift[]>([]);
const [loading, setLoading] = useState(true);

async function loadShifts() {
setLoading(true);

// 1. get logged in user
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
router.push("/login");
return;
}

// 2. get employee record
const { data: employeeRow } = await supabase
.from("employees")
.select("id, name")
.eq("user_id", user.id)
.single();

if (!employeeRow) {
setLoading(false);
return;
}

setEmployee(employeeRow);

// 3. get shifts for this employee
const { data: shiftRows } = await supabase
.from("schedules")
.select("*")
.eq("employee_id", employeeRow.id)
.order("work_date", { ascending: false });

setShifts((shiftRows ?? []) as Shift[]);
setLoading(false);
}

useEffect(() => {
loadShifts();
}, []);

if (loading) {
return (
<main style={{ padding: 20 }}>
<p>Loading shifts...</p>
</main>
);
}

return (
<main style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
<h1>My Shifts</h1>

<p style={{ opacity: 0.7 }}>
Upcoming and past scheduled shifts.
</p>

{shifts.length === 0 ? (
<p>No shifts assigned yet.</p>
) : (
<div style={{ display: "grid", gap: 12 }}>
{shifts.map((shift) => (
<div key={shift.id} style={card}>
<div style={row}>
<strong>{formatAppDate(shift.work_date)}</strong>

{shift.is_outing && (
<span style={outingBadge}>Outing</span>
)}
</div>

<div style={grid}>
<div>
<div style={label}>Time</div>
<div>
{formatTime12(shift.start_time)} - {formatTime12(shift.end_time)}

</div>
</div>

<div>
<div style={label}>House</div>
<div>{shift.house_name || "—"}</div>
</div>

<div>
<div style={label}>Mileage</div>
<div>{shift.mileage ?? "—"}</div>
</div>
</div>

<div style={{ marginTop: 10 }}>
<div style={label}>Daily Log</div>
<div style={{ opacity: 0.8 }}>
{shift.daily_log || "No notes added."}
</div>
</div>
</div>
))}
</div>
)}
</main>
);
}

const card: React.CSSProperties = {
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
background: "white",
};

const row: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
marginBottom: 10,
};

const grid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "1fr 1fr 1fr",
gap: 12,
};

const label: React.CSSProperties = {
fontSize: 12,
opacity: 0.6,
};

const outingBadge: React.CSSProperties = {
background: "#dbeafe",
padding: "4px 8px",
borderRadius: 999,
fontSize: 12,
};






<a href="/employee/shifts">
<button>My Shifts</button>
</a>

