import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Note, PaginationMeta } from '../types';
import { NoteModal } from '../components/NoteModal';
import { Pagination } from '../components/Pagination';
import { Plus, Edit2, Trash2, BookOpen, Calendar, Clock } from 'lucide-react';

export const NotesDashboard: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 6,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchNotes = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/notes?page=${page}&limit=6`);
      setNotes(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load notes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(1);
  }, []);

  const handleSaveNote = async (title: string, content: string) => {
    if (editingNote) {
      await api.put(`/notes/${editingNote.id}`, { title, content });
      setMessage({ type: 'success', text: 'Note updated successfully!' });
    } else {
      await api.post('/notes', { title, content });
      setMessage({ type: 'success', text: 'Note created successfully!' });
    }
    fetchNotes(pagination.page);
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/notes/${id}`);
      setMessage({ type: 'success', text: 'Note deleted successfully.' });
      fetchNotes(pagination.page);
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete note.' });
    }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Notes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Secure, end-to-end authenticated notes accessible only by you.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Note
        </button>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-semibold uppercase hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 mt-6 p-8">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full inline-flex mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No notes found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't written any notes yet. Click the button below to add your first note.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Note
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {note.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap line-clamp-5">
                    {note.content}
                  </p>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(note.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                      title="Edit note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white border border-slate-200 rounded-lg shadow-sm">
            <Pagination
              meta={pagination}
              onPageChange={(page) => fetchNotes(page)}
            />
          </div>
        </div>
      )}

      {/* Note Create/Edit Modal */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
        initialNote={editingNote}
      />
    </div>
  );
};
