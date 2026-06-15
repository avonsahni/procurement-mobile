import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/types';
import { compressAndUploadPhotos, signPaths, MAX_PHOTOS, PickedPhoto } from '../lib/photos';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Remarks'>;

interface Remark {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  image_urls: string[] | null;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function RemarksScreen({ route }: Props) {
  const { packageId } = route.params;
  const { user } = useAuth();
  const writable = canWrite(user?.role);

  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [posting, setPosting] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  const fetchRemarks = useCallback(async () => {
    const { data } = await supabase
      .from('remarks')
      .select('id, username, text, timestamp, image_urls')
      .eq('package_id', packageId)
      .order('timestamp', { ascending: false });
    const rows = (data || []) as Remark[];
    setRemarks(rows);
    const allPaths = rows.flatMap(r => r.image_urls || []);
    if (allPaths.length) setSigned(await signPaths(allPaths));
  }, [packageId]);

  useEffect(() => {
    fetchRemarks().finally(() => setLoading(false));
  }, [fetchRemarks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRemarks();
    setRefreshing(false);
  };

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    setPhotos(prev => {
      const next = [...prev];
      for (const a of assets) {
        if (next.length >= MAX_PHOTOS) break;
        next.push({ uri: a.uri, width: a.width, height: a.height, fileName: a.fileName });
      }
      if (prev.length + assets.length > MAX_PHOTOS) {
        Alert.alert('Limit reached', `You can attach up to ${MAX_PHOTOS} photos per remark.`);
      }
      return next;
    });
  };

  const pickFromLibrary = async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert('Limit reached', `Maximum ${MAX_PHOTOS} photos.`); return; }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to attach photos.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 1,
      });
      if (!result.canceled) addAssets(result.assets);
    } catch (e: any) {
      Alert.alert('Could not open photo library', e?.message || 'Please try again.');
    }
  };

  const pickFromCamera = async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert('Limit reached', `Maximum ${MAX_PHOTOS} photos.`); return; }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to capture photos.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled) addAssets(result.assets);
    } catch (e: any) {
      // The iOS Simulator has no camera; this works on a physical device.
      Alert.alert('Camera unavailable', e?.message || 'The camera is not available on this device.');
    }
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handlePost = async () => {
    if (!text.trim()) { Alert.alert('Validation', 'Please enter a remark.'); return; }
    if (!user) return;
    if (posting) return;
    setPosting(true);
    try {
      let paths: string[] = [];
      let totalBytes = 0;
      if (photos.length) {
        const uploaded = await compressAndUploadPhotos(photos, { orgId: user.orgId, packageId });
        paths = uploaded.paths;
        totalBytes = uploaded.totalBytes;
      }
      // Insert only after all uploads succeed (no partial remarks).
      const { error } = await supabase.from('remarks').insert({
        package_id:  packageId,
        text:        text.trim(),
        username:    user.fullName,
        user_id:     user.id,
        image_urls:  paths,
        image_bytes: totalBytes,
      });
      if (error) throw error;
      setText('');
      setPhotos([]);
      await fetchRemarks();
    } catch (e: any) {
      Alert.alert('Could not post remark', e?.message || 'Upload failed. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical
        showsVerticalScrollIndicator
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        {/* Compose box — writers only */}
        {writable ? (
          <View style={styles.composeCard}>
            <Text style={styles.sectionHeading}>New Remark</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe site progress…"
              placeholderTextColor="#94a3b8"
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={4}
            />

            {photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                {photos.map((p, i) => (
                  <View key={`${p.uri}-${i}`} style={styles.thumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                      <Text style={styles.removeBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickFromLibrary} disabled={posting}>
                <Text style={styles.photoBtnText}>🖼  Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickFromCamera} disabled={posting}>
                <Text style={styles.photoBtnText}>📷  Camera</Text>
              </TouchableOpacity>
              <Text style={styles.counter}>{photos.length}/{MAX_PHOTOS}</Text>
            </View>

            <TouchableOpacity
              style={[styles.postBtn, posting && styles.postBtnDisabled]}
              onPress={handlePost}
              disabled={posting}
            >
              {posting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.postBtnText}>Post Remark</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.readOnlyNote}>Read-only access</Text>
        )}

        {/* Existing remarks */}
        <Text style={styles.sectionHeading}>Remarks</Text>
        {remarks.length === 0 ? (
          <Text style={styles.emptyText}>No remarks yet.</Text>
        ) : (
          remarks.map(r => (
            <View key={r.id} style={styles.remarkCard}>
              <View style={styles.remarkHeader}>
                <Text style={styles.remarkUser} numberOfLines={1}>{r.username}</Text>
                <Text style={styles.remarkDate}>{formatTs(r.timestamp)}</Text>
              </View>
              <Text style={styles.remarkText}>{r.text}</Text>
              {r.image_urls && r.image_urls.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                  {r.image_urls.map(path => {
                    const url = signed[path];
                    if (!url) return null;
                    return (
                      <TouchableOpacity key={path} onPress={() => setViewer(url)} activeOpacity={0.8}>
                        <Image source={{ uri: url }} style={styles.remarkThumb} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Full-image viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <TouchableOpacity style={styles.viewerOverlay} activeOpacity={1} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12, marginTop: 4 },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  readOnlyNote: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 },

  composeCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12,
    fontSize: 15, color: '#0f172a', backgroundColor: '#f8fafc',
    minHeight: 90, textAlignVertical: 'top',
  },
  thumbRow: { marginTop: 12 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#e2e8f0' },
  removeBtn: {
    position: 'absolute', top: -6, right: -6, backgroundColor: '#0f172a',
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  photoActions: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  photoBtn: {
    backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginRight: 10,
  },
  photoBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '700' },
  counter: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: '#64748b' },
  postBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 16 },
  postBtnDisabled: { opacity: 0.7 },
  postBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  remarkCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  remarkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  remarkUser: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  remarkDate: { fontSize: 11, color: '#94a3b8' },
  remarkText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  remarkThumb: { width: 88, height: 88, borderRadius: 8, marginRight: 10, marginTop: 12, backgroundColor: '#e2e8f0' },

  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
});
