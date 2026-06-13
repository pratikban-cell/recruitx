const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://tknfqbzqxdktbortdelh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbmZxYnpxeGRrdGJvcnRkZWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNDI5MjIsImV4cCI6MjA5NDYxODkyMn0.IIwJ5fN4XUkpz_l18h5nJTVRduyzslurR8O8CszLyTQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = ["applications", "messages", "negotiations", "jobs", "candidates", "recruiters", "calendar_connections", "profiles"];
  
  for (const table of tables) {
    console.log(`Trying to delete from ${table}...`);
    // Delete all records by checking if ID is not null (since .delete() requires a filter)
    const { data, error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error(`Error deleting from ${table}:`, error.message);
    } else {
      console.log(`Success deleting from ${table}`);
    }
  }
}

run();
