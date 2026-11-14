import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { createGameServer } from './server'

const env = (name: string): number | undefined => (process.env[name] ? Number(process.env[name]) : undefined)
const PORT = env('PORT') ?? 8080
/** Optional: where running games are written when the server stops, and read from when it starts. */
const SNAPSHOT_FILE = process.env.SNAPSHOT_FILE

const settings = Object.fromEntries(
  Object.entries({
    botDelayMs: env('BOT_DELAY_MS'),
    trickPauseMs: env('TRICK_PAUSE_MS'),
    maxRooms: env('MAX_ROOMS'),
    idleTimeoutMs: env('ROOM_IDLE_MS'),
  }).filter(([, v]) => v !== undefined && Number.isFinite(v)),
)

const server = createGameServer({ ...settings, trustProxy: process.env.TRUST_PROXY === '1' })

if (SNAPSHOT_FILE && existsSync(SNAPSHOT_FILE)) {
  try {
    server.rooms.restore(JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')))
    console.log(`restored ${server.rooms.roomCount} room(s) from ${SNAPSHOT_FILE}`)
  } catch (err) {
    console.error(`could not read ${SNAPSHOT_FILE}; starting without saved rooms`, err)
  }
  // Used up either way: a later crash must not bring back games from before this start.
  rmSync(SNAPSHOT_FILE, { force: true })
}

server.http.listen(PORT, () => {
  console.log(`Augury listening on http://localhost:${PORT}`)
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`  on your network: http://${net.address}:${PORT}`)
    }
  }
})

// As PID 1 in a container Node ignores SIGTERM unless handled. Rooms live in memory: with a
// snapshot file they are written out first, otherwise they end here.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (SNAPSHOT_FILE) {
      try {
        mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true })
        writeFileSync(SNAPSHOT_FILE, JSON.stringify(server.rooms.snapshot()))
        console.log(`saved ${server.rooms.roomCount} room(s) to ${SNAPSHOT_FILE}`)
      } catch (err) {
        console.error(`could not write ${SNAPSHOT_FILE}`, err)
      }
    }
    process.exit(0)
  })
}
