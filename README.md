# Black Power Ecommerce Website

A full-stack ecommerce website called **Black Power**, built with plain HTML, CSS, JavaScript, and a Node.js backend.

## Features

- Instagram-inspired dark UI theme with accent colors
- Product listing from backend API
- Active shopping cart with quantity controls
- Cart persistence with `localStorage`
- Checkout form that submits orders to backend
- Backend order validation and storage to `data/orders.json`
- API tests using Node's built-in test runner

## Project Structure

- `public/index.html` — main frontend page
- `public/styles.css` — frontend styling
- `public/app.js` — frontend cart + checkout logic
- `server.js` — backend server + API routes
- `data/orders.json` — local order persistence
- `test/server.test.js` — backend/API tests

## Requirements

- Node.js 18+ (Node 20+ recommended)

## How to Run

1. Install dependencies (none external are required, but this initializes npm scripts):

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm start
   ```

3. Open your browser:

   - http://localhost:3000

## Development Mode

Run:

```bash
npm run dev
```

## Run Tests

```bash
npm test
```

## Create an Archive (ZIP)

To generate a distributable archive of the project files:

```bash
npm run archive
```

This creates:

- `black-power-website.zip`

## API Endpoints

- `GET /api/products` — list products
- `GET /api/orders` — list received orders
- `POST /api/orders` — submit an order

Example order payload:

```json
{
  "customerName": "Jane Doe",
  "email": "jane@example.com",
  "address": "123 Unity Street",
  "items": [{ "id": "bp-tee", "name": "Black Power Street Tee", "price": 35, "quantity": 2 }],
  "total": 70
}
```
