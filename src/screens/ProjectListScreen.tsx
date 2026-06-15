import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Project } from '../lib/types';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectList'>;

const STATUS_COLORS: Record<string, string> = {
  Active: '#16a34a',
  Completed: '#2563eb',
  Paused: '#d97706',
  'On Hold': '#dc2626',
};

export default function ProjectListScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { setProjectName } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // No single project in context while viewing the projects list.
  useFocusEffect(useCallback(() => { setProjectName(''); }, [setProjectName]));

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('id, name, client, status')
      .eq('org_id', user.orgId)
      .order('created_at', { ascending: false });
    setProjects((data || []) as Project[]);
  }, [user]);

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      ),
    });
  }, [fetchProjects, navigation, signOut]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      alwaysBounceVertical
      contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.listContent}
      data={projects}
      keyExtractor={p => p.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No projects found.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const color = STATUS_COLORS[item.status] || '#64748b';
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PackageList', { projectId: item.id, projectName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.cardRow}>
              <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
              </View>
            </View>
            {item.client ? <Text style={styles.client}>{item.client}</Text> : null}
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 12, paddingBottom: 48 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  signOutBtn: { marginRight: 4, paddingVertical: 4, paddingHorizontal: 8 },
  signOutText: { color: '#fff', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0', position: 'relative',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectName: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  client: { fontSize: 13, color: '#64748b', marginTop: 5 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  arrow: { position: 'absolute', right: 16, bottom: 16, fontSize: 20, color: '#cbd5e1' },
});
