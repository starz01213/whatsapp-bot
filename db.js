const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    // Initialize the database tables
    initDb: async () => {
        const query = `
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                phone TEXT,
                session_data TEXT,
                status TEXT,
                connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await pool.query(query);
            console.log("Database tables initialized");
        } catch (err) {
            console.error("Database init error:", err.message);
        }
    },

    // Save or update session data
    saveSessionToDb: async (sessionId, phone, sessionData) => {
        const query = `
            INSERT INTO sessions (session_id, phone, session_data, status)
            VALUES ($1, $2, $3, 'online')
            ON CONFLICT (session_id) 
            DO UPDATE SET phone = $2, session_data = $3, status = 'online';
        `;
        await pool.query(query, [sessionId, phone, sessionData]);
    },

    // Retrieve session data
    getSessionFromDb: async (sessionId) => {
        const query = `SELECT * FROM sessions WHERE session_id = $1`;
        const res = await pool.query(query, [sessionId]);
        return res.rows[0];
    },

    // Update online/offline status
    updateStatusInDb: async (sessionId, status) => {
        const query = `UPDATE sessions SET status = $1 WHERE session_id = $2`;
        await pool.query(query, [status, sessionId]);
    }
};

