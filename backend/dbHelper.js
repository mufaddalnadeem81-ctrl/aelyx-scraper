const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

const KEYS_FILE = path.join(__dirname, 'keys.json');

// Initialize global memory storage for environments with read-only filesystems
global.localKeys = global.localKeys || {};

function readLocalKeys() {
    let fileKeys = {};
    try {
        if (fs.existsSync(KEYS_FILE)) {
            fileKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[DATABASE] Error reading local keys.json:', e.message);
    }
    // Merge file keys and memory keys, with memory keys taking precedence for updates
    return { ...fileKeys, ...global.localKeys };
}

function writeLocalKeys(keys) {
    // Keep updated in memory
    global.localKeys = { ...global.localKeys, ...keys };
    
    try {
        fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
    } catch (e) {
        console.error('[DATABASE] Error writing local keys.json:', e.message);
    }
}

async function getApiKey(apiKey) {
    try {
        // Try Supabase first
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('api_key', apiKey)
            .eq('active', true)
            .single();
        
        if (!error && data) {
            return data;
        }
        if (error) {
            console.warn('[DATABASE] Supabase error in getApiKey, trying local fallback:', error.message || error);
        }
    } catch (err) {
        console.warn('[DATABASE] Supabase connection failed in getApiKey, trying local fallback:', err.message);
    }

    // Fallback to local keys.json
    const keys = readLocalKeys();
    if (keys[apiKey] && keys[apiKey].active) {
        return keys[apiKey];
    }
    return null;
}

async function createApiKey(apiKey, ownerName) {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .insert([
                {
                    api_key: apiKey,
                    owner_name: ownerName || 'dashboard-user'
                }
            ])
            .select()
            .single();
        
        if (!error && data) {
            // Mirror to local keys.json just in case we go offline later
            const keys = readLocalKeys();
            keys[apiKey] = data;
            writeLocalKeys(keys);
            return data;
        }
        if (error) {
            console.warn('[DATABASE] Supabase error in createApiKey, trying local fallback:', error.message || error);
        }
    } catch (err) {
        console.warn('[DATABASE] Supabase connection failed in createApiKey, trying local fallback:', err.message);
    }

    // Fallback to local keys.json
    const keys = readLocalKeys();
    const newRecord = {
        api_key: apiKey,
        owner_name: ownerName || 'dashboard-user',
        requests_used: 0,
        active: true,
        created_at: new Date().toISOString()
    };
    keys[apiKey] = newRecord;
    writeLocalKeys(keys);
    return newRecord;
}

async function incrementUsage(apiKey) {
    try {
        // First get current record to increment
        const { data, error } = await supabase
            .from('api_keys')
            .select('requests_used')
            .eq('api_key', apiKey)
            .single();
        
        if (!error && data) {
            const nextCount = (data.requests_used || 0) + 1;
            const { error: updateError } = await supabase
                .from('api_keys')
                .update({ requests_used: nextCount })
                .eq('api_key', apiKey);
            
            if (!updateError) {
                // Mirror to local keys.json
                const keys = readLocalKeys();
                if (keys[apiKey]) {
                    keys[apiKey].requests_used = nextCount;
                    writeLocalKeys(keys);
                }
                return;
            }
        }
    } catch (err) {
        console.warn('[DATABASE] Supabase connection failed in incrementUsage:', err.message);
    }

    // Update local keys.json as fallback
    const keys = readLocalKeys();
    if (keys[apiKey]) {
        keys[apiKey].requests_used = (keys[apiKey].requests_used || 0) + 1;
        writeLocalKeys(keys);
    } else {
        keys[apiKey] = {
            api_key: apiKey,
            owner_name: 'dashboard-user',
            requests_used: 1,
            active: true,
            created_at: new Date().toISOString()
        };
        writeLocalKeys(keys);
    }
}

module.exports = {
    getApiKey,
    createApiKey,
    incrementUsage
};
