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
    <section
    style={{
    marginTop: 28,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    overflowX: "auto",
    }}
    >
    <h2 style={{ marginTop: 0, marginBottom: 14 }}>Weekly Schedule</h2>
    
    <table
    style={{
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 760,
    }}
    >
    <thead>
    <tr>
    <th style={thStyle}>Employee</th>
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
    <div style={{ fontWeight: 600 }}>
    {(shift.start_time || "--").slice(0, 5)} - {(shift.end_time || "--").slice(0, 5)}
    </div>
    ) : (
    <span style={{ opacity: 0.55 }}>Off</span>
    )}
    </td>
    );
    })}
    </tr>
    ))}
    </tbody>
    </table>
    </section>
    );
    }
    
    const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 14,
    };
    
    const tdStyle: React.CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    fontSize: 14,
    };
    
    const employeeCellStyle: React.CSSProperties = {
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    fontWeight: 700,
    whiteSpace: "nowrap",
    };