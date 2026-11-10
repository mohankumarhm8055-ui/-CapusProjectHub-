# 16 — Comprehensive Technology Stack

CampusProjectHub is constructed exclusively with modern, battle-tested software engineering technologies, deliberately avoiding fragile external site builders, low-code widgets, or unmaintained libraries.

---

## 1. Frontend Technologies (Client Tier)

| Technology | Version | Purpose in CampusProjectHub |
| :--- | :---: | :--- |
| **React** | `19.3.1` | Component-driven UI rendering, concurrent mode, and declarative state synchronization. |
| **TypeScript** | `5.7.3` | End-to-end static type-safety, interface contracts, and compile-time error elimination. |
| **Tailwind CSS** | `4.3.5` | Modern CSS engine utilizing custom theme tokens for academic deep slate, vivid indigo, and emerald states. |
| **React Router** | `7.18.5` | Declarative client-side routing (`/`, `/explore-projects`, `/ai-mentor`, `/ai-mentor/proposals/:id`, `/signin`, `/signup`). |
| **Framer Motion** | `14.10.1` | Hardware-accelerated UI transitions, marquee ticker animations, and lightbox modal presentations. |
| **Lucide React** | `1.70.0` | Accessible, tree-shakable SVG iconography for engineering workflows and completion states. |
| **Vite** | `8.3.6` | Next-generation ESM development server and Rollup-based production build bundler. |

---

## 2. Backend Technologies (Application Tier)

| Technology | Version | Purpose in CampusProjectHub |
| :--- | :---: | :--- |
| **Node.js** | `v22.x LTS` | Event-driven JavaScript runtime environment powering high-concurrency API requests. |
| **Express.js** | `4.21.2` | Minimal, unopinionated HTTP web framework orchestrating modular RESTful routes. |
| **Zod** | `3.24.1` | Strict runtime payload validation for API inputs, route params, and decision structures. |
| **jsonwebtoken (JWT)** | `9.0.2` | Cryptographic session tokens and role-based access control (RBAC). |
| **express-rate-limit** | `7.5.0` | IP-based request throttling protecting AI endpoints from resource exhaustion. |
| **docx** | `9.2.1` | Production OpenXML Word document compiler generating valid `.docx` binaries. |
| **pdfkit** | `0.16.0` | Low-level PDF document streaming engine with page buffering and dynamic footer numbering. |
| **dotenv** | `16.4.7` | Twelve-factor application environment configuration management. |
| **tsx** | `4.19.2` | Direct TypeScript execution and watch engine for backend development and test suites. |

---

## 3. Database & Persistence Layer

| Technology | Version | Purpose in CampusProjectHub |
| :--- | :---: | :--- |
| **MongoDB** | `7.0 / 8.0` | Distributed document database storing canonical project records, proposals, and chats. |
| **Mongoose ODM** | `8.9.5` | Object Document Mapping providing schema validation, indexes, and middleware hooks. |
| **Native TypeScript Maps** | Built-in | Zero-dependency concurrent in-memory fallback stores ensuring 100% test reliability. |

---

## 4. Test Harness & Quality Assurance

- **Test Runner:** Node.js native test runner (`node:test` & `node:assert`).
- **Linter:** Oxlint (`oxlint` v1.90.0) providing ultra-fast Rust-based static analysis.
- **Headless Browser Automation:** Chrome/Edge DevTools Protocol (CDP) via Node child process WebSockets.
