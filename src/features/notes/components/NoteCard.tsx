import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { spacing } from '../../../core/ui/spacing';
import type { Note } from '../types';

function formatDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NoteCard({
  note,
  onPress,
  index = 0,
}: {
  note: Note;
  onPress: () => void;
  index?: number;
}) {
  const preview = (note.body || '').replace(/\s+/g, ' ').trim();
  const showTags = (note.tags ?? []).slice(0, 3);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const delay = Math.min(index * 35, 220);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, delay, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Card mode="elevated" style={styles.card} onPress={onPress}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
              {note.title || 'Untitled'}
            </Text>
            <Text variant="labelSmall" style={styles.date}>
              {formatDate(note.updatedAt)}
            </Text>
          </View>

          <Text variant="bodyMedium" numberOfLines={2} style={styles.preview}>
            {preview || 'No text'}
          </Text>

          {showTags.length ? (
            <View style={styles.tagsRow}>
              {showTags.map((t) => (
                <Chip key={t} compact style={styles.chip}>
                  {t}
                </Chip>
              ))}
            </View>
          ) : null}
        </Card.Content>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { flex: 1 },
  date: { opacity: 0.6 },
  preview: { marginTop: spacing.xs, opacity: 0.9 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: { borderRadius: 999 },
});
