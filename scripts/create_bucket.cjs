const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error("Supabase credentials missing in .env.local");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  console.log("=== CHECKING AND CREATING SUPABASE BUCKET: attendance-photos ===");

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Error listing buckets:", listErr);
  } else {
    console.log("Existing Buckets:", buckets.map((b) => b.name));
  }

  const { data, error } = await supabase.storage.createBucket("attendance-photos", {
    public: true, // Make bucket public so getPublicUrl works
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (error) {
    if (error.message?.includes("already exists") || error.statusCode === "409") {
      console.log("✓ Bucket 'attendance-photos' already exists. Ensuring it's public...");
      await supabase.storage.updateBucket("attendance-photos", { public: true });
      console.log("✓ Bucket 'attendance-photos' updated to PUBLIC.");
    } else {
      console.error("Error creating bucket:", error);
    }
  } else {
    console.log("✓ Successfully CREATED PUBLIC BUCKET: 'attendance-photos'", data);
  }
})();
