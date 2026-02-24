const productGrid = document.getElementById('product-grid');
const cartItemsEl = document.getElementById('cart-items');
const cartCountEl = document.getElementById('cart-count');
const cartTotalEl = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout');
const statusEl = document.getElementById('status');

const cart = new Map();
let products = [];

function money(amount) {
  return `$${amount.toFixed(2)}`;
}

function renderProducts() {
  const template = document.getElementById('product-template');
  productGrid.innerHTML = '';

  products.forEach((product) => {
    const clone = template.content.cloneNode(true);
    const img = clone.querySelector('img');
    const title = clone.querySelector('h4');
    const desc = clone.querySelector('.desc');
    const price = clone.querySelector('.price');
    const button = clone.querySelector('button');

    img.src = product.image;
    img.alt = product.name;
    title.textContent = product.name;
    desc.textContent = product.description;
    price.textContent = money(product.price);

    button.addEventListener('click', () => addToCart(product.id));

    productGrid.appendChild(clone);
  });
}

function addToCart(id) {
  const item = cart.get(id);
  if (item) {
    item.quantity += 1;
  } else {
    const product = products.find((p) => p.id === id);
    cart.set(id, { ...product, quantity: 1 });
  }
  renderCart();
}

function updateQuantity(id, step) {
  const item = cart.get(id);
  if (!item) return;
  item.quantity += step;
  if (item.quantity <= 0) {
    cart.delete(id);
  }
  renderCart();
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  let count = 0;
  let total = 0;

  cart.forEach((item) => {
    count += item.quantity;
    total += item.price * item.quantity;

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${item.name}</strong>
      <div>${money(item.price)} each</div>
      <div class="qty-row">
        <span>Qty: ${item.quantity}</span>
        <div class="qty-btns">
          <button data-action="minus">-</button>
          <button data-action="plus">+</button>
        </div>
      </div>
    `;

    li.querySelector('[data-action="minus"]').addEventListener('click', () => updateQuantity(item.id, -1));
    li.querySelector('[data-action="plus"]').addEventListener('click', () => updateQuantity(item.id, 1));
    cartItemsEl.appendChild(li);
  });

  cartCountEl.textContent = count;
  cartTotalEl.textContent = money(total);
}

async function loadProducts() {
  const response = await fetch('/api/products');
  products = await response.json();
  renderProducts();
}

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (cart.size === 0) {
    statusEl.textContent = 'Your cart is empty.';
    return;
  }

  const formData = new FormData(checkoutForm);
  const payload = {
    customerName: formData.get('name').trim(),
    email: formData.get('email').trim(),
    address: formData.get('address').trim(),
    items: Array.from(cart.values()).map((item) => ({
      id: item.id,
      quantity: item.quantity
    }))
  };

  statusEl.textContent = 'Submitting order...';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      statusEl.textContent = data.error || 'Order failed.';
      return;
    }

    statusEl.textContent = `Order placed! ID: ${data.order.id}`;
    checkoutForm.reset();
    cart.clear();
    renderCart();
  } catch (error) {
    statusEl.textContent = 'Network error while placing order.';
  }
});

loadProducts().catch(() => {
  statusEl.textContent = 'Could not load products.';
});
