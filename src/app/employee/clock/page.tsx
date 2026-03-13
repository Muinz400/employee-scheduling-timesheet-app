"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../../../supabaseClient";

const LocationMap = dynamic(() => import("../../../components/LocationMap"), {
ssr: false,
});

const TEST_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";

const JOB_SITE = {
name: "Client Home - Marysville",
latitude: 48.03957,
longitude: -122.14665,
};

const ALLOWED_RADIUS_METERS = 200;

export default function ClockPage() {
const [status, setStatus] = useState<string>("Not clocked in");
const [location, setLocation] = useState<string>("");
const [distanceAway, setDistanceAway] = useState<string | null>(null);
const [employeeLat, setEmployeeLat] = useState<number | null>(null);
const [employeeLng, setEmployeeLng] = useState<number | null>(null);
const [lastClockIn, setLastClockIn] = useState<string | null>(null);
const [lastClockOut, setLastClockOut] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

function getDistanceMeters(
lat1: number,
lon1: number,
lat2: number,
lon2: number
) {
const toRad = (value: number) => (value * Math.PI) / 180;

const earthRadius = 6371000;
const dLat = toRad(lat2 - lat1);
const dLon = toRad(lon2 - lon1);

const a =
Math.sin(dLat / 2) * Math.sin(dLat / 2) +
Math.cos(toRad(lat1)) *
Math.cos(toRad(lat2)) *
Math.sin(dLon / 2) *
Math.sin(dLon / 2);

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
return earthRadius * c;
}

function formatDateTime(value: string | null) {
if (!value) return "—";

return new Date(value).toLocaleString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

async function loadLatestClockLog() {
const { data, error } = await supabase
.from("clock_logs")
.select("clock_in, clock_out")
.eq("employee_id", TEST_EMPLOYEE_ID)
.order("clock_in", { ascending: false })
.limit(1)
.single();

if (!error && data) {
setLastClockIn(data.clock_in ?? null);
setLastClockOut(data.clock_out ?? null);
setStatus(data.clock_in && !data.clock_out ? "Clocked In" : "Clocked Out");
}
}

function updateLocationState(lat: number, lng: number) {
setEmployeeLat(lat);
setEmployeeLng(lng);
setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);

const metersAway = getDistanceMeters(
lat,
lng,
JOB_SITE.latitude,
JOB_SITE.longitude
);

setDistanceAway(metersAway.toFixed(0));
return metersAway;
}

function checkCurrentLocation() {
if (!navigator.geolocation) return;

navigator.geolocation.getCurrentPosition(
(pos) => {
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;
updateLocationState(lat, lng);
},
(err) => {
console.error(err);
}
);
}

useEffect(() => {
checkCurrentLocation();
loadLatestClockLog();
}, []);

const handleClockIn = async () => {
if (!navigator.geolocation) {
alert("Geolocation not supported");
return;
}

setLoading(true);

navigator.geolocation.getCurrentPosition(
async (pos) => {
try {
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

const metersAway = updateLocationState(lat, lng);

if (metersAway > ALLOWED_RADIUS_METERS) {
alert(
`Clock in blocked. You are ${metersAway.toFixed(
0
)} meters away from ${JOB_SITE.name}. You must be within ${ALLOWED_RADIUS_METERS} meters.`
);
setLoading(false);
return;
}

const nowIso = new Date().toISOString();

const { error } = await supabase.from("clock_logs").insert([
{
employee_id: TEST_EMPLOYEE_ID,
latitude: lat,
longitude: lng,
clock_in: nowIso,
},
]);

if (error) {
alert(error.message);
setLoading(false);
return;
}

setStatus("Clocked In");
setLastClockIn(nowIso);
setLastClockOut(null);
} catch (err) {
console.error(err);
alert("Failed to clock in");
} finally {
setLoading(false);
}
},
(err) => {
console.error(err);
alert("Unable to get location");
setLoading(false);
}
);
};

const handleClockOut = async () => {
setLoading(true);

try {
const { data: latestLog, error: fetchError } = await supabase
.from("clock_logs")
.select("*")
.eq("employee_id", TEST_EMPLOYEE_ID)
.is("clock_out", null)
.order("clock_in", { ascending: false })
.limit(1)
.single();

if (fetchError || !latestLog) {
alert("No active clock-in found");
setLoading(false);
return;
}

const nowIso = new Date().toISOString();

const { error: updateError } = await supabase
.from("clock_logs")
.update({ clock_out: nowIso })
.eq("id", latestLog.id);

if (updateError) {
alert(updateError.message);
setLoading(false);
return;
}

setStatus("Clocked Out");
setLastClockOut(nowIso);
} catch (err) {
console.error(err);
alert("Failed to clock out");
} finally {
setLoading(false);
}
};

const isWithinRadius =
distanceAway !== null && Number(distanceAway) <= ALLOWED_RADIUS_METERS;

return (
<main>
<h1>CareClock Employee Time</h1>


<div style={cardStyle}>
<p>
<strong>Status:</strong>{" "}
<span
style={{
padding: "4px 10px",
borderRadius: "999px",
background: status === "Clocked In" ? "#dcfce7" : "#e5e7eb",
color: status === "Clocked In" ? "#166534" : "#111827",
fontWeight: 600,
}}
>
{status}
</span>
</p>

<p>
<strong>GPS location:</strong>{" "}
{location || "Location will appear after clock in"}
</p>

<p>
<strong>Job site:</strong> {JOB_SITE.name}
</p>

<p>
<strong>Allowed radius:</strong> {ALLOWED_RADIUS_METERS} meters
</p>

<p>
<strong>Distance away:</strong>{" "}
{distanceAway ? `${distanceAway} meters` : "Calculating..."}
</p>

<p>
<strong>Location Check:</strong>{" "}
<span
style={{
color:
distanceAway && Number(distanceAway) <= ALLOWED_RADIUS_METERS
? "green"
: "crimson",
fontWeight: 600,
}}
>
{distanceAway
? Number(distanceAway) <= ALLOWED_RADIUS_METERS
? "✅ Within job site radius"
: "❌ Outside job site radius"
: "Checking..."}
</span>
</p>

<div style={{ display: "flex", gap: 12, marginTop: 16 }}>
<button
style={clockInBtn}
onClick={handleClockIn}
disabled={loading || !isWithinRadius || status === "Clocked In"}
>
{loading ? "Working..." : "Clock In"}
</button>

<button
style={clockOutBtn}
onClick={handleClockOut}
disabled={loading || status !== "Clocked In"}
>
{loading ? "Working..." : "Clock Out"}
</button>
</div>
</div>

<LocationMap
employeeLat={employeeLat}
employeeLng={employeeLng}
jobSiteLat={JOB_SITE.latitude}
jobSiteLng={JOB_SITE.longitude}
radiusMeters={ALLOWED_RADIUS_METERS}
jobSiteName={JOB_SITE.name}
/>

<div style={logCardStyle}>
<h3 style={{ marginTop: 0, marginBottom: 12 }}>Latest Time Activity</h3>
<p style={{ margin: "6px 0" }}>
<strong>Last Clock In:</strong> {formatDateTime(lastClockIn)}
</p>
<p style={{ margin: "6px 0" }}>
<strong>Last Clock Out:</strong> {formatDateTime(lastClockOut)}
</p>
</div>
</main>
);
}

const cardStyle: React.CSSProperties = {
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 20,
maxWidth: 460,
};

const logCardStyle: React.CSSProperties = {
marginTop: 20,
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
maxWidth: 460,
};

const clockInBtn: React.CSSProperties = {
background: "#16a34a",
color: "white",
border: "none",
padding: "10px 16px",
borderRadius: 8,
cursor: "pointer",
};

const clockOutBtn: React.CSSProperties = {
background: "#dc2626",
color: "white",
border: "none",
padding: "10px 16px",
borderRadius: 8,
cursor: "pointer",
};
