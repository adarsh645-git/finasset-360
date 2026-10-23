## REMOVED Requirements

### Requirement: The home page is an interim page while the app is rebuilt
**Reason**: The Overview replaces the interim "Being rebuilt" page at `/` (this change's ticket 5).

**Migration**: The signed-out redirect (CI-02) is kept by the `(app)` layout's session guard and tested as SH-01/CI-02.
