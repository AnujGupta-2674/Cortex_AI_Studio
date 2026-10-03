import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectConversations,
  selectActiveConversationId,
  selectLoadingConversations,
  setActiveConversation,
  startNewChat,
  deleteConversation,
  renameConversation,
  fetchMessages,
} from '../redux/slices/chatSlice.js';
import { selectCurrentUser, logoutUser } from '../redux/slices/authSlice.js';

export const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const conversations = useSelector(selectConversations);
  const activeConversationId = useSelector(selectActiveConversationId);
  const loading = useSelector(selectLoadingConversations);
  const user = useSelector(selectCurrentUser);

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Untitled Chat').toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectConversation = (id) => {
    dispatch(setActiveConversation(id));
    dispatch(fetchMessages(id));
    if (onClose) onClose();
  };

  const handleNewChat = () => {
    dispatch(startNewChat());
    if (onClose) onClose();
  };

  const handleStartRename = (e, c) => {
    e.stopPropagation();
    setEditingId(c._id);
    setEditTitle(c.title || 'New Chat');
    setMenuOpenId(null);
  };

  const handleSaveRename = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      dispatch(renameConversation({ id, title: editTitle.trim() }));
    }
    setEditingId(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      dispatch(deleteConversation(id));
    }
    setMenuOpenId(null);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 md:static md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col bg-[#0b0e17]/95 md:bg-[#07090e]/80 border-r border-white/[0.08] backdrop-blur-2xl text-slate-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-md shadow-purple-500/20">
            <div className="h-full w-full bg-[#0b0e14] rounded-[11px] flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.07 6.26 5 7.42V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.58c2.93-1.16 5-4.05 5-7.42a8 8 0 0 0-8-8z" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Cortex AI
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Studio
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Multi-Agent Mesh
            </p>
          </div>
        </div>

        {/* Close mobile button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05]"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* New Chat Button (matching outline wireframe top) */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-cyan-500/20 hover:from-purple-600/30 hover:via-indigo-600/30 hover:to-cyan-500/30 border border-purple-500/30 hover:border-purple-400/50 text-white font-medium text-sm transition-all duration-200 shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-purple-500/20 text-purple-300">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span>New Chat</span>
          </div>
          <span className="text-[11px] text-slate-400 group-hover:text-purple-300 font-mono transition-colors">
            +
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.08] focus:border-purple-500/50 focus:bg-white/[0.06] rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Conversations List (middle section in wireframe outline) */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent Chats
        </div>

        {loading && conversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2">
            <div className="w-5 h-5 mx-auto border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading history...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs text-slate-500">
            {search ? 'No matching chats found' : 'No chats yet. Start a new conversation above!'}
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isActive = activeConversationId === c._id;
            const isEditing = editingId === c._id;

            return (
              <div
                key={c._id}
                onClick={() => handleSelectConversation(c._id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border border-purple-500/30 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <svg
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(e, c._id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={(e) => handleSaveRename(e, c._id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="bg-black/60 border border-purple-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                    />
                  ) : (
                    <span className="text-xs truncate">{c.title || 'Untitled Chat'}</span>
                  )}
                </div>

                {/* Hover / Options Menu */}
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStartRename(e, c)}
                      title="Rename"
                      className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-white/[0.08]"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, c._id)}
                      title="Delete"
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-white/[0.08]"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* User Footer Profile & Settings (matching bottom pill in wireframe outline) */}
      <div className="p-3 border-t border-white/[0.08] bg-[#07090e]/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email || 'cortex'}`}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border border-purple-500/30 object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#07090e]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'Explorer'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Logged in'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
