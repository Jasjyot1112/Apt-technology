const API_URL = 'http://localhost:3000/api/orders';
const SOCKET_URL = 'http://localhost:3000';

let socket;
let reconnectAttempts = 0;

// DOM Elements
const tbody = document.getElementById('orders-body');
const connectionDot = document.getElementById('connection-dot');
const connectionStatus = document.getElementById('connection-status');
const createBtn = document.getElementById('btn-create-order');
const notificationContainer = document.getElementById('notification-container');
const toastTemplate = document.getElementById('toast-template');

// Format date helper
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Render a single row
function createRowHtml(order) {
  return `
    <tr id="order-${order.id}">
      <td>#${order.id}</td>
      <td>${order.customer_name}</td>
      <td>${order.product_name}</td>
      <td><span class="badge ${order.status}">${order.status}</span></td>
      <td>${formatDate(order.updated_at)}</td>
      <td class="actions">
        <button class="btn small secondary" onclick="mockUpdate(${order.id}, '${order.status}')">Advance Status</button>
        <button class="btn small danger" onclick="deleteOrder(${order.id})">Delete</button>
      </td>
    </tr>
  `;
}

// Fetch and render initial data
async function fetchOrders() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();
    
    tbody.innerHTML = orders.map(createRowHtml).join('');
  } catch (error) {
    console.error('Error fetching initial data:', error);
    showNotification('Error', 'Failed to load initial data. Is the server running?', 'delete');
  }
}

// Show Toast Notification
function showNotification(title, message, type) {
  const clone = toastTemplate.content.cloneNode(true);
  const toast = clone.querySelector('.toast');
  toast.classList.add(type.toLowerCase());
  
  clone.querySelector('.toast-title').textContent = title;
  clone.querySelector('.toast-message').textContent = message;
  
  notificationContainer.appendChild(clone);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Socket Initialization
function setupSocket() {
  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    connectionDot.className = 'dot connected';
    connectionStatus.textContent = 'Connected (Real-time Active)';
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    connectionDot.className = 'dot disconnected';
    connectionStatus.textContent = `Disconnected (${reason})`;
  });

  socket.on('connect_error', (err) => {
    reconnectAttempts++;
    connectionDot.className = 'dot disconnected';
    connectionStatus.textContent = `Reconnecting... (Attempt ${reconnectAttempts})`;
  });

  // DB Event Listener
  socket.on('db_change', (payload) => {
    console.log('Received DB change:', payload);
    const { operation, data } = payload;
    
    let title = '';
    let message = '';
    let type = operation;

    switch (operation) {
      case 'INSERT':
        title = 'New Order Received';
        message = `${data.customer_name} ordered ${data.product_name}`;
        
        // Add row to top
        const trInsert = document.createElement('tr');
        trInsert.innerHTML = createRowHtml(data).trim();
        trInsert.id = `order-${data.id}`;
        trInsert.className = 'highlight-insert';
        tbody.prepend(trInsert); // Note: Assuming descending order display
        
        // Remove animation class after it completes
        setTimeout(() => trInsert.classList.remove('highlight-insert'), 2000);
        break;

      case 'UPDATE':
        title = 'Order Updated';
        message = `Order #${data.id} status is now ${data.status}`;
        
        const existingRow = document.getElementById(`order-${data.id}`);
        if (existingRow) {
          // Replace content
          const tempDiv = document.createElement('tbody');
          tempDiv.innerHTML = createRowHtml(data);
          const newRow = tempDiv.firstElementChild;
          newRow.className = 'highlight-update';
          existingRow.replaceWith(newRow);
          
          setTimeout(() => newRow.classList.remove('highlight-update'), 2000);
        } else {
          // If not in DOM, maybe we refresh or fetch it. Just fetch all for safety if missing.
          fetchOrders();
        }
        break;

      case 'DELETE':
        title = 'Order Deleted';
        // OLD row data is provided in payload.data for DELETE
        message = `Order #${data.id} was removed.`;
        
        const rowToRemove = document.getElementById(`order-${data.id}`);
        if (rowToRemove) {
          rowToRemove.style.transition = 'opacity 0.3s ease';
          rowToRemove.style.opacity = '0';
          setTimeout(() => rowToRemove.remove(), 300);
        }
        break;
    }

    showNotification(title, message, type);
  });
}

// API Interactions (Mocking actions from UI)
async function createMockOrder() {
  const names = ['John Doe', 'Jane Smith', 'Michael Scott', 'Dwight Schrute', 'Jim Halpert'];
  const products = ['Gaming PC', 'Mechanical Keyboard', '4K Monitor', 'Wireless Mouse', 'Standing Desk'];
  
  const payload = {
    customer_name: names[Math.floor(Math.random() * names.length)],
    product_name: products[Math.floor(Math.random() * products.length)],
    status: 'pending'
  };

  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    // Don't need to update UI here, socket will handle it!
  } catch (error) {
    console.error(error);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Mock New Order';
  }
}

// Make globally available for inline onclick
window.mockUpdate = async function(id, currentStatus) {
  let nextStatus = 'shipped';
  if (currentStatus === 'pending') nextStatus = 'shipped';
  else if (currentStatus === 'shipped') nextStatus = 'delivered';
  else return; // delivered is final state

  try {
    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
  } catch (error) {
    console.error(error);
  }
}

window.deleteOrder = async function(id) {
  if (!confirm('Are you sure you want to delete this order?')) return;
  try {
    await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error(error);
  }
}

// Init
createBtn.addEventListener('click', createMockOrder);
fetchOrders();
setupSocket();
