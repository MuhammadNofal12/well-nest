export type Member = {
  id: string
  email: string
  fullName: string
}

export type Appointment = {
  id: string
  service: string
  clinician: string
  startsAt: string
  status: 'scheduled' | 'cancelled' | 'completed'
  createdAt: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const apiBase = import.meta.env.VITE_API_URL ?? '/api'

type ErrorPayload = { error?: { code?: string; message?: string } }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError('Unable to reach the API. Start the backend and PostgreSQL, then try again.', 0, 'network_error')
  }

  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({})) as ErrorPayload & T
  if (!response.ok) {
    throw new ApiError(payload.error?.message ?? 'The request could not be completed.', response.status, payload.error?.code)
  }
  return payload
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}

export const api = {
  auth: {
    me: () => request<{ user: Member }>('/auth/me'),
    login: (email: string, password: string) => post<{ user: Member }>('/auth/login', { email, password }),
    signup: (fullName: string, email: string, password: string) => post<{ user: Member }>('/auth/signup', { fullName, email, password }),
    logout: () => post<void>('/auth/logout'),
  },
  appointments: {
    list: () => request<{ appointments: Appointment[] }>('/appointments'),
    create: (input: { service: string; clinician: string; startsAt: string }) => post<{ appointment: Appointment }>('/appointments', input),
  },
  chat: {
    currentSession: () => request<{ session: { id: string; title: string } }>('/chat/sessions/current'),
    createSession: () => post<{ session: { id: string; title: string } }>('/chat/sessions', { title: 'Appointment planning' }),
    messages: (sessionId: string) => request<{ messages: ChatMessage[] }>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`),
    send: (sessionId: string, content: string) => post<{
      userMessage: ChatMessage
      assistantMessage: ChatMessage
      bookingIntent: { service: string | null; clinician: string | null; date: string | null; time: string | null } | null
      requiresForm: boolean
      provider: 'mistral' | 'fallback'
    }>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, { content }),
  },
}
