#!/usr/bin/env node

const Corestore = require('corestore')
const { createWriteStream } = require('fs')
const { writeFile } = require('fs/promises')
const goodbye = require('graceful-goodbye')
const HyperDHT = require('hyperdht')
const idEnc = require('hypercore-id-encoding')
const os = require('os')
const path = require('path')
const pino = require('pino')
const process = require('process')
const { command, flag, arg, summary, header } = require('paparam')
const { Client } = require('hyperdht-inspector')

const DEFAULT_STORAGE = path.join(os.homedir(), '.hyperdht-inspector')
const logger = pino()
const storageFlag = () =>
  flag('--storage|-s [path]', `Identity storage path (default: ${DEFAULT_STORAGE})`)
const bootstrapFlag = () =>
  flag('--bootstrap [bootstrap]', 'JSON array of HyperDHT bootstrap nodes')

const identityCmd = command(
  'identity',
  summary('Print the stable client identity for a server allowlist'),
  storageFlag(),
  async ({ flags }) => {
    const { store, keyPair } = await openIdentity(flags.storage)
    process.stdout.write(`${idEnc.normalize(keyPair.publicKey)}\n`)
    await store.close()
  }
)

const heapdumpCmd = command(
  'heapdump',
  summary('Capture a remote Chrome heap snapshot'),
  arg('<server-public-key>', 'Inspector server public key'),
  flag('--out <filepath>', 'Heap snapshot output path').default('profile.heapsnapshot'),
  storageFlag(),
  bootstrapFlag(),
  async ({ args, flags }) => {
    const serverPublicKey = idEnc.decode(args.serverPublicKey)
    const filepath = path.resolve(flags.out)
    const output = createWriteStream(filepath)
    const client = await openClient(flags, serverPublicKey)

    client.on('HeapProfiler.addHeapSnapshotChunk', (notification) => {
      output.write(notification.params.chunk)
    })

    await client.ready()
    const result = await client.post('HeapProfiler.takeHeapSnapshot')
    logger.info({ result }, 'HeapProfiler.takeHeapSnapshot done')
    await new Promise((resolve) => output.end(resolve))
    goodbye.exit()
  }
)

const cpuProfileCmd = command(
  'cpu-profile',
  summary('Record a remote CPU profile for a fixed duration'),
  arg('<server-public-key>', 'Inspector server public key'),
  flag('--out <filepath>', 'CPU profile output path').default('profile.cpuprofile'),
  flag('--duration <seconds>', 'CPU sampling duration in seconds').default(30),
  storageFlag(),
  bootstrapFlag(),
  async ({ args, flags }) => {
    const serverPublicKey = idEnc.decode(args.serverPublicKey)
    const filepath = path.resolve(flags.out)
    const duration = Number(flags.duration)

    const client = await openClient(flags, serverPublicKey)

    logger.info('Connecting to inspector server')
    await client.ready()
    await client.post('Profiler.enable')
    await client.post('Profiler.start')
    logger.info({ filepath, duration }, 'CPU profiler started')

    await new Promise((resolve) => setTimeout(resolve, duration * 1000))

    const result = await client.post('Profiler.stop')
    await writeFile(filepath, JSON.stringify(result.profile))
    logger.info({ filepath }, 'CPU profile saved')
    goodbye.exit()
  }
)

const cmd = command(
  'hyperdht-inspector',
  header('Capture Node.js or Bare profiles over an authenticated HyperDHT connection'),
  identityCmd,
  heapdumpCmd,
  cpuProfileCmd
)

cmd.parse()

async function openIdentity(storagePath) {
  const storage = storagePath ? path.resolve(storagePath) : DEFAULT_STORAGE
  const store = new Corestore(storage)

  await store.ready()
  return {
    store,
    keyPair: await store.createKeyPair('hyperdht-inspector-client-identity')
  }
}

async function openClient(flags, serverPublicKey) {
  const { store, keyPair } = await openIdentity(flags.storage)
  const dht = new HyperDHT({
    keyPair,
    bootstrap: flags.bootstrap ? JSON.parse(flags.bootstrap) : undefined
  })
  const client = new Client(dht, serverPublicKey)

  goodbye(() => client.close(), 0)
  goodbye(() => dht.destroy(), 1)
  goodbye(() => store.close(), 2)

  return client
}
