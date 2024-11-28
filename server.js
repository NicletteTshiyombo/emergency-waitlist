const express = require('express');
const { MongoClient } = require('mongodb');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('dev')); // Logs requests for debugging

const port = 3001;
const atlasConnectionUri = 'your_mongodb_connection_string'; // Replace with your MongoDB URI
const dbName = 'Emergency_waitlist';

async function main() {
    const client = new MongoClient(atlasConnectionUri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB.');

        const db = client.db(dbName);
        const triageCollection = db.collection('Patients');

        // Add a new patient
        app.post('/addPatient', async (req, res) => {
            try {
                const { name, code, severity, waitTime } = req.body;

                // Validate input
                if (!name || !code || severity === undefined || waitTime === undefined) {
                    console.error('Validation failed: Missing required fields');
                    return res.status(400).json({ error: 'Missing required fields: name, code, severity, waitTime' });
                }

                if (typeof severity !== 'number' || typeof waitTime !== 'number') {
                    console.error('Validation failed: Incorrect field types');
                    return res.status(400).json({ error: 'Severity and waitTime must be numbers' });
                }

                const newPatient = { name, code, severity, waitTime };
                console.log('Adding new patient:', newPatient);

                const result = await triageCollection.insertOne(newPatient);

                if (result.acknowledged) {
                    console.log('Patient added successfully:', result.insertedId);
                    res.status(201).json({ success: true, patientId: result.insertedId });
                } else {
                    console.error('Failed to add patient');
                    res.status(500).json({ error: 'Failed to add patient to the triage list' });
                }
            } catch (error) {
                console.error('Error in /addPatient:', error.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Get the list of all patients
        app.get('/getTriageList', async (req, res) => {
            try {
                const triageList = await triageCollection.find().toArray();

                if (triageList.length === 0) {
                    console.warn('No patients found in the triage list');
                    return res.status(404).json({ message: 'No patients found' });
                }

                console.log('Retrieved triage list with', triageList.length, 'patients');
                res.status(200).json(triageList);
            } catch (error) {
                console.error('Error in /getTriageList:', error.message);
                res.status(500).json({ error: 'Unable to retrieve triage list due to server error' });
            }
        });

        // Get wait time for a specific patient
        app.get('/getPatientWaitTime', async (req, res) => {
            try {
                const { name } = req.query;

                if (!name || name.trim() === '') {
                    console.error('Validation failed: Patient name is missing');
                    return res.status(400).json({ error: 'Patient name is required' });
                }

                const patient = await triageCollection.findOne({ name });

                if (!patient) {
                    console.warn(`Patient '${name}' not found`);
                    return res.status(404).json({ error: 'Patient not found' });
                }

                console.log(`Retrieved wait time for '${name}'`);
                res.status(200).json({ waitTime: patient.waitTime });
            } catch (error) {
                console.error('Error in /getPatientWaitTime:', error.message);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Home route
        app.get('/', (req, res) => {
            res.send('Welcome to the Emergency Room Triage System!');
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

        // Gracefully close the database connection on exit
        process.on('SIGINT', async () => {
            console.log('Closing database connection...');
            await client.close();
            process.exit();
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1); // Exit with failure code
    }
}

main().catch(console.error);
