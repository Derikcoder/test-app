# Styles Library

This folder now holds the reusable SCSS library for the client app.

## Structure

- `library/_states.scss` - page shells, loading states, empty states, error states
- `library/_utilities.scss` - text helpers, color helpers, sizing helpers
- `library/_components.scss` - reusable UI surfaces and semantic form classes (`profile-form-*`, `quote-review-*`, `modal-grid-input`)
- `shared.scss` - import wrapper used by the app bootstrap

## Usage

Import `src/styles/shared.scss` once from the app entrypoint. Add new reusable style primitives to the most specific partial possible so each file stays small and easy to scan.
