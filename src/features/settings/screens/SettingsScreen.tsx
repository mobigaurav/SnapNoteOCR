import React, { useLayoutEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import {
  Card,
  Divider,
  IconButton,
  List,
  Snackbar,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import Share from 'react-native-share';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { spacing } from '../../../core/ui/spacing';

import {  exportNoteAsTxt } from '../../../core/export/exportService';
import { useAppSelector } from '../../../app/hooks';
import { selectNotes } from '../../notes/notesSlice';


type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

/**
 * ✅ Replace these two when you publish:
 * - iOS: APP_STORE_ID (numeric)
 * - Android: ANDROID_PACKAGE (com.your.app)
 */
const APP_STORE_ID = ''; // e.g. '1234567890'
const ANDROID_PACKAGE = ''; // e.g. 'com.gaurav.snapnote'

const PRIVACY_URL = 'https://mobigaurav.github.io/SnapNoteOCR/privacy.html'; // replace later
const SUPPORT_EMAIL = 'mobigaurav@gmail.com'; // replace later
const TERMS_URL = 'https://mobigaurav.github.io/SnapNoteOCR/terms.html'

function getStoreUrls() {
  const iosReview = APP_STORE_ID
    ? `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`
    : '';
  const iosFallback = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '';

  const androidMarket = ANDROID_PACKAGE ? `market://details?id=${ANDROID_PACKAGE}` : '';
  const androidFallback = ANDROID_PACKAGE
    ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
    : '';

  return { iosReview, iosFallback, androidMarket, androidFallback };
}

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);

  const [snack, setSnack] = useState({ visible: false, message: '' });

  useLayoutEffect(() => {
    nav.setOptions({ title: 'Settings' });
  }, [nav]);

  const notes = useAppSelector(selectNotes);

const exportAllTxt = async () => {
  if (exporting) return;
  if (!notes.length) return toast('No notes to export.');

  try {
    setExporting(true);
    const combined = {
      id: 'all',
      title: 'SnapNote Export',
      body: notes.map(n => `# ${n.title}\n${n.body}\n\n---\n`).join('\n'),
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await exportNoteAsTxt(combined);
    toast('Export ready — choose where to share/save.');
  } catch (e: any) {
    toast(e?.message ?? 'Export failed.');
  } finally {
    setExporting(false);
  }
};



  const toast = (message: string) => setSnack({ visible: true, message });

  const onShareApp = async () => {
    const { iosFallback, androidFallback } = getStoreUrls();
    const url = Platform.OS === 'ios' ? iosFallback : androidFallback;

    // If store URL not configured yet, still share a nice message (not broken).
    const message =
      url
        ? `Check out SnapNote — scan documents into clean notes.\n\n${url}`
        : 'Check out SnapNote — scan documents into clean notes. (Store link coming soon)';

    try {
      await Share.open({ message, url: url || undefined });
    } catch {
      // user cancelled share — ignore
    }
  };

  const onRateApp = async () => {
    const { iosReview, androidMarket, androidFallback } = getStoreUrls();

    try {
      if (Platform.OS === 'ios') {
        if (!iosReview) return toast('App Store link not set yet.');
        await Linking.openURL(iosReview);
        return;
      }

      // Android: prefer market://
      if (!androidMarket) return toast('Play Store package not set yet.');
      const can = await Linking.canOpenURL(androidMarket);
      await Linking.openURL(can ? androidMarket : androidFallback);
    } catch {
      toast('Could not open store. Try again later.');
    }
  };

  const onPrivacy = async () => {
    try {
      const can = await Linking.canOpenURL(PRIVACY_URL);
      if (!can) return toast('Privacy URL not set yet.');
      await Linking.openURL(PRIVACY_URL);
    } catch {
      toast('Could not open link.');
    }
  };

    const onTerms = async () => {
    try {
      const can = await Linking.canOpenURL(TERMS_URL);
      if (!can) return toast('Terms URL not set yet.');
      await Linking.openURL(TERMS_URL);
    } catch {
      toast('Could not open link.');
    }
  };

  const onContact = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=SnapNote Support`);
    } catch {
      toast('Could not open email app.');
    }
  };

  return (
    <Surface style={styles.container} elevation={0}>
      {/* Polished header card */}
      <Card mode="elevated" style={styles.heroCard}>
        <Card.Content style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroText}>
              <Text variant="headlineSmall">SnapNote</Text>
              <Text style={styles.muted}>On-device OCR • Local notes</Text>
            </View>

            <IconButton
              icon="shield-check-outline"
              size={22}
              style={[styles.heroIcon, { backgroundColor: theme.colors.secondaryContainer }]}
            />
          </View>

          <Divider style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.muted}>Privacy</Text>
              <Text variant="titleMedium">Local</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.muted}>Account</Text>
              <Text variant="titleMedium">None</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.muted}>Sync</Text>
              <Text variant="titleMedium">Off</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Actions</Text>
        </Card.Content>

        <List.Item
          title="Share SnapNote"
          description="Send to a friend"
          left={(p) => <List.Icon {...p} icon="share-variant-outline" />}
          onPress={onShareApp}
        />
        <List.Item
          title="Rate the app"
          description="Open store review page"
          left={(p) => <List.Icon {...p} icon="star-outline" />}
          onPress={onRateApp}
        />
       <List.Item
        title="Export all as TXT"
        description={exporting ? 'Preparing…' : 'One combined file'}
        left={(p) => <List.Icon {...p} icon="file-document-outline" />}
        onPress={() => exportAllTxt()}
        disabled={exporting}
      />


      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Support & Legal</Text>
        </Card.Content>

        <List.Item
          title="Privacy Policy"
          description="How we handle your data"
          left={(p) => <List.Icon {...p} icon="file-document-outline" />}
          onPress={onPrivacy}
        />
         <List.Item
          title="Terms"
          description="Terms & Conditions"
          left={(p) => <List.Icon {...p} icon="file-document-outline" />}
          onPress={onTerms}
        />
        <List.Item
          title="Contact support"
          description={SUPPORT_EMAIL}
          left={(p) => <List.Icon {...p} icon="email-outline" />}
          onPress={onContact}
        />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.muted}>Version 1.0.0</Text>
      </View>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        duration={2200}
      >
        {snack.message}
      </Snackbar>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.md },

  heroCard: { borderRadius: 22, overflow: 'hidden' },
  heroContent: { gap: spacing.md },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: { flex: 1 },
  heroIcon: { borderRadius: 14 },

  heroDivider: { opacity: 0.5 },

  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stat: { flex: 1 },

  card: { borderRadius: 18, overflow: 'hidden' },
  cardContent: { paddingBottom: 0 },

  footer: { alignItems: 'center', marginTop: 'auto', paddingVertical: spacing.md },

  muted: { opacity: 0.7 },
});
