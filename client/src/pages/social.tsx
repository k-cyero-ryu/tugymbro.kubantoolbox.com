import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Image as ImageIcon, User, X, Edit2, Trash2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useAuth } from "@/hooks/useAuth";

const createPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(2000, "Post too long"),
  imageUrl: z.string().optional(),
  imageName: z.string().optional(),
  imageSize: z.number().optional(),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

interface SocialPost {
  id: string;
  content: string;
  imageUrl?: string;
  imageName?: string;
  imageSize?: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorUsername: string;
  authorRole: string;
  authorProfileImageUrl?: string;
}

interface SocialComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  postId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorUsername: string;
  authorRole: string;
  authorProfileImageUrl?: string;
}

export default function Social() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");

  // Fetch social posts
  const { data: posts, isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social/posts"],
  });

  // Create post form
  const form = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
      imageUrl: "",
      imageName: "",
      imageSize: 0,
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: CreatePostForm) => apiRequest("POST", "/api/social/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      form.reset();
      setShowCreateForm(false);
      setSelectedImage(null);
      setImagePreview(null);
      toast({
        title: t("social.postCreated", "Post created successfully"),
        description: t("social.postCreatedDesc", "Your post has been shared with the community"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("social.createPostError", "Failed to create post"),
        variant: "destructive",
      });
    },
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: (postId: string) => apiRequest("POST", `/api/social/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) => 
      apiRequest("POST", `/api/social/posts/${postId}/comments`, { content }),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts", postId, "comments"] });
      setNewComments(prev => ({ ...prev, [postId]: "" }));
    },
  });

  // Edit post mutation
  const editPostMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      apiRequest("PUT", `/api/social/posts/${postId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      setEditingPostId(null);
      setEditPostContent("");
      toast({
        title: t("social.postUpdated", "Post updated successfully"),
        description: t("social.postUpdatedDesc", "Your post has been updated"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("social.editPostError", "Failed to update post"),
        variant: "destructive",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => apiRequest("DELETE", `/api/social/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({
        title: t("social.postDeleted", "Post deleted successfully"),
        description: t("social.postDeletedDesc", "Your post has been removed"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("social.deletePostError", "Failed to delete post"),
        variant: "destructive",
      });
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiRequest("PUT", `/api/social/comments/${commentId}`, { content }),
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      // Find the post ID for this comment to refresh comments
      const postWithComment = posts?.find(post => 
        expandedComments.has(post.id)
      );
      if (postWithComment) {
        queryClient.invalidateQueries({ queryKey: ["/api/social/posts", postWithComment.id, "comments"] });
      }
      setEditingCommentId(null);
      setEditCommentContent("");
      toast({
        title: t("social.commentUpdated", "Comment updated successfully"),
        description: t("social.commentUpdatedDesc", "Your comment has been updated"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("social.editCommentError", "Failed to update comment"),
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => apiRequest("DELETE", `/api/social/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      // Find the post ID for this comment to refresh comments
      const postWithComment = posts?.find(post => 
        expandedComments.has(post.id)
      );
      if (postWithComment) {
        queryClient.invalidateQueries({ queryKey: ["/api/social/posts", postWithComment.id, "comments"] });
      }
      toast({
        title: t("social.commentDeleted", "Comment deleted successfully"),
        description: t("social.commentDeletedDesc", "Your comment has been removed"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("social.deleteCommentError", "Failed to delete comment"),
        variant: "destructive",
      });
    },
  });

  // Fetch comments for expanded posts
  const fetchComments = (postId: string) => {
    return useQuery<SocialComment[]>({
      queryKey: ["/api/social/posts", postId, "comments"],
      enabled: expandedComments.has(postId),
    });
  };

  // Handle photo upload
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json() as { uploadURL: string };
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL || "";
      const imageName = uploadedFile.name || "";
      const imageSize = uploadedFile.size || 0;
      
      // Update form with image data
      form.setValue("imageUrl", imageUrl);
      form.setValue("imageName", imageName);
      form.setValue("imageSize", imageSize);
      
      setSelectedImage(uploadedFile.data as File);
      setImagePreview(imageUrl);
    }
  };

  const removeSelectedImage = () => {
    form.setValue("imageUrl", "");
    form.setValue("imageName", "");
    form.setValue("imageSize", 0);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const onSubmit = (data: CreatePostForm) => {
    createPostMutation.mutate(data);
  };

  const handleToggleLike = (postId: string) => {
    toggleLikeMutation.mutate(postId);
  };

  const handleToggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCreateComment = (postId: string) => {
    const content = newComments[postId];
    if (!content?.trim()) return;

    createCommentMutation.mutate({ postId, content });
  };

  // Helper functions for edit/delete actions
  const handleEditPost = (post: SocialPost) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
  };

  const handleSavePostEdit = (postId: string) => {
    if (!editPostContent.trim()) return;
    editPostMutation.mutate({ postId, content: editPostContent });
  };

  const handleCancelPostEdit = () => {
    setEditingPostId(null);
    setEditPostContent("");
  };

  const handleDeletePost = (postId: string) => {
    deletePostMutation.mutate(postId);
  };

  const handleEditComment = (comment: SocialComment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleSaveCommentEdit = (commentId: string) => {
    if (!editCommentContent.trim()) return;
    editCommentMutation.mutate({ commentId, content: editCommentContent });
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  const getRoleBadgeColor = (role: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'trainer': return 'default';
      case 'client': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return t('roles.superadmin', 'SuperAdmin');
      case 'trainer': return t('roles.trainer', 'Trainer');
      case 'client': return t('roles.client', 'Client');
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("social.title", "Social Feed")}
        </h1>

        {/* Create Post Button */}
        {!showCreateForm && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowCreateForm(true)}>
            <CardContent className="py-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full py-2 px-4 text-gray-500 dark:text-gray-400">
                  {t("social.createPostPrompt", "Share something with the community...")}
                </div>
                <Button size="sm" data-testid="button-create-new-post">
                  {t("social.createPost", "Post")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Post Form */}
        {showCreateForm && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold">{t("social.createPost", "Create New Post")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowCreateForm(false);
                  form.reset();
                  removeSelectedImage();
                }}
                data-testid="button-cancel-create-post"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={t("social.postPlaceholder", "What's on your mind? Share your fitness journey, tips, or achievements...")}
                            className="min-h-[100px] resize-none"
                            {...field}
                            data-testid="input-post-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-full max-h-64 rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeSelectedImage}
                        data-testid="button-remove-image"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handlePhotoUploadComplete}
                      buttonClassName="variant-outline"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {t("social.addPhoto", "Add Photo")}
                      </div>
                    </ObjectUploader>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          form.reset();
                          removeSelectedImage();
                        }}
                        data-testid="button-cancel-post"
                      >
                        {t("common.cancel", "Cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPostMutation.isPending}
                        data-testid="button-create-post"
                      >
                        {createPostMutation.isPending ? t("common.posting", "Posting...") : t("common.post", "Post")}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts && posts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-gray-500 dark:text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {t("social.noPostsTitle", "No posts yet")}
                  </h3>
                  <p>
                    {t("social.noPostsDesc", "Be the first to share something with the community!")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            posts?.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                onToggleLike={handleToggleLike}
                onToggleComments={handleToggleComments}
                isCommentsExpanded={expandedComments.has(post.id)}
                newComment={newComments[post.id] || ""}
                onNewCommentChange={(value) => 
                  setNewComments(prev => ({ ...prev, [post.id]: value }))
                }
                onCreateComment={handleCreateComment}
                onEditPost={handleEditPost}
                onSavePostEdit={handleSavePostEdit}
                onCancelPostEdit={handleCancelPostEdit}
                onDeletePost={handleDeletePost}
                onEditComment={handleEditComment}
                onSaveCommentEdit={handleSaveCommentEdit}
                onCancelCommentEdit={handleCancelCommentEdit}
                onDeleteComment={handleDeleteComment}
                fetchComments={fetchComments}
                getRoleBadgeColor={getRoleBadgeColor}
                getRoleLabel={getRoleLabel}
                createCommentMutation={createCommentMutation}
                editingPostId={editingPostId}
                editingCommentId={editingCommentId}
                editPostContent={editPostContent}
                editCommentContent={editCommentContent}
                setEditPostContent={setEditPostContent}
                setEditCommentContent={setEditCommentContent}
                editPostMutation={editPostMutation}
                editCommentMutation={editCommentMutation}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: SocialPost;
  currentUser: any;
  onToggleLike: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  isCommentsExpanded: boolean;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onCreateComment: (postId: string) => void;
  onEditPost: (post: SocialPost) => void;
  onSavePostEdit: (postId: string) => void;
  onCancelPostEdit: () => void;
  onDeletePost: (postId: string) => void;
  onEditComment: (comment: SocialComment) => void;
  onSaveCommentEdit: (commentId: string) => void;
  onCancelCommentEdit: () => void;
  onDeleteComment: (commentId: string) => void;
  fetchComments: (postId: string) => any;
  getRoleBadgeColor: (role: string) => string;
  getRoleLabel: (role: string) => string;
  createCommentMutation: any;
  editingPostId: string | null;
  editingCommentId: string | null;
  editPostContent: string;
  editCommentContent: string;
  setEditPostContent: (content: string) => void;
  setEditCommentContent: (content: string) => void;
  editPostMutation: any;
  editCommentMutation: any;
}

function PostCard({
  post,
  currentUser,
  onToggleLike,
  onToggleComments,
  isCommentsExpanded,
  newComment,
  onNewCommentChange,
  onCreateComment,
  onEditPost,
  onSavePostEdit,
  onCancelPostEdit,
  onDeletePost,
  onEditComment,
  onSaveCommentEdit,
  onCancelCommentEdit,
  onDeleteComment,
  fetchComments,
  getRoleBadgeColor,
  getRoleLabel,
  createCommentMutation,
  editingPostId,
  editingCommentId,
  editPostContent,
  editCommentContent,
  setEditPostContent,
  setEditCommentContent,
  editPostMutation,
  editCommentMutation
}: PostCardProps) {
  const { t } = useTranslation();
  const { data: comments }: { data: SocialComment[] | undefined } = fetchComments(post.id);
  
  const isAuthor = currentUser?.id === post.authorId;
  const isEditing = editingPostId === post.id;

  return (
    <Card data-testid={`card-social-post-${post.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.authorProfileImageUrl} />
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>
                {post.authorFirstName} {post.authorLastName}
              </h3>
              <Badge variant={getRoleBadgeColor(post.authorRole) as any} className="text-xs">
                {getRoleLabel(post.authorRole)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-username-${post.id}`}>
              @{post.authorUsername}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-time-${post.id}`}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`dropdown-post-${post.id}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEditPost(post)}
                  data-testid={`menu-edit-post-${post.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t("common.edit", "Edit")}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`menu-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t("common.delete", "Delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("social.deletePostTitle", "Delete Post")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("social.deletePostConfirm", "Are you sure you want to delete this post? This action cannot be undone.")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeletePost(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid={`confirm-delete-post-${post.id}`}
                      >
                        {t("common.delete", "Delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                className="min-h-[80px] resize-none"
                placeholder={t("social.editPostPlaceholder", "Edit your post...")}
                data-testid={`textarea-edit-post-${post.id}`}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancelPostEdit}
                  data-testid={`button-cancel-edit-post-${post.id}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSavePostEdit(post.id)}
                  disabled={editPostMutation.isPending || !editPostContent.trim()}
                  data-testid={`button-save-edit-post-${post.id}`}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {editPostMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap" data-testid={`text-content-${post.id}`}>
              {post.content}
            </p>
          )}
          
          {post.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={post.imageUrl.startsWith('/objects/') ? post.imageUrl : post.imageUrl}
                alt={post.imageName || "Post image"}
                className="w-full max-h-96 object-cover"
                data-testid={`img-post-${post.id}`}
              />
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleLike(post.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-red-500"
                data-testid={`button-like-${post.id}`}
              >
                <Heart className="w-4 h-4" />
                <span className="text-xs">{post.likesCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleComments(post.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
                data-testid={`button-comments-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{post.commentsCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1 text-gray-500 hover:text-green-500"
                disabled
                data-testid={`button-share-${post.id}`}
              >
                <Share2 className="w-4 h-4" />
                <span className="text-xs">{t("common.share", "Share")}</span>
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {isCommentsExpanded && (
            <div className="space-y-4 pt-4 border-t">
              {/* New Comment Input */}
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex space-x-2">
                  <Textarea
                    placeholder={t("social.commentPlaceholder", "Write a comment...")}
                    className="min-h-[60px] resize-none flex-1"
                    value={newComment}
                    onChange={(e) => onNewCommentChange(e.target.value)}
                    data-testid={`input-comment-${post.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => onCreateComment(post.id)}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    data-testid={`button-send-comment-${post.id}`}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments?.map((comment) => {
                  const isCommentAuthor = currentUser?.id === comment.authorId;
                  const isEditingComment = editingCommentId === comment.id;
                  
                  return (
                    <div key={comment.id} className="flex space-x-3" data-testid={`comment-${comment.id}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.authorProfileImageUrl} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        {isEditingComment ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              className="min-h-[60px] resize-none"
                              placeholder={t("social.editCommentPlaceholder", "Edit your comment...")}
                              data-testid={`textarea-edit-comment-${comment.id}`}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCancelCommentEdit}
                                data-testid={`button-cancel-edit-comment-${comment.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                {t("common.cancel", "Cancel")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onSaveCommentEdit(comment.id)}
                                disabled={editCommentMutation.isPending || !editCommentContent.trim()}
                                data-testid={`button-save-edit-comment-${comment.id}`}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                {editCommentMutation.isPending ? t("common.saving", "Saving...") : t("common.save", "Save")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 relative group">
                              {isCommentAuthor && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`dropdown-comment-${comment.id}`}>
                                        <MoreHorizontal className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => onEditComment(comment)}
                                        data-testid={`menu-edit-comment-${comment.id}`}
                                      >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        {t("common.edit", "Edit")}
                                      </DropdownMenuItem>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem 
                                            onSelect={(e) => e.preventDefault()}
                                            data-testid={`menu-delete-comment-${comment.id}`}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {t("common.delete", "Delete")}
                                          </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t("social.deleteCommentTitle", "Delete Comment")}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              {t("social.deleteCommentConfirm", "Are you sure you want to delete this comment? This action cannot be undone.")}
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => onDeleteComment(comment.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              data-testid={`confirm-delete-comment-${comment.id}`}
                                            >
                                              {t("common.delete", "Delete")}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold text-sm" data-testid={`text-comment-author-${comment.id}`}>
                                  {comment.authorFirstName} {comment.authorLastName}
                                </span>
                                <Badge variant={getRoleBadgeColor(comment.authorRole) as any} className="text-xs">
                                  {getRoleLabel(comment.authorRole)}
                                </Badge>
                              </div>
                              <p className="text-sm pr-6" data-testid={`text-comment-content-${comment.id}`}>
                                {comment.content}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" data-testid={`text-comment-time-${comment.id}`}>
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}