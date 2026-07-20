import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import ConnectionForm from './components/ConnectionForm';
import Terminal from './components/Terminal';
import SSHProxy from './services/sshProxy';

export default function App() {
  const [screen, setScreen] = useState('form'); // 'form' | 'terminal'
  const [output, setOutput] = useState([]);
  const [connected, setConnected] = useState(false);
  const proxyRef = useRef(null);

  const addOutput = useCallback((text, type = 'normal') => {
    setOutput((prev) => [...prev, { text, type, id: Date.now() + Math.random() }]);
  }, []);

  const handleConnect = useCallback(async (config) => {
    const proxy = new SSHProxy(config.proxyUrl);
    proxyRef.current = proxy;

    proxy.onOutput = (data) => {
      addOutput(data);
    };

    proxy.onClose = (reason) => {
      addOutput(`\n[Disconnected: ${reason}]`, 'error');
      setConnected(false);
    };

    proxy.onError = (msg) => {
      addOutput(`[Error: ${msg}]`, 'error');
    };

    try {
      addOutput(`Connecting to ${config.host}:${config.port} as ${config.username}...`);
      await proxy.connect(config);
      addOutput(`Connected to ${config.host}\n`);
      setConnected(true);
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
    setConnected(false);
    setOutput([]);
    setScreen('form');
  }, []);

  useEffect(() => {
    return () => {
      if (proxyRef.current) {
        proxyRef.current.disconnect();
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {screen === 'form' ? (
        <ConnectionForm onConnect={handleConnect} />
      ) : (
        <Terminal
          output={output}
          onSend={handleSend}
          onDisconnect={handleDisconnect}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
});
