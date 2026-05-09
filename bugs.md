- `BUG-009`: the Apply Access success message uses generic wording instead of the submitted address.

- `BUG-010`: notification controls are not properly interactable, and the digest action lacks clear success feedback.

- `BUG-011`: security controls have accessibility/input issues, including an unlabeled visibility toggle and a 2FA checkbox that is not manually interactable.

- `BUG-012`: console/runtime stability issues are present, including proxy errors and Google Maps load failures.

- `BUG-QA-001`: Settings browser notifications and sound alerts cannot be activated normally; LE detail `Publish` and `Fuzz` toggles do work.

- `BUG-QA-002`: a newly created law-enforcement account is blocked at login as pending approval while the same account shows as `ACTIVE` in `/users`.

- `BUG-QA-003`: after LE login, the shell still shows Moderator dashboard items and exposes the wrong sidebar entries.

- `BUG-QA-004`: LE queue filtering is inconsistent: stale detail remains visible after filters change, and `All Active` includes closed incidents.
