"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { supabase } from "../../supabaseClient";
import { formatAppDate } from "../../lib/time";

type ProfileRow = {
id: string;
org_id: string;
role: string;
};

type EmployeeRow = {
id: string;
name: string;
email: string;
hourly_rate: number | null;
};

type ClockLogRow = {
id: string;
employee_id: string;
clock_in: string | null;
clock_out: string | null;
};

type ScheduleRow = {
id: string;
employee_id: string;
work_date: string;
mileage: number | null;
};

type PayrollSettingsRow = {
id: string;
employee_id: string;
federal_tax_percent: number;
social_security_percent: number;
medicare_percent: number;
state_tax_percent: number;
insurance_amount: number;
dental_amount: number;
other_deductions: number;
};

type PayrollRow = {
employee: EmployeeRow;
settings: PayrollSettingsRow;
totalHours: number;
mileageUnits: number;
mileageRate: number;
mileageReimbursement: number;
grossPay: number;
grossWithReimbursement: number;
federalTax: number;
socialSecurity: number;
medicare: number;
stateTax: number;
fixedDeductions: number;
totalDeductions: number;
netPay: number;
};

const DEFAULT_MILEAGE_RATE = 0.67;

const defaultSettings = {
federal_tax_percent: 0,
social_security_percent: 6.2,
medicare_percent: 1.45,
state_tax_percent: 0,
insurance_amount: 0,
dental_amount: 0,
other_deductions: 0,
};

function startOfWeekSunday(date = new Date()) {
const d = new Date(date);
d.setHours(0, 0, 0, 0);
d.setDate(d.getDate() - d.getDay());
return d;
}

function addDays(date: Date, days: number) {
const d = new Date(date);
d.setDate(d.getDate() + days);
return d;
}

function toDateInputValue(date: Date) {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");
return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
return `$${value.toFixed(2)}`;
}

function safeNumber(value: unknown) {
const n = Number(value);
return Number.isFinite(n) ? n : 0;
}

export default function PayrollPage() {
const router = useRouter();

const [authReady, setAuthReady] = useState(false);
const [orgId, setOrgId] = useState<string | null>(null);

const [employees, setEmployees] = useState<EmployeeRow[]>([]);
const [clockLogs, setClockLogs] = useState<ClockLogRow[]>([]);
const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
const [settings, setSettings] = useState<PayrollSettingsRow[]>([]);

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [exportingPdf, setExportingPdf] = useState(false);
const [error, setError] = useState<string | null>(null);

const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
const [formValues, setFormValues] = useState({
federal_tax_percent: "",
social_security_percent: "",
medicare_percent: "",
state_tax_percent: "",
insurance_amount: "",
dental_amount: "",
other_deductions: "",
});

const currentWeekStart = startOfWeekSunday();
const currentWeekEnd = addDays(currentWeekStart, 6);

const [periodPreset, setPeriodPreset] = useState<"week" | "biweekly" | "custom">(
"week"
);
const [dateFrom, setDateFrom] = useState<string>(toDateInputValue(currentWeekStart));
const [dateTo, setDateTo] = useState<string>(toDateInputValue(currentWeekEnd));
const [mileageRate, setMileageRate] = useState<string>(String(DEFAULT_MILEAGE_RATE));

useEffect(() => {
void checkAdminAndLoadData();
}, []);

async function checkAdminAndLoadData() {
setLoading(true);
setError(null);

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
.select("id, org_id, role")
.eq("id", user.id)
.single();

if (profileError || !profile) {
router.push("/login");
return;
}

const adminProfile = profile as ProfileRow;

if (adminProfile.role !== "admin") {
router.push("/employee/clock");
return;
}

setOrgId(adminProfile.org_id);
setAuthReady(true);

await Promise.all([
loadEmployees(adminProfile.org_id),
loadClockLogs(adminProfile.org_id),
loadSchedules(adminProfile.org_id),
loadPayrollSettings(adminProfile.org_id),
]);

setLoading(false);
}

async function loadEmployees(activeOrgId: string) {
const { data, error } = await supabase
.from("employees")
.select("id, name, email, hourly_rate")
.eq("org_id", activeOrgId)
.order("name", { ascending: true });

if (error) {
setError(error.message);
return;
}

setEmployees((data ?? []) as EmployeeRow[]);
}

async function loadClockLogs(activeOrgId: string) {
const { data: employeeRows, error: employeeError } = await supabase
.from("employees")
.select("id")
.eq("org_id", activeOrgId);

if (employeeError) {
setError(employeeError.message);
return;
}

const employeeIds = (employeeRows ?? []).map((e) => e.id);
if (employeeIds.length === 0) {
setClockLogs([]);
return;
}

const { data, error } = await supabase
.from("clock_logs")
.select("id, employee_id, clock_in, clock_out")
.in("employee_id", employeeIds)
.order("clock_in", { ascending: false });

if (error) {
setError(error.message);
return;
}

setClockLogs((data ?? []) as ClockLogRow[]);
}

async function loadSchedules(activeOrgId: string) {
const { data, error } = await supabase
.from("schedules")
.select("id, employee_id, work_date, mileage")
.eq("org_id", activeOrgId)
.order("work_date", { ascending: false });

if (error) {
setError(error.message);
return;
}

setSchedules((data ?? []) as ScheduleRow[]);
}

async function loadPayrollSettings(activeOrgId: string) {
const { data: employeeRows, error: employeeError } = await supabase
.from("employees")
.select("id")
.eq("org_id", activeOrgId);

if (employeeError) {
setError(employeeError.message);
return;
}

const employeeIds = (employeeRows ?? []).map((e) => e.id);
if (employeeIds.length === 0) {
setSettings([]);
return;
}

const { data, error } = await supabase
.from("employee_payroll_settings")
.select("*")
.in("employee_id", employeeIds);

if (error) {
setError(error.message);
return;
}

setSettings((data ?? []) as PayrollSettingsRow[]);
}

function applyWeekPreset() {
const weekStart = startOfWeekSunday();
const weekEnd = addDays(weekStart, 6);
setPeriodPreset("week");
setDateFrom(toDateInputValue(weekStart));
setDateTo(toDateInputValue(weekEnd));
}

function applyBiweeklyPreset() {
const weekStart = startOfWeekSunday();
const biweeklyEnd = addDays(weekStart, 13);
setPeriodPreset("biweekly");
setDateFrom(toDateInputValue(weekStart));
setDateTo(toDateInputValue(biweeklyEnd));
}

function openEdit(employeeId: string) {
const existing = settings.find((s) => s.employee_id === employeeId);

setEditingEmployeeId(employeeId);
setFormValues({
federal_tax_percent: String(
existing?.federal_tax_percent ?? defaultSettings.federal_tax_percent
),
social_security_percent: String(
existing?.social_security_percent ?? defaultSettings.social_security_percent
),
medicare_percent: String(
existing?.medicare_percent ?? defaultSettings.medicare_percent
),
state_tax_percent: String(
existing?.state_tax_percent ?? defaultSettings.state_tax_percent
),
insurance_amount: String(
existing?.insurance_amount ?? defaultSettings.insurance_amount
),
dental_amount: String(existing?.dental_amount ?? defaultSettings.dental_amount),
other_deductions: String(
existing?.other_deductions ?? defaultSettings.other_deductions
),
});
}

function closeEdit() {
setEditingEmployeeId(null);
setFormValues({
federal_tax_percent: "",
social_security_percent: "",
medicare_percent: "",
state_tax_percent: "",
insurance_amount: "",
dental_amount: "",
other_deductions: "",
});
}

async function savePayrollSettings() {
if (!editingEmployeeId) return;

setSaving(true);
setError(null);

const payload = {
employee_id: editingEmployeeId,
federal_tax_percent: Number(formValues.federal_tax_percent || 0),
social_security_percent: Number(formValues.social_security_percent || 0),
medicare_percent: Number(formValues.medicare_percent || 0),
state_tax_percent: Number(formValues.state_tax_percent || 0),
insurance_amount: Number(formValues.insurance_amount || 0),
dental_amount: Number(formValues.dental_amount || 0),
other_deductions: Number(formValues.other_deductions || 0),
updated_at: new Date().toISOString(),
};

const { error } = await supabase
.from("employee_payroll_settings")
.upsert(payload, { onConflict: "employee_id" });

if (error) {
setError(error.message);
setSaving(false);
return;
}

if (orgId) {
await loadPayrollSettings(orgId);
}

setSaving(false);
closeEdit();
}

async function handleSignOut() {
await supabase.auth.signOut();
router.push("/login");
}

const parsedMileageRate = Number(mileageRate || 0);

const filteredClockLogs = useMemo(() => {
if (!dateFrom || !dateTo) return clockLogs;

const from = new Date(`${dateFrom}T00:00:00`).getTime();
const to = new Date(`${dateTo}T23:59:59`).getTime();

return clockLogs.filter((log) => {
if (!log.clock_in) return false;
const time = new Date(log.clock_in).getTime();
return time >= from && time <= to;
});
}, [clockLogs, dateFrom, dateTo]);

const filteredSchedules = useMemo(() => {
if (!dateFrom || !dateTo) return schedules;

return schedules.filter((schedule) => {
return schedule.work_date >= dateFrom && schedule.work_date <= dateTo;
});
}, [schedules, dateFrom, dateTo]);

const payrollRows = useMemo(() => {
return employees.map((employee) => {
const employeeLogs = filteredClockLogs.filter(
(log) => log.employee_id === employee.id && log.clock_in && log.clock_out
);

const totalHours = employeeLogs.reduce((sum, log) => {
if (!log.clock_in || !log.clock_out) return sum;

const start = new Date(log.clock_in).getTime();
const end = new Date(log.clock_out).getTime();

if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum;

return sum + (end - start) / (1000 * 60 * 60);
}, 0);

const employeeSchedules = filteredSchedules.filter(
(schedule) => schedule.employee_id === employee.id
);

const mileageUnits = employeeSchedules.reduce((sum, schedule) => {
return sum + (schedule.mileage ?? 0);
}, 0);

const mileageReimbursement =
mileageUnits * (Number.isNaN(parsedMileageRate) ? 0 : parsedMileageRate);

const employeeSettings =
settings.find((s) => s.employee_id === employee.id) ??
({
id: "",
employee_id: employee.id,
...defaultSettings,
} as PayrollSettingsRow);

const hourlyRate = employee.hourly_rate ?? 0;
const grossPay = totalHours * hourlyRate;
const grossWithReimbursement = grossPay + mileageReimbursement;

const federalTax = grossPay * (employeeSettings.federal_tax_percent / 100);
const socialSecurity =
grossPay * (employeeSettings.social_security_percent / 100);
const medicare = grossPay * (employeeSettings.medicare_percent / 100);
const stateTax = grossPay * (employeeSettings.state_tax_percent / 100);

const fixedDeductions =
(employeeSettings.insurance_amount ?? 0) +
(employeeSettings.dental_amount ?? 0) +
(employeeSettings.other_deductions ?? 0);

const totalDeductions =
federalTax + socialSecurity + medicare + stateTax + fixedDeductions;

const netPay = grossWithReimbursement - totalDeductions;

return {
employee,
settings: employeeSettings,
totalHours,
mileageUnits,
mileageRate: Number.isNaN(parsedMileageRate) ? 0 : parsedMileageRate,
mileageReimbursement,
grossPay,
grossWithReimbursement,
federalTax,
socialSecurity,
medicare,
stateTax,
fixedDeductions,
totalDeductions,
netPay,
};
});
}, [employees, filteredClockLogs, filteredSchedules, settings, parsedMileageRate]);

const totalGross = payrollRows.reduce(
(sum, row) => sum + row.grossWithReimbursement,
0
);
const totalNet = payrollRows.reduce((sum, row) => sum + row.netPay, 0);
const totalDeductionsAll = payrollRows.reduce(
(sum, row) => sum + row.totalDeductions,
0
);

function exportSummaryPdf() {
try {
setExportingPdf(true);

const doc = new jsPDF("p", "mm", "a4");

doc.setFontSize(18);
doc.text("Payroll Summary", 14, 18);

doc.setFontSize(10);
doc.text(`Period: ${formatAppDate(dateFrom)} - ${formatAppDate(dateTo)}`, 14, 26);
doc.text(`Mileage Rate: ${formatCurrency(safeNumber(parsedMileageRate))}/mile`, 14, 32);
doc.text(`Employees: ${employees.length}`, 14, 38);
doc.text(`Gross Payroll: ${formatCurrency(totalGross)}`, 110, 26);
doc.text(`Total Deductions: ${formatCurrency(totalDeductionsAll)}`, 110, 32);
doc.text(`Estimated Net Payroll: ${formatCurrency(totalNet)}`, 110, 38);

autoTable(doc, {
startY: 46,
head: [[
"Employee",
"Hours",
"Rate",
"Gross",
"Mileage",
"Deductions",
"Net"
]],
body: payrollRows.map((row) => [
row.employee.name,
row.totalHours.toFixed(2),
formatCurrency(row.employee.hourly_rate ?? 0),
formatCurrency(row.grossPay),
formatCurrency(row.mileageReimbursement),
formatCurrency(row.totalDeductions),
formatCurrency(row.netPay),
]),
styles: {
fontSize: 9,
cellPadding: 3,
},
headStyles: {
fillColor: [17, 24, 39],
},
});

const fileName = `payroll-summary-${dateFrom}-to-${dateTo}.pdf`;
doc.save(fileName);
} catch (err) {
console.error(err);
setError("Failed to export payroll summary PDF.");
} finally {
setExportingPdf(false);
}
}

function exportEmployeePdf(row: PayrollRow) {
try {
const doc = new jsPDF("p", "mm", "a4");

doc.setFontSize(18);
doc.text("Employee Pay Statement", 14, 18);

doc.setFontSize(10);
doc.text(`Employee: ${row.employee.name}`, 14, 28);
doc.text(`Email: ${row.employee.email}`, 14, 34);
doc.text(`Pay Period: ${formatAppDate(dateFrom)} - ${formatAppDate(dateTo)}`, 14, 40);

autoTable(doc, {
startY: 48,
theme: "grid",
head: [["Earnings", "Amount"]],
body: [
["Total Hours", row.totalHours.toFixed(2)],
["Hourly Rate", formatCurrency(row.employee.hourly_rate ?? 0)],
["Gross Pay", formatCurrency(row.grossPay)],
["Mileage Units", row.mileageUnits.toFixed(2)],
["Mileage Rate", `${formatCurrency(row.mileageRate)}/mile`],
["Mileage Reimbursement", formatCurrency(row.mileageReimbursement)],
["Total Earnings", formatCurrency(row.grossWithReimbursement)],
],
styles: { fontSize: 10 },
headStyles: { fillColor: [17, 24, 39] },
});

const finalY1 = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 48;

autoTable(doc, {
startY: finalY1 + 8,
theme: "grid",
head: [["Withholdings / Deductions", "Amount"]],
body: [
["Federal Tax", `-${formatCurrency(row.federalTax)}`],
["Social Security", `-${formatCurrency(row.socialSecurity)}`],
["Medicare", `-${formatCurrency(row.medicare)}`],
["State Tax", `-${formatCurrency(row.stateTax)}`],
["Insurance", `-${formatCurrency(row.settings.insurance_amount ?? 0)}`],
["Dental", `-${formatCurrency(row.settings.dental_amount ?? 0)}`],
["Other Deductions", `-${formatCurrency(row.settings.other_deductions ?? 0)}`],
["Total Deductions", `-${formatCurrency(row.totalDeductions)}`],
],
styles: { fontSize: 10 },
headStyles: { fillColor: [17, 24, 39] },
});

const finalY2 = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? finalY1 + 8;

doc.setFontSize(14);
doc.text(`Estimated Net Pay: ${formatCurrency(row.netPay)}`, 14, finalY2 + 14);

const safeEmployeeName = row.employee.name
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/(^-|-$)/g, "");

const fileName = `${safeEmployeeName || "employee"}-payroll-${dateFrom}-to-${dateTo}.pdf`;
doc.save(fileName);
} catch (err) {
console.error(err);
setError(`Failed to export PDF for ${row.employee.name}.`);
}
}

if (!authReady && loading) {
return (
<main style={pageStyle}>
<p>Loading payroll...</p>
</main>
);
}

return (
<main style={pageStyle}>
<div style={headerRow}>
<div>
<h1 style={{ margin: 0, fontSize: 36 }}>Payroll</h1>
<p style={subText}>
Estimated payroll summary with taxes, deductions, mileage reimbursement,
and date-range filtering.
</p>
</div>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
<button
onClick={exportSummaryPdf}
style={primaryBtn}
disabled={exportingPdf || payrollRows.length === 0}
>
{exportingPdf ? "Exporting PDF..." : "Export Summary PDF"}
</button>

<button onClick={handleSignOut} style={signOutBtn}>
Sign Out
</button>
</div>
</div>

{error && <div style={errorCard}>{error}</div>}

<section style={filtersCard}>
<div style={filtersHeader}>
<h3 style={{ margin: 0 }}>Payroll Period</h3>
<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
<button style={smallBtn} onClick={applyWeekPreset}>
This Week
</button>
<button style={smallBtn} onClick={applyBiweeklyPreset}>
Biweekly
</button>
<button
style={smallBtn}
onClick={() => setPeriodPreset("custom")}
>
Custom
</button>
</div>
</div>

<div style={filterGrid}>
<div>
<label style={labelStyle}>Date From</label>
<input
type="date"
value={dateFrom}
onChange={(e) => {
setPeriodPreset("custom");
setDateFrom(e.target.value);
}}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Date To</label>
<input
type="date"
value={dateTo}
onChange={(e) => {
setPeriodPreset("custom");
setDateTo(e.target.value);
}}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Mileage Rate ($ / mile)</label>
<input
type="number"
step="0.01"
value={mileageRate}
onChange={(e) => setMileageRate(e.target.value)}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Preset</label>
<div style={presetBadge}>
{periodPreset === "week"
? "This Week"
: periodPreset === "biweekly"
? "Biweekly"
: "Custom"}
</div>
</div>
</div>

<div style={{ marginTop: 12, opacity: 0.72, fontSize: 14 }}>
Period: {formatAppDate(dateFrom)} — {formatAppDate(dateTo)}
</div>
</section>

<div style={statsRow}>
<div style={statCard}>
<div style={statLabel}>Employees</div>
<div style={statValue}>{employees.length}</div>
</div>

<div style={statCard}>
<div style={statLabel}>Gross Payroll</div>
<div style={statValue}>${totalGross.toFixed(2)}</div>
</div>

<div style={statCard}>
<div style={statLabel}>Estimated Net Payroll</div>
<div style={statValue}>${totalNet.toFixed(2)}</div>
</div>
</div>

{payrollRows.length === 0 ? (
<div style={emptyState}>No payroll data found yet.</div>
) : (
<div style={{ display: "grid", gap: 16 }}>
{payrollRows.map((row) => (
<section key={row.employee.id} style={payrollCard}>
<div style={payrollHeader}>
<div>
<h3 style={{ margin: 0 }}>{row.employee.name}</h3>
<p style={{ margin: "6px 0 0 0", opacity: 0.7 }}>
{row.employee.email}
</p>
</div>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
<button
style={secondaryBtn}
onClick={() => exportEmployeePdf(row)}
>
Export PDF
</button>

<button style={editBtn} onClick={() => openEdit(row.employee.id)}>
Edit Deductions
</button>
</div>
</div>

<div style={threeCol}>
<div style={blockCard}>
<div style={blockTitle}>Earnings</div>
<div style={lineItem}>
<span>Total Hours</span>
<strong>{row.totalHours.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Hourly Rate</span>
<strong>${(row.employee.hourly_rate ?? 0).toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Gross Pay</span>
<strong>${row.grossPay.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Mileage Reimb</span>
<strong>${row.mileageReimbursement.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Mileage Units</span>
<strong>{row.mileageUnits.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Mileage Rate</span>
<strong>${row.mileageRate.toFixed(2)}</strong>
</div>
<div
style={{
...lineItem,
marginTop: 10,
paddingTop: 10,
borderTop: "1px solid #e5e7eb",
}}
>
<span>Total Earnings</span>
<strong>${row.grossWithReimbursement.toFixed(2)}</strong>
</div>
</div>

<div style={blockCard}>
<div style={blockTitle}>Withholdings</div>
<div style={lineItem}>
<span>Federal Tax</span>
<strong>-${row.federalTax.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Social Security</span>
<strong>-${row.socialSecurity.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Medicare</span>
<strong>-${row.medicare.toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>State Tax</span>
<strong>-${row.stateTax.toFixed(2)}</strong>
</div>
</div>

<div style={blockCard}>
<div style={blockTitle}>Deductions</div>
<div style={lineItem}>
<span>Insurance</span>
<strong>-${(row.settings.insurance_amount ?? 0).toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Dental</span>
<strong>-${(row.settings.dental_amount ?? 0).toFixed(2)}</strong>
</div>
<div style={lineItem}>
<span>Other</span>
<strong>-${(row.settings.other_deductions ?? 0).toFixed(2)}</strong>
</div>
<div
style={{
...lineItem,
marginTop: 10,
paddingTop: 10,
borderTop: "1px solid #e5e7eb",
}}
>
<span>Total Deductions</span>
<strong>-${row.totalDeductions.toFixed(2)}</strong>
</div>
</div>
</div>

<div style={netRow}>
<span>Estimated Net Pay</span>
<strong>${row.netPay.toFixed(2)}</strong>
</div>
</section>
))}
</div>
)}

{editingEmployeeId && (
<div style={overlay}>
<div style={modal}>
<h3 style={{ marginTop: 0 }}>Edit Employee Payroll Settings</h3>

<div style={formGrid}>
<div>
<label style={labelStyle}>Federal Tax %</label>
<input
value={formValues.federal_tax_percent}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
federal_tax_percent: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Social Security %</label>
<input
value={formValues.social_security_percent}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
social_security_percent: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Medicare %</label>
<input
value={formValues.medicare_percent}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
medicare_percent: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>State Tax %</label>
<input
value={formValues.state_tax_percent}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
state_tax_percent: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Insurance $</label>
<input
value={formValues.insurance_amount}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
insurance_amount: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Dental $</label>
<input
value={formValues.dental_amount}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
dental_amount: e.target.value,
}))
}
style={inputStyle}
/>
</div>

<div>
<label style={labelStyle}>Other Deductions $</label>
<input
value={formValues.other_deductions}
onChange={(e) =>
setFormValues((prev) => ({
...prev,
other_deductions: e.target.value,
}))
}
style={inputStyle}
/>
</div>
</div>

<div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
<button style={primaryBtn} onClick={savePayrollSettings}>
{saving ? "Saving..." : "Save Settings"}
</button>
<button style={secondaryBtn} onClick={closeEdit}>
Cancel
</button>
</div>
</div>
</div>
)}
</main>
);
}

const pageStyle: React.CSSProperties = {
maxWidth: 1200,
margin: "40px auto",
padding: 20,
};

const headerRow: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
alignItems: "flex-start",
gap: 16,
flexWrap: "wrap",
marginBottom: 24,
};

const subText: React.CSSProperties = {
marginTop: 8,
opacity: 0.72,
fontSize: 15,
};

const signOutBtn: React.CSSProperties = {
padding: "10px 16px",
background: "#111827",
color: "white",
border: "none",
borderRadius: 10,
fontWeight: 600,
cursor: "pointer",
};

const filtersCard: React.CSSProperties = {
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 18,
padding: 18,
boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
marginBottom: 24,
};

const filtersHeader: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 16,
flexWrap: "wrap",
marginBottom: 16,
};

const filterGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: 14,
};

const smallBtn: React.CSSProperties = {
background: "#e5e7eb",
color: "#111827",
border: "none",
padding: "10px 14px",
borderRadius: 10,
cursor: "pointer",
fontWeight: 600,
};

const presetBadge: React.CSSProperties = {
width: "100%",
minHeight: 46,
display: "flex",
alignItems: "center",
padding: "12px 14px",
border: "1px solid #d1d5db",
borderRadius: 12,
background: "#f8fafc",
fontSize: 14,
fontWeight: 600,
};

const statsRow: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
gap: 14,
marginBottom: 24,
};

const statCard: React.CSSProperties = {
background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
border: "1px solid #e5e7eb",
borderRadius: 16,
padding: 18,
boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
};

const statLabel: React.CSSProperties = {
fontSize: 12,
opacity: 0.68,
marginBottom: 8,
textTransform: "uppercase",
letterSpacing: 0.6,
};

const statValue: React.CSSProperties = {
fontSize: 26,
fontWeight: 700,
};

const payrollCard: React.CSSProperties = {
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 18,
padding: 18,
boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const payrollHeader: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 16,
flexWrap: "wrap",
marginBottom: 16,
};

const editBtn: React.CSSProperties = {
background: "#111827",
color: "white",
border: "none",
borderRadius: 10,
padding: "10px 14px",
fontWeight: 600,
cursor: "pointer",
};

const threeCol: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
gap: 14,
};

const blockCard: React.CSSProperties = {
border: "1px solid #e5e7eb",
borderRadius: 14,
padding: 14,
background: "#f8fafc",
};

const blockTitle: React.CSSProperties = {
fontSize: 13,
fontWeight: 700,
marginBottom: 12,
textTransform: "uppercase",
letterSpacing: 0.5,
};

const lineItem: React.CSSProperties = {
display: "flex",
justifyContent: "space-between",
gap: 12,
marginBottom: 8,
fontSize: 14,
};

const netRow: React.CSSProperties = {
marginTop: 18,
paddingTop: 14,
borderTop: "1px solid #e5e7eb",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
fontSize: 20,
fontWeight: 700,
};

const overlay: React.CSSProperties = {
position: "fixed",
inset: 0,
background: "rgba(15, 23, 42, 0.45)",
display: "flex",
alignItems: "center",
justifyContent: "center",
padding: 20,
zIndex: 1000,
};

const modal: React.CSSProperties = {
width: "100%",
maxWidth: 700,
background: "white",
borderRadius: 18,
padding: 20,
boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
};

const formGrid: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: 14,
};

const labelStyle: React.CSSProperties = {
display: "block",
marginBottom: 8,
fontSize: 13,
fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
width: "100%",
padding: "12px 14px",
border: "1px solid #d1d5db",
borderRadius: 12,
background: "#fff",
fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
background: "#2563eb",
color: "white",
border: "none",
padding: "10px 16px",
borderRadius: 10,
cursor: "pointer",
fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
background: "#e5e7eb",
color: "#111827",
border: "none",
padding: "10px 16px",
borderRadius: 10,
cursor: "pointer",
fontWeight: 600,
};

const errorCard: React.CSSProperties = {
marginBottom: 18,
background: "#fef2f2",
border: "1px solid #fecaca",
color: "#991b1b",
padding: 14,
borderRadius: 14,
};

const emptyState: React.CSSProperties = {
minHeight: 160,
border: "1px dashed #cbd5e1",
borderRadius: 16,
display: "flex",
justifyContent: "center",
alignItems: "center",
background: "#f8fafc",
fontWeight: 600,
};
