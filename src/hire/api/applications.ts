import { apiRequest } from '../../shared/api/client'

export interface ApplicationStatus {
  shrtCode: string
  name: string
  descr?: string | null
}

export interface Application {
  appId: string
  postId: string
  postTitle: string
  postDescr?: string | null
  postReqTech?: string | null
  postReqDept?: string | null
  cndtId: string
  candidateName: string
  candidateSurname: string
  candidateEmail: string
  status: ApplicationStatus | null
  appliedDate: string
}

export function applyToPost(postId: string): Promise<Application> {
  return apiRequest<Application>('/applications', {
    method: 'POST',
    body: JSON.stringify({ postId }),
  })
}

export function fetchMyApplications(): Promise<Application[]> {
  return apiRequest<Application[]>('/applications/my')
}

export function fetchManagedApplications(): Promise<Application[]> {
  return apiRequest<Application[]>('/applications/manage')
}

export function fetchApplicationsByPost(postId: string): Promise<Application[]> {
  return apiRequest<Application[]>(`/applications/manage/post/${postId}`)
}

export function updateApplicationStatus(appId: string, statusCode: string): Promise<Application> {
  return apiRequest<Application>(`/applications/${appId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ statusCode }),
  })
}
