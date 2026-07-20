const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');

const PORT = process.env.PORT || 3001;

const wss = new WebSocketServer({ port: PORT });

console.log(`[ming-ssh proxy] Listening on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[ming-ssh proxy] New client connected');
  let sshClient = null;
  let sshStream = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      if (sshStream) sshStream.write(raw.toString());
      return;
    }

    switch (msg.type) {
      case 'connect':
        sshClient = new Client();

        sshClient.on('ready', () => {
          console.log(`[ming-ssh proxy] SSH connected to ${msg.host}:${msg.port}`);
          ws.send(JSON.stringify({ type: 'connected' }));

          sshClient.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
            if (err) {
              ws.send(JSON.stringify({ type: 'error', stage: 'shell', data: err.message }));
              return;
            }

            sshStream = stream;

            stream.on('data', (data) => {
              ws.send(JSON.stringify({ type: 'output', data: data.toString('utf-8') }));
            });

            stream.stderr.on('data', (data) => {
              ws.send(JSON.stringify({ type: 'output', data: data.toString('utf-8') }));
            });

            stream.on('close', () => {
              ws.send(JSON.stringify({ type: 'closed', reason: 'Shell closed' }));
              cleanup();
            });
          });
        });

        sshClient.on('error', (err) => {
          console.error('[ming-ssh proxy] SSH error:', err.message);
          ws.send(JSON.stringify({ type: 'error', stage: 'connect', data: err.message }));
          cleanup();
        });

        sshClient.on('close', () => {
          ws.send(JSON.stringify({ type: 'closed', reason: 'SSH connection closed' }));
          cleanup();
        });

        sshClient.connect({
          host: msg.host,
          port: msg.port,
          username: msg.username,
          password: msg.password,
          readyTimeout: 10000,
          algorithms: {
            kex: [
              'ecdh-sha2-nistp256',
              'ecdh-sha2-nistp384',
              'ecdh-sha2-nistp521',
              'diffie-hellman-group-exchange-sha256',
              'diffie-hellman-group14-sha256',
              'diffie-hellman-group14-sha1',
            ],
          },
        });
        break;

      case 'command':
        if (sshStream) {
          sshStream.write(msg.data + '\n');
        }
        break;

      case 'raw':
        if (sshStream) {
          sshStream.write(msg.data);
        }
        break;

      case 'resize':
        if (sshStream) {
          sshStream.setWindow(msg.rows, msg.cols, 0, 0);
        }
        break;

      case 'disconnect':
        cleanup();
        break;
    }
  });

  ws.on('close', () => {
    console.log('[ming-ssh proxy] Client disconnected');
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[ming-ssh proxy] WebSocket error:', err.message);
    cleanup();
  });

  function cleanup() {
    if (sshStream) {
      sshStream.close();
      sshStream = null;
    }
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
  }
});
