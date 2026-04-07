# Video Review UI Refresh Design

Date: 2026-04-07
Status: Proposed

## Summary

The existing live application is functional: admin login, project creation, video upload, secret customer links, time-based comments, and comment status tracking already work. This design focuses on a safe visual and UX refresh, not a platform rewrite.

The goal is to make the product feel more distinctive and easier to use, especially for customers leaving feedback. The chosen direction is a gentle redesign:

- keep the current backend and core behavior
- make the customer experience more creative and visually stronger
- make the admin experience cleaner and more efficient
- add a clearly visible, clickable timeline with comment markers
- let customers create comments either from the current playback position or by clicking directly on the timeline

## Goals

- Improve the visual quality of both customer and admin screens.
- Keep the existing production workflow stable.
- Make the video the clear center of the customer experience.
- Add a timeline UI that makes feedback positions obvious at a glance.
- Reduce friction for leaving and reviewing comments.
- Keep the implementation small enough to ship safely to the live Hetzner deployment.

## Non-Goals

- No backend rewrite.
- No database migration.
- No collaborative live cursors or multi-user presence.
- No frame-accurate annotation drawing layer in this phase.
- No threaded replies or emoji reactions in this phase.
- No full rebuild of routing, auth, or upload architecture.

## Product Direction

### Visual Thesis

Creative and distinctive, but still easy to understand. The customer side should feel more cinematic and present the video as the main object. The admin side should feel calmer and more operational, with better hierarchy and less visual noise.

### Content Plan

- Customer page: video first, then timeline, then comment action, then comment list
- Admin page: project overview first, then upload/share actions, then comment management

### Interaction Thesis

- Timeline markers should make feedback visible instantly.
- Clicking a marker or comment should jump the video to the right moment.
- Creating a comment should feel direct and low-friction.

## Existing Constraints

- The live product already uses timestamp-based comments from the backend.
- The current server endpoints are sufficient for the main redesign.
- The current production stack is Node + Express + static frontend build behind Nginx on Hetzner.
- The deployment must avoid risky infrastructure changes because other projects run on the same server.

## Chosen Approach

Use the current `AdminApp` and `ReviewApp` as the production base and upgrade them incrementally. Reuse selected interaction ideas from the older `VideoReviewPlatform.jsx` prototype, but do not transplant the full prototype into production.

This keeps the working data flow intact while letting the UI become much stronger.

## Customer Experience Design

### Layout

- Large primary video area on the left
- Comment column on the right
- Prominent timeline directly under the video
- Comment composer close to the timeline so the action feels connected to the playback position

On mobile:

- video first
- timeline second
- comment composer third
- comments list last

### Customer Visual Style

- Darker, cinematic video stage
- Stronger contrast between video area and surrounding interface
- More distinctive typography and accents
- Cleaner spacing and grouping so the page still feels simple

The redesign should avoid generic SaaS cards everywhere. The video area should feel like the main stage, while the comment area remains practical and readable.

### Timeline Behavior

The timeline becomes a first-class interaction area.

- Show current playback progress.
- Show comment markers at their saved `timeSec`.
- Show hover feedback so users understand where they are about to jump.
- Clicking the timeline seeks the video to that time.
- Clicking a marker seeks the video to the linked comment.

### Comment Creation

The customer can create a comment in two ways:

1. Pause or scrub the video, then add a comment at the current position.
2. Click directly on the timeline, then add a comment at that selected position.

Behavior details:

- The selected timestamp is always visible before submitting.
- Submitting a comment posts the existing payload shape: `authorName`, `text`, `timeSec`.
- After submit, the comment list refreshes and the new marker appears immediately.
- The list remains sorted by time.

### Comment List

- Each comment clearly shows author, time, status, and text.
- Clicking a comment jumps playback to that point.
- The active or selected comment should be visually highlighted.
- Resolved comments should remain visible but visually calmer than open comments.

## Admin Experience Design

### Layout

The admin side remains an operational workspace, not a marketing surface.

- Top section for login, project creation, and quick actions
- Clear project list with stronger hierarchy
- Better upload affordance
- Comment management panel with easier scanning

### Admin Visual Style

- Cleaner spacing
- Better visual grouping
- More confidence in actions like upload, copy link, open customer view
- Same visual family as the customer side, but quieter and more utilitarian

### Admin Interactions

- Projects should display video presence and open comment counts more clearly.
- Upload actions should look deliberate instead of like a plain browser file control dropped into the page.
- Feedback states such as copy success, upload success, and errors should be clearer than browser alerts.
- The admin detail area will include a compact video preview for the selected project.
- Clicking an admin comment will jump that preview to the matching video position.

## Technical Design

### Frontend Structure

Primary files affected:

- `src/ReviewApp.jsx`
- `src/AdminApp.jsx`
- `src/index.css`
- `src/api.js`

Potential extraction if the code starts to grow:

- small shared button/input primitives
- a shared timeline component
- small comment item components

### Data Model

Keep the current backend contract.

Project data already contains:

- `id`
- `title`
- `shareToken`
- `video`
- comment counts

Comment data already contains:

- `id`
- `authorName`
- `timeSec`
- `text`
- `status`
- `createdAt`

No schema change is required for the core redesign.

### Timeline Rendering Strategy

Use the existing video duration on the client and calculate marker positions as:

- `leftPercent = (comment.timeSec / duration) * 100`

For timeline click:

- capture click position inside the track
- convert that position into seconds using the current video duration
- seek video to that time
- store that time in local UI state as the pending comment timestamp

This keeps the feature lightweight and avoids backend changes.

The admin video preview can reuse the existing share-token video route because the admin project list already contains the `shareToken`.

### Error Handling

- Keep current API error behavior.
- Improve UI messaging for failed fetch, failed upload, and failed comment submission.
- Do not hide comments or controls when refresh fails; show the error and keep context visible.

### Responsive Behavior

- Desktop: split layout with video left and comments right
- Tablet: reduced split but still timeline-forward
- Mobile: single-column stack with video and timeline first

The timeline must remain usable with touch input.

### Accessibility

- Timeline markers must have visible focus states.
- Comment actions must remain keyboard reachable.
- Time information should not be color-only.
- Contrast must stay readable over darker video-stage backgrounds.

### Testing Strategy

Implementation should cover:

- timeline marker placement from comment timestamps
- clicking the timeline updates selected playback time
- clicking a comment or marker seeks the video
- submitting a comment uses the intended timestamp
- customer and admin screens still render with existing API responses

Manual verification should include:

- desktop and mobile layouts
- upload still works
- customer link still loads
- comments still persist
- resolved/open toggles still work

## Rollout Plan

Ship as a frontend-only refresh first, using the current backend behavior.

Suggested order:

1. Restyle customer layout
2. Add timeline interaction and markers
3. Improve customer comment flow
4. Restyle admin layout
5. Improve admin feedback states
6. Verify locally
7. Deploy carefully to Hetzner and smoke-test the live domain

## Risks and Mitigations

### Risk: UI code grows messy quickly

Mitigation:

- extract small timeline or comment subcomponents when needed
- avoid copying the full legacy prototype into production

### Risk: Timeline behavior feels confusing

Mitigation:

- always show the selected time clearly
- keep one obvious primary action for adding comments

### Risk: Visual redesign harms usability

Mitigation:

- prioritize readability and hierarchy over decoration
- keep the video and core actions visually dominant

### Risk: Live regressions during deploy

Mitigation:

- avoid backend contract changes
- verify locally first
- deploy as a normal frontend rebuild with the existing server process

## Acceptance Criteria

- The customer page feels visibly more polished and distinctive.
- The admin page feels cleaner and easier to scan.
- Customers can add comments both from the current playback position and by clicking the timeline.
- Comment markers are visible on the timeline.
- Clicking markers and comment entries jumps to the correct video position.
- Existing upload, secret-link sharing, comment storage, and status updates still work.
