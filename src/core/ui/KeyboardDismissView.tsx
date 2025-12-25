import React from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

export function KeyboardDismissView({ children }: { children: React.ReactNode }) {
  return (
    <Pressable style={styles.root} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
