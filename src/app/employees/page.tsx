import Link from "next/link";

export default function EmployeePage() {
return (
<main style={{ padding: 20, maxWidth: 1000 }}>
<h1 style={{ marginBottom: 12 }}>Employee Dashboard</h1>
<p style={{ opacity: 0.8, marginBottom: 24 }}>
Access your shifts, clock-ins, and timesheets.
</p>

<div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
<Link href="/employee/shifts" style={cardStyle}>My Shifts</Link>
<Link href="/employee/clock" style={cardStyle}>Clock In / Out</Link>
<Link href="/employee/timesheets" style={cardStyle}>My Timesheets</Link>
<Link href="/employee/profile" style={cardStyle}>My Profile</Link>
</div>
</main>
);
}

const cardStyle: React.CSSProperties = {
display: "block",
padding: 16,
border: "1px solid #e5e7eb",
borderRadius: 12,
background: "white",
color: "#111827",
textDecoration: "none",
fontWeight: 600,
};




