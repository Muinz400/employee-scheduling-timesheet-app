"use client";

import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";

type Props = {
employeeLat: number | null;
employeeLng: number | null;
jobSiteLat: number;
jobSiteLng: number;
radiusMeters: number;
jobSiteName: string;
};

export default function LocationMap({
employeeLat,
employeeLng,
jobSiteLat,
jobSiteLng,
radiusMeters,
jobSiteName,
}: Props) {
const hasEmployeeLocation = employeeLat != null && employeeLng != null;

const center: [number, number] = hasEmployeeLocation
? [(employeeLat + jobSiteLat) / 2, (employeeLng + jobSiteLng) / 2]
: [jobSiteLat, jobSiteLng];

return (
<div
style={{
marginTop: 20,
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 12,
}}
>
<h3 style={{ marginTop: 0, marginBottom: 12 }}>Live GPS Verification</h3>
<p style={{ color: "#6b7280", marginBottom: 20 }}>
CareClock verifies employee location before allowing clock-in.
</p>
<div style={{ height: 320, borderRadius: 12, overflow: "hidden" }}>
<MapContainer
center={center}
zoom={17}
scrollWheelZoom={false}
style={{ height: "100%", width: "100%" }}
>
<TileLayer
attribution='&copy; OpenStreetMap contributors'
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

<Circle
center={[jobSiteLat, jobSiteLng]}
radius={radiusMeters}
pathOptions={{
color: "#2563eb",
fillColor: "#93c5fd",
fillOpacity: 0.2,
}}
/>

<CircleMarker
center={[jobSiteLat, jobSiteLng]}
radius={8}
pathOptions={{
color: "#1d4ed8",
fillColor: "#2563eb",
fillOpacity: 1,
}}
>
<Popup>{jobSiteName}</Popup>
</CircleMarker>

{hasEmployeeLocation && (
<CircleMarker
center={[employeeLat!, employeeLng!]}
radius={8}
pathOptions={{
color: "#15803d",
fillColor: "#22c55e",
fillOpacity: 1,
}}
>
<Popup>Employee Location</Popup>
</CircleMarker>
)}
</MapContainer>
</div>

<div
style={{
display: "flex",
gap: 16,
flexWrap: "wrap",
marginTop: 12,
fontSize: 14,
}}
>
<span>🔵 Job Site Radius</span>
<span>🟢 Employee Location</span>
</div>
</div>
);
}
