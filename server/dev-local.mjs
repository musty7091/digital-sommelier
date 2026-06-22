import { spawn } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'

const commands = [
  {
    name: 'IMAGE-API',
    command: 'node ./server/local-image-api.mjs',
  },
  {
    name: 'DB-API',
    command: 'node ./server/database-api.mjs',
  },
  {
    name: 'VITE',
    command: isWindows ? 'npm.cmd run dev' : 'npm run dev',
  },
]

const children = []

function start(commandInfo) {
  console.log(`[${commandInfo.name}] başlatılıyor: ${commandInfo.command}`)

  const child = spawn(commandInfo.command, [], {
    shell: true,
    stdio: 'inherit',
    windowsHide: false,
  })

  children.push(child)

  child.on('error', (error) => {
    console.error(`[${commandInfo.name}] başlatılamadı:`, error.message)
  })

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[${commandInfo.name}] ${code} koduyla kapandı.`)
    }

    if (signal) {
      console.log(`[${commandInfo.name}] ${signal} sinyaliyle kapandı.`)
    }
  })
}

for (const commandInfo of commands) {
  start(commandInfo)
}

function shutdown() {
  console.log('\nUygulama kapatılıyor...')

  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }

  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)