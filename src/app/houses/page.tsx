"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!;

type HouseRow = {
  id: string;
  team: "red" | "blue" | "green";
  name: string;
  created_at: string;
};

export default function HousesPage() {
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [team, setTeam] = useState<HouseRow["team"]>("red");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchHouses() {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("houses")
      .select("id, team, name, created_at")
      .eq("org_id", ORG_ID)
      .order("team", { ascending: true })
      .order("name", { ascending: true });

    if (error) setError(error.message);
    setHouses((data ?? []) as HouseRow[]);
    setLoading(false);
  }

  async function addHouse(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("houses").insert([
      {
        org_id: ORG_ID,
        team,
        name: trimmed,
      },
    ]);

    if (error) setError(error.message);
    else {
      setName("");
      await fetchHouses();
    }

    setSaving(false);
  }

  useEffect(() => {
    fetchHouses();
  }, []);

  return (
    <main style={{ padding: 20, maxWidth: 800 }}>
      <h1>Houses</h1>

      <form onSubmit={addHouse} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select value={team} onChange={(e) => setTeam(e.target.value as HouseRow["team"])}>
          <option value="red">Red Team</option>
          <option value="blue">Blue Team</option>
          <option value="green">Green Team</option>
        </select>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="House name (e.g., Maple House)"
          style={{ flex: 1, padding: 8 }}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add House"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : houses.length === 0 ? (
        <p>No houses yet.</p>
      ) : (
        <ul>
          {houses.map((h) => (
            <li key={h.id}>
              <b>{h.team.toUpperCase()}</b> — {h.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}