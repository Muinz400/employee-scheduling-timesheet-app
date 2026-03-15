type Schedule = {
    id: string;
    employee_id: string;
    work_date: string;
    start_time: string | null;
    end_time: string | null;
    };
    
    type Employee = {
    id: string;
    name: string;
    };
    
    type WeeklyScheduleProps = {
    schedules: Schedule[];
    employees: Employee[];
    };
    
    function formatShiftTime(start: string | null, end: string | null) {
    const safeStart = start ? start.slice(0, 5) : "--:--";
    const safeEnd = end ? end.slice(0, 5) : "--:--";
    return `${safeStart} - ${safeEnd}`;
    }
    
    export default function WeeklySchedule({
    schedules,
    employees,
    }: WeeklyScheduleProps) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    function getShift(empId: string, day: string) {
    return schedules.find(
    (s) =>
    s.employee_id === empId &&
    new Date(`${s.work_date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    }) === day
    );
    }
    
    return (
    <section style={sectionStyle}>
    <div style={headerRow}>
    <div>
    <h2 style={titleStyle}>Weekly Schedule</h2>
    <p style={subTextStyle}>
    Quick weekly overview of each employee’s assigned shifts.
    </p>
    </div>
    </div>
    
    <div style={tableWrapStyle}>
    <table style={tableStyle}>
    <thead>
    <tr>
    <th style={employeeHeaderStyle}>Employee</th>
    {days.map((day) => (
    <th key={day} style={thStyle}>
    {day}
    </th>
    ))}
    </tr>
    </thead>
    
    <tbody>
    {employees.map((emp) => (
    <tr key={emp.id}>
    <td style={employeeCellStyle}>{emp.name}</td>
    
    {days.map((day) => {
    const shift = getShift(emp.id, day);
    
    return (
    <td key={day} style={tdStyle}>
    {shift ? (
    <div style={shiftPillStyle}>
    {formatShiftTime(shift.start_time, shift.end_time)}
    </div>
    ) : (
    <span style={offTextStyle}>Off</span>
    )}
    </td>
    );
    })}
    </tr>
    ))}
    </tbody>
    </table>
    </div>
    </section>
    );
    }
    
    const sectionStyle: React.CSSProperties = {
    marginTop: 28,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
    };
    
    const headerRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    };
    
    const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 26,
    };
    
    const subTextStyle: React.CSSProperties = {
    marginTop: 6,
    marginBottom: 0,
    opacity: 0.68,
    fontSize: 14,
    };
    
    const tableWrapStyle: React.CSSProperties = {
    overflowX: "auto",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fff",
    };
    
    const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 820,
    };
    
    const employeeHeaderStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "14px 16px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 14,
    fontWeight: 700,
    minWidth: 180,
    };
    
    const thStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "14px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
    };
    
    const tdStyle: React.CSSProperties = {
    padding: "14px 12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
    textAlign: "center",
    fontSize: 14,
    };
    
    const employeeCellStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
    fontWeight: 700,
    whiteSpace: "nowrap",
    color: "#0f172a",
    };
    
    const shiftPillStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: "nowrap",
    };
    
    const offTextStyle: React.CSSProperties = {
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: 13,
    };
    