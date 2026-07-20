import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';

// ─── SSHProxy Service ───────────────────────────────────────────────
class SSHProxy {
  constructor(proxyUrl) {
    this.proxyUrl = proxyUrl;
    this.ws = null;
    this.onOutput = null;
    this.onClose = null;
    this.onError = null;
  }

  connect(config) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.proxyUrl);

        this.ws.onopen = () => {
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
          if (this.onError) this.onError('WebSocket error: connection failed');
          reject(error);
        };

        this.ws.onclose = () => {
          if (this.onClose) this.onClose('Connection lost');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  sendCommand(command) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'command', data: command }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'disconnect' }));
      this.ws.close();
      this.ws = null;
    }
  }
}

// ─── ConnectionForm Component ───────────────────────────────────────
function ConnectionForm({ onConnect }) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [proxyUrl, setProxyUrl] = useState('ws://localhost:3001');

  const handleConnect = () => {
    if (!host || !username) return;
    onConnect({ host, port: parseInt(port), username, password, proxyUrl });
  };

  return (
    <KeyboardAvoidingView
      style={formStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={formStyles.title}>ming-ssh</Text>
      <Text style={formStyles.subtitle}>SSH Terminal Client</Text>

      <View style={formStyles.form}>
        <Text style={formStyles.label}>Proxy Server</Text>
        <TextInput
          style={formStyles.input}
          value={proxyUrl}
          onChangeText={setProxyUrl}
          placeholder="ws://localhost:3001"
          placeholderTextColor="#555"
          autoCapitalize="none"
        />

        <Text style={formStyles.label}>Host</Text>
        <TextInput
          style={formStyles.input}
          value={host}
          onChangeText={setHost}
          placeholder="192.168.1.100"
          placeholderTextColor="#555"
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={formStyles.label}>Port</Text>
        <TextInput
          style={formStyles.input}
          value={port}
          onChangeText={setPort}
          placeholder="22"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />

        <Text style={formStyles.label}>Username</Text>
        <TextInput
          style={formStyles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="root"
          placeholderTextColor="#555"
          autoCapitalize="none"
        />

        <Text style={formStyles.label}>Password</Text>
        <TextInput
          style={formStyles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#555"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={formStyles.button} onPress={handleConnect}>
          <Text style={formStyles.buttonText}>Connect</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const formStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00ff41',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {},
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
    color: '#e0e0e0',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#00ff41',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#0f0f23',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

// ─── Terminal Component ─────────────────────────────────────────────
function Terminal({ output, onSend, onDisconnect }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current.scrollToEnd({ animated: false }), 50);
    }
  }, [output]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    Keyboard.dismiss();
  };

  return (
    <View style={termStyles.container}>
      <View style={termStyles.header}>
        <Text style={termStyles.headerTitle}>ming-ssh Terminal</Text>
        <TouchableOpacity style={termStyles.disconnectBtn} onPress={onDisconnect}>
          <Text style={termStyles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={termStyles.outputScroll}
        contentContainerStyle={termStyles.outputContent}
      >
        {output.map((line, i) => (
          <Text key={i} style={[termStyles.line, line.type === 'error' && termStyles.errorLine]}>
            {line.text}
          </Text>
        ))}
      </ScrollView>

      <View style={termStyles.inputBar}>
        <Text style={termStyles.prompt}>$</Text>
        <TextInput
          style={termStyles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          placeholder="Type command..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity style={termStyles.sendBtn} onPress={handleSend}>
          <Text style={termStyles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const termStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#12122a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#00ff41',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  disconnectBtn: {
    backgroundColor: '#ff4444',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  outputScroll: { flex: 1, paddingHorizontal: 12 },
  outputContent: { paddingVertical: 8 },
  line: {
    color: '#d4d4d4',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  errorLine: { color: '#ff4444' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#12122a',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  prompt: {
    color: '#00ff41',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  input: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: '#00ff41',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  sendBtnText: { color: '#0f0f23', fontWeight: 'bold', fontSize: 14 },
});

// ─── App ────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('form');
  const [output, setOutput] = useState([]);
  const proxyRef = useRef(null);

  const addOutput = useCallback((text, type = 'normal') => {
    setOutput((prev) => [...prev, { text, type, id: Date.now() + Math.random() }]);
  }, []);

  const handleConnect = useCallback(async (config) => {
    const proxy = new SSHProxy(config.proxyUrl);
    proxyRef.current = proxy;

    proxy.onOutput = (data) => addOutput(data);
    proxy.onClose = (reason) => {
      addOutput(`\n[Disconnected: ${reason}]`, 'error');
    };
    proxy.onError = (msg) => addOutput(`[Error: ${msg}]`, 'error');

    try {
      addOutput(`Connecting to ${config.host}:${config.port} as ${config.username}...`);
      await proxy.connect(config);
      addOutput(`Connected to ${config.host}\n`);
      setScreen('terminal');
    } catch (error) {
      addOutput(`Connection failed: ${error.message}`, 'error');
    }
  }, [addOutput]);

  const handleSend = useCallback((command) => {
    if (proxyRef.current) {
      addOutput(`$ ${command}`);
      proxyRef.current.sendCommand(command);
    }
  }, [addOutput]);

  const handleDisconnect = useCallback(() => {
    if (proxyRef.current) {
      proxyRef.current.disconnect();
      proxyRef.current = null;
    }
    setOutput([]);
    setScreen('form');
  }, []);

  useEffect(() => {
    return () => { if (proxyRef.current) proxyRef.current.disconnect(); };
  }, []);

  return (
    <SafeAreaView style={appStyles.container}>
      <StatusBar style="light" />
      {screen === 'form' ? (
        <ConnectionForm onConnect={handleConnect} />
      ) : (
        <Terminal output={output} onSend={handleSend} onDisconnect={handleDisconnect} />
      )}
    </SafeAreaView>
  );
}

const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
});
