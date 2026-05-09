const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { faker } = require('@faker-js/faker');

const categories = ['infrastructure', 'security', 'health', 'environment', 'utility', 'transportation'];
const severities = ['low', 'medium', 'high', 'critical'];
const statuses = ['submitted', 'in_review', 'verified', 'dispatched', 'on_scene', 'resolved', 'archived', 'rejected'];

function getRandomLebanonLocation() {
    // Lebanon roughly: Lat 33.05 to 34.69, Lng 35.10 to 36.62
    const lat = faker.location.latitude({ min: 33.05, max: 34.69 });
    const lng = faker.location.longitude({ min: 35.10, max: 36.62 });
    return { lat, lng };
}

const seedExtra = async () => {
    try {
        console.log('Seeding MORE users and reports...');

        const usersToCreate = 200;
        const users = [];

        // Generate users
        for (let i = 0; i < usersToCreate; i++) {
            const username = faker.internet.username() + Math.floor(Math.random() * 100000);
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
             const reportsCount = faker.number.int({ min: 1, max: 6 });
             for (let j = 0; j < reportsCount; j++) {
                 const { lat, lng } = getRandomLebanonLocation();
                 const incidentDate = faker.date.past({ years: 2 }); // Guarantees past dates
                 const category = faker.helpers.arrayElement(categories);
                 const severity = faker.helpers.arrayElement(severities);
                 const status = faker.helpers.arrayElement(statuses);
                 const title = faker.lorem.sentence({ min: 3, max: 7 });
                 const description = faker.lorem.paragraph({ min: 2, max: 5 });

                 // Insert Incident
                 const incident = await db.one(
                    `INSERT INTO incidents (reporter_id, title, description, category, latitude, longitude, location, status, severity, incident_date, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8, $9, $9, $9)
                     RETURNING incident_id`,
                    [user.user_id, title, description, category, lat, lng, status, severity, incidentDate]
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
        console.log(`✓ Created ${incidentsCreated.length} more incidents/reports strictly in Lebanon and in the past`);
        
    } catch(err) {
        console.error('Error in seedExtra:', err);
    }
};

seedExtra().then(() => process.exit(0));