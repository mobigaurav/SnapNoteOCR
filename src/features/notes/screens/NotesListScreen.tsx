import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Chip,
  FAB,
  IconButton,
  Portal,
  Searchbar,
  Surface,
  Text,
  useTheme,
  Card,
} from 'react-native-paper';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchNotes, selectNotes, selectNotesLoading } from '../notesSlice';
import { spacing } from '../../../core/ui/spacing';
import { NoteCard } from '../components/NoteCard';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NotesList'>;

type FilterKey = 'all' | 'recent' | 'tagged' | 'long';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'recent', label: 'Recent' },
  { key: 'tagged', label: 'Tagged' },
  { key: 'long', label: 'Long' },
];

export default function NotesListScreen() {
  const nav = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const notes = useAppSelector(selectNotes);
  const loading = useAppSelector(selectNotesLoading);

  const [query, setQuery] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  useEffect(() => {
    if (!isFocused) setFabOpen(false);
  }, [isFocused]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'SnapNote',
      headerRight: () => (
        <IconButton
          icon="cog-outline"
          onPress={() => nav.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      ),
    });
  }, [nav]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [filter, query]);

  const counts = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return {
      all: notes.length,
      recent: notes.filter((n) => now - (n.updatedAt ?? 0) <= sevenDays).length,
      tagged: notes.filter((n) => (n.tags?.length ?? 0) > 0).length,
      long: notes.filter((n) => (n.body?.length ?? 0) > 600).length,
    };
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    let base = notes;

    if (filter === 'recent') {
      base = base.filter((n) => now - (n.updatedAt ?? 0) <= sevenDays);
    } else if (filter === 'tagged') {
      base = base.filter((n) => (n.tags?.length ?? 0) > 0);
    } else if (filter === 'long') {
      base = base.filter((n) => (n.body?.length ?? 0) > 600);
    }

    if (!q) return base;

    return base.filter((n) => {
      const hay = `${n.title} ${n.body} ${(n.tags ?? []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, query, filter]);

  const onRefresh = () => dispatch(fetchNotes());

  // ✅ subtle background tint
  const bg = theme.colors.surfaceVariant; // nice “tinted” background
  const headerCardBg = theme.colors.surface; // keeps cards readable

  return (
    <Surface style={[styles.container, { backgroundColor: bg }]} elevation={0}>
      {/* Premium header */}
      <View style={styles.header}>
        <Text variant="headlineSmall">Your notes</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Scan. Clean. Save. Everything stays on-device.
        </Text>

        <Searchbar
          placeholder="Search notes, tags, text…"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />

        {/* ✅ Quick stats row */}
        <Card mode="elevated" style={[styles.statsCard, { backgroundColor: headerCardBg }]}>
          <Card.Content style={styles.statsContent}>
            <Stat label="Total" value={counts.all} />
            <Stat label="Recent" value={counts.recent} />
            <Stat label="Tagged" value={counts.tagged} />
            <Stat label="Long" value={counts.long} />
          </Card.Content>
        </Card>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
              style={styles.filterChip}
            >
              {f.label} · {counts[f.key]}
            </Chip>
          ))}
        </View>
      </View>

      {loading && notes.length === 0 ? <ActivityIndicator style={styles.loader} /> : null}

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        renderItem={({ item, index }) => (
          <NoteCard
            note={item}
            index={index}
            onPress={() => nav.navigate('NoteDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 ? styles.listEmptyContent : null,
        ]}
        refreshing={loading}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text variant="titleMedium">Nothing here</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Try changing filters or tap + to create a new note.
              </Text>
            </View>
          ) : null
        }
      />

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={isFocused}
          icon={fabOpen ? 'close' : 'plus'}
          onStateChange={({ open }) => setFabOpen(open)}
          actions={[
            { icon: 'camera', label: 'Scan', onPress: () => nav.navigate('Scan') },
            { icon: 'pencil-plus', label: 'New note', onPress: () => nav.navigate('NoteEditor') },
          ]}
        />
      </Portal>
    </Surface>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text variant="labelSmall" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="titleMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  subtitle: { opacity: 0.7 },

  search: {
    marginTop: spacing.sm,
    borderRadius: 16,
  },

  statsCard: {
    marginTop: spacing.sm,
    borderRadius: 18,
    overflow: 'hidden',
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stat: { flex: 1 },
  statLabel: { opacity: 0.7 },

  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  filterChip: { borderRadius: 999 },

  loader: { marginTop: spacing.md },

  listContent: { paddingBottom: spacing.xl },

  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

  emptyState: { alignItems: 'center', gap: spacing.sm },

  emptyText: { textAlign: 'center', opacity: 0.7 },
});
