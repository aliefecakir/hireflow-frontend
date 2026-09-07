import { apiRequest } from '../../shared/api/client'

export interface PostStatus {
  shrtCode: string
  name: string
}

export interface Post {
  postId: string
  title: string
  descr: string
  reqTech: string | null
  reqDept: string | null
  applied?: boolean
  status: PostStatus | null
  cdate: string
  udate: string
}

export interface PostPayload {
  title: string
  descr: string
  reqTech: string
  reqDept: string
  statusCode: string
}

export function fetchActivePosts(): Promise<Post[]> {
  return apiRequest<Post[]>('/posts')
}

export function fetchManagedPosts(): Promise<Post[]> {
  return apiRequest<Post[]>('/posts/manage')
}

export function createPost(payload: PostPayload): Promise<Post> {
  return apiRequest<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updatePost(postId: string, payload: PostPayload): Promise<Post> {
  return apiRequest<Post>(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updatePostStatus(postId: string, statusCode: string): Promise<Post> {
  return apiRequest<Post>(`/posts/${postId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ statusCode }),
  })
}
