const stories = [
  {
    name: 'unity',
    image:
      'https://images.unsplash.com/photo-1521252659862-eec69941b071?auto=format&fit=crop&w=300&q=80'
  },
  {
    name: 'legacy',
    image:
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=300&q=80'
  },
  {
    name: 'power',
    image:
      'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=300&q=80'
  },
  {
    name: 'culture',
    image:
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80'
  }
];

const productsContainer = document.getElementById('products');
const storiesContainer = document.getElementById('stories');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const cartToggle = document.getElementById('cartToggle');
const cartPanel = document.getElementById('cartPanel');
const statusMessage = document.getElementById('statusMessage');
const checkoutForm = document.getElementById('checkoutForm');

let products = [];
let cart = JSON.parse(localStorage.getItem('blackPowerCart') || '[]');

function renderStories() {
  storiesContainer.innerHTML = stories
    .map(
      story => `
      <div class="story">
        <div class="story-avatar"><img src="${story.image}" alt="${story.name}" /></div>
        <span>${story.name}</span>
      </div>
    `
    )
    .join('');
}

function saveCart() {
  localStorage.setItem('blackPowerCart', JSON.stringify(cart));
}

function updateCartSummary() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartCount.textContent = String(count);
  cartTotal.textContent = total.toFixed(2);
}

function renderCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
    updateCartSummary();
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      item => `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <small>$${item.price.toFixed(2)} each</small>
        </div>
        <div class="qty-control">
          <button data-action="decrease" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button data-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
    `
    )
    .join('');

  updateCartSummary();
}

function renderProducts() {
  productsContainer.innerHTML = products
    .map(
      product => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" />
        <div class="product-info">
          <h4>${product.name}</h4>
          <p>${product.description}</p>
          <p><strong>$${product.price.toFixed(2)}</strong></p>
          <button data-id="${product.id}">Add to Cart</button>
        </div>
      </article>
    `
    )
    .join('');
}

async function loadProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Could not load products.');
  }
  const data = await response.json();
  products = data.products;
  renderProducts();
}

function addToCart(id) {
  const product = products.find(entry => entry.id === id);
  if (!product) {
    return;
  }

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  renderCart();
}

function updateQuantity(id, action) {
  const item = cart.find(entry => entry.id === id);
  if (!item) {
    return;
  }

  item.quantity += action === 'increase' ? 1 : -1;
  if (item.quantity <= 0) {
    cart = cart.filter(entry => entry.id !== id);
  }

  saveCart();
  renderCart();
}

async function checkout(event) {
  event.preventDefault();
  statusMessage.textContent = '';

  if (cart.length === 0) {
    statusMessage.textContent = 'Add products before placing an order.';
    return;
  }

  const payload = {
    customerName: document.getElementById('customerName').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
    total: Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      statusMessage.textContent = data.message || 'Order failed.';
      return;
    }

    statusMessage.textContent = `Order received! ID: ${data.order.id.slice(0, 8)}...`;
    checkoutForm.reset();
    cart = [];
    saveCart();
    renderCart();
  } catch {
    statusMessage.textContent = 'Network error. Please retry.';
  }
}

productsContainer.addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) {
    return;
  }

  addToCart(button.dataset.id);
});

cartItemsContainer.addEventListener('click', event => {
  const button = event.target.closest('button[data-id]');
  if (!button) {
    return;
  }

  updateQuantity(button.dataset.id, button.dataset.action);
});

cartToggle.addEventListener('click', () => {
  cartPanel.classList.toggle('hidden');
});

checkoutForm.addEventListener('submit', checkout);

(async function init() {
  renderStories();
  renderCart();
  try {
    await loadProducts();
  } catch (error) {
    statusMessage.textContent = error.message;
  }
})();
