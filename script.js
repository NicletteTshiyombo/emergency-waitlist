// Function to fetch all patients and display them in the admin table
function fetchPatients() {
    fetch('http://localhost:3000/getAllPatients', {
        method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
        const tableBody = document.querySelector('.admin-container table tbody');
        tableBody.innerHTML = '';  // Clear the table before adding new data

        data.forEach(patient => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${patient.card_number}</td>
                <td>${patient.name}</td>
                <td>${patient.injury_type}</td>  
                <td>${patient.pain_level}</td>
                <td>${patient.priority_id}</td>
                <td><button onclick="selectPatient('${patient.card_number}')" class="button">Select</button></td>
            `;
            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error fetching patients:', error);
    });
}

// Call fetchPatients on window load
window.onload = fetchPatients;

// Function to select a patient from triage
let selectedEntry = null;
function selectPatient(cardNumber) {
    selectedEntry = cardNumber;
    document.getElementById('selectedEntryDisplay').textContent = `Selected Entry: ${cardNumber}`;
    console.log("Selected patient", cardNumber);
}

// Function to increase priority level
function increasePriority() {
    if (selectedEntry) {
        fetch('http://localhost:3000/updatePriority', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_number: selectedEntry, increase: false })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to increase priority');
            }
            return response.json();
        })
        .then(data => {
            console.log('Priority increased successfully:', data);
            fetchPatients();
        })
        .catch(error => console.error('Error increasing priority:', error));
    } else {
        console.error("No patient selected");
    }
}

// Function to decrease priority level
function decreasePriority() {
    if (selectedEntry) {
        fetch('http://localhost:3000/updatePriority', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_number: selectedEntry, increase: true })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to decrease priority');
            }
            return response.json();
        })
        .then(data => {
            console.log('Priority decreased successfully:', data);
            fetchPatients();
        })
        .catch(error => console.error('Error decreasing priority:', error));
    } else {
        console.error("No patient selected");
    }
}

// Function to remove a patient
function removePatient() {
    if (selectedEntry) {
        fetch('http://localhost:3000/removePatient', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_number: selectedEntry })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to remove patient');
            }
            return response.json();
        })
        .then(data => {
            console.log('Patient removed successfully:', data);
            fetchPatients();
        })
        .catch(error => console.error('Error removing patient:', error));
    } else {
        console.error("No patient selected");
    }
}

// Add event listeners to buttons
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loadData').addEventListener('click', fetchPatients);
    document.getElementById('increaseLevel').addEventListener('click', increasePriority);
    document.getElementById('decreaseLevel').addEventListener('click', decreasePriority);
    document.getElementById('removeData').addEventListener('click', removePatient);
});
