# Async PDF Generation Engine

A full-stack Laravel 12 and React application demonstrating high-concurrency background processing, real-time UI synchronization, and robust backend architecture.

## Tech Stack

- **Backend:** Laravel 12, PHP 8.5, PostgreSQL 18, Redis 3
- **Real-time:** Laravel Reverb, Laravel Echo
- **Frontend:** React 19, Vite, Material UI (MUI), Emotion
- **Infrastructure:** Laravel Sail (Docker)

## Key Architectural Decisions

This project was built with focus on thread-safety, decoupled business logic and UI performance.

### 1. Concurrency & Atomic DB Updates

In a high-throughput worker environment, using standard Eloquent `$model->update()` for status transitions introduces race conditions (read-then-write bugs).

To solve this, the `PdfGenerationRepository` utilizes a unified generic atomic update pattern.

Database state transitions (e.g., `WAITING -> PROCESSING`) are executed as single, atomic SQL statements. This ensures that even with 100+ concurrent queue workers, a PDF job can only be claimed once.

### 2. Decoupled WebSockets

Because atomic database queries bypass Laravel's Eloquent lifecycle events (Observers), I decoupled the WebSocket side-effects from the database logic.

The application uses a centralized `PdfStatusEmitter` helper.

The Service layer orchestrates the logic: it executes the atomic DB update, evaluates the result, and only then triggers the Emitter. This keeps the Domain/Service layer completely separated of "UI concerns" like WebSockets.

### 3. Derived Frontend State

To prevent spamming the API during mass updates (e.g., generating 100 PDFs simultaneously), the dashboard is highly optimized:

- Initial load fetches the job list and aggregate stats via HTTP `GET`.
- Subsequently, Laravel Echo listens for WebSocket pushes and updates the local React state.
- Aggregate stats are derived locally using React's `useMemo` hook based on the active jobs array.

This eliminates the need to constantly poll any endpoint or pack heavy aggregate queries into WebSocket payloads.

### 4. WCAG-Accessible UI

The React frontend uses Material UI components configured for accessibility. State transitions (like job completion) trigger `aria-live` accessible toast notifications, and interactive elements support keyboard navigation.

## Note on PDF Generation Implementation

For the scope of this assignment, I skipped actual file generation and replaced it with a static `sample.pdf` file, simulating a dynamic payload delay of 3-15 seconds.

The primary technical challenge of this task was the asynchronous architecture, atomic database concurrency (preventing race conditions on job claims/cancellations), and real-time UI state synchronization via WebSockets.

### Production Implementation

In a real-world scenario, I would not generate PDFs synchronously via PHP dependencies like `dompdf` or `wkhtmltopdf`. I would implement Gotenberg (a stateless Docker API for PDF rendering) or Spatie Browsershot without bloating the PHP application.

## Local setup & installation

This project uses Laravel Sail for a seamless Docker environment. If you run into any issues, refer to [Laravel Sail Docs](https://laravel.com/docs/13.x/sail).

Note for Windows users: Please run these commands inside your WSL2 terminal.

### 1. Clone and install dependencies

```bash
git clone https://github.com/karlmuuga/twn-async-pdf-task.git
cd twn-async-pdf-task
cp .env.example .env

# Install Composer dependencies via a temporary container
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    composer:2 \
    composer install --ignore-platform-reqs

# Install NPM dependencies via a temporary container
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    node:24 \
    npm install
```

### 2. Start the environment

```bash
./vendor/bin/sail up -d
```

### 3. Set app key and run database migrations

When all containers have been started successfully (initial PostgreSQL startup can take a few seconds), run the following commands:

```
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate
```

### 4. Access the Application

Open your browser and navigate to: [http://localhost](http://localhost)

> If testing on a local network device, Vite has been configured to allow CORS. Change `APP_URL` environment variable and access via your host machine's IP, e.g. `http://192.168.x.x`.

