# 18 — Current Architectural Limitations

Maintaining pedagogical honesty requires transparently documenting the current boundaries of the CampusProjectHub platform.

---

## 1. Documented System Limitations

### 1. Dual AI Provider Configuration (Mock vs Cloud Gemini)
- **Current State:** The backend operates with a resilient, deterministic `MockAcademicMentorProvider` by default for local development, zero-cost operations, and offline CI test suites.
- **Limitation:** To enable real cloud-based Gemini LLM inference, an external `GEMINI_API_KEY` must be configured in environment variables, and network connectivity must be active.

### 2. Simulated Voice Mode vs. Full-Duplex WebRTC
- **Current State:** The Voice Mode modal provides a high-fidelity visualizer and simulated audio speech synthesis preview.
- **Limitation:** True real-time peer-to-peer WebRTC voice streaming with live STT/TTS pipeline is not deployed (intentionally classified as `UNNECESSARY` in Task 4 to prevent student semester collapse).

### 3. Template Management Scope (Default VTU Template)
- **Current State:** The proposal engine formats documents according to the verified VTU / Autonomous Engineering Capstone Template standard.
- **Limitation:** Custom institutional template creation, visual drag-and-drop template designers, and direct institutional `.docx` template file uploads are scheduled for **Task 6 (College Template Management)**.

### 4. Single-Process In-Memory Store Persistence
- **Current State:** In-memory fallback stores ensure continuous operation if MongoDB is unavailable.
- **Limitation:** In-memory data is ephemeral to the Node.js process lifecycle and does not persist across server reboots if MongoDB is disconnected. Production deployments require MongoDB persistence.

### 5. Algorithmic Similarity vs. Heavy Vector Clouds
- **Current State:** Similarity analysis utilizes character/token n-gram Jaccard containment and technology classification.
- **Limitation:** While fast and free of cloud hosting costs, it does not perform deep cross-lingual multi-layer semantic transformer embeddings across millions of external non-college papers.

### 6. University ERP & Grade Book Integration
- **Current State:** Milestone approvals and faculty reviews are managed within CampusProjectHub.
- **Limitation:** Direct bidirectional synchronization with external university ERP systems (e.g. Peoplesoft, SAP, Ellucian) is outside current undergraduate capstone scope.
