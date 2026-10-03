'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth';

const INITIAL_TAGS = [
  { id: 'tag-1', name: 'Database', color: 'neo-yellow' },
  { id: 'tag-2', name: 'Prisma', color: 'neo-green' },
  { id: 'tag-3', name: 'Migration', color: 'neo-pink' },
  { id: 'tag-4', name: 'Frontend', color: 'neo-cyan' },
  { id: 'tag-5', name: 'Performance', color: 'neo-orange' },
];

const INITIAL_NOTES = [
  {
    id: 'note-1',
    title: 'Configure Prisma ORM with PostgreSQL',
    content: 'Setup local PostgreSQL container and configure DATABASE_URL in the environment file. Initialize schema with Prisma schema command. Verify port 5432 bindings and ensure connection SSL mode is configured properly for dev.',
    userId: 'user-1',
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    tags: [INITIAL_TAGS[0], INITIAL_TAGS[1]],
  },
  {
    id: 'note-2',
    title: 'Run Initial Schema Migration',
    content: 'Execute prisma migrate dev to generate initial SQL migrations. Verify output files inside the migrations directory before pushing schema changes to production and committing files to Git.',
    userId: 'user-1',
    createdAt: new Date('2026-06-10T14:30:00Z'),
    updatedAt: new Date('2026-06-10T14:30:00Z'),
    tags: [INITIAL_TAGS[2], INITIAL_TAGS[0]],
  },
  {
    id: 'note-3',
    title: 'Prevent Hot Reload Client Exhaustion',
    content: 'Cache the instantiated PrismaClient on globalThis. Prevents development server from spawning duplicate connection pools during hot reloads when saving files in Next.js development mode.',
    userId: 'user-1',
    createdAt: new Date('2026-06-15T09:00:00Z'),
    updatedAt: new Date('2026-06-15T09:00:00Z'),
    tags: [INITIAL_TAGS[1], INITIAL_TAGS[4]],
  },
  {
    id: 'note-4',
    title: 'Resolve Hydration Mismatches in Layouts',
    content: 'Avoid layouts rendering mismatched markup by checking window state before calling browser storage APIs. Maintain client-server HTML parity by only mounting stateful UI elements post mount.',
    userId: 'user-1',
    createdAt: new Date('2026-06-16T11:00:00Z'),
    updatedAt: new Date('2026-06-16T11:00:00Z'),
    tags: [INITIAL_TAGS[3]],
  },
];

// Persist state across Next.js dev server hot reloads
globalThis.mockNotes = globalThis.mockNotes || [...INITIAL_NOTES];

export async function getTags() {
  try {
    const tags = await prisma.tag.findMany();
    return tags;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getNotes(filters = {}) {
  const where = {};

  if (filters.search) {
    where.OR = [ 
      //OR operator is used to filter notes based on title or content containing the search term, case-insensitively
      { title: { contains: filters.search, mode: "insensitive" } },
      { content: { contains: filters.search, mode: "insensitive" } },
    ]
  }

  if (filters.tag) {
    where.tags = { some: { name: filters.tag } }
  }

  try {
    const notes = await prisma.note.findMany({
      where,
      include: { tags: true },
      orderBy: { createdAt: "desc" } //data will come in descending order of creation date
    });
    return notes;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getNoteById(id) {
  try {
    const note = await prisma.note.findUnique({
      where: { id },
      include: { tags: true }
    })
    return note;
  } catch (err) {
    console.log(err)
    return null;
  }
}

export async function createNote(prevState, formData) {
  const title = formData.get('title');
  const content = formData.get('content');
  const tagIds = formData.getAll('tags');

  if (!title || !content) {
    return { success: false, error: 'Title and content are required.' };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in." }
    }
    await prisma.note.create({
      data: {
        title,
        content,
        userId: user.id,
        tags: {
          connect: tagIds.map(id => ({ id }))
        }
      }
    })
  } catch (err) {
    console.log(err)
    return { success: false, error: "Failed to create note." }
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function updateNote(noteId, prevState, formData) {
  const title = formData.get('title');
  const content = formData.get('content');
  const tagIds = formData.getAll('tags');

  if (!title || !content) {
    return { success: false, error: 'Title and content are required.' };
  }

  try {
    await prisma.note.update({
      where: { id: noteId },
      data: {
        title,
        content,
        tags: {
          set: tagIds.map(id => ({ id }))
        }
      }
    })
  } catch (err) {
    console.log(err);
    return { success: false, error: 'Failed to update note.' };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function deleteNote(noteId) {
  try {
    await prisma.note.delete({
      where: { id: noteId }
    })
  } catch (err) {
    console.log(err)
    return { sucess: false, error: "Failed to delete note." }
  }
  revalidatePath('/dashboard');
  return { success: true };
}
