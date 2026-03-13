"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabaseClient";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID;

type TimesheetRow = {
  id: string;
  employee_id: string | null;
  month_start: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
};

type EntryAggRow = {
  timesheet_id: string;
  total_hours: number | null;
};

type EmployeeRow = {
  id: string;
  name: string;
  email: string | null;
  hourly_rate: number;
  tax_rate: number;
  insurance_deduction: number;
};

function getMonthKey(row: TimesheetRow) {
  return row.month_start || row.period_start || "";
}

function formatMonthLabel(value: string) {
  if (!value) return "Unknown month";
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function TimesheetsPage() {
  const router = useRouter();

  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [hoursByTimesheet, setHoursByTimesheet] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingMonth, setOpeningMonth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTimesheets = useMemo(() => {
    return [...timesheets].sort((a, b) => {
      const aKey = getMonthKey(a);
      const bKey = getMonthKey(b);
      return bKey.localeCompare(aKey);
    });
  }, [timesheets]);

  const filteredTimesheets = useMemo(() => {
    if (!selectedEmployeeId) return sortedTimesheets;
    return sortedTimesheets.filter((sheet) => sheet.employee_id === selectedEmployeeId);
  }, [sortedTimesheets, selectedEmployeeId]);

  async function fetchEmployees() {
    if (!ORG_ID) throw new Error("Missing NEXT_PUBLIC_ORG_ID in .env.local");

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, email, hourly_rate, tax_rate, insurance_deduction")
      .eq("org_id", ORG_ID)
      .order("name", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as EmployeeRow[];
    setEmployees(rows);

    if (!selectedEmployeeId && rows.length > 0) {
      setSelectedEmployeeId(rows[0].id);
    }
  }

  async function fetchTimesheets() {
    if (!ORG_ID) throw new Error("Missing NEXT_PUBLIC_ORG_ID in .env.local");

    const { data, error } = await supabase
      .from("timesheets")
      .select("id, employee_id, month_start, period_start, period_end, created_at")
      .eq("org_id", ORG_ID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setTimesheets((data ?? []) as TimesheetRow[]);
  }

  async function fetchHours() {
    const { data, error } = await supabase
      .from("timesheet_entries")
      .select("timesheet_id, total_hours");

    if (error) throw error;

    const totals: Record<string, number> = {};
    ((data ?? []) as EntryAggRow[]).forEach((row) => {
      const key = row.timesheet_id;
      if (!key) return;
      totals[key] = (totals[key] ?? 0) + Number(row.total_hours ?? 0);
    });

    setHoursByTimesheet(totals);
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchEmployees(), fetchTimesheets(), fetchHours()]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  }

  async function openCurrentMonth() {
    setError(null);

    if (!ORG_ID) {
      setError("Missing NEXT_PUBLIC_ORG_ID in .env.local");
      return;
    }

    if (!selectedEmployeeId) {
      setError("Select an employee first");
      return;
    }

    setOpeningMonth(true);

    try {
      const now = new Date();

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const { data: existing, error: findError } = await supabase
        .from("timesheets")
        .select("id")
        .eq("org_id", ORG_ID)
        .eq("employee_id", selectedEmployeeId)
        .or(`month_start.eq.${monthStart},period_start.eq.${monthStart}`)
        .maybeSingle();

      if (findError) {
        setError(`Find error: ${findError.message}`);
        setOpeningMonth(false);
        return;
      }

      if (existing?.id) {
        router.push(`/timesheets/${existing.id}`);
        return;
      }

      const payload = {
        org_id: ORG_ID,
        employee_id: selectedEmployeeId,
        month_start: monthStart,
        period_start: monthStart,
        period_end: monthEnd,
        status: "draft",
      };

      const { data: created, error: createError } = await supabase
        .from("timesheets")
        .insert([payload])
        .select("id")
        .single();

      if (createError) {
        setError(`Create error: ${createError.message}`);
        setOpeningMonth(false);
        return;
      }

      if (!created?.id) {
        setError("Month was created but no id was returned.");
        setOpeningMonth(false);
        return;
      }

      await fetchTimesheets();
      router.push(`/timesheets/${created.id}`);
    } finally {
      setOpeningMonth(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      <h1 style={{ marginBottom: 12 }}>Timesheets</h1>

      <p style={{ opacity: 0.8, marginBottom: 16 }}>Monthly dashboard</p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600 }}>Employee</span>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              minWidth: 220,
              background: "white",
            }}
          >
            <option value="">Select employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={openCurrentMonth}
          disabled={openingMonth || !selectedEmployeeId}
          className="primary-btn"
        >
          {openingMonth ? "Opening..." : "Open Current Month"}
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : employees.length === 0 ? (
        <p>No employees found. Add an employee first.</p>
      ) : filteredTimesheets.length === 0 ? (
        <p>No timesheets found for this employee yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {filteredTimesheets.map((sheet) => {
            const monthValue = getMonthKey(sheet);
            const total = hoursByTimesheet[sheet.id] ?? 0;
            const employee = employees.find((e) => e.id === sheet.employee_id);

            return (
              <div
                key={sheet.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  background: "white",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>
                    {formatMonthLabel(monthValue)}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Employee: <b>{employee?.name ?? "Unknown employee"}</b>
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    Total hours: <b>{total.toFixed(2)}</b>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/timesheets/${sheet.id}`)}
                  style={{
                    background: "#111",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Open
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}