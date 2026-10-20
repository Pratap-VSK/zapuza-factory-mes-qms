# Zapuza Factory MES & QMS

An enterprise-grade, full-stack **Manufacturing Execution System (MES)** and **Quality Management System (QMS)** engineered for high-precision shop floors, heavy manufacturing, and regulated industrial environments. Zapuza combines real-time machine telemetry, stringent quality gates, offline-resilient shop-floor tablet interfaces, and cryptographic traceability.

---

## 🏗️ Architectural Overview

Zapuza is structured as a decoupled containerized micro-ecosystem optimized for reliability, horizontal scalability, and sub-second shop-floor latency.

```
+-----------------------------------------------------------------+
|                         Nginx Reverse Proxy                     |
+-----------------------------------------------------------------+
          |                                       |
          v                                       v
+-------------------------------+       +-------------------------+
|     Frontend (Next.js 15)     |       |   Backend (Django REST) |
|   - Shop-Floor Tablet UI      | <---> |   - Core MES / QMS Logic|
|   - Central Portal & Studio   |       |   - Django Channels (WS)|
+-------------------------------+       +-------------------------+
                                                  |
                                        +-------------------+
                                        | Celery + Redis    |
                                        | (Async Engine)    |
                                        +-------------------+
                                                  |
                                        +-------------------+
                                        | PostgreSQL / DB   |
                                        +-------------------+
```

### Key Subsystems & Applications

1. **`plant_master`**: Central facility management, machine maintenance tracking (`machine_pm_lock`), and gauge calibration enforcement (`calibration_guard`).
2. **`material_intake`**: Incoming raw material inspection, Mill Test Certificate (`mtc_validator`), auto-barcode printing, and quarantine management (`quarantine_engine`).
3. **`production_routing`**: Sequence interlocks, first-piece inspection guards (`first_piece_guard`), hold-timer engines, and end-to-end component genealogy (`trace_lineage`).
4. **`shopfloor_quality`**: In-process inspections, dual-QR verification (`dual_qr_verifier`), tolerance evaluation against specs, and Material Review Board (`mrb_workflow`) handling.
5. **`dispatch_clearance`**: Certificate of Analysis (`coa_generator`) creation, final shipping interlocks, and cryptographic crate sealing.
6. **`accounts`**: Role-based access control, secure audit logging, and hardware device fingerprinting.

---

## 🛠️ Technology Stack

### Backend (`/backend`)
* **Framework:** Python 3.14, Django & Django REST Framework (DRF)
* **Real-time Communication:** Django Channels (WebSockets for live terminal updates)
* **Async Workers:** Celery with Redis broker for background sync and timers
* **Security & Crypto:** Custom cryptographic QR signers (`core/crypto/qr_signer.py`), device fingerprinting middleware, and strict audit trails.

### Frontend (`/frontend`)
* **Framework:** Next.js 15 (App Router with TypeScript)
* **Styling & UI:** Tailwind CSS, responsive layouts tailored for industrial tablets and central administration dashboards.
* **Offline Resilience:** IndexedDB wrapper (`services/offline/db.ts`), custom sync engine (`syncEngine.ts`), and cache warmers for network dropouts on the shop floor.
* **Ergonomics:** Glove-friendly numeric keypads, mandatory defect camera capture workflows, and dual-QR verification modals.

### Infrastructure & Deployment (`/docker` & `/nginx`)
* **Containerization:** Docker & Docker Compose orchestration.
* **Reverse Proxy:** Nginx configuration for secure SSL termination and routing.

---

## 📁 Repository Structure

```text
zapuza-factory-mes-qms/
├── backend/
│   ├── apps/
│   │   ├── accounts/              # User management, RBAC, audit logs
│   │   ├── dispatch_clearance/    # COA generation & shipping interlocks
│   │   ├── material_intake/       # Dock intake, MTC validation, quarantine
│   │   ├── pdi_templates/         # Blueprint revision control & pin mapping
│   │   ├── plant_master/          # Machine PM locks & calibration guards
│   │   ├── production_routing/    # Routing sequences, lineage, first-piece guard
│   │   ├── shift_handover/        # Shift logs & handover clearance guards
│   │   └── shopfloor_quality/     # MRB workflows, tolerance & dual-QR verification
│   ├── config/                    # Django settings (base, local, production), WSGI/ASGI
│   ├── core/                      # Crypto signers, middleware, exceptions, seed commands
│   ├── requirements/              # Base and production Python dependencies
│   ├── Dockerfile
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router ((auth), (central-portal), (shopfloor-tablet))
│   │   ├── components/            # Blueprint studio, tablet ergonomics, traceability graphs
│   │   ├── services/              # API clients, offline IndexedDB engine, WebSockets
│   │   └── types/                 # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── nginx/
│   └── nginx.conf                 # Reverse proxy configuration
├── docker-compose.yml             # Full stack container orchestration
└── architecture.txt               # High-level system topology diagram
```

---

## 🚀 Getting Started & Installation

### Prerequisites
* **Docker** (v24.0+) & **Docker Compose** (v2.20+)
* **Node.js** (v18+ recommended, if running frontend locally)
* **Python** (v3.14+, if running backend locally)

### Quick Start with Docker Compose
To spin up the entire stack (PostgreSQL, Redis, Django Backend, Celery Worker, Next.js Frontend, and Nginx), run:

```bash
# Clone the repository and navigate into the root directory
cd zapuza-factory-mes-qms-740581c2460abe46414b6b3db6b0e2717f093666

# Configure production environment variables if necessary
cp .env.production .env

# Build and start all containers in detached mode
docker-compose up --build -d
```

### Seeding Demo Data
To initialize the database with standard plant masters, demo workstations, and sample routing templates, execute:

```bash
docker-compose exec backend python manage.py seed_zapuza_demo
```

---

## 🖥️ Operational Portals

Once running, access the application through the following interfaces:
* **Central Admin & Supervisor Portal:** `http://localhost:3000/dashboard` (Manage blueprints, review MRB quarantines, and inspect audit logs)
* **Shop-Floor Tablet Operator Terminal:** `http://localhost:3000/inspector-workflow/scan` (Optimized for touchscreens, glove input, and offline execution)
* **Public Crate Verification Portal:** `http://localhost:3000/verify` (Cryptographic verification of finished goods prior to dispatch)

---

## 🔒 Security & Compliance Features

* **Calibration & Maintenance Interlocks:** Production orders automatically halt if assigned machines miss PM schedules or calibrated gauges expire.
* **Traceability Lineage Trees:** Complete backward and forward tracking of sub-components, serial numbers, and material heat lots.
* **Offline Fault Tolerance:** Shop-floor tablet terminals safely cache inspection results locally via IndexedDB during network outages and auto-sync upon connection restoration.

```
zapuza-factory-mes-qms/
├── docker-compose.yml                      # PostgreSQL, Redis, Django/ASGI, Celery Worker, Celery Beat, Next.js
├── .env.production                         # Secrets, HMAC Keys, DB Credentials, AWS S3 Keys
├── nginx/
│   └── nginx.conf                          # Reverse Proxy, SSL Termination, Static/Media serving
│
├── backend/                                # DJANGO REST FRAMEWORK (DRF) PRODUCTION BACKEND
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt                        # DRF, psycopg2-binary, celery, redis, channels, cryptography, reportlab
│   │   └── production.txt                  # gunicorn, uvicorn, sentry-sdk, django-storages, boto3
│   │
│   ├── config/                             # Core Project Configuration
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── production.py
│   │   ├── urls.py                         # Root API Router (/api/v1/...)
│   │   ├── wsgi.py
│   │   ├── asgi.py                         # Django Channels ASGI (Live Bottleneck & Supervisor Queue WebSockets)
│   │   └── celery.py                       # Celery Setup for Hold Timers & Hourly Inspection Prompts
│   │
│   ├── core/                               # Enterprise Security, Cryptographic QR & Audit Engine (Section 13)
│   │   ├── __init__.py
│   │   ├── models.py                       # BaseTimestampModel, ImmutableAuditLog (Append-Only DB Table)
│   │   ├── middleware/
│   │   │   ├── audit_trail.py              # Captures UserID, IP, Device Serial, Old/New Value on every request
│   │   │   └── device_fingerprint.py       # Validates registered Shopfloor Industrial Tablets
│   │   ├── crypto/
│   │   │   └── qr_signer.py                # HMAC-SHA256 Signer & Verifier for Tamper-Proof Station & Crate QRs
│   │   ├── exceptions.py                   # Custom Interlock Exceptions (CalibrationExpired, CoolingHoldActive, etc.)
│   │   └── permissions.py                  # Strict RBAC (PlantManager, QualityEngineer, QualityManager, Supervisor, Inspector)
│   │
│   └── apps/                               # MODULAR DOMAIN-DRIVEN APPS (Mapped 1:1 with BRD Sections)
│       │
│       ├── accounts/                       # Section 12: Role-Based Access Control & User Management
│       │   ├── models.py                   # CustomUser, Role, PlantDepartmentAssignment, TabletDeviceRegistry
│       │   ├── serializers.py              # JWT Auth + Badge QR Login Serializers
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── plant_master/                   # Section 2: Plant Infrastructure, Machines, Tooling & Calibration Locks
│       │   ├── models.py                   # FactorySite, Workstation, PartMaster, CNCProgram, MeasuringGauge, PMChecklistLog
│       │   ├── services/
│       │   │   ├── calibration_guard.py    # Enforces Section 2.3: Blocks measurement if Gauge calibration is expired
│       │   │   └── machine_pm_lock.py      # Enforces Section 2.2: Disables job selection if daily PM check is overdue
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── material_intake/                # Section 3: Dock Intake, MTC Verification, Lab Sampling & Quarantine
│       │   ├── models.py                   # RawMaterialIntake, MillTestCertificate, ChemMechSpec, SpectroLabSample, SupplierNCR
│       │   ├── services/
│       │   │   ├── mtc_validator.py        # Validates Chemical/Mechanical properties against engineering specs
│       │   │   ├── quarantine_engine.py    # Triggers Supplier Quarantine & generates SNCR on failure
│       │   │   └── barcode_printer.py      # Generates weather-resistant ZPL/PDF barcode tags for raw stock bundles
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── pdi_templates/                  # Section 4: Central Template Studio, Blueprint Pinning & CTQ Rules
│       │   ├── models.py                   # InspectionTemplate, TemplateRevision, BlueprintDocument, BlueprintPin, InspectionParameter
│       │   ├── services/
│       │   │   ├── revision_control.py     # Locks active templates; forces QM re-approval on new drawing revisions (Rev A -> Rev B)
│       │   │   └── pin_mapper.py           # Validates X/Y coordinate pins and CTQ tolerance rules
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── production_routing/             # Sections 7, 8, 9: Travelers, Process Sequences, Hold Timers & First-Piece
│       │   ├── models.py                   # WorkOrder, DigitalTraveler, ProcessRouteStep, OperationExecutionLog, ProcessHoldTimer
│       │   ├── services/
│       │   │   ├── sequence_interlock.py   # Prevents starting Op 30 if Op 20 is incomplete
│       │   │   ├── hold_timer_engine.py    # Calculates cooling/curing countdowns & raises 423 Locked if scanned early
│       │   │   ├── first_piece_guard.py    # Locks station in "Setup Mode" until QA signs off First-Piece
│       │   │   └── trace_lineage.py        # Forward (Heat # -> Crates) & Backward (Serial # -> Birth Certificate) Graph Engine
│       │   ├── tasks.py                    # Celery tasks: Hourly sampling alerts (15-min grace pause) & Hold expiry alerts
│       │   ├── consumers.py                # WebSocket consumer for Live Shopfloor Bottleneck & Queue Heatmaps (Section 8.3)
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── shopfloor_quality/              # Sections 5, 6: Tablet Inspection, Dual-QR Lock, Concessions & MRB
│       │   ├── models.py                   # InspectionSession, ParameterMeasurement, DefectPhoto, SupervisorReview, ConcessionRecord, MRBDisposition
│       │   ├── services/
│       │   │   ├── dual_qr_verifier.py     # Enforces Section 5.1: Verifies Station QR + Traveler Barcode before unlocking form
│       │   │   ├── tolerance_evaluator.py  # Evaluates readings, requires 2 photos on failure, triggers CTQ freeze & SMS/Email
│       │   │   ├── mrb_workflow.py         # Executes Rework Routing generation, Scrap write-off, RTV, or Customer Concession
│       │   │   └── offline_sync_ingest.py  # Idempotent batch processor for offline tablet inspection queues
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       ├── dispatch_clearance/             # Sections 10, 11: Pre-Dispatch Gate Interlocks, Manifests & Customer CoA
│       │   ├── models.py                   # ShippingClearanceGate, DispatchManifest, CrateLabel, DigitalCoACertificate
│       │   ├── services/
│       │   │   ├── shipping_interlock.py   # 3-Point Gatekeeper (100% Ops + 0 Active Holds + Approved Final PDI)
│       │   │   └── coa_generator.py        # Generates encrypted public CoA report & tamper-proof Customer Crate QR
│       │   ├── serializers.py
│       │   ├── views.py
│       │   └── urls.py
│       │
│       └── shift_handover/                 # Section 12.2: Mandatory Digital Shift Handover Logbook
│           ├── models.py                   # ShiftHandoverLog, ToolWearStatus,IncomingOperatorAck
│           ├── services.py                 # Blocks incoming operator station access until outgoing handover is acknowledged
│           ├── serializers.py
│           ├── views.py
│           └── urls.py
│
└── frontend/                               # NEXT.JS 14+ (REACT + TYPESCRIPT + TAILWIND) WEB & TABLET PWA
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs                     # Configured with Serwist / next-pwa for Industrial Offline Operation
    ├── tailwind.config.ts                  # High-contrast shopfloor color tokens & oversized touch-target utilities
    ├── public/
    │   ├── manifest.json                   # PWA Manifest (Fullscreen kiosk mode for shopfloor tablets)
    │   └── sw.js                           # Service Worker for background offline sync & asset caching
    │
    └── src/
        ├── middleware.ts                   # Route protection based on RBAC Role & Device Type (Desktop vs Tablet)
        │
        ├── types/                          # Strict TypeScript Interfaces mirroring DRF Serializers
        │   ├── master.types.ts
        │   ├── intake.types.ts
        │   ├── blueprint.types.ts
        │   ├── traveler.types.ts
        │   ├── inspection.types.ts
        │   └── dispatch.types.ts
        │
        ├── services/                       # API Clients & Offline Storage Engine
        │   ├── apiClient.ts                # Axios instance with JWT refresh & Device-Serial header injection
        │   ├── websocketClient.ts          # Real-time socket manager for Bottleneck Heatmap & Supervisor Queue
        │   └── offline/
        │       ├── db.ts                   # IndexedDB (Dexie.js) schema: stores active Templates, Gauges, & SyncQueue
        │       ├── syncEngine.ts           # Background sync worker pushing offline inspections + photo blobs on reconnect
        │       └── cacheWarmer.ts          # Pre-fetches active shift blueprints & gauge calibration list
        │
        ├── components/                     # Shared Production UI Components
        │   ├── blueprint-studio/
        │   │   ├── PdfBlueprintCanvas.tsx  # High-res PDF/CAD renderer with zoom/pan & coordinate Pin overlay
        │   │   ├── PinMarker.tsx           # Color-coded interactive pin (Orange for CTQ, Blue for Standard, Green/Red status)
        │   │   └── ParameterConfigForm.tsx # Tolerance setup (+ / -, Max/Min, Visual, Required Gauge Type)
        │   │
        │   ├── tablet-ergonomics/          # Section 13 (7.2): Glove-Friendly Industrial UI Kit
        │   │   ├── GloveNumericKeypad.tsx  # Custom oversized on-screen numpad (prevents native keyboard popups)
        │   │   ├── DualQrScannerModal.tsx  # WebRTC Camera QR/Barcode scanner (Hardware keyboard search strictly disabled)
        │   │   ├── MandatoryDefectCamera.tsx # Forces minimum 2 clear photo captures on out-of-tolerance entry
        │   │   ├── CoolingHoldLockScreen.tsx # Fullscreen Flashing RED countdown interlock banner
        │   │   └── OfflineSyncStatusBar.tsx # Live Wi-Fi health indicator & pending offline record counter
        │   │
        │   └── traceability/
        │       └── LineageTreeGraph.tsx    # Interactive visual node graph (Heat Lot <-> Ops <-> Gauges <-> Shipping Crate)
        │
        └── app/                            # NEXT.JS APP ROUTER (3 SEPARATE WORKSPACES)
            │
            ├── (auth)/
            │   └── login/page.tsx          # Portal Login & Tablet Operator Badge QR Scan Login
            │
            ├── (central-portal)/           # WORKSPACE 1: Desktop Web Portal (Managers, Engineers, Supervisors)
            │   ├── layout.tsx              # Enterprise sidebar, audit notifications, role header
            │   ├── dashboard/page.tsx      # Section 8.3: Live Shopfloor Bottleneck Heatmap, Machine Queues & Cycle Times
            │   ├── master-setup/
            │   │   ├── factories/page.tsx  # Section 2.1: Sites, Departments, Workstations, CNC Programs
            │   │   └── gauges/page.tsx     # Section 2.3: Measuring Equipment Register & Calibration Expiry Tracker
            │   ├── dock-intake/
            │   │   ├── page.tsx            # Section 3: Raw Material Receiving, MTC PDF Viewer & Spectro Lab Status
            │   │   └── sncr/page.tsx       # Section 3.3: Supplier Quarantine & Non-Conformance Reports
            │   ├── blueprint-studio/
            │   │   ├── page.tsx            # Section 4: Master Template List & Revision Control (Rev A / Rev B)
            │   │   └── [id]/pin/page.tsx   # Section 4.1: Interactive Blueprint Pinning & QM Approval Studio
            │   ├── supervisor-review/
            │   │   ├── page.tsx            # Section 6.1: Live Approval Queue, Defect Photo Viewer & Concession Release
            │   │   └── mrb-quarantine/page.tsx # Section 6.3: Digital Rejection Holding Area (Rework, Scrap, RTV, Customer Concession)
            │   ├── travelers-traceability/
            │   │   ├── page.tsx            # Section 7.1: Active Digital Job Travelers & Routing Sequence Monitor
            │   │   └── search/page.tsx     # Section 7.2: Forward Recall (Heat #) & Backward Field (Serial #) Birth Certificate
            │   ├── dispatch-gate/
            │   │   └── page.tsx            # Sections 10, 11: 3-Point Shipping Interlock Monitor, Gate Pass & Crate QR Printer
            │   └── audit-logs/
            │       └── page.tsx            # Section 13.3: Tamper-proof ISO/Aerospace Activity Audit Trail Viewer
            │
            ├── (shopfloor-tablet)/         # WORKSPACE 2: Rugged Industrial Tablet PWA (Inspectors & Operators)
            │   ├── layout.tsx              # High-contrast, locked kiosk header, no manual search bar, Glove UI wrapper
            │   ├── shift-handover/page.tsx # Section 12.2: Mandatory Outgoing/Incoming Shift Handover & Ack Gate
            │   ├── machine-pm/page.tsx     # Section 2.2: Daily Preventive Maintenance & Zero-Point Setup Checklist
            │   ├── operator-terminal/
            │   │   └── [stationId]/page.tsx # Sections 8, 9: First-Piece Setup Lock, Active Cycle Timer, Hourly Sampling Prompt
            │   └── inspector-workflow/
            │       ├── scan/page.tsx       # Section 5.1: Mandatory 2-Step Physical QR Scan (Station Frame QR + Traveler QR)
            │       └── execute/[sessionId]/page.tsx # Sections 5.2-5.4: Locked linear checklist, Gauge scan, Split-screen Blueprint Pin highlight, GREEN/RED tolerance & Mandatory 2-Photo trigger
            │
            └── (public-verification)/      # WORKSPACE 3: External Customer Verification Portal
                └── verify/[crateSignature]/page.tsx # Section 11.3: Digital Certificate of Analysis (CoA), Measured PDI Values & MTCs

````

                                                          Developed by;
                                                    -: S.Pratap Vishwakarma :-
                                                                                                                                                        Used Ai ;
                                                                                                                                                      GOOGLE-GEMINI
