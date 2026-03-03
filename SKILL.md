# Intercom Desk – Agent Skill File

## Overview

Intercom Desk is a structured complaint handling interface built on the Intercom ecosystem.

It allows users to:
- Select complaint categories
- Drill down into sub-issues
- Submit structured complaints
- Receive guided support flows

This replaces unstructured support messaging with a guided, categorized interaction model.

---

## Capabilities

- List complaint categories
- Fetch sub-issues based on category
- Submit structured complaint data
- Validate required complaint fields
- Return confirmation responses

---

## API Endpoints

### GET /api/categories
Returns available complaint categories.

### GET /api/categories/:id
Returns sub-issues under selected category.

### POST /api/complaints
Submits a structured complaint.

Body example:

{
  "category": "payment",
  "subIssue": "failed_transaction",
  "description": "My payment was deducted but not confirmed."
}

---

## How To Run

1. Install dependencies:
   npm install

2. Start backend:
   node api/server.js

3. Start frontend:
   cd web
   npm install
   npm run dev

Frontend default: http://localhost:5173  
API default: http://localhost:3001

---

## Deployment

Frontend: https://intercomdesk.netlify.app  
API: https://intercom-desk.onrender.com

---

## Notes For Agents

Agents should:
- Always request category first
- Then request sub-issue
- Then collect structured description
- Validate required fields before submission
- Return confirmation with reference ID
