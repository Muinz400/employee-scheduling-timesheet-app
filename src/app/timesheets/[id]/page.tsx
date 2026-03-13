"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../supabaseClient";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID;

type HouseRow = { id: string; name: string; team: "red" | "blue" | "green" };
type EntryRow = {
  id: string;
  work_date: string;
  house_id: string | null;
  time_in: string;
  time_out: string;
  overtime_hours: number;
  total_hours: number | null;
  is_volunteer: boolean;
  notes: string | null;
};

function hoursBetween(timeIn: string, timeOut: string) {
  // "HH:MM" 24hr
  const [h1, m1] = timeIn.split(":").map(Number);
  const [h2, m2] = timeOut.split(":").map(Number);
  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;
  const diff = end - start;
  return Math.max(0, diff / 60);
}

function getRegularHours(total: number) {
  return Math.min(total, 8);
}

function getOvertimeHours(total: number) {
  return Math.max(total - 8, 0);
}

function formatTime(time: string) {
  if (!time) return "";

  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatDate(date: string) {
  const d = new Date(date);

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TimesheetDetailPage() {
  const params = useParams();
  const timesheetId = params.id as string;

  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [workDate, setWorkDate] = useState("");
  const [houseId, setHouseId] = useState<string>("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [notes, setNotes] = useState("");



  // edit
  const [editingId, setEditingId] = useState<string | null>(null);

  const housesById = useMemo(() => {
    const m = new Map<string, HouseRow>();
    houses.forEach((h) => m.set(h.id, h));
    return m;
  }, [houses]);

  const monthTotal = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.total_hours ?? 0), 0);
  }, [entries]);

  const summary = useMemo(() => {
    let regular = 0;
    let overtimeTotal = 0;
    let volunteer = 0;
  
    for (const e of entries) {
      const ot = Number(e.overtime_hours ?? 0);
      const total = Number(e.total_hours ?? 0);
      const regularPortion = Math.max(0, total - ot);
  
      if (e.is_volunteer) {
        volunteer += total;
      } else {
        regular += regularPortion;
        overtimeTotal += ot;
      }
    }
  
    return {
      regular,
      overtime: overtimeTotal,
      volunteer,
      total: regular + overtimeTotal + volunteer,
    };
  }, [entries]);

  

  function downloadPdf() {
    window.print();
  }
  

  function exportCsv() {
    const headers = ["Date","House","Time In","Time Out","Total Hours"]
  
    const rows = entries.map(e => [
      formatDate(e.work_date),
      e.house_id,
      formatTime(e.time_in),
      formatTime(e.time_out),
      e.total_hours
    ])
  
    const csv = [headers, ...rows]
      .map(r => r.join(","))
      .join("\n")
  
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
  
    const link = document.createElement("a")
    link.href = url
    link.download = "timesheet.csv"
    link.click()
  }

  async function fetchHouses() {
    if (!ORG_ID) throw new Error("Missing NEXT_PUBLIC_ORG_ID in .env.local");

    const { data, error } = await supabase
      .from("houses")
      .select("id, name, team")
      .eq("org_id", ORG_ID)
      .order("team", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    setHouses((data ?? []) as HouseRow[]);
  }

  async function fetchEntries() {
    if (!timesheetId) throw new Error("Missing timesheet id in route");

    const { data, error } = await supabase
      .from("timesheet_entries")
      .select(
        "id, work_date, house_id, time_in, time_out, overtime_hours, total_hours, is_volunteer, notes"
      )
      .eq("timesheet_id", timesheetId)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    setEntries((data ?? []) as EntryRow[]);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await fetchHouses();
      await fetchEntries();
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setWorkDate("");
    setHouseId("");
    setTimeIn("");
    setTimeOut("");
    setIsVolunteer(false);
    setNotes("");
    setEditingId(null);
  }

  function startEdit(row: EntryRow) {
    setEditingId(row.id);
    setWorkDate(row.work_date || "");
    setHouseId(row.house_id || "");
    setTimeIn(row.time_in || "");
    setTimeOut(row.time_out || "");
    setIsVolunteer(Boolean(row.is_volunteer));
    setNotes(row.notes || "");
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Delete this entry?")) return;

    const { error } = await supabase
      .from("timesheet_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      setError(error.message);
      return;
    }

    await fetchEntries();
  }

  async function addEntry(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    if (!ORG_ID) return setError("Missing NEXT_PUBLIC_ORG_ID in .env.local");
    if (!timesheetId) return setError("Missing timesheet id in route");

    const hid = (houseId || "").trim();
    if (!workDate) return setError("Pick a date");
    if (!hid) return setError("Select a house");
    if (!timeIn) return setError("Enter time in");
    if (!timeOut) return setError("Enter time out");

    const totalWorked = hoursBetween(timeIn, timeOut);

const regularHours = Math.min(totalWorked, 8);
const ot = Math.max(totalWorked - 8, 0);

const total = Number((regularHours + ot).toFixed(2));
    
    const duplicateExists = entries.some((entry) => {
      return (
        entry.work_date === workDate &&
        entry.house_id === hid &&
        entry.time_in === timeIn &&
        entry.time_out === timeOut
      );
    });
    
    if (duplicateExists) {
      return setError("This exact shift already exists.");
    }
    setSaving(true);

    const { error } = await supabase.from("timesheet_entries").insert([
      {
        org_id: ORG_ID,
        timesheet_id: timesheetId,
        work_date: workDate,
        house_id: hid,
        time_in: timeIn,
        time_out: timeOut,
        overtime_hours: ot,
        total_hours: total,
        is_volunteer: isVolunteer,
        notes: notes.trim() || null,
      },
    ]);

    if (error) {
      if (error.message.includes("timesheet_entries_unique_shift")) {
        setError("This shift has already been logged.");
      } else {
        setError(error.message);
      }
      setSaving(false);
      return;
    }
    
    resetForm();
    await fetchEntries();
    setSaving(false);
  }
  async function updateEntry(entryId: string) {
    setError(null);

    if (!ORG_ID) return setError("Missing NEXT_PUBLIC_ORG_ID in .env.local");
    if (!timesheetId) return setError("Missing timesheet id in route");

    const hid = (houseId || "").trim();
    if (!workDate) return setError("Pick a date");
    if (!hid) return setError("Select a house");
    if (!timeIn) return setError("Enter time in");
    if (!timeOut) return setError("Enter time out");

    const totalWorked = hoursBetween(timeIn, timeOut);

const regularHours = Math.min(totalWorked, 8);
const ot = Math.max(totalWorked - 8, 0);

const total = Number((regularHours + ot).toFixed(2));

    const duplicateExists = entries.some((entry) => {
      return (
        entry.work_date === workDate &&
        entry.house_id === hid &&
        entry.time_in === timeIn &&
        entry.time_out === timeOut
      );
    });
    
    if (duplicateExists) {
      return setError("This exact shift already exists.");
    }
    setSaving(true);

    const { error } = await supabase
      .from("timesheet_entries")
      .update({
        work_date: workDate,
        house_id: hid,
        time_in: timeIn,
        time_out: timeOut,
        overtime_hours: ot,
        total_hours: total,
        is_volunteer: isVolunteer,
        notes: notes.trim() || null,
      })
      .eq("id", entryId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    resetForm();
    await fetchEntries();
    setSaving(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesheetId]);

  return (
    <main style={{ padding: 20, maxWidth: 1000 }}>
      <h1>Timesheet</h1>
    <nav
  style={{
    display: "flex",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  }}
>
  <Link href="/timesheets" style={navLinkStyle}>
    Timesheets
  </Link>

  <Link href="/payroll" style={navLinkStyle}>
    Payroll
  </Link>
</nav>  
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  }}
>
  <div
    style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div style={{ fontSize: 12, opacity: 0.7 }}>Regular Hours</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.regular.toFixed(2)}</div>
  </div>

  <div
    style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div style={{ fontSize: 12, opacity: 0.7 }}>Overtime Hours</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.overtime.toFixed(2)}</div>
  </div>

  <div
    style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div style={{ fontSize: 12, opacity: 0.7 }}>Volunteer Hours</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.volunteer.toFixed(2)}</div>
  </div>

  <div
    style={{
      background: "#111827",
      color: "white",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div style={{ fontSize: 12, opacity: 0.8 }}>Total Hours</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{summary.total.toFixed(2)}</div>
  </div>
</div>



<div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "flex-end" }}>  <button
    type="button"
    onClick={exportCsv}
    className="primary-btn"
  >
    Export CSV
  </button>

  <button
    type="button"
    onClick={downloadPdf}
    className="primary-btn"
  >
    Download PDF
  </button>
</div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (editingId) updateEntry(editingId);
          else addEntry(ev);
        }}
        style={{ display: "grid", gap: 8, marginBottom: 16 }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />

          <select value={houseId} onChange={(e) => setHouseId(e.target.value)}>
            <option value="">Select house</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.team.toUpperCase()} — {h.name}
              </option>
            ))}
          </select>

          <input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} />
          <input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />

          

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={isVolunteer}
              onChange={(e) => setIsVolunteer(e.target.checked)}
            />
            Volunteer
          </label>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
        />

        <div style={{ display: "flex", gap: 8 }}>
        <button
        type="submit"
        disabled={saving}
  className="primary-btn"

>
            {saving ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save Changes" : "Add Entry"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          {entries.map((e) => {
            const house = e.house_id ? housesById.get(e.house_id) : undefined;

            return (
              <div key={e.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <b>{formatDate(e.work_date)}</b> —{" "}
                    {house ? `${house.team.toUpperCase()} — ${house.name}` : "House"}
                    {e.is_volunteer ? " (Volunteer)" : ""}
                  </div>

                  <div>
                  {formatTime(e.time_in)} – {formatTime(e.time_out)} • OT {Number(e.overtime_hours).toFixed(2)} • Total{" "}
                    <b>{Number(e.total_hours ?? 0).toFixed(2)}</b>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      style={{
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteEntry(e.id)}
                      style={{
                        background: "#ff4d4f",
                        color: "white",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {e.notes && <div style={{ marginTop: 6, opacity: 0.8 }}>{e.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
const navLinkStyle = {
  background: "#111827",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 600,
};