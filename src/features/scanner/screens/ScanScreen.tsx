import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  type CameraCaptureError,
} from 'react-native-vision-camera';

import type { RootStackParamList } from '../../../navigation/RootNavigator';
import { spacing } from '../../../core/ui/spacing';
import { KeyboardDismissView } from '../../../core/ui/KeyboardDismissView';
import { recognizeTextFromImagePath, cleanOcrText } from '../services/ocrService';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Scan'>;

const { width: W, height: H } = Dimensions.get('window');



export default function ScanScreen() {
  const theme = useTheme();
  const nav = useNavigation<Nav>();
  const cameraRef = useRef<Camera>(null);

  const device = useCameraDevice('back');
  //const { hasPermission, requestPermission } = useCameraPermission();

  const [busy, setBusy] = useState(false);

  //  async function ensureCameraPermission(): Promise<boolean> {
  //     const current = await Camera.getCameraPermissionStatus();
  //     if (current === 'authorized') return true;

  //     const next = await Camera.requestCameraPermission();
  //     return next === 'authorized';
  //  }


  // Torch
  const [torchOn, setTorchOn] = useState(false);
  const hasTorch = !!device?.hasTorch;

  // Review
  const [reviewText, setReviewText] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const [hasPermission, setHasPermission] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<{ visible: boolean; message: string; action?: { label: string; onPress: () => void } }>(
    { visible: false, message: '' }
  );

  // Hints
  const [showTapHint, setShowTapHint] = useState(true);
  const [showSteadyHint, setShowSteadyHint] = useState(true);
  const tapOpacity = useRef(new Animated.Value(0)).current;
  const steadyOpacity = useRef(new Animated.Value(0)).current;

  // useEffect(() => {
  //   (async () => {
  //     if (!hasPermission) await requestPermission();
  //   })();
  // }, [hasPermission, requestPermission]);

  useEffect(() => {
  let mounted = true;

  (async () => {
    const status = await Camera.getCameraPermissionStatus();
    if (!mounted) return;

    // VisionCamera returns "authorized" for granted permission
    if (status === 'granted') {
      setHasPermission(true);
      return;
    }

    const next = await Camera.requestCameraPermission();
    if (!mounted) return;
    setHasPermission(next === 'granted');
  })();

  return () => {
    mounted = false;
  };
}, []);

  useEffect(() => {
    if (!hasTorch && torchOn) setTorchOn(false);
  }, [hasTorch, torchOn]);

  const frame = useMemo(() => {
    // Scanner “window”
    const frameW = Math.min(W - spacing.xl, 360);
    const frameH = Math.min(H * 0.45, 260);

    const left = (W - frameW) / 2;
    const top = (H - frameH) / 2 - 20; // slightly above center feels nicer

    return { frameW, frameH, left, top };
  }, []);

  // Animate hints while in camera mode
  useEffect(() => {
    if (isReviewing) return;

    // tap hint
    setShowTapHint(true);
    tapOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(tapOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(tapOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setShowTapHint(false));

    // steady hint pulse
    setShowSteadyHint(true);
    steadyOpacity.setValue(0);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(steadyOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(steadyOpacity, { toValue: 0.35, duration: 420, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const t = setTimeout(() => {
      pulse.stop();
      Animated.timing(steadyOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => setShowSteadyHint(false)
      );
    }, 2400);

    return () => {
      clearTimeout(t);
      pulse.stop();
    };
  }, [isReviewing, steadyOpacity, tapOpacity]);

  const openSnack = (message: string, action?: { label: string; onPress: () => void }) => {
    setSnack({ visible: true, message, action });
  };

  

  const showNoTextTips = useCallback(() => {
    openSnack('No text found. Try more light, avoid glare, fill the frame.', {
      label: 'Manual',
      onPress: () => nav.navigate('NoteEditor'),
    });
  }, [nav]);

  const onCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setBusy(true);

      const photo = await cameraRef.current.takePhoto({ flash: 'off' });

      const text = await recognizeTextFromImagePath(photo.path);

      if (!text) {
        Vibration.vibrate(20);
        showNoTextTips();
        return;
      }

      Vibration.vibrate(10);
      setReviewText(text);
      setIsReviewing(true);
    } catch (e: any) {
      const msg =
        (e as CameraCaptureError)?.message ??
        e?.message ??
        'Scan failed. Please try again.';
      Vibration.vibrate(30);
      openSnack(msg);
    } finally {
      setBusy(false);
    }
  }, [showNoTextTips]);

  const onRetake = () => {
    setReviewText('');
    setIsReviewing(false);
  };

  const onUseText = () => {
    const cleaned = cleanOcrText(reviewText);
    nav.navigate('NoteEditor', { initialText: cleaned });
  };

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>Loading camera…</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Camera permission required</Text>
        <Button mode="contained" onPress={() => Camera.requestCameraPermission().then(s => setHasPermission(s === 'granted'))} style={styles.mt}>
          Grant Permission
        </Button>
      </View>
    );
  }

  // REVIEW MODE (premium)
  if (isReviewing) {
    return (
      <KeyboardDismissView>
        <View style={styles.reviewRoot}>
          <View style={styles.reviewHeader}>
            <Text variant="headlineSmall">Review</Text>
            <Text variant="bodyMedium" style={styles.subtle}>
              Edit the recognized text before saving.
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.reviewBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card mode="elevated" style={styles.reviewCard}>
              <Card.Content>
                <TextInput
                  label="Recognized text"
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  mode="outlined"
                  style={styles.reviewInput}
                />
              </Card.Content>
            </Card>
          </ScrollView>

          <View style={styles.reviewFooter}>
            <Button mode="outlined" onPress={onRetake} disabled={busy}>
              Retake
            </Button>
            <Button mode="contained" onPress={onUseText} disabled={busy}>
              Use text
            </Button>
          </View>

          <Snackbar
            visible={snack.visible}
            onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
            action={snack.action ? { label: snack.action.label, onPress: snack.action.onPress } : undefined}
          >
            {snack.message}
          </Snackbar>
        </View>
      </KeyboardDismissView>
    );
  }

  // CAMERA MODE (premium)
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={!isReviewing}
        photo
        torch={hasTorch && torchOn ? 'on' : 'off'}
      />

      {/* Torch pill */}
      <View style={styles.topRight}>
        {hasTorch ? (
          <Card mode="elevated" style={styles.torchPill}>
            <IconButton
              icon={torchOn ? 'flashlight-off' : 'flashlight'}
              size={20}
              onPress={() => setTorchOn((v) => !v)}
              disabled={busy}
              accessibilityLabel={torchOn ? 'Turn torch off' : 'Turn torch on'}
            />
          </Card>
        ) : null}
      </View>

      {/* Dimmed overlay with “window” */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {/* Top dim */}
        <View style={[styles.dim, { left: 0, top: 0, width: W, height: frame.top }]} />
        {/* Bottom dim */}
        <View
          style={[
            styles.dim,
            { left: 0, top: frame.top + frame.frameH, width: W, height: Math.max(0, H - (frame.top + frame.frameH)) },
          ]}
        />
        {/* Left dim */}
        <View style={[styles.dim, { left: 0, top: frame.top, width: frame.left, height: frame.frameH }]} />
        {/* Right dim */}
        <View
          style={[
            styles.dim,
            { left: frame.left + frame.frameW, top: frame.top, width: Math.max(0, W - (frame.left + frame.frameW)), height: frame.frameH },
          ]}
        />

        {/* Frame */}
        <View
          style={[
            styles.frame,
            {
              left: frame.left,
              top: frame.top,
              width: frame.frameW,
              height: frame.frameH,
              borderColor: 'rgba(255,255,255,0.92)',
            },
          ]}
        />

        {/* Hints */}
        {showTapHint ? (
          <Animated.View style={[styles.tapHintWrap, { opacity: tapOpacity }]}>
            <Text style={styles.hintPill}>Tap to focus</Text>
          </Animated.View>
        ) : null}

        {showSteadyHint ? (
          <Animated.View style={[styles.steadyHintWrap, { opacity: steadyOpacity }]}>
            <Text style={styles.hintPill}>Hold steady…</Text>
          </Animated.View>
        ) : (
          <View style={styles.steadyHintWrap}>
            <Text style={styles.hintPill}>Keep text inside the frame</Text>
          </View>
        )}
      </View>

      {/* Floating capture sheet */}
      <View style={styles.sheetWrap}>
        <Card mode="elevated" style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.sheetContent}>
            <View style={styles.sheetTextRow}>
              <Text variant="titleMedium">Scan text</Text>
              <Text variant="bodySmall" style={styles.subtle}>
                On-device OCR • stored locally
              </Text>
            </View>

            <View style={styles.sheetButtons}>
              <Button
                mode="contained"
                onPress={onCapture}
                disabled={busy}
                contentStyle={styles.captureBtnContent}
              >
                {busy ? 'Recognizing…' : 'Capture'}
              </Button>

              <Button
                mode="outlined"
                onPress={() => nav.navigate('NoteEditor')}
                disabled={busy}
              >
                Manual note
              </Button>
            </View>

            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator />
                <Text style={styles.busyText}>Processing…</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack((s) => ({ ...s, visible: false }))}
        action={snack.action ? { label: snack.action.label, onPress: snack.action.onPress } : undefined}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },

  topRight: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  torchPill: {
    borderRadius: 999,
    overflow: 'hidden',
  },

  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  frame: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  tapHintWrap: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  steadyHintWrap: {
    position: 'absolute',
    bottom: 150, // sits above the sheet
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  hintPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
    color: 'white',
    overflow: 'hidden',
  },

  sheetWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  sheet: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sheetContent: {
    gap: spacing.sm,
  },
  sheetTextRow: {
    gap: spacing.xs,
  },
  subtle: {
    opacity: 0.7,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  captureBtnContent: {
    paddingVertical: 6,
  },

  busyRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  busyText: { opacity: 0.7 },

  reviewRoot: { flex: 1 },
  reviewHeader: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  reviewCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  reviewInput: {
    minHeight: 260,
  },
  reviewFooter: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  center: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mt: { marginTop: spacing.md },
});
