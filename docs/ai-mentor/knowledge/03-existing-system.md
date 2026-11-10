# 03 — Analysis of the Existing System

## 1. Current State of Academic Project Administration

In the overwhelming majority of engineering institutions today, capstone project management relies on archaic, manual, and disconnected systems. 

```text
[Incoming Students] ---> [Brainstorm in Isolation] ---> [Paper Synopsis Form]
                                                                |
                                                                v
[Manual Faculty Panel Review] <--- [Unindexed Spreadsheets] <--- [No Historical Search]
        |
        +---> [Late Rejection: "Duplicate of 2023 batch project"] 
        |
        +---> [Subjective Approval without Feasibility Check] 
                    |
                    v
[Fragmented Implementation] (WhatsApp + Google Drive + Trello)
                    |
                    v
[Late-Stage Viva Struggle] (Rushed Reports + Formatting Rejections)
```

---

## 2. Granular Breakdown of Existing Mechanisms

### 1. Physical Paper Forms & Printed Proformas
- Project registrations, team declarations, guide allocations, and synopsis submissions are handled via printed hard-copy forms signed by hand.
- Forms are collected in physical binder folders in the departmental office.
- Physical documents cannot be searched, cross-referenced, or analyzed for concept overlap across years.

### 2. Departmental Google Sheets as "Databases"
- Project coordinators manually transcribe team details, project titles, guide names, and marks into shared spreadsheets.
- Spreadsheets suffer from lack of data validation, accidental cell overwrites, absence of relational links, and zero artifact storage (no diagrams, code repositories, or screenshots).

### 3. Departmental Library Book Stacks as Repositories
- Past project reports are physically bound in black/gold hard-cover books and placed in departmental project libraries.
- Within 1–2 academic years, these books gather dust. Students cannot search them by keyword, technology, or problem statement.
- The associated source code (originally submitted on compact discs or USB drives) becomes inaccessible or unreadable.

### 4. Consumer Messaging Tools for Team & Faculty Communication
- Project coordination happens over ad-hoc WhatsApp or Telegram groups.
- Task assignments, architectural debates, and progress photos are interspersed with personal chats.
- Progress updates are not auditable; faculty cannot distinguish individual contributions from team assertions.

### 5. Subjective Synopsis & Defense Reviews
- Internal review panels evaluate proposed synopses during rapid 10-minute presentation slots.
- Faculty members rely purely on memory to identify if a similar project was submitted two years prior.
- Feasibility is judged impressionistically rather than systematically against the semester's remaining development weeks.

---

## 3. Critical Failure Modes of the Existing System

| Failure Mode | Operational Consequence | Impact on Students & Faculty |
| :--- | :--- | :--- |
| **Silent Duplication** | Two different student teams in consecutive years build the exact same CRUD app. | Wasted academic semesters, lack of technical growth, low placement portfolio value. |
| **Scope Creep Collapse** | A team proposes a massive system (e.g., IoT hardware + Blockchain + Computer Vision) without feasibility guidance. | Team runs out of time; produces an unfinished, un-tested prototype on demo day. |
| **Single-Point Mentorship Failure** | Students depend solely on a busy faculty guide who may not specialize in their chosen modern framework. | Students hit architectural roadblocks with no access to past batch seniors who solved it. |
| **Typographical Rejections** | Students spend days manually formatting margins, roman numeral page numbers, and IEEE reference citations in Word. | Wasted engineering time; faculty frustration over non-standard formatting. |

---

## 4. Current Implementation Status
- **Status:** `Documented Baseline` (CampusProjectHub's entire feature set was engineered specifically to supersede these existing system failure points).
