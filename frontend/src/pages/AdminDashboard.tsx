import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { User, Note, PaginationMeta } from '../types';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { Users, BookOpen, ShieldAlert, Plus, Trash2, Edit3, X, Check } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'notes' | 'users'>('notes');

  // Notes state
  const [adminNotes, setAdminNotes] = useState<Note[]>([]);
  const [notesPagination, setNotesPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 8,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 8,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'USER' | 'ADMIN'>('USER');
  const [userInterests, setUserInterests] = useState('');

  const fetchAdminNotes = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/notes?page=${page}&limit=8`);
      setAdminNotes(res.data.data);
      setNotesPagination(res.data.pagination);
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch global notes.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/users?page=${page}&limit=8`);
      setUsers(res.data.data);
      setUsersPagination(res.data.pagination);
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch users list.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notes') {
      fetchAdminNotes(1);
    } else {
      fetchUsers(1);
    }
  }, [activeTab]);

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('USER');
    setUserInterests('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserPassword('');
    setUserRole(u.role);
    setUserInterests((u.interests || []).join(', '));
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const interests = userInterests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, {
          name: userName.trim(),
          role: userRole,
          interests,
        });
        setMessage({ type: 'success', text: `User ${userName} updated successfully.` });
      } else {
        await api.post('/admin/users', {
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          role: userRole,
          interests,
        });
        setMessage({ type: 'success', text: `User ${userName} created successfully.` });
      }
      setIsUserModalOpen(false);
      fetchUsers(usersPagination.page);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentAdmin?.id) {
      alert('Protection: You cannot delete your own active administrator account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user "${u.name}"?`)) return;

    try {
      await api.delete(`/admin/users/${u.id}`);
      setMessage({ type: 'success', text: `User ${u.name} deleted successfully.` });
      fetchUsers(usersPagination.page);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Admin Access
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            System Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Global note supervision and role-based user management.
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={openCreateUserModal}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 mt-6">
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>All System Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
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

      {/* Tab 1: All System Notes */}
      {activeTab === 'notes' && (
        <div className="mt-6">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : adminNotes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500">No notes exist in the system yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3.5">Title</th>
                      <th className="px-6 py-3.5">Author</th>
                      <th className="px-6 py-3.5">Content Preview</th>
                      <th className="px-6 py-3.5">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminNotes.map((note) => {
                      const author = typeof note.userId === 'object' ? note.userId : null;
                      return (
                        <tr key={note.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">
                            {note.title}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {author ? (
                              <div>
                                <div className="font-medium text-slate-800">{author.name}</div>
                                <div className="text-xs text-slate-400">{author.email}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">
                                {String(note.userId)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-md truncate">
                            {note.content}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                            {new Date(note.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                meta={notesPagination}
                onPageChange={(page) => fetchAdminNotes(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="mt-6">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Interests</th>
                      <th className="px-6 py-3.5">Registered</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.interests && u.interests.length > 0 ? (
                              u.interests.map((interest, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200"
                                >
                                  {interest}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit user"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentAdmin?.id}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.id === currentAdmin?.id
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                            }`}
                            title={
                              u.id === currentAdmin?.id
                                ? 'Cannot delete your own account'
                                : 'Delete user'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                meta={usersPagination}
                onPageChange={(page) => fetchUsers(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* User Create/Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingUser ? `Edit ${editingUser.name}` : 'Create New User'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'USER' | 'ADMIN')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Interests (Comma-separated)
                </label>
                <input
                  type="text"
                  value={userInterests}
                  onChange={(e) => setUserInterests(e.target.value)}
                  placeholder="Technology, Sports, Chess"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
