"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../supabaseClient";

type EmployeeRow = {
id: string;
name: string;
email: string | null;
hourly_rate: number | null;
tax_rate: number | null;
insurance_deduction: number | null;
};

type ClockLogRow = {
id: string;
employee_id: string;
clock_in: string | null;
clock_out: string | null;
};

type PayrollRow = {
date: string;
clockIn: string;
clockOut: string;
regularHours: number;
overtimeHours: number;
totalHours: number;
};

function getMonthStart(monthValue: string) {
return `${monthValue}-01T00:00:00.000Z`;
}

function getMonthEnd(monthValue: string) {
const [year, month] = monthValue.split("-").map(Number);
const nextMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
return nextMonth.toISOString();
}

function formatMonthLabel(monthValue: string) {
const [year, month] = monthValue.split("-").map(Number);

return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
month: "long",
year: "numeric",
});
}

function formatDateOnly(value: string) {
return new Date(value).toLocaleDateString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
});
}

function formatTimeOnly(value: string) {
return new Date(value).toLocaleTimeString("en-US", {
hour: "numeric",
minute: "2-digit",
});
}

function formatMoney(value: number) {
return `$${value.toFixed(2)}`;
}

function getTodayMonthValue() {
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
return `${year}-${month}`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
const blob = new Blob([content], { type: mimeType });
const url = URL.createObjectURL(blob);
const anchor = document.createElement("a");
anchor.href = url;
anchor.download = filename;
anchor.click();
URL.revokeObjectURL(url);
}

export default function PayrollPage() {
const [employees, setEmployees] = useState<EmployeeRow[]>([]);
const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
const [selectedMonth, setSelectedMonth] = useState(getTodayMonthValue());
const [clockLogs, setClockLogs] = useState<ClockLogRow[]>([]);
const [hourlyRate, setHourlyRate] = useState("0");
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function loadEmployees() {
const { data, error: employeeError } = await supabase
.from("employees")
.select("id, name, email, hourly_rate, tax_rate, insurance_deduction")
.order("name", { ascending: true });

if (employeeError) {
setError(employeeError.message);
return;
}

const employeeRows = (data ?? []) as EmployeeRow[];
setEmployees(employeeRows);

if (!selectedEmployeeId && employeeRows.length > 0) {
const firstEmployee = employeeRows[0];
setSelectedEmployeeId(firstEmployee.id);
setHourlyRate(String(firstEmployee.hourly_rate ?? 0));
}
}

async function loadClockLogs(employeeId: string, monthValue: string) {
if (!employeeId) return;

const { data, error: logError } = await supabase
.from("clock_logs")
.select("id, employee_id, clock_in, clock_out")
.eq("employee_id", employeeId)
.gte("clock_in", getMonthStart(monthValue))
.lt("clock_in", getMonthEnd(monthValue))
.order("clock_in", { ascending: true });

if (logError) {
setError(logError.message);
return;
}

setClockLogs((data ?? []) as ClockLogRow[]);
}

useEffect(() => {
async function boot() {
setLoading(true);
setError("");
await loadEmployees();
setLoading(false);
}

boot();
}, []);

useEffect(() => {
if (!selectedEmployeeId) return;

const employee = employees.find((item) => item.id === selectedEmployeeId);
if (employee) {
setHourlyRate(String(employee.hourly_rate ?? 0));
}

loadClockLogs(selectedEmployeeId, selectedMonth);
}, [selectedEmployeeId, selectedMonth, employees]);

const selectedEmployee = useMemo(() => {
return employees.find((item) => item.id === selectedEmployeeId) ?? null;
}, [employees, selectedEmployeeId]);

const payrollRows = useMemo(() => {
const completedLogs = clockLogs.filter(
(log) => log.clock_in && log.clock_out
);

return completedLogs.map((log) => {
const start = new Date(log.clock_in as string);
const end = new Date(log.clock_out as string);

const totalHoursRaw = Math.max(
0,
(end.getTime() - start.getTime()) / (1000 * 60 * 60)
);

const overtimeHours = Math.max(0, totalHoursRaw - 8);
const regularHours = totalHoursRaw - overtimeHours;

return {
date: formatDateOnly(log.clock_in as string),
clockIn: formatTimeOnly(log.clock_in as string),
clockOut: formatTimeOnly(log.clock_out as string),
regularHours,
overtimeHours,
totalHours: totalHoursRaw,
};
});
}, [clockLogs]);

const regularHours = useMemo(() => {
return payrollRows.reduce((sum, row) => sum + row.regularHours, 0);
}, [payrollRows]);

const overtimeHours = useMemo(() => {
return payrollRows.reduce((sum, row) => sum + row.overtimeHours, 0);
}, [payrollRows]);

const volunteerHours = 0;

const totalHours = regularHours + overtimeHours + volunteerHours;

const numericHourlyRate = Number(hourlyRate) || 0;
const taxRate = selectedEmployee?.tax_rate ?? 0;
const insuranceDeduction = selectedEmployee?.insurance_deduction ?? 0;

const regularPay = regularHours * numericHourlyRate;
const overtimePay = overtimeHours * numericHourlyRate * 1.5;
const estimatedGrossPay = regularPay + overtimePay;
const taxDeduction = estimatedGrossPay * taxRate;
const estimatedNetPay =
estimatedGrossPay > 0
? estimatedGrossPay - taxDeduction - insuranceDeduction
: 0;


function exportPayrollCSV() {
const lines = [
[
"Employee",
"Month",
"Date",
"Clock In",
"Clock Out",
"Regular Hours",
"Overtime Hours",
"Total Hours",
].join(","),
...payrollRows.map((row) =>
[
`"${selectedEmployee?.name ?? "Unknown Employee"}"`,
`"${formatMonthLabel(selectedMonth)}"`,
`"${row.date}"`,
`"${row.clockIn}"`,
`"${row.clockOut}"`,
row.regularHours.toFixed(2),
row.overtimeHours.toFixed(2),
row.totalHours.toFixed(2),
].join(",")
),
"",
["Regular Hours", regularHours.toFixed(2)].join(","),
["Overtime Hours", overtimeHours.toFixed(2)].join(","),
["Total Hours", totalHours.toFixed(2)].join(","),
["Hourly Rate", numericHourlyRate.toFixed(2)].join(","),
["Regular Pay", regularPay.toFixed(2)].join(","),
["Overtime Pay", overtimePay.toFixed(2)].join(","),
["Gross Pay", estimatedGrossPay.toFixed(2)].join(","),
["Tax Deduction", taxDeduction.toFixed(2)].join(","),
["Insurance Deduction", insuranceDeduction.toFixed(2)].join(","),
["Net Pay", estimatedNetPay.toFixed(2)].join(","),
];

downloadTextFile(
`careclock-payroll-${selectedMonth}.csv`,
lines.join("\n"),
"text/csv;charset=utf-8;"
);
}

function downloadPayrollPDF() {
const doc = new jsPDF();

doc.setFontSize(18);
doc.text("CareClock Payroll Summary", 14, 18);

doc.setFontSize(11);
doc.text(`Employee: ${selectedEmployee?.name ?? "Unknown Employee"}`, 14, 28);
doc.text(`Month: ${formatMonthLabel(selectedMonth)}`, 14, 34);
doc.text(`Hourly Rate: ${formatMoney(numericHourlyRate)}`, 14, 40);

autoTable(doc, {
startY: 48,
head: [[
"Date",
"Clock In",
"Clock Out",
"Regular Hours",
"Overtime Hours",
"Total Hours",
]],
body: payrollRows.map((row) => [
row.date,
row.clockIn,
row.clockOut,
row.regularHours.toFixed(2),
row.overtimeHours.toFixed(2),
row.totalHours.toFixed(2),
]),
styles: {
fontSize: 10,
cellPadding: 3,
},
headStyles: {
fillColor: [17, 24, 39],
},
});

const finalY =
(doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
?.finalY ?? 60;

autoTable(doc, {
startY: finalY + 10,
head: [["Payroll Summary", "Amount"]],
body: [
["Regular Hours", regularHours.toFixed(2)],
["Overtime Hours", overtimeHours.toFixed(2)],
["Volunteer Hours", volunteerHours.toFixed(2)],
["Total Hours", totalHours.toFixed(2)],
["Regular Pay", formatMoney(regularPay)],
["Overtime Pay", formatMoney(overtimePay)],
["Estimated Gross Pay", formatMoney(estimatedGrossPay)],
["Tax Deduction", `-${formatMoney(taxDeduction)}`],
["Insurance Deduction", `-${formatMoney(insuranceDeduction)}`],
["Estimated Net Pay", formatMoney(estimatedNetPay)],
],
styles: {
fontSize: 10,
cellPadding: 3,
},
headStyles: {
fillColor: [22, 163, 74],
},
});

doc.save(`careclock-payroll-${selectedMonth}.pdf`);
}

if (loading) {
return <main>
    <p>Loading payroll...</p></main>;
}

return (
<main>
<h1 style={{ marginBottom: 6 }}>Payroll</h1>

<p style={{ marginTop: 0, opacity: 0.75 }}>
Payroll summary is automatically calculated from employee timesheets.
</p>

{error ? (
<p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>
) : null}

<div style={toolbarStyle}>
<div style={fieldBlockStyle}>
<label style={labelStyle}>Employee</label>
<select
value={selectedEmployeeId}
onChange={(e) => setSelectedEmployeeId(e.target.value)}
style={inputStyle}
>
{employees.map((employee) => (
<option key={employee.id} value={employee.id}>
{employee.name}
</option>
))}
</select>
</div>

<div style={fieldBlockStyle}>
<label style={labelStyle}>Month</label>
<input
type="month"
value={selectedMonth}
onChange={(e) => setSelectedMonth(e.target.value)}
style={inputStyle}
/>
</div>

<div style={fieldBlockStyle}>
<label style={labelStyle}>Hourly Rate</label>
<input
type="number"
step="0.01"
value={hourlyRate}
onChange={(e) => setHourlyRate(e.target.value)}
style={inputStyle}
/>
</div>
</div>

<div style={statsGridStyle}>
<StatCard label="Regular Hours" value={regularHours.toFixed(2)} />
<StatCard label="Overtime Hours" value={overtimeHours.toFixed(2)} />
<StatCard label="Volunteer Hours" value={volunteerHours.toFixed(2)} />
<StatCard
label="Total Hours"
value={totalHours.toFixed(2)}
dark
/>
<StatCard label="Regular Pay" value={formatMoney(regularPay)} />
<StatCard label="Overtime Pay" value={formatMoney(overtimePay)} />
<StatCard
label="Estimated Gross Pay"
value={formatMoney(estimatedGrossPay)}
green
/>
<StatCard label="Tax Deduction" value={`-${formatMoney(taxDeduction)}`} />
<StatCard
label="Insurance Deduction"
value={`-${formatMoney(insuranceDeduction)}`}
/>
<StatCard
label="Estimated Net Pay"
value={formatMoney(estimatedNetPay)}
dark
/>
</div>

<div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
<button onClick={exportPayrollCSV} style={primaryBtnStyle}>
Export Payroll CSV
</button>

<button onClick={downloadPayrollPDF} style={darkBtnStyle}>
Download Payroll PDF
</button>
</div>

<div style={tableCardStyle}>
<h3 style={{ marginTop: 0, marginBottom: 12 }}>Payroll Entries</h3>

{payrollRows.length === 0 ? (
<p style={{ opacity: 0.7 }}>No completed clock logs found for this month.</p>
) : (
<table style={tableStyle}>
<thead>
<tr>
<th style={thStyle}>Date</th>
<th style={thStyle}>Clock In</th>
<th style={thStyle}>Clock Out</th>
<th style={thStyle}>Regular Hours</th>
<th style={thStyle}>Overtime Hours</th>
<th style={thStyle}>Total Hours</th>
</tr>
</thead>
<tbody>
{payrollRows.map((row, index) => (
<tr key={`${row.date}-${index}`}>
<td style={tdStyle}>{row.date}</td>
<td style={tdStyle}>{row.clockIn}</td>
<td style={tdStyle}>{row.clockOut}</td>
<td style={tdStyle}>{row.regularHours.toFixed(2)}</td>
<td style={tdStyle}>{row.overtimeHours.toFixed(2)}</td>
<td style={tdStyle}>{row.totalHours.toFixed(2)}</td>
</tr>
))}
</tbody>
</table>
)}
</div>
</main>
);
}

function StatCard({
label,
value,
dark,
green,
}: {
label: string;
value: string;
dark?: boolean;
green?: boolean;
}) {
let background = "white";
let color = "#111827";
let border = "1px solid #e5e7eb";

if (dark) {
background = "#111827";
color = "white";
border = "1px solid #111827";
}

if (green) {
background = "#16a34a";
color = "white";
border = "1px solid #16a34a";
}

return (
<div
style={{
background,
color,
border,
borderRadius: 10,
padding: 14,
minHeight: 84,
}}
>
<div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>{label}</div>
<div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
</div>
);
}

const toolbarStyle: React.CSSProperties = {
display: "flex",
gap: 14,
flexWrap: "wrap",
marginBottom: 18,
};

const fieldBlockStyle: React.CSSProperties = {
display: "flex",
flexDirection: "column",
gap: 6,
minWidth: 180,
};

const labelStyle: React.CSSProperties = {
fontSize: 13,
fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
border: "1px solid #d1d5db",
borderRadius: 8,
padding: "10px 12px",
fontSize: 14,
background: "white",
};

const statsGridStyle: React.CSSProperties = {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
gap: 12,
};

const primaryBtnStyle: React.CSSProperties = {
background: "#2563eb",
color: "white",
border: "none",
borderRadius: 8,
padding: "10px 16px",
fontWeight: 600,
cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
background: "#16a34a",
color: "white",
border: "none",
borderRadius: 8,
padding: "10px 16px",
fontWeight: 600,
cursor: "pointer",
};

const darkBtnStyle: React.CSSProperties = {
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    };


const tableCardStyle: React.CSSProperties = {
marginTop: 22,
background: "white",
border: "1px solid #e5e7eb",
borderRadius: 12,
padding: 16,
};



const tableStyle: React.CSSProperties = {
width: "100%",
borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
textAlign: "left",
padding: "10px 8px",
borderBottom: "1px solid #e5e7eb",
fontSize: 13,
};

const tdStyle: React.CSSProperties = {
padding: "10px 8px",
borderBottom: "1px solid #f3f4f6",
fontSize: 14,
};
