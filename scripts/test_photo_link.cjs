const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  const p = "in/6f148985-e39e-4bd7-95ea-ba06baff5374/1788001650708.jpg";
  const { data } = supabase.storage.from("attendance-photos").getPublicUrl(p);
  console.log("Generated Public URL:", data.publicUrl);

  const fetchRes = await fetch(data.publicUrl);
  console.log("HTTP Fetch Status:", fetchRes.status, fetchRes.statusText);
  if (!fetchRes.ok) {
    const text = await fetchRes.text();
    console.log("Response Body:", text);
  }
})();
