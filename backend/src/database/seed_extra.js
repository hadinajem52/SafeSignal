const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { faker } = require('@faker-js/faker');

const categories = ['infrastructure', 'security', 'health', 'environment', 'utility', 'transportation'];

function getRandomLebanonLocation() {
    // Lebanon roughly: Lat 33.05 to 34.69, Lng 35.10 to 36.62
    const lat = faker.location.latitude({ min: 33.05, max: 34.69 });
    const lng = faker.location.longitude({ min: 35.10, max: 36.62 });
    return { lat, lng };
}

const seedExtra = async () => {
    try {
        console.log('Seeding extra users and reports...');

        const usersToCreate = 50;
        const users = [];

        // Generate users
        for (let i = 0; i < usersToCreate; i++) {
            const username = faker.internet.username() + Math.floor(Math.random() * 10000);
            const email = faker.internet.email();
            const password = 'password123';
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const user = await db.one(
                `INSERT INTO users (username, email, password_hash, role, is_verified, created_at, updated_at)
                 VALUES ($1, $2, $3, 'citizen', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING user_id, email, username`,
                [username, email, hash]
            );
            users.push(user);
        }
        console.log(`✓ Created ${users.length} users`);

        const incidentsCreated = [];
        // Generate incidents and reports
        for (const user of users) {
             const reportsCount = faker.number.int({ min: 1, max: 5 });
             for (let j = 0; j < reportsCount; j++) {
                 const { lat, lng } = getRandomLebanonLocation();
                 const incidentDate = faker.date.past({ years: 1 });
                 const category = faker.helpers.arrayElement(categories);
                 const title = faker.lorem.sentence({ min: 3, max: 7 });
                 const description = faker.lorem.paragraph({ min: 2, max: 5 });

                 // Insert Incident
                 const incident = await db.one(
                    `INSERT INTO incidents (reporter_id, title, description, category, latitude, longitude, location, status, severity, incident_date, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326), 'verified', 'medium', $7, $7, $7)
                     RETURNING incident_id`,
                    [user.user_id, title, description, category, lat, lng, incidentDate]
                 );
                 incidentsCreated.push(incident);

                 // Insert Report
                 await db.none(
                    `INSERT INTO reports (incident_id, ml_confidence_score, created_at)
                     VALUES ($1, $2, $3)`,
                    [incident.incident_id, faker.number.float({ min: 0.5, max: 0.99, fractionDigits: 2 }), incidentDate]
                 );
             }
        }
        console.log(`✓ Created ${incidentsCreated.length} incidents/reports`);
        
    } catch(err) {
        console.error('Error in seedExtra:', err);
    }
};

seedExtra().then(() => process.exit(0));