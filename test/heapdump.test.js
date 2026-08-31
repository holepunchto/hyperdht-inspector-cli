const fs = require('fs/promises')
const path = require('path')
const test = require('brittle')
const createTestnet = require('hyperdht/testnet')
const idEnc = require('hypercore-id-encoding')
const tmpDir = require('test-tmp')
const { createServer, runCli } = require('./helpers')

test('heapdump CLI', async (t) => {
  const dir = await tmpDir(t)
  const { bootstrap } = await createTestnet(10, t.teardown)
  const server = await createServer(t, bootstrap)
  const snapshotPath = path.join(dir, 'target.heapsnapshot')
  const completed = await runCli(
    t,
    'heapdump',
    idEnc.normalize(server.publicKey),
    '--out',
    snapshotPath,
    '--storage',
    path.join(dir, 'client'),
    '--bootstrap',
    JSON.stringify(bootstrap)
  )
  t.is(completed.exitCode, 0, `heapdump exits successfully: ${completed.stderr}`)

  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
  t.ok(snapshot.snapshot, 'writes parseable heap-snapshot JSON')
  t.ok(snapshot.nodes.length > 0, 'heap snapshot contains nodes')
})
