// Function to fetch all patients and display them in the admin table
function fetchPatients() {
    fetch('http://localhost:3001/getAllPatients', {
        method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
        const patientsList = document.getElementById('patients-list');
        patientsList.innerHTML = '';  // Clear the table before adding new data

        data.forEach(patient => {
            const row = document.createElement('tr');
            row.classList.add('patient');

            row.innerHTML = `
                <td>${patient.name}</td>
                <td>${patient.card_number}</td>
                <td>${patient.priority_id}</td>
                <td>${patient.injury_type}</td>  
                <td>${patient.user_code}</td>
                <td>${patient.pain_level}</td>
            `;
            patientsList.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error fetching patients:', error);
    });
}
