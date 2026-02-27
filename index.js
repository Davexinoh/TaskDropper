#!/usr/bin/env node
'use strict'

/**
 * TaskDropper — a minimal P2P task board on Intercom/Trac Network.
 * Upstream Intercom: https://github.com/Trac-Systems/intercom
 */

const Hyperswarm = require('hyperswarm')
const crypto = require('crypto')
const readline = require('readline')

const CHANNEL = process.env.TASKDROPPER_CHANNEL || 'taskdropper'
const CHANNEL_TOPIC = crypto.createHash('sha256').update(CHANNEL).digest()

const tasks = new Map()
const peers = new Set()
let swarm = null
let myPubkey = null

function uuid () {
  return crypto.randomBytes(6).toString('hex')
}

function now () {
  return Math.floor(Date.now() / 1000)
}

function broadcast (msg) {
  const data = Buffer.from(JSON.stringify(msg))
  for (const conn of peers) {
    try { conn.write(data) } catch (_) {}
  }
}

function applyMessage (msg) {
  if (!msg || !msg.kind) return
  if (msg.kind === 'task.post') {
    if (!tasks.has(msg.taskId)) {
      tasks.set(msg.taskId, {
        taskId: msg.taskId,
        description: msg.description,
        status: 'open',
        poster: msg.poster,
        postedAt: msg.postedAt,
        claimer: null,
        completedBy: null
      })
    }
  }
  if (msg.kind === 'task.claim') {
    const t = tasks.get(msg.taskId)
    if (t && t.status === 'open') {
      t.status = 'claimed'
      t.claimer = msg.claimer
    }
  }
  if (msg.kind === 'task.done') {
    const t = tasks.get(msg.taskId)
    if (t) {
      t.status = 'done'
      t.completedBy = msg.completedBy
    }
  }
}

function cmdPost (args) {
  const description = args.join(' ').trim()
  if (!description) return console.log('Usage: post <description>')
  const msg = {
    kind: 'task.post',
    taskId: uuid(),
    description,
    poster: myPubkey,
    postedAt: now()
  }
  applyMessage(msg)
  broadcast(msg)
  console.log(`\n✅ Task posted [${msg.taskId}]: "${description}"\n`)
}

function cmdList () {
  if (tasks.size === 0) {
    console.log('\n  (no tasks yet — be the first to post one!)\n')
    return
  }
  console.log('\n─── Tasks ───────────────────────────────────────')
  for (const t of tasks.values()) {
    const icon = t.status === 'done' ? '✓' : t.status === 'claimed' ? '⚡' : '○'
    const claimerInfo = t.claimer ? `  claimed by ${t.claimer.slice(0, 10)}…` : ''
    console.log(`  ${icon} [${t.taskId}] ${t.description}${claimerInfo}`)
  }
  console.log('─────────────────────────────────────────────────\n')
}

function cmdClaim (args) {
  const taskId = args[0]
  if (!taskId) return console.log('Usage: claim <taskId>')
  const t = tasks.get(taskId)
  if (!t) return console.log(`Task ${taskId} not found.`)
  if (t.status !== 'open') return console.log(`Task ${taskId} is already ${t.status}.`)
  const msg = { kind: 'task.claim', taskId, claimer: myPubkey, claimedAt: now() }
  applyMessage(msg)
  broadcast(msg)
  console.log(`\n⚡ Claimed task [${taskId}]\n`)
}

function cmdDone (args) {
  const taskId = args[0]
  if (!taskId) return console.log('Usage: done <taskId>')
  const t = tasks.get(taskId)
  if (!t) return console.log(`Task ${taskId} not found.`)
  if (t.status === 'done') return console.log(`Task ${taskId} is already done.`)
  const msg = { kind: 'task.done', taskId, completedBy: myPubkey, completedAt: now() }
  applyMessage(msg)
  broadcast(msg)
  console.log(`\n✓ Marked task done [${taskId}]\n`)
}

function cmdHelp () {
  console.log(`
  Commands:
    post <description>   Post a new task
    list                 List all tasks
    claim <taskId>       Claim an open task
    done <taskId>        Mark a task as complete
    help                 Show this help
    exit                 Quit
`)
}

async function start () {
  swarm = new Hyperswarm()
  myPubkey = swarm.keyPair.publicKey.toString('hex')

  swarm.on('connection', (conn) => {
    peers.add(conn)
    conn.on('data', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        applyMessage(msg)
      } catch (_) {}
    })
    conn.on('close', () => peers.delete(conn))
    conn.on('error', () => peers.delete(conn))
  })

  await swarm.join(CHANNEL_TOPIC, { server: true, client: true })
  await swarm.flush()

  console.log(`
╔══════════════════════════════════════════╗
║          TaskDropper  📋                 ║
║   P2P Task Board on Intercom/Trac        ║
╚══════════════════════════════════════════╝

  Channel : ${CHANNEL}
  Peer ID : ${myPubkey.slice(0, 16)}…
  Peers   : ${peers.size} connected

  Type "help" for commands.
`)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'taskdropper> '
  })
  rl.prompt()

  rl.on('line', (line) => {
    const parts = line.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)
    switch (cmd) {
      case 'post':  cmdPost(args);  break
      case 'list':  cmdList();      break
      case 'claim': cmdClaim(args); break
      case 'done':  cmdDone(args);  break
      case 'help':  cmdHelp();      break
      case 'exit':
        console.log('Goodbye 👋')
        swarm.destroy().then(() => process.exit(0))
        return
      case '': break
      default:
        console.log(`Unknown command: "${cmd}". Type "help".`)
    }
    rl.prompt()
  })

  rl.on('close', () => {
    swarm.destroy().then(() => process.exit(0))
  })
}

start().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
