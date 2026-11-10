# 19 — Future Roadmap & Architectural Enhancements

CampusProjectHub is structured with modular domain boundaries to support incremental expansion across upcoming development phases and academic years.

---

## 1. Near-Term Roadmap (Task 6 & Next Milestones)

### A. College Template Management Engine (Task 6)
- **Visual Template Designer:** Allow department coordinators to create custom document layout templates through an interactive UI.
- **DOCX Template Ingestion:** Upload an existing college Word template (`.dotx` / `.docx`), extract typographical placeholders, and bind them directly to the proposal compiler.
- **Departmental Front Matter:** Support custom college seals, signature approval blocks, and institutional declaration rubrics.

### B. Automated GitHub Repository Quality Auditing
- Integrate GitHub OAuth webhooks to inspect student code repositories.
- Compute automated software health indicators: commit frequency, code test coverage, pull request reviews, and issue closure rates to identify struggling teams early.

---

## 2. Medium-Term Enhancements (Cross-College Scale)

### C. Federated Inter-University Repository Network
- Establish a privacy-compliant federated search protocol connecting peer engineering universities.
- Allow students in University A to discover verified capstone benchmarks developed in University B, broadening academic horizons without data leakage.

### D. Cloud Vector Intelligence & Semantic RAG
- Scale repository similarity matching using dedicated vector indexes (such as pgvector or local Qdrant).
- Enable semantic document Question-Answering across full multi-page project report PDFs.

---

## 3. Long-Term Enhancements (Advanced Capstone Features)

### E. AI Viva Examiner Simulation (Full-Duplex Voice)
- Expand the current simulated Voice Mode into a full duplex WebRTC voice assistant.
- Simulate an aggressive internal viva defense committee: asks probing technical questions, cross-examines algorithm time complexity, and grades student verbal explanations against department rubrics.

### F. University ERP & Ledger Integration
- Secure REST webhooks to synchronize milestone sign-offs directly into university grade management systems (such as Contineo, Peoplesoft, or Canvas LMS).
