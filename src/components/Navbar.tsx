"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
const pathname = usePathname();

const isAdmin = pathname.startsWith("/admin");
const isEmployee = pathname.startsWith("/employee");

return (
<nav
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
padding: "16px 20px",
borderBottom: "1px solid #e5e7eb",
background: "white",
}}
>
<div style={{ fontWeight: 700, fontSize: 20 }}>
CareClock
</div>


<div style={{ display: "flex", gap: 10 }}>
{isAdmin && (
<>
<NavLink href="/admin">Dashboard</NavLink>
<NavLink href="/employees">Employees</NavLink>
<NavLink href="/scheduling">Scheduling</NavLink>
<NavLink href="/timesheets">Timesheets</NavLink>
<NavLink href="/payroll">Payroll</NavLink>
</>
)}

{isEmployee && (
<>
<NavLink href="/employee">Dashboard</NavLink>
<NavLink href="/employee/shifts">My Shifts</NavLink>
<NavLink href="/employee/clock">Clock In/Out</NavLink>
<NavLink href="/employee/timesheets">My Timesheets</NavLink>
<NavLink href="/employee/profile">Profile</NavLink>
</>
)}
</div>
</nav>
);
}

function NavLink({ href, children }: any) {
return (
<Link
href={href}
style={{
padding: "8px 14px",
borderRadius: 8,
background: "#111",
color: "white",
textDecoration: "none",
fontSize: 14,
}}
>
{children}
</Link>
);
}
