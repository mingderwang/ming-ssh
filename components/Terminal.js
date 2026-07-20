import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';

export default function Terminal({ output, onSend, onDisconnect }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [output]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ming-ssh Terminal</Text>
        <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.outputScroll}
        contentContainerStyle={styles.outputContent}
      >
        {output.map((line, i) => (
          <Text key={i} style={[styles.line, line.type === 'error' && styles.errorLine]}>
            {line.text}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          style={styles.input}
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
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
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
  disconnectText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  outputScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  outputContent: {
    paddingVertical: 8,
  },
  line: {
    color: '#d4d4d4',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  errorLine: {
    color: '#ff4444',
  },
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
  sendBtnText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
