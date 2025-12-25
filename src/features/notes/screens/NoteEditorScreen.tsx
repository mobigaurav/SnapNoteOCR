import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { spacing } from '../../../core/ui/spacing';
import { KeyboardDismissView } from '../../../core/ui/KeyboardDismissView';
import { NotesRepo } from '../../../core/db/notesRepo';
import { useAppDispatch } from '../../../app/hooks';
import { deleteNote, saveNote } from '../notesSlice';

type EditorRoute = RouteProp<RootStackParamList, 'NoteEditor'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'NoteEditor'>;

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function NoteEditorScreen() {
  const theme = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<EditorRoute>();
  const dispatch = useAppDispatch();

  const isEdit = !!route.params?.id;
  const noteId = useMemo(() => route.params?.id ?? makeId(), [route.params?.id]);

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>(route.params?.initialText ?? '');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState<number>(Date.now());

  // Load note when editing
  useEffect(() => {
    let alive = true;

    const load = async () => {
      const id = route.params?.id;
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const note = await NotesRepo.getById(id);
        if (!alive) return;

        if (!note) {
          setError('Note not found.');
          return;
        }

        setTitle(note.title ?? '');
        setBody(note.body ?? '');
        setTags(note.tags ?? []);
        setCreatedAt(note.createdAt ?? Date.now());
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Failed to load note');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [route.params?.id]);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (!t) return;

    const normalized = t.toLowerCase();
    if (tags.map((x) => x.toLowerCase()).includes(normalized)) {
      setTagInput('');
      return;
    }

    setTags((prev) => [...prev, t]);
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  }, []);

  const onSave = useCallback(async () => {
    try {
      Keyboard.dismiss();
      setSaving(true);
      setError(null);

      const now = Date.now();
      const payload = {
        id: noteId,
        title: title.trim() || 'Untitled',
        body: body.trim(),
        tags,
        createdAt,
        updatedAt: now,
      };

      await dispatch(saveNote(payload)).unwrap();
      nav.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [body, createdAt, dispatch, nav, noteId, tags, title]);

  const onDelete = useCallback(() => {
    if (!isEdit) {
      nav.goBack();
      return;
    }

    // Keep it simple: delete immediately (you can add Alert confirm if desired)
    (async () => {
      try {
        setSaving(true);
        await dispatch(deleteNote(noteId)).unwrap();
        nav.goBack();
      } finally {
        setSaving(false);
      }
    })();
  }, [dispatch, isEdit, nav, noteId]);

  // ✅ Configure Navigation Header (title + actions)
  useLayoutEffect(() => {
    nav.setOptions({
      title: isEdit ? 'Edit note' : 'New note',
      headerRight: () => (
        <View style={styles.headerRight}>
          {isEdit ? (
            <IconButton
              icon="trash-can-outline"
              size={20}
              onPress={onDelete}
              disabled={saving}
            />
          ) : null}
          <IconButton
            icon="content-save"
            size={20}
            onPress={onSave}
            disabled={saving}
          />
        </View>
      ),
    });
  }, [isEdit, nav, onDelete, onSave, saving]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardDismissView>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={{ color: theme.colors.error }}>{error}</Text>
          </View>
        ) : null}

        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              Title
            </Text>
            <TextInput
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              placeholder="Give it a name"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </Card.Content>

          <Divider />

          <Card.Content style={styles.cardContent}>
            <View style={styles.bodyHeader}>
              <Text variant="labelLarge" style={styles.sectionTitle}>
                Note
              </Text>
              <Text variant="labelSmall" style={styles.counter}>
                {body.length} chars
              </Text>
            </View>

            <TextInput
              mode="outlined"
              value={body}
              onChangeText={setBody}
              placeholder="Write here…"
              multiline
              style={styles.bodyInput}
            />

            <Text variant="bodySmall" style={styles.helper}>
              Tip: scanned text can be edited here before saving.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.tagsHeader}>
              <Text variant="labelLarge" style={styles.sectionTitle}>
                Tags
              </Text>
              <Text variant="bodySmall" style={styles.helperMuted}>
                Optional
              </Text>
            </View>

            <View style={styles.tagRow}>
              <TextInput
                mode="outlined"
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="e.g. receipts, work, health"
                returnKeyType="done"
                onSubmitEditing={addTag}
              />
              <IconButton
                icon="plus"
                mode="contained"
                onPress={addTag}
                disabled={!tagInput.trim()}
                style={styles.addBtn}
              />
            </View>

            {tags.length ? (
              <View style={styles.tagsWrap}>
                {tags.map((t) => (
                  <Chip key={t} onClose={() => removeTag(t)} style={styles.chip}>
                    {t}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text variant="bodySmall" style={styles.helperMuted}>
                Add tags to group notes later.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Small footer hint */}
        <View style={styles.footer}>
          <Text variant="labelSmall" style={styles.footerText}>
            Your notes are stored locally on your device.
          </Text>
        </View>
      </ScrollView>
    </KeyboardDismissView>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },

  card: { borderRadius: 18, overflow: 'hidden' },
  cardContent: { gap: spacing.sm },

  sectionTitle: { opacity: 0.85 },

  bodyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  counter: { opacity: 0.6 },

  bodyInput: { minHeight: 220 },

  helper: { marginTop: spacing.xs, opacity: 0.7 },
  helperMuted: { opacity: 0.65 },

  tagsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tagInput: { flex: 1 },
  addBtn: { borderRadius: 12 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderRadius: 999 },

  errorWrap: { paddingHorizontal: spacing.md },

  footer: { alignItems: 'center', marginTop: spacing.sm },
  footerText: { opacity: 0.6 },

  loading: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: { opacity: 0.7 },
});
