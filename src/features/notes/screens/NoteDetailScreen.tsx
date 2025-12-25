import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Vibration } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import Share from 'react-native-share';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { deleteNote, selectNotes } from '../notesSlice';
import { spacing } from '../../../core/ui/spacing';
import { exportNoteAsPdf, exportNoteAsTxt } from '../../../core/export/exportService';

type DetailRoute = RouteProp<RootStackParamList, 'NoteDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'NoteDetail'>;

function formatDate(ms?: number) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Simple haptics without deps
const hapticTap = () => Vibration.vibrate(6);
const hapticSuccess = () => Vibration.vibrate(10);
const hapticError = () => Vibration.vibrate(35);

function isShareCancelError(e: any) {
  const msg = (e?.message ?? '').toLowerCase();
  // react-native-share commonly throws on cancel; treat as non-error
  return msg.includes('cancel') || msg.includes('canceled') || msg.includes('cancelled');
}

export default function NoteDetailScreen() {
  const theme = useTheme();
  const route = useRoute<DetailRoute>();
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const notes = useAppSelector(selectNotes);
  const note = useMemo(() => notes.find((n) => n.id === route.params.id), [notes, route.params.id]);

  const [exporting, setExporting] = useState<null | 'pdf' | 'txt'>(null);
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const toast = (message: string) => setSnack({ visible: true, message });

  const onEdit = useCallback(() => {
    if (!note) return;
    hapticTap();
    nav.navigate('NoteEditor', { id: note.id, initialText: note.body });
  }, [nav, note]);

  const onShare = useCallback(async () => {
    if (!note) return;
    try {
      hapticTap();
      await Share.open({ message: `${note.title}\n\n${note.body}` });
      // If share sheet completes, give a subtle success
      hapticSuccess();
    } catch (e: any) {
      if (isShareCancelError(e)) return; // user cancelled
      hapticError();
      toast(e?.message ?? 'Share failed.');
    }
  }, [note]);

  const onExportPdf = useCallback(async () => {
    if (!note || exporting) return;
    try {
      hapticTap();
      setExporting('pdf');
      await exportNoteAsPdf(note);
      // export service already vibrates success, but this is fine if duplicated is too strong
      toast('PDF ready — choose where to share/save.');
    } catch (e: any) {
      if (isShareCancelError(e)) return; // user cancelled share sheet
      hapticError();
      toast(e?.message ?? 'PDF export failed.');
    } finally {
      setExporting(null);
    }
  }, [note, exporting]);

  const onExportTxt = useCallback(async () => {
    if (!note || exporting) return;
    try {
      hapticTap();
      setExporting('txt');
      await exportNoteAsTxt(note);
      toast('TXT ready — choose where to share/save.');
    } catch (e: any) {
      if (isShareCancelError(e)) return;
      hapticError();
      toast(e?.message ?? 'TXT export failed.');
    } finally {
      setExporting(null);
    }
  }, [note, exporting]);

  const onDelete = useCallback(() => {
    if (!note) return;

    hapticTap();
    Alert.alert(
      'Delete note?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteNote(note.id)).unwrap();
              hapticSuccess();
              nav.goBack();
            } catch (e: any) {
              hapticError();
              toast(e?.message ?? 'Delete failed.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [dispatch, nav, note]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Note',
      headerRight: () => (
        <View style={styles.headerRight}>
          <IconButton icon="pencil" size={20} onPress={onEdit} />
          <IconButton icon="share-variant" size={20} onPress={onShare} />
          <IconButton
            icon="file-pdf-box"
            size={20}
            onPress={onExportPdf}
            disabled={!!exporting}
          />
          <IconButton
            icon="file-document-outline"
            size={20}
            onPress={onExportTxt}
            disabled={!!exporting}
          />
          <IconButton icon="trash-can-outline" size={20} onPress={onDelete} />
        </View>
      ),
    });
  }, [nav, onDelete, onEdit, onShare, onExportPdf, onExportTxt, exporting]);

  if (!note) {
    return (
      <View style={styles.center}>
        <Text>Note not found.</Text>
      </View>
    );
  }

  const updated = formatDate(note.updatedAt);
  const created = formatDate(note.createdAt);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="headlineSmall" style={styles.title}>
            {note.title || 'Untitled'}
          </Text>

          <View style={styles.metaRow}>
            {updated ? (
              <Text variant="labelSmall" style={styles.metaText}>
                Updated {updated}
              </Text>
            ) : null}
            {created && created !== updated ? (
              <Text variant="labelSmall" style={styles.metaText}>
                Created {created}
              </Text>
            ) : null}
          </View>

          {(note.tags?.length ?? 0) > 0 ? (
            <View style={styles.tagsWrap}>
              {note.tags!.map((t) => (
                <Chip key={t} style={styles.chip}>
                  {t}
                </Chip>
              ))}
            </View>
          ) : null}

          <Divider style={styles.divider} />

          <Text variant="bodyLarge" style={[styles.body, { color: theme.colors.onSurface }]}>
            {note.body || ''}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="contained" icon="pencil" onPress={onEdit}>
          Edit
        </Button>

        <Button mode="outlined" icon="share-variant" onPress={onShare} disabled={!!exporting}>
          Share
        </Button>

        <Button
          mode="outlined"
          icon="file-pdf-box"
          onPress={onExportPdf}
          disabled={!!exporting}
          loading={exporting === 'pdf'}
        >
          PDF
        </Button>
{/* 
        <Button
          mode="outlined"
          icon="file-document-outline"
          onPress={onExportTxt}
          disabled={!!exporting}
          loading={exporting === 'txt'}
        >
          TXT
        </Button>

        <Button
          mode="outlined"
          icon="trash-can-outline"
          onPress={onDelete}
          disabled={!!exporting}
          textColor={theme.colors.error}
        >
          Delete
        </Button> */}
      </View>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={2200}
      >
        {snack.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  card: { borderRadius: 18, overflow: 'hidden' },
  cardContent: { gap: spacing.sm },
  title: { letterSpacing: 0.2 },

  metaRow: { gap: spacing.xs },
  metaText: { opacity: 0.65 },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: { borderRadius: 999 },

  divider: { marginTop: spacing.sm },

  body: {
    marginTop: spacing.sm,
    lineHeight: 24,
    opacity: 0.95,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },

  center: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
