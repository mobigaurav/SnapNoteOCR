// src/features/notes/notesSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { NotesRepo, type Note as DbNote } from '../../core/db/notesRepo';
import type { Note } from './types';

type NotesState = {
  items: Note[];
  loading: boolean;
  error?: string;
};

const initialState: NotesState = {
  items: [],
  loading: false,
};

export const fetchNotes = createAsyncThunk('notes/fetchNotes', async () => {
  const notes = await NotesRepo.list();
  return notes as Note[];
});

export const saveNote = createAsyncThunk('notes/saveNote', async (note: Note) => {
  await NotesRepo.upsert(note as unknown as DbNote);
  return note;
});

export const deleteNote = createAsyncThunk('notes/deleteNote', async (id: string) => {
  await NotesRepo.remove(id);
  return id;
});

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    upsertLocal(state, action: PayloadAction<Note>) {
      const idx = state.items.findIndex((n) => n.id === action.payload.id);
      if (idx >= 0) state.items[idx] = action.payload;
      else state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (s) => {
        s.loading = true;
        s.error = undefined;
      })
      .addCase(fetchNotes.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(fetchNotes.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message ?? 'Failed to load notes';
      })
      .addCase(saveNote.fulfilled, (s, a) => {
        const idx = s.items.findIndex((n) => n.id === a.payload.id);
        if (idx >= 0) s.items[idx] = a.payload;
        else s.items.unshift(a.payload);
      })
      .addCase(deleteNote.fulfilled, (s, a) => {
        s.items = s.items.filter((n) => n.id !== a.payload);
      });
  },
});

export const { upsertLocal } = notesSlice.actions;

export const selectNotes = (state: RootState) => state.notes.items;
export const selectNotesLoading = (state: RootState) => state.notes.loading;

export default notesSlice.reducer;
