import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
title: "CareClock",
description: "A simple GPS-Verified timesheet for home care agencies",
};

type RootLayoutProps = {
children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
return (
<html lang="en">
<body>
<div style={{ minHeight: "100vh", background: "#f8fafc" }}>
<header
style={{
borderBottom: "1px solid #e5e7eb",
background: "white",
padding: "16px 20px",
}}
>
<div
style={{
maxWidth: 1100,
margin: "0 auto",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 16,
flexWrap: "wrap",
}}
>
<Link
href="/"
style={{
fontSize: 22,
fontWeight: 700,
textDecoration: "none",
color: "#111827",
}}
>
CareClock
</Link>

<nav
style={{
display: "flex",
gap: 12,
flexWrap: "wrap",
}}
>
<Link href="/admin" style={navLinkStyle}>
Admin
</Link>

<Link href="/employee" style={navLinkStyle}>
Employee
</Link>
</nav>
</div>
</header>

<main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
{children}
</main>
</div>
</body>
</html>
);
}

const navLinkStyle: React.CSSProperties = {
background: "#111827",
color: "white",
padding: "10px 14px",
borderRadius: 8,
textDecoration: "none",
fontWeight: 600,
};
