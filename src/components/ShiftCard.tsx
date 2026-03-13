type Shift = {
    id: string
    work_date: string
    start_time: string | null;
    end_time: string| null;
    mileage: number| null;
    is_outing: boolean| null;
    daily_log: string| null;
  }
  
  type Employee = {
    id: string
    name: string
  }
  
  export default function ShiftCard({
    shift,
    employee,
    onEdit,
    onDelete
  }: {
    shift: Shift
    employee?: Employee
    onEdit: () => void
    onDelete: () => void
  }) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          background: "#f8fafc"
        }}
      >
        <div style={{ fontWeight: 700 }}>
          {employee?.name || "Unknown Employee"}
        </div>
  
        <div>
          {shift.work_date}
        </div>
  
        <div>
          {shift.start_time} - {shift.end_time}
        </div>
  
        <div>
          Mileage: {shift.mileage}
        </div>
  
        <div>
          Outing: {shift.is_outing ? "Yes" : "No"}
        </div>
  
        {shift.daily_log && (
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            {shift.daily_log}
          </div>
        )}
  
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete}>Delete</button>
        </div>
      </div>
    )
  }