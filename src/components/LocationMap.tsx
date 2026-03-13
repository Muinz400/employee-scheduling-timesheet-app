"use client";

type LocationMapProps = {
employeeLat: number;
employeeLng: number;
jobLat: number;
jobLng: number;
radiusMeters: number;
};

export default function LocationMap({
employeeLat,
employeeLng,
jobLat,
jobLng,
radiusMeters,
}: LocationMapProps) {
const googleMapsUrl = `https://www.google.com/maps?q=${employeeLat},${employeeLng}`;

return (
<div
style={{
marginTop: 20,
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
background: "white",
}}
>
<h3 style={{ marginTop: 0, marginBottom: 8 }}>Live GPS Verification</h3>

<p style={{ marginTop: 0, opacity: 0.75, marginBottom: 14 }}>
Employees must be physically within the job site radius to clock in.
</p>

<div style={{ display: "grid", gap: 10 }}>
<div>
<strong>Employee Location:</strong>{" "}
{employeeLat.toFixed(6)}, {employeeLng.toFixed(6)}
</div>

<div>
<strong>Job Site:</strong> {jobLat.toFixed(6)}, {jobLng.toFixed(6)}
</div>

<div>
<strong>Allowed Radius:</strong> {radiusMeters} meters
</div>
</div>

<div style={{ marginTop: 16 }}>
<a
href={googleMapsUrl}
target="_blank"
rel="noreferrer"
style={{
display: "inline-block",
padding: "10px 16px",
background: "#2563eb",
color: "white",
borderRadius: 8,
textDecoration: "none",
fontWeight: 600,
}}
>
Open Live Location in Maps
</a>
</div>
</div>
);
}
