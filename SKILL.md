# Intercom Desk – Agent Skill File

## Overview

Intercom Desk is a structured complaint intake interface built on the Intercom / Trac ecosystem.

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

Example request body:

{
  "category": "payment",
  "subIssue": "failed_transaction",
  "description": "My payment was deducted but not confirmed."
}

---

## Deployment

Live Demo:
https://intercom-desk.onrender.com

API Base:
https://intercom-desk.onrender.com/api

---

## Notes For Agents

Agents should:

1. Ask the user to choose a complaint category.
2. Ask the user to choose a specific sub-issue.
3. Collect a structured description of the problem.
4. Validate required fields before submitting.
5. Return confirmation with a reference ID.
