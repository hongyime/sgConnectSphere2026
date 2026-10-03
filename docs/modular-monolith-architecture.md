# ConnectSphere Modular Monolith Architecture

## Architecture overview

ConnectSphere is implemented as a single deployable modular monolith. All users enter through one React web application and a shared API layer. The application is separated internally into business modules with clearly defined responsibilities, while PostgreSQL and the notification infrastructure are shared.

Each event request represents one event session with its own date, time, venue, equipment, approval and registration arrangements. If an organiser plans multiple sessions, a separate event request must be created for each session.

```mermaid
flowchart TB
    subgraph USERS["1. User entry paths"]
        direction LR
        EO[Event Organiser]
        EC[Event Coordinator]
        VS[Venue Staff]
        TS[Technical Support Staff]
        AT[Attendee]
        LD[Event Coordinator Lead]
        SO[Safety Officer]
    end

    ACCESS[ConnectSphere Access]

    EO --> ACCESS
    EC --> ACCESS
    VS --> ACCESS
    TS --> ACCESS
    AT --> ACCESS
    LD --> ACCESS
    SO --> ACCESS

    subgraph ENTRY["2. Shared application entry"]
        direction TB
        UI[React Web Application]
        API[REST / JSON API Controllers]
        IAM[Identity and Access Control]
        ROUTER[Role and Action Router]

        UI --> API
        API -->|Validate request| IAM
        IAM -->|Role and organisation context| ROUTER
    end

    ACCESS --> UI

    subgraph MONOLITH["3. Single deployable modular monolith"]
        direction TB

        subgraph CORE["Core event-management modules"]
            direction LR
            EVT[Event Lifecycle]
            VEN[Venue and Booking]
            EQ[Equipment and Support]
        end

        subgraph SERVICES["Supporting business modules"]
            direction LR
            REG[Attendee Registration]
            AUD[Audit and History]
            NOT[Notification Dispatcher]
        end

        EVT -->|Venue requirements| VEN
        VEN -->|Booking status or conflict| EVT

        EVT -->|Equipment and support requirements| EQ
        EQ -->|Reservation or shortfall| EVT

        EVT -->|Confirmed event details| REG
        REG -->|Capacity and attendance status| EVT

        EVT -->|Lifecycle changes| AUD
        VEN -->|Booking changes| AUD
        EQ -->|Reservation changes| AUD
        REG -->|Registration changes| AUD

        EVT -.->|Event deliveries| NOT
        VEN -.->|Booking deliveries| NOT
        EQ -.->|Equipment deliveries| NOT
        REG -.->|Registration deliveries| NOT
    end

    ROUTER --> EVT
    ROUTER --> VEN
    ROUTER --> EQ
    ROUTER --> REG

    subgraph INFRA["4. Shared infrastructure"]
        direction TB
        DB[(PostgreSQL 16)]
        QUEUE[Redis Job Queue]
        WORKER[Background Worker]
        EMAIL[Email Provider]

        DB -->|Committed outbox jobs| QUEUE
        QUEUE --> WORKER
        WORKER --> EMAIL
    end

    IAM --> DB
    EVT --> DB
    VEN --> DB
    EQ --> DB
    REG --> DB
    AUD --> DB
    NOT -->|Delivery and outbox records| DB
```

## Module responsibilities

| Layer | Component | Main responsibility |
|---|---|---|
| User access | React Web Application | Provides a shared interface for all seven user roles. |
| Application entry | API Controllers | Receives REST/JSON requests and routes them into the application. |
| Security | Identity and Access Control | Authenticates users and retrieves their role and organisation context. |
| Security | Role and Action Router | Allows users to access only the actions permitted for their role. |
| Business module | Event Lifecycle | Manages event drafts, submission, review, clarification, approval, planning, confirmation, cancellation and completion. |
| Business module | Venue and Booking | Maintains venue information, venue blocks, booking requests, suitability checks and booking conflicts. |
| Business module | Equipment and Support | Maintains equipment, checks availability, creates reservations, identifies shortfalls and assigns technical staff. |
| Business module | Attendee Registration | Publishes confirmed event information and manages registration, capacity, waitlists, withdrawal and attendance. |
| Supporting module | Audit and History | Records important user actions and changes to business records. |
| Supporting module | Notification Dispatcher | Creates and processes notification deliveries arising from business events. |
| Shared infrastructure | PostgreSQL 16 | Stores users, events, bookings, equipment, registrations, audit history and notification delivery records. |
| Shared infrastructure | Redis Job Queue | Queues committed notification jobs for asynchronous processing. |
| Shared infrastructure | Background Worker | Processes queued notification jobs outside the main user request. |
| External service | Email Provider | Delivers confirmation, clarification, waitlist and change-notification emails. |

## Role-to-module access

| User role | Primary modules used |
|---|---|
| Event Organiser | Identity and Access Control, Event Lifecycle, Notification Dispatcher |
| Event Coordinator | Identity and Access Control, Event Lifecycle, Venue and Booking, Equipment and Support, Notification Dispatcher |
| Venue Staff | Identity and Access Control, Venue and Booking, Event Lifecycle, Notification Dispatcher |
| Technical Support Staff | Identity and Access Control, Equipment and Support, Event Lifecycle, Notification Dispatcher |
| Attendee | Identity and Access Control, Attendee Registration, Event Lifecycle, Notification Dispatcher |
| Event Coordinator Lead | Identity and Access Control, Event Lifecycle (unassigned queue, assignment, reassignment, oversight), Notification Dispatcher |
| Safety Officer | Identity and Access Control, Event Lifecycle (Operational Safety Check), Venue and Booking and Equipment and Support (read-only, for the factors), Notification Dispatcher |

## Architectural interpretation

- The system is deployed as one application rather than as independent microservices.
- Each module owns a distinct business responsibility and communicates with other modules through defined application-level interactions.
- The modules share one PostgreSQL database but should keep their business logic separated.
- Venue and equipment readiness determine whether an approved event can be confirmed.
- Notifications are handled asynchronously through committed outbox records, Redis and a background worker.
- Audit records preserve the history of significant actions across the business modules.
