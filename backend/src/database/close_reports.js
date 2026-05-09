const db = require('../config/database');

const closeAllReports = async () => {
    try {
        console.log('Closing all open incidents/reports...');

        // Update incidents to 'resolved' and closure_outcome to 'resolved_handled'
        const result = await db.result(
            `UPDATE incidents 
             SET status = 'resolved',
                 closure_outcome = 'resolved_handled',
                 first_action_at = COALESCE(first_action_at, CURRENT_TIMESTAMP),
                 closed_at = COALESCE(closed_at, CURRENT_TIMESTAMP),
                 updated_at = CURRENT_TIMESTAMP
             WHERE status NOT IN ('resolved', 'rejected', 'archived', 'police_closed', 'merged')`
        );

        console.log(`✓ Closed ${result.rowCount} incidents.`);

        // Also update any pending moderation queue items to 'approved'
        const modResult = await db.result(
            `UPDATE moderation_queue
             SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP
             WHERE status = 'pending'`
        );
        
        console.log(`✓ Approved ${modResult.rowCount} items in moderation queue.`);

    } catch (err) {
        console.error('Error closing reports:', err);
    }
};

closeAllReports().then(() => process.exit(0));
