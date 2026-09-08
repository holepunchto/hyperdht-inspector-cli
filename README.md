# hyperdht-inspector-cli

Capture heap snapshots and CPU profiles from Node.js or Bare over an
authenticated HyperDHT connection. The target does not need an `--inspect`
flag, an HTTP inspector port, or a WebSocket bridge.

This package provides the command-line client for
[`hyperdht-inspector`](https://github.com/holepunchto/hyperdht-inspector). It
does not export the inspector client or server classes.

## Install

Install the CLI globally:

```sh
npm install --global hyperdht-inspector-cli
```

This installs two commands:

```text
hyperdht-inspector
hyperdht-inspector-bare
```

Use `hyperdht-inspector` with Node.js. Use `hyperdht-inspector-bare` with the
Bare runtime.

## Identity

Print the stable client public key:

```sh
hyperdht-inspector identity
```

The CLI stores its identity in `~/.hyperdht-inspector` by default. To use a
different directory, set `--storage`:

```sh
hyperdht-inspector identity --storage ./inspector-identity
```

The same storage directory always gives the same client public key. Add this
key to the inspector server allowlist before you connect.

## Heap snapshot

Capture a remote Chrome heap snapshot:

```sh
hyperdht-inspector heapdump <server-public-key> --out profile.heapsnapshot
```

The default output file is `profile.heapsnapshot`. Open it in the Chrome
DevTools **Memory** panel.

## CPU profile

Record and save a remote CPU profile:

```sh
hyperdht-inspector cpu-profile <server-public-key> --duration 30000 --out profile.cpuprofile
```

The default duration is 30 seconds. The default output file is
`profile.cpuprofile`. The command stops the profiler after the selected
duration, saves the file, and exits. Open the file in the Chrome DevTools
**Performance** panel.

## Command options

```text
hyperdht-inspector identity [--storage <path>]
hyperdht-inspector heapdump <server-public-key> [--out <filepath>]
hyperdht-inspector cpu-profile <server-public-key> [--duration <milliseconds>] [--out <filepath>]
```

The capture commands also accept these options:

```text
--storage <path>     Client identity directory (default: ~/.hyperdht-inspector)
--bootstrap <json>   JSON array of HyperDHT bootstrap nodes
```

For example, use a private test network as follows:

```sh
hyperdht-inspector heapdump <server-public-key> \
  --bootstrap '[{"host":"127.0.0.1","port":49737}]'
```

## Security

An allowed client can run inspector commands in the target process. Allow only
trusted client public keys. Keep the identity storage directory private. Do not
commit it to source control.

The application that uses `hyperdht-inspector` owns access control. It must
authenticate the remote client key, for example with RPC router middleware.

## Test

Run the Node.js integration tests and formatting check:

```sh
npm test
```

Run the same CLI integration tests with Bare:

```sh
npm run test:bare
```

The tests start a local HyperDHT network and an inspector server. They capture
real heap and CPU profile files and check the file data.

## License

Apache-2.0
