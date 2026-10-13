const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function handleResponse(res: Response, defaultMessage: string) {
  if (!res.ok) {
    let errorMsg = defaultMessage;
    try {
      const errorData = await res.json();
      if (errorData && errorData.error) {
        errorMsg = errorData.error;
      }
    } catch (_) {
      try {
        const text = await res.text();
        if (text) errorMsg = text;
      } catch (_) {}
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchProducts(all: boolean = false) {
  const res = await fetch(`${API_BASE}/products${all ? '?all=true' : ''}`, { cache: 'no-store' });
  return handleResponse(res, 'Failed to fetch products');
}


export async function saveProduct(productData: any) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  return handleResponse(res, 'Failed to save product');
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(res, 'Failed to delete product');
}

export async function getSignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; filePath: string }> {
  const res = await fetch(`${API_BASE}/upload/signed-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType }),
  });
  return handleResponse(res, 'Failed to generate signed upload URL');
}

export async function uploadImageViaSignedUrl(file: File): Promise<string> {
  const contentType = file.type || 'image/jpeg';
  const { uploadUrl, publicUrl } = await getSignedUploadUrl(file.name, contentType);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Direct bucket upload failed with status ${res.status}`);
  }
  return publicUrl;
}

export async function uploadImage(file: File): Promise<string> {
  try {
    return await uploadImageViaSignedUrl(file);
  } catch (err) {
    console.warn('Signed URL direct upload failed, attempting fallback multipart upload:', err);
    const formData = new FormData();
    formData.append('images', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await handleResponse(res, 'Failed to upload image');
    return data.imageUrl || (data.imageUrls && data.imageUrls[0]);
  }
}

export async function uploadImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];
  try {
    return await Promise.all(files.map((file) => uploadImageViaSignedUrl(file)));
  } catch (err) {
    console.warn('Signed URL direct uploads failed, attempting fallback multipart upload:', err);
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await handleResponse(res, 'Failed to upload images');
    return data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
  }
}

export async function createOrder(orderCommand: any) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderCommand),
  });
  return handleResponse(res, 'Failed to create order');
}

export async function fetchOrders(email?: string) {
  const url = email ? `${API_BASE}/orders?email=${encodeURIComponent(email)}` : `${API_BASE}/orders`;
  const res = await fetch(url, { cache: 'no-store' });
  return handleResponse(res, 'Failed to fetch orders');
}

export async function lookupOrder(orderRef: string, email: string) {
  const url = `${API_BASE}/orders?orderRef=${encodeURIComponent(orderRef.trim())}&email=${encodeURIComponent(email.trim())}`;
  const res = await fetch(url, { cache: 'no-store' });
  return handleResponse(res, 'Failed to look up order');
}


export async function updateOrderStatus(orderId: string, status: string) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res, 'Failed to update order status');
}

export async function verifyAdminPassword(password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

export async function fetchFeatureFlags() {
  const res = await fetch(`${API_BASE}/feature-flags`, { cache: 'no-store' });
  return handleResponse(res, 'Failed to fetch feature flags');
}

export async function fetchFeatureFlag(id: string) {
  const res = await fetch(`${API_BASE}/feature-flags/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  return handleResponse(res, `Failed to fetch feature flag ${id}`);
}

export async function updateFeatureFlag(id: string, enabled: boolean) {
  const res = await fetch(`${API_BASE}/feature-flags/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  return handleResponse(res, `Failed to update feature flag ${id}`);
}

