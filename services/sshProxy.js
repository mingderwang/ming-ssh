export default class SSHProxy {
  constructor(proxyUrl) {
    this.proxyUrl = proxyUrl;
    this.ws = null;
    this.onOutput = null;
    this.onClose = null;
    this.onError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(config) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.proxyUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.ws.send(JSON.stringify({
            type: 'connect',
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
          }));
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'connected':
                resolve();
                break;
              case 'output':
                if (this.onOutput) this.onOutput(msg.data);
                break;
              case 'error':
                if (msg.stage === 'connect') {
                  reject(new Error(msg.data));
                } else if (this.onError) {
                  this.onError(msg.data);
                }
                break;
              case 'closed':
                if (this.onClose) this.onClose(msg.reason);
                break;
            }
          } catch (e) {
            if (this.onOutput) this.onOutput(event.data);
          }
        };

        this.ws.onerror = (error) => {
          if (this.onError) this.onError('WebSocket error: ' + (error.message || 'connection failed'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          if (this.onClose && !event.wasClean) {
            this.onClose('Connection lost');
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendCommand(command) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        data: command,
      }));
    }
  }

  sendResize(cols, rows) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'resize',
        cols,
        rows,
      }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'disconnect' }));
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
