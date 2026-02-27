# TaskDropper 📋

A minimal peer-to-peer task board built on [Intercom](https://github.com/Trac-Systems/intercom) — the Trac Network stack for autonomous agents.

> This app is based on upstream Intercom: https://github.com/Trac-Systems/intercom

Post tasks to a shared P2P sidechannel, claim them, and mark them done. No server, no database, no central authority. Just peers.

---

## What it does

- **Post** a task to the shared `taskdropper` sidechannel
- **List** all open tasks seen on the channel
- **Claim** a task (broadcasts your peer pubkey as the claimer)
- **Done** — mark a task complete

All messages are signed and routed over Hyperswarm/HyperDHT via Intercom sidechannels.

---

## Install

```bash
git clone https://github.com/Davexinoh/taskdropper
cd taskdropper
npm install
Requires Pear Runtime and Node.js 20+.
Bootstrap (first time only):
bash scripts/bootstrap.sh
Run
node index.js
Commands available in the interactive prompt:
Command
Description
post <description>
Post a new task
list
List all tasks
claim <taskId>
Claim an open task
done <taskId>
Mark a task as complete
help
Show available commands
exit
Quit
Architecture
TaskDropper uses a single Intercom sidechannel (taskdropper) as a shared broadcast bus. Each peer:
Joins the taskdropper sidechannel on startup
Maintains a local in-memory task list, updated from incoming messages
Signs all outbound task events with the peer's Noise keypair
Message kinds:
task.post — new task announcement
task.claim — claim intent
task.done — completion notice
Skill file
See SKILL.md for agent instructions.
Trac Address
trac1v3u8ac33q9m6hsr4jvznfcknhmdl0p6tgjly0vjw9jt5998mmknst95kw6
