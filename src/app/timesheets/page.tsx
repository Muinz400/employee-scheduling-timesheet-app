"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TimesheetsRedirectPage() {
const router = useRouter();

useEffect(() => {
router.replace("/admin/dashboard/timesheets");
}, [router]);

return (
<main style={{ padding: 24 }}>
<p>Redirecting to timesheets...</p>
</main>
);
}