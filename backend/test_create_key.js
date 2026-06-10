require("dotenv").config();
const supabase = require("./supabase");
const { v4: uuidv4 } = require('uuid');

async function testCreate() {
  const apiKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
  const { data, error } = await supabase
    .from('api_keys')
    .insert([
        {
            api_key: apiKey,
            owner_name: 'dashboard-user'
        }
    ])
    .select();

  console.log("Data:", data);
  console.log("Error:", error);
}

testCreate();
