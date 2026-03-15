"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHomeRedirect() {
const router = useRouter();

useEffect(() => {
router.replace("/admin/dashboard");
}, [router]);

return (
<main style={{ padding: 24 }}>
<p>Redirecting to admin dashboard...</p>
</main>
);
}