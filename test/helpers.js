const { spawn } = require('child_process')
const path = require('path')
const { once } = require('events')
const process = require('process')
const HyperDHT = require('hyperdht')
const ProtomuxRpcRouter = require('protomux-rpc-router')
const { isBare } = require('which-runtime')
const { Server } = require('hyperdht-inspector')

const BIN = isBare
  ? path.join(__dirname, '..', 'bin-bare.js')
  : path.join(__dirname, '..', 'bin.js')

exports.createServer = async (t, bootstrap) => {
  const dht = new HyperDHT({
    bootstrap
  })
  await dht.fullyBootstrapped()
  const router = new ProtomuxRpcRouter()
  const inspector = new Server(router)
  const server = dht.createServer((stream) => inspector.handleConnection(stream))

  t.teardown(() => dht.destroy())
  t.teardown(() => router.close())

  await Promise.all([router.ready(), server.listen()])

  return server
}

exports.spawnCli = (t, ...args) => {
  const proc = spawn(process.execPath, [BIN, ...args])

  t.teardown(async () => {
    if (proc.exitCode === null && proc.signalCode === null) {
      const killed = once(proc, 'exit')
      proc.kill('SIGKILL')
      await killed
    }
  }, 10)

  process.once('exit', () => {
    if (proc.exitCode === null) proc.kill('SIGKILL')
  })

  return proc
}

exports.runCli = async (t, ...args) => {
  const proc = exports.spawnCli(t, ...args)

  let stdout = ''
  let stderr = ''

  proc.stdout.on('data', (data) => {
    stdout += data.toString()
  })

  proc.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  const [exitCode, signal] = await once(proc, 'close')

  return { exitCode, signal, stdout, stderr }
}

exports.waitForOutput = (proc, text) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${text}"`))
    }, 30_000)

    let output = ''
    proc.stdout.on('data', (data) => {
      output += data
      const line = output.split('\n').find((line) => line.includes(text))
      if (line) {
        clearTimeout(timer)
        resolve(line)
      }
    })
  })
}
