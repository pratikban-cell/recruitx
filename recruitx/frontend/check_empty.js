const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tknfqbzqxdktbortdelh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbmZxYnpxeGRrdGJvcnRkZWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDI5MjIsImV4cCI6MjA5NDYxODkyMn0.IIwJ5fN4XUkpz_l18h5nJTVRduyzslurR8O8CszLyTQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ["profiles", "candidates", "recruiters", "jobs", "negotiations", "messages", "applications", "calendar_connections"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Error reading ${table}:`, error.message);
    } else {
      console.log(`${table}: ${data.length} records remain`);
    }
  }
}

check();
