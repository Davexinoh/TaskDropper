IntercomDesk Skill Specification

Overview

IntercomDesk provides a structured workflow for handling user complaints through tickets instead of unstructured messages.

The system collects complaints, generates a ticket reference, and allows administrators to manage the ticket lifecycle.

---

Ticket Lifecycle

A ticket passes through several states:

pending → investigating → resolved / rejected

Timeline events are recorded whenever the ticket status changes.

---

Ticket Data Model

Each ticket contains:

- id (reference ID)
- category
- subIssue
- priority
- status
- description
- adminReply
- internalNote
- assignedTo
- tags
- attachments
- timeline
- messages

---

User Workflow

1. User selects a complaint category.
2. User selects the specific issue.
3. User sets priority.
4. User describes the problem.
5. Optional proof attachments are added.
6. The system generates a reference ID.
7. User can check status or continue chatting within the ticket.

---

Admin Workflow

1. Admin logs in using the admin key.
2. Admin views the ticket dashboard.
3. Admin selects a ticket.
4. Admin can:
   - change ticket status
   - reply to user
   - add internal notes
   - assign ticket to staff
   - add tags
5. Ticket timeline is updated automatically.

---

Admin Security

Admin endpoints require the header:

x-admin-key

The value must match the server's "ADMIN_KEY".

---

Storage

The backend uses SQLite to store:

- tickets
- ticket timeline
- chat messages
- attachments
- categories
- sub-issues

---

Intended Use

IntercomDesk can be used for:

- customer support systems
- product feedback collection
- bug reporting
- internal helpdesk tools

---

Key Advantages

- structured complaints instead of free text
- persistent ticket tracking
- admin control panel
- built-in communication thread
- simple deployment (GitHub Pages + Render)
