import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
try {
const { name, email, hourlyRate, orgId } = await req.json();

if (!name || !email || !hourlyRate || !orgId) {
return NextResponse.json(
{ error: "Missing required fields." },
{ status: 400 }
);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
return NextResponse.json(
{ error: "Missing server environment variables." },
{ status: 500 }
);
}

const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

const temporaryPassword =
Math.random().toString(36).slice(-10) + "Aa1!";

const { data: authData, error: authError } =
await adminSupabase.auth.admin.createUser({
email,
password: temporaryPassword,
email_confirm: true,
user_metadata: {
full_name: name,
role: "employee",
},
});

if (authError || !authData.user) {
return NextResponse.json(
{ error: authError?.message || "Failed to create auth user." },
{ status: 400 }
);
}

const userId = authData.user.id;

const { error: profileError } = await adminSupabase.from("profiles").insert({
id: userId,
org_id: orgId,
full_name: name,
role: "employee",
});

if (profileError) {
await adminSupabase.auth.admin.deleteUser(userId);
return NextResponse.json(
{ error: profileError.message },
{ status: 400 }
);
}

const { error: employeeError } = await adminSupabase.from("employees").insert({
org_id: orgId,
user_id: userId,
email,
name,
hourly_rate: Number(hourlyRate),
});

if (employeeError) {
await adminSupabase.from("profiles").delete().eq("id", userId);
await adminSupabase.auth.admin.deleteUser(userId);
return NextResponse.json(
{ error: employeeError.message },
{ status: 400 }
);
}

return NextResponse.json({
success: true,
temporaryPassword,
});
} catch (error) {
return NextResponse.json(
{ error: "Unexpected server error." },
{ status: 500 }
);
}
}
