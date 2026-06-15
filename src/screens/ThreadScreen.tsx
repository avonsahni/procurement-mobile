import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Thread'>;

interface Message {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ThreadScreen({ route }: Props) {
  const { threadId, channelId } = route.params;
  const { user } = useAuth();
  const writable = canWrite(user?.role);

  const [messages, setMessages] = useState<Message[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);
  // Keep a live ref of known names so the realtime callback resolves without stale closures.
  const namesRef = useRef<Record<string, string>>({});
  namesRef.current = names;

  // Resolve display names for any author_ids we don't already know.
  const resolveNames = useCallback(async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter(id => id && !(id in namesRef.current));
    if (missing.length === 0) return;
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', missing);
    const add: Record<string, string> = {};
    (data || []).forEach((p: any) => { add[p.id] = p.full_name || 'Unknown'; });
    missing.forEach(id => { if (!(id in add)) add[id] = 'Unknown'; });
    setNames(prev => ({ ...prev, ...add }));
  }, []);

  // Append a message if it isn't already present (dedupe by id).
  const appendMessage = useCallback((msg: Message) => {
    setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, author_id, body, created_at')
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    const rows = (data || []) as Message[];
    setMessages(rows);
    await resolveNames(rows.map(m => m.author_id));
  }, [threadId, resolveNames]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  // Realtime: new messages on this thread appear live.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        payload => {
          const m = payload.new as any;
          if (m?.deleted_at) return;
          const msg: Message = { id: m.id, author_id: m.author_id, body: m.body, created_at: m.created_at };
          appendMessage(msg);
          resolveNames([msg.author_id]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId, appendMessage, resolveNames]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || !user || posting) return;
    setPosting(true);
    try {
      // last_message_at / message_count are maintained by trg_message_after_insert.
      const { data, error } = await supabase
        .from('messages')
        .insert({
          thread_id:  threadId,
          channel_id: channelId,
          org_id:     user.orgId,
          author_id:  user.id,
          body,
        })
        .select('id, author_id, body, created_at')
        .single();
      if (error) throw error;
      setText('');
      // Optimistically show it; realtime INSERT for the same id is deduped.
      if (data) {
        if (!(data.author_id in namesRef.current)) {
          setNames(prev => ({ ...prev, [data.author_id]: user.fullName || 'You' }));
        }
        appendMessage(data as Message);
      }
    } catch (e: any) {
      // RLS write policies (channel membership / author_id = auth.uid()) surface here.
      Alert.alert('Could not send message', e?.message || 'You may not have permission to post in this channel.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1e3a5f" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.listContent}
        data={messages}
        keyExtractor={m => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.author_id === user?.id;
          return (
            <View style={[styles.msgRow, mine && styles.msgRowMine]}>
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                {!mine ? <Text style={styles.author}>{names[item.author_id] || '…'}</Text> : null}
                <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>{formatTime(item.created_at)}</Text>
              </View>
            </View>
          );
        }}
      />

      {writable ? (
        <View style={styles.composeBar}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || posting) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || posting}
          >
            {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>Send</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.readOnlyBar}>
          <Text style={styles.readOnlyText}>Read-only access</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  emptyText: { fontSize: 14, color: '#94a3b8' },

  msgRow: { flexDirection: 'row', marginBottom: 10 },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%', backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  bubbleMine: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  author: { fontSize: 12, fontWeight: '700', color: '#2563eb', marginBottom: 4 },
  body: { fontSize: 15, color: '#0f172a', lineHeight: 20 },
  bodyMine: { color: '#fff' },
  time: { fontSize: 10, color: '#94a3b8', marginTop: 6, alignSelf: 'flex-end' },
  timeMine: { color: '#cbd5e1' },

  composeBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc', maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 20, paddingHorizontal: 18,
    height: 42, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  readOnlyBar: {
    padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', alignItems: 'center',
  },
  readOnlyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
});
