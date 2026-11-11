import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { GroupedInterestItem, UserWithPostsProfile, User } from '../types';
import { BarChart3, Database, Layers, ArrowRight, UserCheck, FileText, Sparkles } from 'lucide-react';

export const AggregationsPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<1 | 2>(1);

  // Scenario 1 State
  const [interestsData, setInterestsData] = useState<GroupedInterestItem[]>([]);
  const [isLoadingScenario1, setIsLoadingScenario1] = useState(false);

  // Scenario 2 State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userProfileWithPosts, setUserProfileWithPosts] = useState<UserWithPostsProfile | null>(null);
  const [isLoadingScenario2, setIsLoadingScenario2] = useState(false);

  const [error, setError] = useState('');

  // Fetch Scenario 1 data
  const loadScenario1 = async () => {
    setIsLoadingScenario1(true);
    setError('');
    try {
      const res = await api.get('/aggregations/users-by-interest');
      setInterestsData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load aggregation scenario 1');
    } finally {
      setIsLoadingScenario1(false);
    }
  };

  // Fetch user list for Scenario 2 selector
  const loadUsersForScenario2 = async () => {
    try {
      const res = await api.get('/admin/users?limit=50');
      const usersList: User[] = res.data.data;
      setAllUsers(usersList);
      if (usersList.length > 0 && !selectedUserId) {
        setSelectedUserId(usersList[0].id);
        fetchUserPosts(usersList[0].id);
      }
    } catch {
      // Handled silently
    }
  };

  const fetchUserPosts = async (userId: string) => {
    if (!userId) return;
    setIsLoadingScenario2(true);
    setError('');
    try {
      const res = await api.get(`/aggregations/user-posts/${userId}`);
      setUserProfileWithPosts(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user posts');
    } finally {
      setIsLoadingScenario2(false);
    }
  };

  useEffect(() => {
    if (activeScenario === 1) {
      loadScenario1();
    } else {
      loadUsersForScenario2();
    }
  }, [activeScenario]);

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedUserId(id);
    fetchUserPosts(id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            MongoDB Aggregations Showcase
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Aggregation Pipelines
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live demonstration of the mandatory aggregation scenarios solved using single-pipeline execution.
        </p>
      </div>

      {/* Scenario Switcher Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 mt-6">
        <button
          onClick={() => setActiveScenario(1)}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeScenario === 1
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Scenario 1: Group Users by Interests</span>
        </button>

        <button
          onClick={() => setActiveScenario(2)}
          className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeScenario === 2
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Scenario 2: User Posts ($lookup)</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      {/* ============================================================== */}
      {/* SCENARIO 1 VIEW */}
      {/* ============================================================== */}
      {activeScenario === 1 && (
        <div className="mt-6 space-y-6">
          {/* Architecture Note */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Constraint Compliance:</span> Executed via{' '}
              <code className="bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-800 font-mono">
                exactly one User.aggregate()
              </code>{' '}
              call using stages:{' '}
              <code className="font-mono text-indigo-800">$match → $unwind → $group → $project → $sort</code>.
              Users with empty interests are safely filtered out, and passwords are never projected.
            </div>
          </div>

          {isLoadingScenario1 ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : interestsData.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500">
                No interest categories found. Register users with interests or run the seed script.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interestsData.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-base font-bold text-slate-900">
                      #{item.interest}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {item.userCount} user{item.userCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold uppercase text-slate-400">
                      Associated Users
                    </div>
                    {item.users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-800">{u.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[120px]">
                          {u.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SCENARIO 2 VIEW */}
      {/* ============================================================== */}
      {activeScenario === 2 && (
        <div className="mt-6 space-y-6">
          {/* Architecture Note */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Constraint Compliance:</span> Executed via{' '}
              <code className="bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-800 font-mono">
                single aggregation pipeline with $lookup
              </code>{' '}
              stage. Filtered by user{' '}
              <code className="bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-800 font-mono">_id</code>,
              joined with the{' '}
              <code className="bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-800 font-mono">posts</code>{' '}
              collection via foreign key index{' '}
              <code className="bg-indigo-100/80 px-1.5 py-0.5 rounded text-indigo-800 font-mono">
                &#123; userId: 1, createdAt: -1, _id: -1 &#125;
              </code>
              . Passwords and internal fields are completely excluded.
            </div>
          </div>

          {/* User Selector Dropdown */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select User to Query via $lookup
              </label>
              <select
                value={selectedUserId}
                onChange={handleUserSelect}
                className="w-full sm:w-80 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Target Endpoint: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">GET /api/aggregations/user-posts/{selectedUserId || ':id'}</code>
            </div>
          </div>

          {/* Result Presentation */}
          {isLoadingScenario2 ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : !userProfileWithPosts ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500">Select a user above to run the $lookup pipeline.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
              {/* User Profile Card */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {userProfileWithPosts.name}
                  </h2>
                  <p className="text-sm text-slate-500">{userProfileWithPosts.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Role: {userProfileWithPosts.role}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Total Posts Joined: {userProfileWithPosts.postCount}
                  </span>
                </div>
              </div>

              {/* Joined Posts Section */}
              <div>
                <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-1.5" />
                  Posts Returned by $lookup Pipeline ({userProfileWithPosts.posts.length})
                </h3>

                {userProfileWithPosts.posts.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">
                      This user currently has zero posts. The aggregation pipeline gracefully returned an empty array.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userProfileWithPosts.posts.map((post) => (
                      <div
                        key={post.id}
                        className="p-4 rounded-lg bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <h4 className="font-bold text-slate-900 text-sm">{post.title}</h4>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-3">
                          {post.content}
                        </p>
                        <div className="mt-3 text-[11px] text-slate-400">
                          Created: {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
