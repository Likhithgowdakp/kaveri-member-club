const BASE_URL = '/api/v1';

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, detail: any) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('kaveri_admin_token');
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Support HttpOnly cookies
  });

  if (!response.ok) {
    let errDetail = 'Request failed';
    try {
      const data = await response.json();
      errDetail = data.detail || errDetail;
    } catch {
      errDetail = await response.text();
    }
    throw new ApiError(response.status, errDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Members Public
  registerMember: (data: {
    full_name: string;
    primary_phone: string;
    alt_phone?: string;
    email?: string;
    address?: string;
    password?: string;
    consent_whatsapp: boolean;
    consent_sms: boolean;
    accept_privacy_notice: boolean;
  }) => request<any>('/members/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  memberLogin: (data: { member_identifier: string; password: string }) =>
    request<any>('/members/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMemberCard: (memberNumber: string) =>
    request<any>(`/members/${encodeURIComponent(memberNumber)}/card`),

  // Customer Preferences & DPDP
  verifyCustomer: (memberNumber: string, phone: string) =>
    request<any>('/preferences/verify', {
      method: 'POST',
      body: JSON.stringify({ member_number: memberNumber, phone }),
    }),

  updateConsent: (data: {
    member_number: string;
    phone: string;
    whatsapp_consent?: boolean;
    sms_consent?: boolean;
    reason?: string;
  }) => request<any>('/preferences/update-consent', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  requestCorrection: (data: {
    member_number: string;
    phone: string;
    requested_name?: string;
    requested_email?: string;
    requested_address?: string;
    notes?: string;
  }) => request<any>('/preferences/request-correction', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  requestAccountClosure: (data: {
    member_number: string;
    phone: string;
    reason?: string;
    confirm_closure: boolean;
  }) => request<any>('/preferences/request-deletion', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Admin Auth
  adminLogin: async (credentials: { username: string; password: string }) => {
    const res = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.access_token) {
      localStorage.setItem('kaveri_admin_token', res.access_token);
      localStorage.setItem('kaveri_admin_user', JSON.stringify(res.user));
    }
    return res;
  },

  adminLogout: async () => {
    try {
      await request<any>('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('kaveri_admin_token');
      localStorage.removeItem('kaveri_admin_user');
    }
  },

  getAdminProfile: () => request<any>('/auth/me'),

  changePassword: (data: { current_password: string; new_password: string }) =>
    request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard & Members Management
  getDashboardStats: () => request<any>('/dashboard/stats'),

  listMembers: (params?: { q?: string; status_filter?: string; page?: number; page_size?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.status_filter) qs.set('status_filter', params.status_filter);
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.page_size) qs.set('page_size', params.page_size.toString());
    return request<any>(`/admin/members/?${qs.toString()}`);
  },

  getMemberDetail: (memberId: number) =>
    request<any>(`/admin/members/${memberId}`),

  updateMember: (memberId: number, data: any) =>
    request<any>(`/admin/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  adjustLoyaltyPoints: (memberId: number, points: number, notes: string) => {
    const qs = new URLSearchParams({ points: points.toString(), notes });
    return request<any>(`/admin/members/${memberId}/loyalty?${qs.toString()}`, {
      method: 'POST',
    });
  },

  deleteMember: (memberId: number) =>
    request<any>(`/admin/members/${memberId}`, {
      method: 'DELETE',
    }),

  sendAppSms: (memberId: number, message: string) =>
    request<any>(`/admin/members/${memberId}/send-app-sms`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Campaigns
  previewCampaign: (data: any) =>
    request<any>('/admin/campaigns/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createCampaign: (data: any) =>
    request<any>('/admin/campaigns/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCampaigns: () => request<any>('/admin/campaigns/'),

  getCampaignDetail: (campaignId: number) =>
    request<any>(`/admin/campaigns/${campaignId}`),

  approveCampaign: (campaignId: number) =>
    request<any>(`/admin/campaigns/${campaignId}/approve`, {
      method: 'POST',
    }),

  scheduleCampaign: (campaignId: number) =>
    request<any>(`/admin/campaigns/${campaignId}/schedule`, {
      method: 'POST',
    }),

  cancelCampaign: (campaignId: number, reason: string) =>
    request<any>(`/admin/campaigns/${campaignId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  dispatchCampaignNow: (campaignId: number) =>
    request<any>(`/admin/campaigns/${campaignId}/dispatch-now`, {
      method: 'POST',
    }),

  // Audit & Providers
  getAuditLogs: (limit = 50) => request<any>(`/admin/audit/?limit=${limit}`),

  getProviderStatus: () => request<any>('/providers/status'),

  // Store & WhatsApp Group Settings
  getPublicSettings: () => request<any>('/settings/public'),
  getAdminSettings: () => request<any>('/settings/admin'),
  updateAdminSettings: (data: { whatsapp_group_url?: string; business_phone?: string; welcome_message_template?: string }) =>
    request<any>('/settings/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
