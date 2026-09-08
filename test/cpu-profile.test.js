const { once } = require('events')
const fs = require('fs/promises')
const path = require('path')
const test = require('brittle')
const createTestnet = require('hyperdht/testnet')
const idEnc = require('hypercore-id-encoding')
const tmpDir = require('test-tmp')
const { createServer, spawnCli, waitForOutput } = require('./helpers')

test('cpu-profile CLI', async (t) => {
  const dir = await tmpDir(t)
  const { bootstrap } = await createTestnet(10, t.teardown)
  const server = await createServer(t, bootstrap)
  const profilePath = path.join(dir, 'target.cpuprofile')

  const profile = spawnCli(
    t,
    'cpu-profile',
    idEnc.normalize(server.publicKey),
    '--out',
    profilePath,
    '--storage',
    path.join(dir, 'client'),
    '--bootstrap',
    JSON.stringify(bootstrap),
    '--duration',
    '100'
  )
  let stderr = ''
  profile.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  const started = JSON.parse(await waitForOutput(profile, 'CPU profiler started'))
  t.is(started.filepath, profilePath, 'reports when recording has started')
  t.is(started.duration, 100, 'reports the sampling duration in milliseconds')

  const [exitCode] = await once(profile, 'close')
  t.is(exitCode, 0, `exits automatically after the sampling duration: ${stderr}`)

  const cpuProfile = JSON.parse(await fs.readFile(profilePath, 'utf8'))
  t.ok(cpuProfile.nodes.length > 0, 'writes a parseable Chrome CPU profile')
  t.ok(cpuProfile.endTime >= cpuProfile.startTime, 'profile contains a valid time range')
  t.is(cpuProfile.samples.length, cpuProfile.timeDeltas.length, 'sample timings are complete')
})
