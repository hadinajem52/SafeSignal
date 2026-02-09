---
name: Clean Code & System Design
description:The objective is to create code that is functional, readable, and maintainable.
---


# Agent Instructions: Clean Code & System Design

## 1. Foundational Coding Cornerstones
The objective is to create code that is functional, readable, and maintainable [1].
*   **YAGNI (You Aren't Gonna Need It):** Implement features only when required [2]. Avoid over-engineering by resisting the temptation to plan for every future scenario [3].
*   **KISS (Keep It Simple, Stupid):** Prioritize straightforward designs [3]. Simple solutions are more robust, flexible, and easier to debug [4].
*   **DRY (Don't Repeat Yourself):** Maintain a single, unambiguous source of truth for every piece of logic [5]. Use functions or modules to encapsulate repeated patterns [6].
*   **The Conflict Rule:** DRY is complex and can lead to over-abstraction [7, 8]. If DRY and KISS conflict, **KISS takes precedence** [7, 9].

## 2. SOLID Design Principles
Used to create flexible object-oriented systems that are easy to modify and test [10, 11].
*   **Single Responsibility (SRP):** A class should have one job and one reason to change [11, 12].
*   **Open-Closed (OCP):** Systems should be open for extension but closed for modification to prevent new bugs in stable code [12, 13].
*   **Liskov Substitution (LSP):** Subclasses must be replaceable by their base types without breaking the program's integrity [12, 13].
*   **Interface Segregation (ISP):** Use many specialized interfaces rather than one large, general-purpose interface [12, 14].
*   **Dependency Inversion (DIP):** High-level modules should depend on abstractions (interfaces), not low-level details [12, 15].

## 3. Core System Design Concepts
### Scalability & Performance
*   **Vertical Scaling:** Increasing the capacity (CPU/RAM) of a single server [16, 17].
*   **Horizontal Scaling:** Adding more machines to a cluster. This is generally preferred for fault tolerance and high availability [16, 17].
*   **Latency vs. Throughput:** Latency is the duration of an action (the "lag") [18]. Throughput is the total capacity a system handles per unit of time [19, 20]. A system is only as fast as its slowest **bottleneck** [21].

### Traffic & Networking
*   **Load Balancing:** Acts as a "traffic cop" to distribute requests across servers [22, 23]. Strategies include:
    *   **Round Robin:** Looping through servers in a fixed sequence [24].
    *   **IP Hashing:** Using the client's IP to consistently route them to the same server for cache benefits [25, 26].
*   **Proxies:** A **Forward Proxy** masks the client's identity from the server [27]. A **Reverse Proxy** masks the server and can handle load balancing or SSL termination [28, 29].

### Data Storage
*   **Relational (SQL):** Structured data following **ACID** (Atomicity, Consistency, Isolation, Durability) properties [30, 31].
*   **Non-Relational (NoSQL):** Flexible, key-value stores following **BASE** (Basically Available, Soft state, Eventual consistency) [32, 33].

## 4. Developer Experience (DX) & Maintainability
*   **Naming:** Good names indicate purpose and intent [34]. If a name requires a comment, it has failed its job [35].
*   **Functions:** Should be small (ideally < 50 lines) and do only one thing [36, 37].
*   **Standardized Commits:** Use structured messages (type, scope, subject) to document the "why" behind changes, which aids debugging and audits [38-40].
*   **The Cost of "Bad Code":** Disorganized "spaghetti code" is a financial threat; it slows productivity until it eventually reaches zero [41, 42].