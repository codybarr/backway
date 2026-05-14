# snapshot-history-navigation Specification

## Purpose
TBD - created by archiving change browse-archived-snapshots. Update Purpose after archive.
## Requirements
### Requirement: Capture requests create historical snapshot points
The system SHALL create a new snapshot record when a user submits a URL for capture from the home page, even when a completed snapshot already exists for the same normalized URL.

#### Scenario: Re-capturing an existing URL
- **WHEN** a user submits a URL that has an existing completed snapshot with the same normalized URL
- **THEN** the system creates a new snapshot with a distinct snapshot id
- **AND** the response identifies the new snapshot's metadata and view URLs

#### Scenario: First capture of a URL
- **WHEN** a user submits a URL that has no existing snapshots
- **THEN** the system creates a new snapshot record and queues processing as it does today

### Requirement: Snapshot view exposes previous timestamps for the same URL
The system SHALL provide a replay view that displays previous viewable snapshot timestamps for the current snapshot's normalized URL.

#### Scenario: Previous snapshots exist
- **WHEN** a user opens the replay view for a snapshot whose normalized URL has earlier viewable snapshots
- **THEN** the page displays those earlier snapshot creation timestamps in descending chronological order
- **AND** the list excludes the currently viewed snapshot

#### Scenario: No previous snapshots exist
- **WHEN** a user opens the replay view for a snapshot with no earlier viewable snapshots for the same normalized URL
- **THEN** the page displays an archive-history banner without timestamp links or with an explicit empty-state message

### Requirement: Timestamp links navigate to archived versions
Each previous snapshot timestamp in the history list SHALL link to that snapshot's replay view.

#### Scenario: User selects a previous timestamp
- **WHEN** a user clicks a timestamp for a previous snapshot
- **THEN** the browser navigates to `/snapshot/<previous-id>/view`
- **AND** the selected snapshot version is displayed

### Requirement: History controls use a top accordion banner
The system SHALL render the historical timestamp list in a top-of-page banner overlay that can expand and collapse like an accordion.

#### Scenario: User expands the history banner
- **WHEN** a user activates the history banner control
- **THEN** the page reveals the list of previous snapshot timestamps
- **AND** the archived page content remains visible below or behind the banner without losing the current replay context

#### Scenario: User collapses the history banner
- **WHEN** a user closes the expanded history banner
- **THEN** the timestamp list is hidden
- **AND** the user remains on the same snapshot replay page

### Requirement: Replay content remains isolated from navigation UI
The system SHALL keep Backway navigation UI separate from archived page content so that the history banner does not mutate stored snapshot HTML.

#### Scenario: Replay HTML is available
- **WHEN** a snapshot has stored HTML
- **THEN** the replay view displays the Backway history banner and renders the stored HTML as the archived page content

#### Scenario: Only screenshot fallback is available
- **WHEN** a snapshot has no stored HTML but has a screenshot fallback
- **THEN** the replay view displays the Backway history banner and renders the screenshot fallback as the archived page content

