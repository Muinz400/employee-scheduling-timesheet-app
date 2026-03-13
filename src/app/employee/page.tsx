import Link from "next/link";

export default function EmployeeDashboard() {
return (
<main>
<h1 style={{ marginBottom: 20 }}>Employee Dashboard</h1>

<div style={{ display: "flex", gap: 16 }}>
<Link href="/employee/clock" style={card}>
Clock In / Out
</Link>

<Link href="/employee/shifts" style={card}>
My Shifts
</Link>

<Link href="/employee/timesheets" style={card}>
My Timesheets
</Link>
</div>
</main>
);
}

const card: React.CSSProperties = {
padding: 20,
border: "1px solid #e5e7eb",
borderRadius: 10,
textDecoration: "none",
color: "black",
background: "white",
};