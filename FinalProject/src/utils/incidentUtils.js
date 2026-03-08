/**
 * Converts closure_details (which may arrive as a raw object from the API)
 * to a human-readable string safe for rendering as a React child.
 *
 * @param {string|object|null|undefined} closureDetails
 * @returns {string}
 */
export function normalizeClosureDetails(closureDetails) {
  if (!closureDetails) {
    return '';
  }

  if (typeof closureDetails === 'string') {
    return closureDetails;
  }

  if (typeof closureDetails !== 'object') {
    return String(closureDetails);
  }

  const publicDetails = [
    closureDetails.case_id ? `Case ID: ${closureDetails.case_id}` : '',
    closureDetails.officer_notes ? String(closureDetails.officer_notes).trim() : '',
  ].filter(Boolean);

  return publicDetails.join(' • ');
}
