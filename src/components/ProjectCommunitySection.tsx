import React, { useState } from 'react'
import {
  Heart,
  MessageSquare,
  ThumbsUp,
  Reply,
  Edit2,
  Trash2,
  Flag,
  Send,
  User,
  Check,
} from 'lucide-react'
import type { Comment } from '../types/project'

interface ProjectCommunitySectionProps {
  projectId: string
  initialLikesCount: number
  initialComments: Comment[]
  onRequireAuth: () => void
  isAuthenticated?: boolean
}

export const ProjectCommunitySection: React.FC<ProjectCommunitySectionProps> = ({
  projectId,
  initialLikesCount,
  initialComments,
  onRequireAuth,
  isAuthenticated = false,
}) => {
  // Likes state
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [isLiked, setIsLiked] = useState(false)

  // Comments state
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [sortBy, setSortBy] = useState<'newest' | 'mostLiked'>('newest')
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [reportedCommentIds, setReportedCommentIds] = useState<string[]>([])
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const showTemporaryNotice = (msg: string) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(null), 3000)
  }

  // Handle Like Project
  const handleToggleLike = () => {
    if (!isAuthenticated) {
      onRequireAuth()
      return
    }
    if (isLiked) {
      setIsLiked(false)
      setLikesCount((prev) => prev - 1)
      showTemporaryNotice('Project unliked.')
    } else {
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)
      showTemporaryNotice('Thanks for supporting this academic project!')
    }
  }

  // Handle Add Root Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      onRequireAuth()
      return
    }
    if (!newCommentText.trim()) return

    const newComment: Comment = {
      id: 'c-' + Date.now(),
      projectId,
      userId: 'current-user',
      userName: 'Current Student',
      userAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      content: newCommentText.trim(),
      likesCount: 0,
      createdAt: 'Just now',
      replies: [],
    }

    setComments([newComment, ...comments])
    setNewCommentText('')
    showTemporaryNotice('Comment submitted successfully.')
  }

  // Handle Reply Submit
  const handleAddReply = (parentId: string) => {
    if (!isAuthenticated) {
      onRequireAuth()
      return
    }
    if (!replyText.trim()) return

    const newReply: Comment = {
      id: 'reply-' + Date.now(),
      projectId,
      userId: 'current-user',
      userName: 'Current Student',
      userAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      content: replyText.trim(),
      parentCommentId: parentId,
      likesCount: 0,
      createdAt: 'Just now',
    }

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply],
          }
        }
        return c
      })
    )
    setReplyingToId(null)
    setReplyText('')
    showTemporaryNotice('Reply posted.')
  }

  // Handle Edit Submit
  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return { ...c, content: editText.trim(), updatedAt: 'Edited just now' }
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === commentId
                ? { ...r, content: editText.trim(), updatedAt: 'Edited just now' }
                : r
            ),
          }
        }
        return c
      })
    )
    setEditingCommentId(null)
    setEditText('')
    showTemporaryNotice('Comment updated.')
  }

  // Handle Delete
  const handleDeleteComment = (commentId: string) => {
    setComments((prev) =>
      prev
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== commentId) || [],
        }))
    )
    showTemporaryNotice('Comment removed.')
  }

  // Handle Like Comment
  const handleLikeComment = (commentId: string) => {
    if (!isAuthenticated) {
      onRequireAuth()
      return
    }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const liked = c.isLiked
          return {
            ...c,
            likesCount: liked ? c.likesCount - 1 : c.likesCount + 1,
            isLiked: !liked,
          }
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === commentId) {
                const liked = r.isLiked
                return {
                  ...r,
                  likesCount: liked ? r.likesCount - 1 : r.likesCount + 1,
                  isLiked: !liked,
                }
              }
              return r
            }),
          }
        }
        return c
      })
    )
  }

  // Handle Report
  const handleReportComment = (commentId: string) => {
    if (reportedCommentIds.includes(commentId)) {
      showTemporaryNotice('Comment already reported for review.')
      return
    }
    setReportedCommentIds([...reportedCommentIds, commentId])
    showTemporaryNotice('Flagged for faculty moderation review.')
  }

  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'mostLiked') return b.likesCount - a.likesCount
    return 0 // Keep order
  })

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-8">
      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-[#6658FF]/10 text-[#6658FF] border border-[#6658FF]/20 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Like Bar & Community Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6658FF]" />
            <h3 className="text-xl sm:text-2xl font-bold text-[#0B192C]">
              Community Discussion & Feedback
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Join the peer review, ask questions about architecture, and suggest enhancements.
          </p>
        </div>

        {/* Dynamic Project Like Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isLiked
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
            <span>{isLiked ? 'Liked' : 'Like Project'}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[11px] bg-black/10 font-mono">
              {likesCount}
            </span>
          </button>
        </div>
      </div>

      {/* New Comment Input Box */}
      <div className="space-y-3">
        <form onSubmit={handleAddComment} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6658FF]/10 border border-[#6658FF]/20 flex items-center justify-center text-[#6658FF] shrink-0 mt-1">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 relative">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onFocus={() => {
                  if (!isAuthenticated) onRequireAuth()
                }}
                rows={3}
                placeholder={
                  isAuthenticated
                    ? 'Leave constructive technical feedback, ask a question, or praise the team...'
                    : 'Sign in to join the discussion and submit feedback...'
                }
                className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40 focus:border-[#6658FF] placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pl-12">
            <span className="text-[11px] text-slate-400 font-medium">
              Academic etiquette: Keep discussions constructive and relevant.
            </span>

            <button
              type="submit"
              disabled={!newCommentText.trim() && isAuthenticated}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#6658FF] hover:from-[#1D4ED8] hover:to-[#5546FF] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comments List & Sorting Bar */}
      <div className="space-y-5 pt-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0B192C]">
            <MessageSquare className="w-4 h-4 text-[#6658FF]" />
            <span>{comments.length} Comments</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Sort by:</span>
            <button
              onClick={() => setSortBy('newest')}
              className={`font-semibold cursor-pointer ${
                sortBy === 'newest' ? 'text-[#6658FF] underline' : 'text-slate-600'
              }`}
            >
              Newest
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => setSortBy('mostLiked')}
              className={`font-semibold cursor-pointer ${
                sortBy === 'mostLiked' ? 'text-[#6658FF] underline' : 'text-slate-600'
              }`}
            >
              Most Liked
            </button>
          </div>
        </div>

        {/* Comment Cards */}
        {sortedComments.length > 0 ? (
          <div className="space-y-6">
            {sortedComments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 mt-0.5"
                  />

                  <div className="flex-1 min-w-0 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                    {/* User and timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#0B192C]">
                          {comment.userName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {comment.createdAt}
                        </span>
                        {comment.updatedAt && (
                          <span className="text-[10px] text-slate-400 italic font-mono">
                            ({comment.updatedAt})
                          </span>
                        )}
                      </div>

                      {/* Comment Actions (Edit / Delete / Report) */}
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {comment.userId === 'current-user' ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id)
                                setEditText(comment.content)
                              }}
                              className="p-1 hover:text-[#6658FF] transition-colors"
                              title="Edit comment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:text-rose-500 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleReportComment(comment.id)}
                            className={`p-1 transition-colors ${
                              reportedCommentIds.includes(comment.id)
                                ? 'text-amber-500'
                                : 'hover:text-amber-500'
                            }`}
                            title="Report comment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content or Edit Box */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40"
                          rows={2}
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1 rounded-full text-xs text-slate-500 hover:bg-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            className="px-4 py-1 rounded-full text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5546FF] cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                        {comment.content}
                      </p>
                    )}

                    {/* Interaction toolbar: Like + Reply */}
                    <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          comment.isLiked ? 'text-[#6658FF]' : 'hover:text-slate-800'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-[#6658FF]' : ''}`} />
                        <span>{comment.likesCount}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            onRequireAuth()
                            return
                          }
                          setReplyingToId(replyingToId === comment.id ? null : comment.id)
                        }}
                        className="flex items-center gap-1 hover:text-[#6658FF] transition-colors cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>

                    {/* Inline Reply Form */}
                    {replyingToId === comment.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={2}
                          className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6658FF]/40"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setReplyingToId(null)}
                            className="px-3 py-1 rounded-full text-xs text-slate-500 hover:bg-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddReply(comment.id)}
                            className="px-4 py-1 rounded-full text-xs font-bold text-white bg-[#6658FF] cursor-pointer"
                          >
                            Post Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-11 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3">
                        <img
                          src={reply.userAvatar}
                          alt={reply.userName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 mt-0.5"
                        />
                        <div className="flex-1 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/70">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#0B192C]">
                                {reply.userName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {reply.createdAt}
                              </span>
                            </div>

                            {reply.userId === 'current-user' && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete reply"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {reply.content}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                            <button
                              onClick={() => handleLikeComment(reply.id)}
                              className={`flex items-center gap-1 transition-colors cursor-pointer ${
                                reply.isLiked ? 'text-[#6658FF]' : 'hover:text-slate-800'
                              }`}
                            >
                              <ThumbsUp className={`w-3 h-3 ${reply.isLiked ? 'fill-[#6658FF]' : ''}`} />
                              <span>{reply.likesCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            No comments yet. Be the first to share your feedback on this project!
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectCommunitySection
