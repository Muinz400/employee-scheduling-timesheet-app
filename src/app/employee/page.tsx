"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

export default function EmployeeDashboard() {
const router = useRouter();
const [ready, setReady] = useState(false);

useEffect(() => {
async function checkEmployee() {
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
.select("id, role")
.eq("id", user.id)
.single();

if (profileError || !profile) {
router.push("/login");
return;
}

if (profile.role !== "employee") {
router.push("/admin");
return;
}

setReady(true);
}

void checkEmployee();
}, [router]);

if (!ready) {
return <main style={{ padding: 24 }}><p>Loading...</p></main>;
}

return (
<main style={{ padding: 24 }}>
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
