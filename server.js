const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const port = 3000;

const pool = new Pool({
    host: "127.0.0.1",
    port: "5432",
    user: "postgres",
    password: "Noblesse",
    database: "emergency_waitlist"
});

// Test the connection
pool.connect()
    .then(() => console.log('Connected to the database'))
    .catch(err => console.error('Connection error', err.stack));


// GET /getAllPatients - Fetch all patients (for admin access)
app.get('/getAllPatients', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT * 
            FROM PATIENTS p
            JOIN PRIORITIES pr ON p.priority_id = pr.priority_id
            JOIN ROOMS r ON p.room_id = r.room_id
            ORDER BY p.priority_id ASC, p.arrival_time ASC
        `);
        res.json(result.rows);  // Return all patients data
        client.release();
    } catch (err) {
        console.error('Error fetching all patients:', err.stack);
        res.status(500).send('Server error');
    }
});

// POST endpoint to update priority
app.post('/updatePriority', async (req, res) => {
    const { card_number, increase } = req.body;
    if (!card_number) {
        return res.status(400).send('Card number is required');
    }

    try {
        const client = await pool.connect();
        // First, fetch the current priority
        const current = await client.query('SELECT priority_id FROM PATIENTS WHERE card_number = $1', [card_number]);
        if (current.rows.length === 0) {
            client.release();
            return res.status(404).send('Patient not found');
        }
        
        const newPriority = current.rows[0].priority_id + (increase ? 1 : -1);

        // Update the priority
        const result = await client.query(
            'UPDATE PATIENTS SET priority_id = $1 WHERE card_number = $2 RETURNING *',
            [newPriority, card_number]
        );
        client.release();

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Failed to update priority');
        }
    } catch (err) {
        console.error('Error updating patient priority:', err.stack);
        res.status(500).send('Server error');
    }
});


// POST endpoint to remove a patient based on card number
app.post('/removePatient', async (req, res) => {
    const { card_number } = req.body;
    if (!card_number) {
        return res.status(400).json({ error: 'Card number is required' });
    }

    try {
        const client = await pool.connect();
        const result = await client.query('DELETE FROM PATIENTS WHERE card_number = $1 RETURNING *', [card_number]);
        client.release();

        if (result.rowCount > 0) {
            res.json({ message: 'Patient removed successfully', data: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (err) {
        console.error('Error removing patient:', err.stack);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST endpoint to check the waiting time
app.post('/checkWaitTime', async (req, res) => {
    const { card_number } = req.body;

    if (!card_number) {
        return res.status(400).json({ error: 'Card number is required' });
    }

    try {
        const client = await pool.connect();

        // Find the patient's priority and arrival time
        const patientQuery = await client.query(`
            SELECT p.priority_id, p.arrival_time, pr.approximate_time
            FROM PATIENTS p
            JOIN PRIORITIES pr ON p.priority_id = pr.priority_id
            WHERE p.card_number = $1
        `, [card_number]);

        if (patientQuery.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Patient not found' });
        }

        const patient = patientQuery.rows[0];

        // Calculate total waiting time for higher priority patients
        const waitTimeQuery = await client.query(`
            WITH OrderedQueue AS (
                SELECT 
                    p.card_number,
                    p.priority_id,
                    p.arrival_time,
                    pr.approximate_time,
                    ROW_NUMBER() OVER (ORDER BY p.priority_id ASC, p.arrival_time ASC) AS queue_position
                FROM PATIENTS p
                JOIN PRIORITIES pr ON p.priority_id = pr.priority_id
            ),
            CurrentPatient AS (
                SELECT queue_position
                FROM OrderedQueue
                WHERE card_number = $1
            )
            SELECT COALESCE(SUM(oq.approximate_time), 0) AS total_wait_time
            FROM OrderedQueue oq
            JOIN CurrentPatient cp ON oq.queue_position < cp.queue_position;
        `, [card_number]);

        client.release();

        const totalWaitTime = waitTimeQuery.rows[0].total_wait_time;

        res.json({ wait_time: totalWaitTime });
    } catch (err) {
        console.error('Error calculating waiting time:', err.stack);
        res.status(500).json({ error: 'Server error' });
    }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
