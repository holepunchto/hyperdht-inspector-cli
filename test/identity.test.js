const path = require('path')
const test = require('brittle')
const idEnc = require('hypercore-id-encoding')
const tmpDir = require('test-tmp')
const { runCli } = require('./helpers')

test('identity CLI', async (t) => {
  const dir = await tmpDir(t)
  const storage = path.join(dir, 'client')

  const first = await runCli(t, 'identity', '--storage', storage)
  const second = await runCli(t, 'identity', '--storage', storage)
  const firstKey = idEnc.decode(first.stdout.trim())
  const secondKey = idEnc.decode(second.stdout.trim())

  t.is(first.exitCode, 0, `first identity command exits successfully: ${first.stderr}`)
  t.is(second.exitCode, 0, `second identity command exits successfully: ${second.stderr}`)
  t.alike(firstKey, secondKey, 'identity is stable')
  t.is(firstKey.length, 32, 'prints a valid public key')
})
