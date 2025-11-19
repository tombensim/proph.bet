"use client"

import { useState, useTransition } from "react"
import { createComment, updateComment, deleteComment } from "@/app/actions/comments"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { useRouter } from "@/lib/navigation"
import { useTranslations } from 'next-intl';

interface Comment {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

interface CommentsSectionProps {
  marketId: string
  initialComments: Comment[]
  currentUserId: string
  isAdmin: boolean
}

export function CommentsSection({ marketId, initialComments, currentUserId, isAdmin }: CommentsSectionProps) {
  const t = useTranslations('MarketDetail');
  const tCommon = useTranslations('Common');
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newComment.trim()) {
      setError("Comment cannot be empty")
      return
    }

    startTransition(async () => {
      const result = await createComment(marketId, newComment)
      if (result.error) {
        setError(result.error)
      } else {
        setNewComment("")
        router.refresh()
      }
    })
  }

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditContent(comment.content)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditContent("")
    setError(null)
  }

  const handleUpdateComment = async (commentId: string) => {
    setError(null)

    if (!editContent.trim()) {
      setError("Comment cannot be empty")
      return
    }

    startTransition(async () => {
      const result = await updateComment(commentId, editContent)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingCommentId(null)
        setEditContent("")
        router.refresh()
      }
    })
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await deleteComment(commentId)
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const canEditComment = (comment: Comment) => {
    return comment.userId === currentUserId
  }

  const canDeleteComment = (comment: Comment) => {
    return comment.userId === currentUserId || isAdmin
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('comments')}</h2>
        
        {/* New Comment Form */}
        <Card className="p-4">
          <form onSubmit={handleCreateComment} className="space-y-4">
            <Textarea
              placeholder={t('shareThoughts')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isPending}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/2000
              </span>
              <Button type="submit" disabled={isPending || !newComment.trim()}>
                {isPending ? t('posting') : t('postComment')}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </Card>
      </div>

      <Separator />

      {/* Comments List */}
      <div className="space-y-4">
        {initialComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('noComments')}
          </p>
        ) : (
          initialComments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.user.image || undefined} />
                  <AvatarFallback>
                    {comment.user.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">
                        {comment.user.name || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground ms-2">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        {comment.updatedAt !== comment.createdAt && ` ${t('edited')}`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {editingCommentId !== comment.id && (
                      <div className="flex gap-2">
                        {canEditComment(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(comment)}
                            disabled={isPending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteComment(comment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment Content or Edit Form */}
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={isPending}
                        rows={3}
                        maxLength={2000}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {editContent.length}/2000
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isPending}
                          >
                            <X className="h-4 w-4 me-1" />
                            {tCommon('cancel')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={isPending || !editContent.trim()}
                          >
                            <Check className="h-4 w-4 me-1" />
                            {tCommon('save')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
