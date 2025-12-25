// src/features/notes/types.ts
export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};
