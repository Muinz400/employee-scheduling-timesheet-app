"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type ClientRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchClients() {
    setError(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setClients([]);
    } else {
      setClients((data ?? []) as ClientRow[]);
    }

    setLoading(false);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
  
    const name = newClientName.trim();
    if (!name) return;
  
    setSaving(true);
  
    const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!;  
    const { error } = await supabase
      .from("clients")
      .insert([
        {
          name,
          active: true,
          org_id: ORG_ID,
        },
      ]);
  
    if (error) {
      setError(error.message);
    } else {
      setNewClientName("");
      await fetchClients();
    }
  
    setSaving(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Clients</h1>

      <form onSubmit={addClient} style={{ marginBottom: 16 }}>
        <input
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
          placeholder="Client name"
          style={{ padding: 8, marginRight: 8, minWidth: 240 }}
        />
        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add Client"}
        </button>
      </form>

      {error && (
        <p style={{ color: "crimson" }}>
          Error: {error}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {clients.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}