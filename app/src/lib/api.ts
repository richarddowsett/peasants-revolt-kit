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

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('images', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await handleResponse(res, 'Failed to upload image');
  return data.imageUrl;
}

export async function uploadImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await handleResponse(res, 'Failed to upload images');
  return data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
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
