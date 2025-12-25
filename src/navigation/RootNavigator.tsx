// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotesListScreen from '../features/notes/screens/NotesListScreen';
import NoteEditorScreen from '../features/notes/screens/NoteEditorScreen';
import NoteDetailScreen from '../features/notes/screens/NoteDetailScreen';
import ScanScreen from '../features/scanner/screens/ScanScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';

export type RootStackParamList = {
  NotesList: undefined;
  Scan: undefined;
  NoteEditor: { id?: string; initialText?: string } | undefined;
  NoteDetail: { id: string };
  Settings: undefined;

};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="NotesList" component={NotesListScreen} options={{ title: 'SnapNote' }} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Stack.Screen name="NoteEditor" component={NoteEditorScreen} options={{ title: 'Edit Note' }} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} options={{ title: 'Note' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
