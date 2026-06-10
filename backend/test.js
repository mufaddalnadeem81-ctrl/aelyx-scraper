require("dotenv").config();

const supabase = require("./supabase");

async function test() {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*");

  console.log("Data:", data);
  console.log("Error:", error);
}

test();