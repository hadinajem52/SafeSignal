# Extracted text from FYP Report_Rabih hajj hassan_Latest_consistency_audited.docx

[0] (Normal) ANTONINE UNIVERSITY
[1] (Body Text) Faculty of Engineering and Technology
[2] (Body Text) Department of Technology in Computer Science
[8] (Body Text) SafeSignal
[17] (Body Text) Spring 2026
[45] (Normal) ACKNOWLEDGMENT
[47] (Normal) I would like to express my sincere gratitude to my supervisor,Dr. Youssef Keryakos, from the Faculty of Engineering – Department of Technology in Computer Science, for his continuous support, guidance, and valuable feedback throughout the development of this project. His insightful advice and encouragement played a significant role in shaping this work.
[49] (Normal) I would also like to extend my thanks to the Dean and the faculty members of the Department of Technology in Computer Science for providing the necessary resources and academic environment that made this project possible.
[52] (Normal) ABSTRACT
[53] (Title) The field of civic technology represents a multidisciplinary domain that combines computer science, software engineering, data analytics, and public-safety engagement. Despite the global growth of smart city solutions, community-driven digital reporting systems remain limited in effectiveness, particularly in regions where traditional reporting mechanisms are slow or inaccessible. This gap highlights both a technical and societal opportunity for developing platforms that enhance community safety through real-time, crowdsourced data.
[55] (Title) The main challenge addressed in this project is the design and development of a scalable, reliable, and intelligent incident reporting system that enables users to submit, track, and verify safety-related reports, while remaining feasible within the scope of a final-year academic project. Existing reporting solutions often suffer from issues such as duplicate submissions, misinformation, and lack of transparency, making them difficult to rely on for timely decision-making.
[57] (Title) This project proposes the development of a mobile-based system titled SafeSignal, implemented using a cross-platform framework and supported by a backend server and machine learning components. The proposed solution focuses on enabling real-time incident reporting through location data, images, and textual descriptions, while incorporating machine learning techniques for automatic categorization and duplicate detection. Additionally, a human moderation layer is integrated to validate and escalate verified reports.
[59] (Title) To validate the proposed solution, multiple system-level tests were conducted, targeting reporting functionality, data accuracy, duplicate detection performance, and overall system reliability. These tests were designed to evaluate both the technical performance of the system and the usability of the application.
[61] (Title) The results demonstrate the successful development of a functional and extensible reporting platform featuring real-time data submission, intelligent processing, and a structured moderation workflow. The project confirms the feasibility of combining mobile technologies, machine learning, and human-in-the-loop verification to support community-based public safety systems.
[71] (Title) TABLE OF CONTENT
[74] (toc 1) CHAPTER 1: GENERAL INTRODUCTION 1
[75] (toc 2) 1. Problem Identification (context, general problem) 1
[76] (toc 2) 2. Problem Statement / Formulation 2
[77] (toc 2) 3. Solution Approach / Methodology 2
[78] (toc 2) 4. Risk Management and Scope Control 3
[79] (toc 2) 5. Report Outline 3
[80] (toc 1) CHAPTER II: PROJECT REQUIREMENTS AND CONSTRAINTS 4
[81] (toc 2) 1. Introduction 4
[82] (toc 2) 2. Project Planning 4
[83] (toc 2) 2.1. Team management 4
[84] (toc 2) 2.2. Time management 5
[85] (toc 2) Time management was a critical factor due to the complexity of the system and the academic constraints imposed by the semester schedule. The project was divided into several phases, including research, system design, mobile application development, backend implementation, machine learning integration, testing, and documentation. Each phase was assigned a specific timeframe to prevent scope creep and ensure steady progress. 5
[86] (toc 2) 2.2.1. Gantt Chart 5
[87] (toc 2) A Gantt chart was used to visualize the project timeline and monitor progress across different development stages. The chart outlined key milestones such as technology familiarization, system design, mobile application development, backend implementation, machine learning integration, system testing, and report writing. This planning tool allowed for better anticipation of risks and facilitated timely adjustments when delays occurred. 5
[88] (toc 2) 2.3. Budget 6
[89] (toc 2) The project was developed with minimal financial cost. Most development tools and frameworks used, including React Native, Node.js, Python libraries, and version control systems, are open-source or freely available for development purposes. The primary expenses were limited to optional third-party services such as cloud hosting infrastructure, database hosting, geolocation API services, and external AI service usage for machine learning functionalities. Overall, the project adhered to a low-budget model, making it accessible and reproducible within similar academic and research environments. 6
[90] (toc 2) 3. Project functional requirements 6
[91] (toc 2) 4. Project constraints 7
[92] (toc 2) 4.1. Technical constraints 7
[93] (toc 2) 4.2. Non-technical constraints 7
[94] (toc 2) 4.3. Standards / codes / regulations / policies 8
[95] (toc 2) 5. Conclusion 8
[96] (toc 1) CHAPTER III: EXISTING SOLUTIONS 9
[97] (toc 2) 1. Introduction 9
[98] (toc 2) 2. Context and Domain of application 9
[99] (toc 2) 3. Existing Solutions /Methods 10
[100] (toc 2) 3.1. First category of methods /Solutions /Algorithms 10
[101] (toc 2) 3.1.1. Algorithm 1 10
[102] (toc 2) 3.1.2. Method 1 11
[103] (toc 2) From a design perspective, large-scale reporting platforms emphasize reliable data flow, secure user authentication, responsive user interaction, and efficient information management. System design is carefully structured to support real-time reporting, media evidence handling, incident tracking, moderation workflows, and scalable data processing while maintaining usability and accessibility for a broad range of users. However, these design methodologies often rely on extensive infrastructure, large datasets, and dedicated development teams, which are not feasible within the constraints of a final-year project. 11
[104] (toc 2) 3.2. Second category of methods /Solutions /Algorithms 11
[105] (toc 2) Community-driven and independent reporting platforms represent a more accessible category of existing solutions, particularly relevant to academic projects. These systems often rely on open-source or widely available technologies such as cross-platform mobile frameworks like React Native, backend technologies such as Node.js, cloud-hosted databases such as PostgreSQL, and machine learning services built using Python-based frameworks. 11
[106] (toc 2) 3.2.1. Algorithm 1 11
[107] (toc 2) 3.2.2. Method 1 11
[108] (toc 2) 4. Comparative study 12
[109] (toc 2) 5. Project Objectives 13
[110] (toc 2) 6. Conclusion 13
[111] (toc 1) CHAPTER IV: PROPOSED SOLUTION / DESIGN / METHOD 14
[112] (toc 2) 1. Introduction 14
[113] (toc 2) 2. Design of the proposed solution 14
[114] (toc 2) 2.1. Solution architecture (project architecture) 14
[115] (toc 2) 2.2. Refined solution architecture (system architecture) 15
[116] (toc 2) 3. Design blocks description 16
[117] (toc 2) 4. Conclusion 17
[118] (toc 1) CHAPTER V: DEVELOPMENT AND IMPLEMENTATION 18
[119] (toc 2) 1. Introduction 18
[120] (toc 2) 2. Hardware development and implementation 18
[121] (toc 2) 2.1. Input block 19
[122] (toc 2) 2.2. Processing block 19
[123] (toc 2) 2.3. Communication block 19
[124] (toc 2) 3. Software development and implementation 19
[125] (toc 2) 3.1. Database structure 20
[126] (toc 2) 3.2. Software functionalities 20
[127] (toc 2) 3.3. Deployment and hosting configuration 21
[128] (toc 2) 4. Conclusion 21
[129] (toc 1) CHAPTER VI: EXPERIMENTS AND RESULTS 21
[130] (toc 2) 1. Introduction 21
[131] (toc 2) 2. Prototype/application 21
[132] (toc 2) 3. Experimental approach 22
[133] (toc 2) 4. System tests/simulations/experiments 23
[134] (toc 2) Authentication and access control 24
[135] (toc 2) Reports and moderation workflow 24
[136] (toc 2) Dashboard and analytics consistency 24
[137] (toc 2) Users, settings, and law-enforcement workflows 25
[138] (toc 2) Representative test results 25
[139] (toc 2) Test result 26
[140] (toc 2) Test interpretation 26
[141] (toc 2) Discussion 26
[142] (toc 2) 5. Impact of the proposed solution 26
[143] (toc 2) 6. Conclusion 27
[144] (toc 1) CHAPTER VII: GENERAL CONCLUSION 28
[145] (toc 2) 1. Report Summary 28
[146] (toc 2) 2. Future work and Perspectives 29
[147] (toc 1) REFERENCES i
[148] (toc 1) LIST OF ACRONYMS ii
[149] (toc 1) LIST OF FIGURES iii
[150] (toc 1) LIST OF TABLES iv
[151] (toc 1) APPENDIX A vi
[152] (toc 1) Code Structure and Implementation Excerpts vi
[153] (toc 2) 1. A.1. Purpose of the Appendix vi
[154] (toc 2) 2. A.2. Project Directory Structure vi
[155] (toc 2) 3. A.3. Incident Reporting Logic (Excerpt Description) vii
[156] (toc 2) 4. A.4. Machine Learning Processing Logic (Excerpt Description) vii
[157] (toc 2) 5. A.5. Moderation and Verification Implementation viii
[158] (toc 2) 6. A.6. Backend and Database Management viii
[159] (toc 2) 7. A.7. Remarks on Code Availability ix
[165] (Heading 1) CHAPTER 1: GENERAL INTRODUCTION
[166] (Heading 2) Problem Identification (context, general problem)
[167] (Normal) Public safety and civic technology have become increasingly important domains that combine software engineering, data management, real-time systems, and user interaction. Modern community-driven platforms require a solid understanding of system architecture, mobile development, data processing, and user-centered design. As a result, they represent an important application area for computer science graduates seeking to apply theoretical knowledge to real-world societal challenges.
[169] (Normal) Despite the growing global adoption of smart city solutions, community-based incident reporting systems remain underdeveloped in Lebanon. Traditional reporting methods, such as hotlines or in-person reports, are often inefficient and lack transparency. Existing digital solutions are limited in number and frequently suffer from issues such as poor usability, lack of trust, and minimal public engagement. This gap is not due to a lack of technical capability, but rather limited infrastructure and the absence of structured platforms that support community-driven safety reporting. Consequently, citizens often lack effective tools to report incidents and stay informed about local safety concerns.
[171] (Normal) From a technical perspective, building a real-time incident reporting system represents a complex engineering problem. It involves the integration of multiple components such as cross-platform mobile interfaces, backend API services, geolocation and mapping systems, database management, machine learning services, and real-time communication mechanisms. These components must work together to ensure reliable data collection, processing, and retrieval. Additionally, challenges such as handling duplicate reports, processing media evidence, filtering misinformation, and maintaining system scalability significantly increase overall system complexity.
[173] (Normal) Another challenge lies in ensuring data credibility and user trust. Many existing platforms lack effective verification mechanisms, leading to inaccurate or misleading information. Incorporating intelligent techniques such as machine learning for report classification, duplicate detection, confidence scoring, and media analysis, along with human moderation and escalation workflows, introduces additional design and implementation challenges. Furthermore, balancing transparency, privacy preservation, and secure handling of sensitive incident data adds another layer of complexity to the system.
[175] (Normal) Within this context, there is a need for an academically grounded project that demonstrates how a scalable, intelligent, and user-centered incident reporting system can be designed, implemented, and evaluated using accessible technologies. Such a project can serve as both a technical proof of concept and a foundation for future development in the domain of civic technology and public safety.
[177] (Heading 2) Problem Statement / Formulation
[178] (Normal) The problem addressed in this project is the lack of effective technology-driven platforms that enable communities to report, verify, and track safety-related incidents in a reliable and transparent manner. Specifically, there is a need to design and implement a scalable system that supports real-time incident reporting, media evidence submission, intelligent data processing, and secure verification workflows through both automated and human-assisted moderation mechanisms.
[180] (Normal) The objective of this project is to develop a functional mobile-based application that enables users to submit and monitor safety-related reports using geolocation data, images, videos, and textual descriptions. The current implementation also includes a web-based moderator dashboard, a law-enforcement workspace, role-based administration, witness corroboration, saved-area and notification features, and machine-learning support for classification, risk analysis, duplicate detection, media evidence judgment, and analytics insights. The project is relevant to computer science students, civic technology initiatives, and organizations seeking practical applications of software engineering and intelligent systems in public safety.
[181] (Heading 2) Solution Approach / Methodology
[182] (Normal) The methodology adopted in this project follows an engineering design approach, emphasizing iterative development, modular system architecture, and continuous testing. The system is developed as a cross-platform mobile application using React Native and Expo, supported by a Node.js and Express backend, a React and Vite moderator dashboard, a PostgreSQL/PostGIS database, Socket.IO realtime communication, and a Python FastAPI machine-learning service.
[184] (Normal) The development process began with identifying functional requirements, including user authentication, incident reporting, geolocation tracking, photo and video upload support, offline report queueing, real-time notifications, witness corroboration, report categorization, duplicate detection, advisory media judgment, moderation workflows, law-enforcement follow-up, analytics, and administrative tools. Based on these requirements, the project was organized into independent modules: mobile application, moderator dashboard, backend API services, machine-learning service, database layer, and shared constants.
[186] (Normal) Implementation was carried out incrementally, with each subsystem developed, tested, and refined before full system integration. Particular attention was given to API communication, database operations, real-time synchronization, and user interaction to ensure reliable report submission and system responsiveness. System-level testing scenarios were used to evaluate reporting accuracy, machine learning classification performance, duplicate detection reliability, notification delivery, and overall application stability, allowing early identification and correction of design and performance issues.
[187] (Heading 2) Risk Management and Scope Control
[188] (Normal) Risk considerations included data reliability, system scalability, machine-learning accuracy, secure handling of sensitive user information, location privacy, reliable realtime communication, and prevention of inaccurate or malicious submissions. The project mitigates these risks through role-based access control, validation, privacy-aware disclosure settings, moderation workflows, advisory ML outputs, and staged testing. Production-grade load testing, security testing, mobile field testing, and formal ML accuracy evaluation remain future validation work.
[189] (Heading 2) Report Outline
[190] (Normal) This report is structured into seven chapters. Chapter II presents the project requirements and constraints, including planning, functional requirements, and technical limitations. Chapter III reviews existing solutions and related works in the field of civic technology and community-based incident reporting systems. Chapter IV details the proposed solution and overall system architecture, including mobile, backend, and machine learning components. Chapter V describes the development and implementation process of the system, including mobile application features, backend services, and data processing modules. Chapter VI presents the system testing, evaluation results, and performance analysis. Finally, Chapter VII concludes the report with a summary of the work and perspectives for future development.
[194] (Heading 1) CHAPTER II: PROJECT REQUIREMENTS AND CONSTRAINTS
[195] (Heading 2) Introduction
[196] (Normal) This chapter presents the requirements and constraints that guided the design and development of the SafeSignal system. Following the problem formulation introduced in Chapter I, the objective of this chapter is to define the planning strategy, functional requirements, and limitations that frame the scope of the project. These elements are essential to ensure that the proposed solution remains feasible, coherent, and aligned with academic and technical expectations.
[197] (Normal) The chapter begins with an overview of the project planning process, including time management and task organization. It then details the functional requirements that define the core objectives of the system, such as incident reporting, data processing, and moderation workflows. Finally, the chapter outlines the technical and non-technical constraints that influenced design decisions, as well as the standards, regulations, and ethical considerations relevant to the project, particularly in terms of data privacy and user protection.
[198] (Heading 2) Project Planning
[199] (Normal) Effective project planning was essential to ensure the successful development of the SafeSignal system within the limited timeframe of a final-year project. Given the multidisciplinary nature of the system, the planning phase focused on defining clear milestones, managing development time efficiently, and prioritizing core system functionalities such as incident reporting, data processing, and moderation workflows.
[200] (Heading3) Team management
[202] (Normal) This project was carried out by a team of two students, both enrolled at the BA campus. Responsibilities were distributed based on individual technical strengths while maintaining continuous collaboration throughout the development process. Core tasks such as system design, mobile application development, backend implementation, and machine learning integration were shared between the team members.
[203] (Normal) Regular communication was maintained to ensure consistency in design decisions, risk management, and progress tracking. This collaborative approach helped mitigate development delays and ensured alignment between system implementation and project objectives.
[205] (Heading3) Time management
[206] (Normal) Time management was a critical factor due to the complexity of the system and the academic constraints imposed by the semester schedule. The project was divided into several phases, including research, system design, mobile application development, backend implementation, dashboard implementation, machine-learning integration, testing, and documentation. Each phase was assigned a specific timeframe to prevent scope creep and ensure steady progress.
[207] (Heading4) Gantt Chart
[208] (Normal) A Gantt chart was used to visualize the project timeline and monitor progress across different development stages. The chart outlined key milestones such as technology familiarization, system design, mobile application development, backend implementation, moderator dashboard development, machine-learning integration, system testing, and report writing.
[211] (Heading3) Budget
[212] (Normal) The project was developed with minimal financial cost. Most development tools and frameworks used, including Expo, React Native, React, Vite, Node.js, Python, PostgreSQL, and version control systems, are open-source or freely available for development purposes. Optional expenses are limited to hosted infrastructure and third-party services such as Render, Neon, Google Maps, Firebase Cloud Messaging, Cloudflare R2-compatible storage, and Gemini API usage.
[214] (Heading 2) Project functional requirements
[215] (Normal) The functional requirements define the essential capabilities that the system must provide to fulfill the objectives of the project. These requirements serve as measurable criteria to evaluate whether the proposed solution successfully addresses the problem statement.
[217] (Normal) The primary functional requirements of the project are as follows:
[218] (Normal) The system shall allow users to register, authenticate, and securely access the application.
[219] (Normal) The system shall allow users to submit incident reports including text descriptions, images, videos, category selection, severity level, and geolocation data.
[220] (Normal) The system shall support anonymous report submission while preserving user privacy.
[221] (Normal) The system shall implement automated machine-learning processing for incident categorization, duplicate detection, risk scoring, toxicity review, media evidence judgment, and analytics or area-insight generation when the configured provider supports those capabilities.
[222] (Normal) The system shall include a duplicate detection mechanism to identify and group similar or repeated incident reports.
[223] (Normal) The system shall provide real-time notifications regarding report status updates and nearby incidents.
[224] (Normal) The system shall provide a witness corroboration mechanism allowing nearby users to confirm submitted incidents.
[225] (Normal) The system shall provide a moderator dashboard for reviewing, validating, rejecting, merging, escalating, and commenting on reports, with additional analytics, user-management, settings, law-enforcement, and admin workflows.
[226] (Normal) The system shall implement secure backend infrastructure ensuring reliable storage and retrieval of incident data.
[227] (Normal) The system shall provide users with map-based visualization, community feed browsing, saved-area insights, and tracking of reported incidents.
[228] (Normal) The system shall support role-based access control for citizens, moderators, administrators, and law-enforcement users.
[229] (Normal) The system shall support incident drafts, offline report queueing, notification inbox management, and role-aware privacy controls such as anonymous reporting, location fuzzing, and media disclosure settings.
[231] (Normal) Failure to meet any of these core requirements would prevent the project from achieving its primary objectives.
[233] (Heading 2) Project constraints
[234] (Normal) In parallel with functional requirements, several constraints influenced the design and implementation of the project. These constraints were carefully considered to ensure feasibility and compliance with academic expectations.
[235] (Heading3) Technical constraints
[236] (Normal) Technical constraints represent explicit limitations that directly affected system design and implementation. The main technical constraints identified for this project include:
[237] (Normal) The use of specific technologies including Expo/React Native, React/Vite, Node.js/Express, PostgreSQL with PostGIS, Socket.IO, FastAPI, Redis-compatible caching, and third-party APIs as the primary development stack.
[238] (Normal) Execution on standard mobile devices without reliance on high-end hardware or processing capabilities.
[239] (Normal) Near real-time responsiveness requirements to ensure smooth user interaction and timely report submission and retrieval.
[240] (Normal) Limited development time, restricting the scope of implemented features and system complexity.
[241] (Normal) The necessity to maintain code readability, modularity, and scalability for academic evaluation.
[242] (Normal) These constraints required careful optimization and prioritization of core system features to ensure stability, performance, and usability.
[244] (Heading3) Non-technical constraints
[246] (Normal) Non-technical constraints encompass factors beyond direct technical implementation. These include:
[247] (Normal) Usability: The system must feature an intuitive user interface and clear feedback mechanisms to ensure accessibility for a wide range of users.
[248] (Normal) Maintainability: The codebase must be structured and documented to facilitate future development and system expansion.
[249] (Normal) Ethical considerations: The project must ensure responsible handling of user-generated content, respect intellectual property rights, and avoid misuse of submitted data.
[250] (Normal) Privacy and data protection: Special attention must be given to protecting user identity and sensitive location information while maintaining system functionality.
[251] (Normal) Schedule constraints: The project had to be completed within the academic semester timeframe.
[252] (Normal) Trust and misuse prevention: The system must minimize false reporting and implement safeguards against malicious or misleading submissions.
[253] (Normal) Special attention was given to ethical obligations, particularly regarding user privacy, transparency in system behavior, and responsible use of community-submitted information.
[255] (Heading3) Standards / codes / regulations / policies
[256] (Normal) While civic technology systems are not governed by a single universal standard, several software engineering guidelines and policies were considered during the project. These include software development life cycle (SDLC) best practices, coding standards for readability and maintainability, data protection principles, and general cybersecurity practices to ensure system integrity and user safety.
[257] (Normal) Relevant standards and guidelines considered in this project include:
[258] (Normal) Software development life cycle (SDLC) models such as iterative and incremental development.
[259] (Normal) General principles from IEEE standards related to software quality, documentation, and system design.
[260] (Normal) Data privacy and protection principles related to the handling of user-generated content and location data.
[261] (Normal) Copyright and intellectual property laws governing the use of third-party libraries, APIs, and assets.
[262] (Normal) Ethical guidelines promoting responsible software development, transparency, and user safety.
[263] (Normal) Secure data handling practices for storage and transmission of sensitive location, media, and user-generated incident data.
[264] (Normal) Although full compliance with all industry standards was not feasible within the project scope, awareness and selective application of relevant guidelines contributed to the overall quality, reliability, and ethical integrity of the system.
[267] (Heading 2) Conclusion
[268] (Normal) This chapter defined the functional and non-functional requirements, constraints, and guiding standards that shaped the design and development of the SafeSignal system. These specifications ensured that the project remained feasible within academic limitations while maintaining a clear focus on usability, reliability, and ethical responsibility. Together, they provide a structured foundation for the system’s design and implementation in the following chapters
[270] (Heading 1) CHAPTER III: EXISTING SOLUTIONS
[271] (Heading 2) Introduction
[272] (Normal) The objective of this chapter is to analyze existing solutions and related works relevant to the development of community-based incident reporting and civic technology systems, with particular emphasis on real-time reporting platforms, public safety applications, and intelligent data processing approaches. Understanding existing solutions is essential to identify current technological approaches, design practices, and limitations that influence the development of similar systems.
[273] (Normal) This chapter first introduces the general context and application domain of civic technology and public safety systems. It then presents and categorizes existing solutions based on functionality, verification mechanisms, and technical implementation. A comparative study is conducted to highlight the strengths and weaknesses of these solutions. Finally, the chapter concludes by defining clear project objectives derived from the analysis of related works.
[274] (Heading 2) Context and Domain of application
[275] (Normal) The domain of application for this project lies within civic technology and community-based public safety systems, specifically mobile platforms designed for real-time incident reporting and information sharing. These systems are characterized by user-generated reporting, geolocation integration, data verification mechanisms, and public access to safety-related information.
[276] (Normal) Historically, digital reporting systems and smart city technologies have become increasingly important in improving communication between citizens and authorities. Despite the growth of modern communication technologies, many communities still lack accessible and transparent platforms for reporting and tracking safety-related incidents. This makes community-driven reporting systems particularly relevant for both academic research and practical implementation.
[277] (Normal) Public safety reporting systems combine mobile computing, backend services, secure database management, geolocation technologies, real-time communication systems, and intelligent data processing services. From a technical standpoint, they require careful system design, secure authentication mechanisms, media handling, scalable APIs, real-time notification delivery, and reliable moderation workflows. Additionally, integrating machine learning techniques for report categorization, duplicate detection, and intelligent report analysis introduces further complexity. These characteristics make such systems strong candidates for studying real-world software engineering and intelligent system design within a computer science framework..
[280] (Heading 2) Existing Solutions /Methods
[281] (Normal) Existing solutions in the domain of community-based incident reporting and public safety systems can be broadly classified into two main categories: official or government-supported reporting platforms and community-driven or crowdsourced reporting solutions.
[283] (Heading3) First category of methods /Solutions /Algorithms
[284] (Normal) Official and government-supported reporting platforms are typically developed by public institutions or large organizations with access to dedicated infrastructure, specialized development teams, and enterprise-level resources. These systems often serve as benchmarks for reliability, scalability, and secure handling of large volumes of sensitive public safety data.
[285] (Heading4) Enterprise-scale processing pattern
[286] (Normal) Official and large-scale reporting platforms often rely on sophisticated backend infrastructures and highly customized system architectures. Core functionalities such as real-time data processing, incident verification, secure user authentication, geolocation services, media processing, and user management are typically tightly integrated and optimized for scalability and reliability. These systems frequently implement advanced techniques such as automated classification algorithms, duplicate detection systems, event-driven architectures, and large-scale database management solutions.
[287] (Normal) While these approaches result in robust and efficient systems, they are often difficult to replicate in an academic context due to limited access to implementation details, proprietary technologies, and the scale of infrastructure and resources required.
[289] (Heading4) Institutional design approach
[290] (Normal) From a design perspective, large-scale reporting platforms emphasize reliable data flow, secure user authentication, responsive user interaction, and efficient information management. System design is carefully structured to support real-time reporting, media evidence handling, incident tracking, moderation workflows, and scalable data processing while maintaining usability and accessibility for a broad range of users.
[292] (Heading3) Second category of methods /Solutions /Algorithms
[293] (Normal) Community-driven and independent reporting platforms represent a more accessible category of existing solutions, particularly relevant to academic projects. These systems often rely on open-source or widely available technologies such as cross-platform mobile frameworks, web dashboards, REST APIs, cloud-hosted databases, and Python-based machine-learning or analytics services.
[294] (Heading4) Open-source development pattern
[295] (Normal) Open-source frameworks and development tools provide developers with access to source code, extensive documentation, and active community support. These technologies support modular development, REST API integration, real-time communication mechanisms, database connectivity, authentication systems, and rapid prototyping. Cross-platform mobile frameworks and modern backend technologies are designed to support scalable application development through component-based architectures and high-level programming environments.
[296] (Normal) Such technologies enable developers to focus on system functionality and application design rather than low-level infrastructure implementation. However, they still require careful architectural planning to avoid tightly coupled components, security vulnerabilities, and performance bottlenecks.
[297] (Heading4) Community-centered design approach
[298] (Normal) Community-driven reporting platforms often prioritize accessibility, usability, privacy protection, and public trust over enterprise-level infrastructure and large-scale deployment features. Development practices in this category emphasize iterative design, modular architectures, and user feedback to improve system effectiveness and reliability. While this approach aligns well with academic constraints, smaller-scale systems may lack the scalability, optimization, and extensive datasets available in large commercial platforms due to limited resources.
[299] (Normal) Nevertheless, these development practices provide valuable insights into scalable system design, data management, and user-centered application development.
[301] (Heading 2) Comparative study
[302] (Normal) A comparative analysis of official large-scale reporting platforms and community-driven solutions highlights several key differences and similarities. Large-scale platforms offer higher levels of scalability, infrastructure reliability, and data processing capabilities but often require significant resources, dedicated teams, and proprietary technologies. Community-driven solutions, on the other hand, emphasize accessibility, flexibility, and modularity, making them more suitable for academic and small-scale projects.
[303] (Normal) Both categories rely on similar fundamental principles, such as efficient data management, responsive user interaction, and reliable reporting mechanisms. However, community-driven solutions place greater emphasis on extensibility, usability, and maintainability, which aligns closely with the objectives of this project.
[304] (Normal) Comparative Analysis Table
[306] (Heading 2) Project Objectives
[307] (Normal) Based on the analysis of existing solutions, the following objectives were defined for the SafeSignal project:
[308] (Normal) To develop a functional mobile-based incident reporting system using accessible and scalable technologies.
[309] (Normal) To implement modular reporting, categorization, and moderation components that can be extended in future iterations.
[310] (Normal) To integrate machine learning techniques for incident classification and duplicate detection.
[311] (Normal) To design a user-friendly system that supports real-time reporting, notifications, witness corroboration, and tracking of safety-related incidents.
[312] (Normal) To ensure code readability, maintainability, scalability, and academic clarity.
[313] (Normal) To create a prototype that can be further expanded beyond the FYP into a deployable community-oriented platform.
[314] (Normal) These objectives aim to balance technical feasibility with practical impact while remaining within the scope of a final-year project.
[315] (Heading 2) Conclusion
[316] (Normal) This chapter reviewed existing solutions in the domain of community-based incident reporting and civic technology systems, highlighting both large-scale official platforms and community-driven approaches. Through this analysis, the limitations of large-scale centralized solutions and the advantages of open-source, flexible, and modular development practices were identified. The insights gained from this study informed the definition of clear project objectives and guided the design choices presented in the following chapter, which details the proposed solution and system architecture.
[317] (Heading 1) CHAPTER IV: PROPOSED SOLUTION / DESIGN / METHOD
[318] (Heading 2) Introduction
[319] (Normal) This chapter presents the proposed solution developed to address the problem identified in the previous chapters. It details the overall design philosophy, system architecture, and the main functional blocks that constitute the SafeSignal system. The objective of this chapter is to provide a clear and structured description of how the proposed solution was conceived and how it improves upon existing approaches while remaining feasible within the constraints of an academic project.
[320] (Normal) The proposed solution emphasizes modularity, scalability, maintainability, and secure handling of user-generated safety data, allowing the developed system to serve both as a functional civic technology platform and as a technical foundation for future expansion. This chapter first introduces the global architecture of the project, then refines it into detailed system components, and finally describes the main design blocks and their interactions.
[321] (Heading 2) Design of the proposed solution
[322] (Normal) The proposed solution consists of a mobile incident-reporting application developed with Expo and React Native, a web-based moderator dashboard developed with React and Vite, backend API services developed using Node.js and Express, a Python FastAPI machine-learning service, and a PostgreSQL/PostGIS database. The implementation separates the mobile client, dashboard client, backend services, realtime communication, data management, and machine-learning modules so that each subsystem can be tested and extended independently.
[323] (Normal) The design process followed an iterative approach, starting with a high-level architectural vision and gradually refining each subsystem. Design decisions were driven by functional requirements, technical constraints, and the need for scalability, reliability, and extensibility.
[324] (Heading3) Solution architecture (project architecture)
[325] (Normal) At the project level, the system architecture is organized into five main layers:
[326] (Normal) • Mobile Application Layer: Includes authentication, incident reporting, drafts, offline queueing, media upload, geolocation tagging, community feed, notifications, saved areas, witness prompts, and account preferences.
[328] (Normal) • Backend and Realtime Services Layer: Manages REST API communication, user authentication, validation, business logic, Socket.IO events, push-notification coordination, scheduled jobs, and communication between clients, the database, and ML services.
[329] (Normal) • Machine Learning and Processing Layer: Handles classification, duplicate detection, risk scoring, toxicity review, advisory media evidence judgment, area insights, dashboard insights, and constellation synthesis through either local models or Gemini-backed provider logic.
[330] (Normal) • Database and Data Management Layer: Uses PostgreSQL with PostGIS to store users, incidents, reports, media metadata, moderation actions, ML outputs, comments, notifications, saved areas, follows, disclosure settings, and witness-constellation data.
[331] (Normal) • Moderator, Admin, and Law-Enforcement Dashboard Layer: Provides report review, analytics, user administration, settings, database administration, law-enforcement incident handling, disclosure controls, and timeline messaging.
[332] (Normal) This layered architecture promotes maintainability, scalability, and efficient separation of system responsibilities.
[333] (Heading3) Refined solution architecture (system architecture)
[334] (Normal) At a more detailed level, the system architecture is refined into interacting components, each responsible for a specific functionality:
[335] (Normal) • Mobile Application Module: Manages registration, login, email verification, Google sign-in, report creation, draft handling, offline queueing, media uploads, location selection, community feed browsing, maps, saved areas, notifications, witness prompts, and user preferences.
[336] (Normal) • Backend API Module: Handles request processing, authentication, role-based authorization, validation, API routing, data persistence, upload handling, scheduled maintenance, notification dispatch, and communication with the ML service.
[337] (Normal) • Machine Learning Module: Provides incident categorization, duplicate detection, pairwise duplicate comparison, confidence scoring, toxicity analysis, risk scoring, media evidence judgment, area insights, dashboard insights, and witness-constellation synthesis. The service supports a local provider and a Gemini-backed provider depending on deployment configuration.
[338] (Normal) • Moderator Dashboard Module: Provides moderators and administrators with tools for reviewing submitted incidents, validating or rejecting reports, linking duplicates, reviewing ML and media judgment outputs, monitoring analytics, managing users and settings, and administering database or access-request workflows.
[339] (Normal) • Real-Time Communication Module: Handles Socket.IO rooms, live notifications, incident timeline updates, notification inbox state, push-token workflows, witness prompt delivery, and synchronization between users, staff roles, and backend services.
[340] (Normal) • Database Management Module: Oversees secure storage, retrieval, and synchronization of user data, incidents, reports, comments, notifications, saved areas, media metadata, geospatial fields, moderation history, and system-generated analytical results.
[341] (Normal) This refined architecture ensures that each system component has a well-defined responsibility, reducing coupling and improving system maintainability.
[345] (Heading 2) Design blocks description
[346] (Normal) The proposed solution can be decomposed into several design blocks, each corresponding to a core system function.
[347] (Normal) User Interaction Block: Implements user-facing features including authentication, incident reporting forms, draft management, anonymous reporting options, media uploads, notification management, saved areas, witness prompts, location selection, and map/feed browsing.
[349] (Normal) Reporting Processing Block: Manages incident report submission and processing. It handles user-submitted descriptions, photo and video evidence, location metadata, draft state, idempotency keys, offline queueing, validation, storage, classification, risk analysis, media judgment, and duplicate detection.
[352] (Normal) Geolocation and Mapping Block: Captures geographic coordinates during report submission, links incidents to precise database locations, supports PostGIS-backed queries, and enables map-based visualization, nearby-incident browsing, saved-area insights, and law-enforcement operations maps.
[354] (Normal) Machine Learning Analysis Block: Introduces automated analysis for incident categorization, duplicate detection, pairwise duplicate review, confidence scoring, toxicity review, risk scoring, media evidence judgment, and insight generation. These outputs support human decision making rather than replacing moderator or law-enforcement review.
[356] (Normal) Moderation and Resolution Block: Provides functionality for reviewing, validating, rejecting, linking duplicates, activating witness constellations, reviewing timeline comments, monitoring analytics, controlling disclosure settings, and coordinating law-enforcement status transitions throughout the incident lifecycle.
[358] (Normal) Each block communicates with others through defined interfaces, ensuring coherence while preserving modularity.
[360] (Heading 2) Conclusion
[361] (Normal) This chapter presented the proposed solution for the SafeSignal system, detailing its architectural design and core components. By adopting a layered and modular approach, the proposed solution balances technical rigor, system security, usability, and scalability. The architecture supports current functional requirements while allowing future expansion, making it suitable both as an academic project and as a foundation for a deployable public safety and civic technology platform.
[362] (Normal) The next chapter will focus on the development and implementation process, describing how these design concepts were translated into a working system.
[364] (Heading 1) CHAPTER V: DEVELOPMENT AND IMPLEMENTATION
[365] (Heading 2) Introduction
[366] (Normal) This chapter describes the development and implementation process of the proposed solution presented in Chapter IV. It explains how the system architecture and design components were translated into a functional SafeSignal system through concrete technical decisions and implementation strategies. The chapter details both the software technologies used and the methods adopted to implement core functionalities such as mobile report submission, backend API services, machine learning processing, real-time communication, and moderator verification workflows
[367] (Normal) The objective of this chapter is to demonstrate the practical realization of the project while justifying the technological choices made during development. Particular emphasis is placed on modularity, code organization, scalability, and maintainability, ensuring that the developed system aligns with both academic standards and professional software engineering practices.
[368] (Heading 2) Hardware development and implementation
[370] (Normal) This project does not require specialized hardware components, as it is a software-based system intended to run on standard mobile devices and conventional development computers. All development and testing were conducted using standard personal computing hardware, while the final application is designed to operate on commonly available smartphones with standard networking and location service capabilities.
[372] (Normal) The absence of dedicated hardware components allowed the development process to focus entirely on software architecture, system integration, and application functionality. Data processing, user interaction, geolocation handling, and feedback mechanisms were implemented through software modules within the mobile application and backend environment. This approach is advantageous, as it allows the system to operate efficiently on widely accessible devices without requiring specialized hardware resources.
[381] (Heading3) Input block
[382] (Normal) The input block is responsible for capturing and interpreting user actions such as account authentication, incident submission, media uploads, location selection, and report browsing. User input is processed through the mobile application interface, where interactions are converted into structured data that can be validated and transmitted efficiently. Input data is then forwarded to the reporting module, where it is validated and prepared for backend processing, machine learning analysis, and secure storage.
[383] (Heading3) Processing block
[384] (Normal) The processing block handles real-time system operations including backend request handling, data validation, machine learning analysis, and moderation workflow processing. This block ensures reliable handling of submitted reports and automated system actions.
[385] (Normal) Key processing tasks include:
[386] (Normal) Validating user-submitted data such as descriptions, uploaded media, and location information.
[387] (Normal) Processing reports through machine learning models for categorization, duplicate detection, and confidence scoring.
[388] (Normal) Updating system records such as report status, moderation decisions, and verification results.
[389] (Heading3) Communication block
[390] (Normal) The communication block manages data exchange between the mobile application, backend services, machine learning modules, and moderator dashboard. It handles API requests, real-time notifications, report synchronization, and communication between system components. Communication mechanisms were designed to reduce direct dependencies between modules, improving scalability, maintainability, and overall system efficiency.
[392] (Heading 2) Software development and implementation
[393] (Normal) The software implementation constitutes the core of the project. Development was carried out using modern cross-platform mobile development technologies, a React/Vite dashboard, backend API services, machine-learning services, realtime communication, and a relational database implemented with PostgreSQL/PostGIS. These technologies provide modular architecture, efficient API communication, and scalable system development suitable for rapid prototyping and iterative development.
[397] (Heading3) Database structure
[398] (Normal) The project relies on PostgreSQL with PostGIS support to manage persistent storage of system data. The database stores user accounts, incidents, reports, moderation queue records, report actions, duplicate links, ML outputs, incident comments, moderator settings, notifications, seen marks, incident follows, saved areas, and witness constellation data introduced through migrations.
[399] (Normal) The database design supports geospatial location queries, report lifecycle timestamps, disclosure controls, idempotent incident creation, media references, text embeddings, ML verdict metadata, and indexes for dashboard, map, feed, notification, and moderation workflows.
[400] (Normal) This database architecture provides a strong foundation for future system expansion, allowing the platform to support larger user bases, increased reporting activity, and more advanced analytical functionalities as the project evolves beyond its current prototype stage.
[401] (Heading3) Software functionalities
[402] (Normal) The main software functionalities implemented in the project include:
[403] (Normal) • Incident Reporting System: Allows users to submit safety or crime-related incidents through title and description fields, category and severity data, date/time selection, location tagging, photo and video evidence, optional anonymous submission, draft saving, and offline queueing.
[404] (Normal) • Machine Learning Processing System: Enables automated analysis through categorization, duplicate detection, risk scoring, toxicity review, media evidence judgment, area insights, dashboard insights, and constellation synthesis. The ML service can run local models or a Gemini-backed provider depending on configuration.
[405] (Normal) • Moderation, Administration, and Law-Enforcement System: Provides dashboard workflows for report review, category updates, duplicate linking or dismissal, rejection, escalation, media judgment retry, user management, access-request administration, settings, law-enforcement queue handling, disclosure settings, and case closure.
[406] (Normal) • Data and Report Management System: Supports storage, retrieval, updating, and synchronization of incidents and reports with metadata such as report status, timestamps, location information, media references, ML outputs, comments, follows, notifications, and saved areas.
[407] (Normal) • Realtime and Notification System: Handles Socket.IO updates, notification inbox records, Firebase/Expo/Notifee notification flows, weekly digest scheduling, push-token management, and witness prompt delivery.
[408] (Normal) These functions are implemented across focused modules rather than a single monolithic component, improving clarity and reducing coupling.
[409] (Heading3) Deployment and hosting configuration
[410] (Normal) The project includes a production-oriented deployment path based on Render, Neon, and Cloudflare R2. Render is used as the target hosting platform for the Node.js/Express backend and the Python FastAPI machine-learning service. The backend connects to the hosted ML service through the `ML_SERVICE_URL` environment variable, while each service keeps its own build and runtime configuration.
[411] (Normal) Neon is used as the hosted PostgreSQL database provider. The backend reads the Neon connection string through `DATABASE_URL`, and the schema relies on PostgreSQL with PostGIS enabled for geospatial incident data. After the database is created, the project initialization scripts create the application tables, indexes, moderation records, notification tables, saved areas, and witness-constellation structures.
[412] (Normal) Cloudflare R2 is used for durable media storage when R2 credentials are configured. The upload middleware switches from local disk storage to R2 when `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are present, then stores uploaded incident photos and videos in the configured R2 bucket using an S3-compatible client. In local development or when R2 credentials are absent, the backend falls back to local upload storage.
[413] (Normal) The mobile deployed profile points the APK to the hosted backend URL, so a rebuilt mobile application can submit reports, receive status updates, and communicate with the Render-hosted backend instead of relying on localhost. This deployment setup keeps application hosting, database persistence, and media storage separated, which improves maintainability and avoids depending on ephemeral service disk for user evidence.
[414] (Heading 2) Conclusion
[415] (Normal) This chapter detailed the development and implementation of the SafeSignal system, explaining how design concepts were translated into a working application. Through the use of modern mobile development frameworks, backend technologies, and machine learning services, modular architecture, and iterative development practices, the project achieved its functional objectives within the constraints of an academic environment. The following chapter presents the experimental evaluation of the system, including system testing and result analysis used to validate the proposed solution.
[443] (Heading 1) CHAPTER VI: EXPERIMENTS AND RESULTS
[444] (Heading 2) Introduction
[445] (Normal) This chapter presents the experimental evaluation of SafeSignal, with emphasis on the moderator dashboard and the workflows that support incident review, access control, analytics, and law-enforcement coordination. A consistency audit was also performed against the current repository state to distinguish historical testcase observations from functionality that is now implemented in source code and regression tests.
[446] (Normal) The consolidated testcase file contains 62 recorded result rows. Of these, 39 passed and 23 failed, producing an observed pass rate of 62.9 percent for the evaluated dashboard snapshot. These counts are consistent with the current `testcases/unified-test-cases.csv` file and provide a historical QA baseline rather than a complete statement of every current code path.
[447] (Heading 2) Prototype/application
[448] (Normal) The evaluated prototype in the testcase evidence is the SafeSignal web-based moderator dashboard. The current project state also includes the Expo/React Native mobile application, the Node.js/Express backend, PostgreSQL/PostGIS data model, Socket.IO realtime layer, and Python FastAPI ML service, so the dashboard results should be interpreted as one major validation slice of a larger implemented system.
[450] (Normal) Table 6.1: Application areas evaluated in the experiment
[452] (Heading 2) Experimental approach
[453] (Normal) The experiment followed a functional system-testing approach. Each testcase defined a view, feature, identifier, test title, description, ordered steps, expected result, actual result, outcome, and bug identifier when applicable. The repository audit also reviewed implemented routes, screens, service modules, database schema, package manifests, and automated test files to verify whether the report descriptions matched the present implementation.
[454] (Normal) The main acceptance criterion was behavioral agreement between the expected and actual result. A testcase passed when the observed screen state, validation behavior, navigation result, or workflow output matched the expected result. A testcase failed when the system exposed inconsistent data, missing feedback, inaccessible controls, incorrect role behavior, stale UI state, or external integration failures.
[455] (Normal) The principal metrics were the number of recorded result rows, pass and fail counts, observed pass rate, number of unique bug identifiers, and failure distribution by functional area. The current repository also contains automated backend and service tests covering authentication, privacy, role access, report idempotency, moderation state transitions, media judgment, constellation workflows, statistics, and map behavior.
[457] (Normal) Table 6.2: Evidence sources used for Chapter VI
[459] (Heading 2) System tests/simulations/experiments
[460] (Normal) The system tests were organized around the main workflows of the prototype. The goal was not to simulate physical hardware, but to verify whether the implemented software behaved correctly when users navigated through the dashboard and performed realistic moderation and administration tasks.
[462] (Normal) Table 6.3: Overall testcase result summary
[464] (Normal) Table 6.4: Result distribution by functional area
[466] (Heading3) Authentication and access control
[467] (Normal) Authentication was one of the strongest evaluated areas. The login page presented clear SafeSignal branding, visible login and apply-access actions, usable password visibility controls, and actionable validation messages for empty, malformed, and invalid credentials. Demo moderator credentials successfully redirected the user into the authenticated dashboard, and direct access to protected logged-out routes redirected to the login page without exposing protected content.
[468] (Normal) A limitation recorded in the original dashboard testcase snapshot was that some restricted-route attempts redirected without clear feedback. The current dashboard source now routes forbidden access with explicit access-denied feedback, so this issue should be treated as a historical finding that requires retesting rather than as an unverified current defect.
[469] (Heading3) Reports and moderation workflow
[470] (Normal) The reports workflow showed a mixed historical result. Keyboard shortcuts and the queue/detail splitter behaved as expected, while some CSV observations reported data-source inconsistencies and status-transition defects. The current backend includes validation and regression coverage for selected moderation transitions, including preventing an already rejected report from being rejected again; however, cross-view report-count consistency still requires end-to-end retesting against a synchronized dataset.
[471] (Normal) These historical results indicate that the moderation interface contains useful interaction mechanics while also showing why state validation and list refresh behavior are important. Current source-level safeguards address some of the recorded transition risks, but the dashboard should still be retested end to end after any status-changing operation.
[472] (Heading3) Dashboard and analytics consistency
[473] (Normal) The dashboard and analytics tests confirmed that some analytics views populate correctly. For example, the Data Analysis Center updated the ninety-day period to thirty-one reports and the one-year period to forty-seven reports with visible trend, hotspot, and category data. At the same time, the thirty-day analytics view showed zero reports while the dashboard showed forty-seven reports, and the reports page also showed zero reports in the all-reports queue.
[474] (Normal) The main interpretation is that the prototype has working analytics presentation components but inconsistent shared data boundaries. A common report-count source of truth is needed so dashboard cards, report queues, and analytics filters describe the same dataset.
[475] (Heading3) Users, settings, and law-enforcement workflows
[476] (Normal) User administration tests found both functional and inconsistent behavior in the historical dataset. The current backend test suite includes coverage for pending staff-user visibility and role/privacy behavior, so access-request state should be retested in the running dashboard before being reported as an open issue.
[477] (Normal) Settings tests identified interaction and feedback issues in the historical dashboard run, including controls that were difficult to operate or insufficiently labeled. The current repository contains settings APIs and dashboard settings screens, but a fresh accessibility and interaction pass is still needed to confirm whether each browser, sound, profile, password, and preference control behaves consistently.
[478] (Heading3) Representative test results
[479] (Normal) Table 6.5: Representative testcase outcomes
[481] (Heading3) Test result
[482] (Normal) The overall testcase result remains 39 passing rows and 23 failing rows out of 62 recorded rows. Authentication, logged-out routing, keyboard shortcuts, panel resizing, selected analytics period filters, and several baseline dashboard flows behaved correctly in the recorded snapshot. The most important historical failure clusters were data consistency across dashboard, reports, and analytics views; report status-transition handling; user and access-request state consistency; settings control reachability; map resource loading; and role-specific law-enforcement navigation. Several of these areas now have source-level safeguards or automated regression tests, so the remaining open risk is the absence of a fresh full end-to-end dashboard retest.
[483] (Heading3) Test interpretation
[484] (Normal) The results show that SafeSignal is not merely a static interface: multiple end-to-end workflows can be executed, including login, route protection, report navigation, analytics filtering, and selected law-enforcement detail interactions. The current codebase also shows implemented support for mobile reporting, offline queueing, notifications, media judgment, witness constellations, privacy controls, and backend regression tests. Remaining evaluation work should focus on proving synchronized behavior across the full deployed stack.
[485] (Normal) The recorded data-consistency failures are significant because SafeSignal depends on trustworthy incident counts and report status. If dashboard totals, report queues, and analytics cards do not agree, moderators may make decisions from conflicting information. Historical report-state and user-state failures also motivated stricter backend safeguards and should be included in the next integrated regression pass.
[486] (Heading3) Discussion
[487] (Normal) The passing tests validate the feasibility of the proposed solution and confirm that the main user journeys are present. The failing tests are useful because they reveal concrete improvement targets rather than abstract weaknesses. Most issues are implementation and consistency problems, not evidence that the overall architecture is unsuitable.
[488] (Normal) The main limitation of this evaluation is that the recorded testcase evidence was performed on a local prototype dataset and local dashboard server. The test files do not provide load testing, security penetration testing, mobile application field testing, or machine-learning precision and recall measurements. External Google Maps resources also failed in the test environment because of proxy-related resource errors, so map behavior should be rechecked in a network environment where the map service is reachable.
[489] (Heading 2) Impact of the proposed solution
[490] (Normal) The proposed solution has practical impact because it demonstrates how a structured incident-reporting workflow can connect public reports, moderator review, analytics, and law-enforcement follow-up in one prototype. Even with the limitations identified by testing, the application shows that community safety reporting can be organized into clear operational stages instead of remaining as unstructured messages.
[491] (Normal) From a technical perspective, the project combines web dashboard development, role-based navigation, report-management workflows, analytics views, and integration points such as maps. The testing results provide a realistic engineering roadmap: stabilize shared data sources, strengthen role-specific access behavior, improve form and toggle accessibility, and make status transitions deterministic.
[492] (Normal) From a societal and educational perspective, SafeSignal offers a practical example of civic technology built within academic constraints. The prototype is not presented as a final production deployment, but the experiments show that the concept is feasible and that further development can be guided by measurable defects and observable user workflows.
[493] (Heading 2) Conclusion
[494] (Normal) This chapter presented the experimental evaluation of SafeSignal using evidence from the project testcase records and dashboard artifacts, and aligned that evidence with the current repository state. The evaluation covered 62 recorded testcase results across authentication, routing, dashboard analytics, reports, users, settings, law-enforcement workflows, and runtime behavior. The result was 39 passes and 23 failures, corresponding to an observed pass rate of 62.9 percent.
[495] (Normal) The experiments confirm that SafeSignal has a working functional foundation, especially in authentication, basic navigation, selected analytics filters, report-interface interactions, and role-protected workflows. The current codebase adds evidence of progress through backend and service tests for moderation state transitions, privacy, notifications, constellations, and media judgment. The next validation cycle should run a fresh integrated dashboard/mobile/backend/ML test pass against one synchronized dataset.
[496] (Heading 1) CHAPTER VII: GENERAL CONCLUSION
[497] (Heading 2) Report Summary
[498] (Normal) This project addressed the design and development of a functional prototype for a community-based incident reporting system titled SafeSignal. The primary objective was to demonstrate the feasibility of building a scalable and extensible software system within the constraints of a final-year computer science project, while also highlighting the potential of civic technology as a practical application of modern software engineering and intelligent systems development.
[500] (Normal) The project successfully delivered a functional mobile-based application and supporting dashboard ecosystem integrating core features such as incident reporting, media and location submission, draft and offline handling, notifications, machine-learning-based incident classification, duplicate detection, risk analysis, media evidence judgment, witness corroboration, moderator verification workflows, law-enforcement coordination, analytics, and secure backend data management.
[502] (Normal) From a technical perspective, the project applied key software engineering principles including modular design, iterative development, machine-learning integration, role-based access control, privacy-aware data handling, realtime communication, and continuous testing. The recorded experiments validated an important dashboard slice of the prototype, while the current source code and automated tests provide additional evidence for backend, ML, privacy, and workflow behavior.
[504] (Normal) Beyond its technical achievements, the project contributes to the local academic and societal context by demonstrating that accessible technologies can be used to develop practical solutions addressing real-world community challenges. The work serves as a foundation for future exploration of civic technology development within Lebanon and highlights the relevance of software engineering and intelligent systems in solving modern public safety and community communication problems.
[513] (Heading 2) Future work and Perspectives
[514] (Normal) While the current implementation fulfills the objectives of a functional prototype, several avenues for future work and improvement have been identified. Since realtime notifications, incident timelines, law-enforcement coordination, saved areas, and witness prompts already exist at prototype level, future work should focus on hardening these features through end-to-end retesting, clearer accessibility feedback, synchronized dashboard data sources, production monitoring, and more complete deployment validation.
[516] (Normal) From a technical standpoint, future iterations could improve machine-learning evaluation with precision, recall, and false-positive analysis for classification, duplicate detection, media judgment, and risk scoring. Additional improvements include load testing, security testing, durable cloud media storage, stricter privacy review, stronger accessibility testing, and full Render/Neon/Firebase/Gemini production-readiness checks.
[518] (Normal) On a broader scale, the project opens perspectives for transforming the prototype into a fully deployable community-driven civic technology platform. With further development, large-scale testing, and collaboration with public safety organizations or local authorities, SafeSignal could evolve into a practical solution that contributes to improving community safety and public awareness. The project also provides a reference framework for future students interested in developing technology-based solutions for real-world social challenges, encouraging innovation and practical problem-solving within academic environments.
[520] (Heading 1) REFERENCES
[522] (Normal) React Native Documentation, React Native Official Documentation. Available at: React Native Documentation
[523] (Normal) Node.js Documentation, Node.js Official Documentation. Available at: Node.js Documentation
[524] (Normal) Express Documentation, Express.js Official Documentation. Available at: Express Documentation
[525] (Normal) PostgreSQL Documentation, PostgreSQL Official Documentation. Available at: PostgreSQL Documentation
[526] (Normal) FastAPI Documentation, FastAPI Official Documentation. Available at: FastAPI Documentation
[527] (Normal) Socket.IO Documentation, Socket.IO Official Documentation. Available at: Socket.IO Documentation
[528] (Normal) Sommerville, Software Engineering, 10th Edition, Pearson Education, 2015.
[529] (Normal) OWASP Foundation, Web Application Security Best Practices. Available at: OWASP Foundation
[530] (Normal) Google Developers, Geolocation API Documentation. Available at: Google Maps Platform
[531] (Normal) IEEE Code of Ethics, IEEE Professional and Ethical Standards. Available at: IEEE Ethics Standards
[532] (Normal) Expo Documentation, Expo Official Documentation. Available at: Expo Documentation
[533] (Normal) Firebase Cloud Messaging Documentation, Firebase Documentation. Available at: Firebase Cloud Messaging
[534] (Normal) Google Gemini API Documentation, Google AI for Developers. Available at: Gemini API Documentation
[537] (Heading 1) LIST OF ACRONYMS
[562] (Heading 1) LIST OF FIGURES
[564] (Normal) No formally captioned figures are included in this version of the report. The cover-page image is a decorative/branding asset and is not treated as a numbered technical figure.
[572] (Heading 1) LIST OF TABLES
[574] (Normal) The following tables are used in the report:
[576] (Subtitle) Table 1: Student and project information
[577] (Subtitle) Table 2: Project timeline and planning
[578] (Subtitle) Table 3: Comparative analysis of existing platform categories
[579] (Subtitle) Table 6.1: Application areas evaluated in the experiment
[580] (Subtitle) Table 6.2: Evidence sources used for Chapter VI
[581] (Subtitle) Table 6.3: Overall testcase result summary
[582] (Subtitle) Table 6.4: Result distribution by functional area
[583] (Subtitle) Table 6.5: Representative testcase outcomes
[613] (Normal) APPENDICES
[629] (Heading 1) APPENDIX A
[631] (Heading 1) Code Structure and Implementation Excerpts
[632] (Heading 2) A.1. Purpose of the Appendix
[633] (isselectedend) This appendix provides supplementary technical information that supports the understanding of the SafeSignal system implementation presented throughout the main chapters of the report. It focuses on the organization of the codebase, the architectural structure adopted during development, and selected implementation descriptions illustrating the main functionalities of the system.
[634] (isselectedend) In accordance with academic guidelines, the appendix does not contain the complete source code of the project. The full codebase is provided separately in electronic format. Only representative implementation descriptions and structural explanations are included here to clarify system design decisions and implementation logic.
[636] (Heading 2) A.2. Project Directory Structure
[637] (isselectedend) The SafeSignal project follows a modular directory structure to ensure maintainability, readability, scalability, and separation of concerns between the mobile application, backend services, machine learning modules, and database interaction layers.
[638] (isselectedend) A simplified representation of the project structure is shown below:
[639] (isselectedend) • Mobile-part/: Expo/React Native mobile app, navigation, screens, hooks, notification services, API clients, offline queueing, and assets.
[640] (isselectedend) • backend/: Node.js/Express API, routes, middleware, services, database schema, migrations, Socket.IO server setup, jobs, tests, and upload handling.
[641] (isselectedend) • moderator-dashboard/: React/Vite dashboard, pages, layouts, reusable components, API service modules, route protection, law-enforcement workspace, settings, analytics, and admin tools.
[642] (isselectedend) • ml-service/: Python FastAPI service, provider abstraction, local and Gemini providers, cache manager, models, utilities, scripts, Dockerfile, and ML tests.
[643] (isselectedend) • constants/: Shared category, status, limit, spacing, typography, theme, and preference constants reused across project components.
[644] (isselectedend) • docs/ and testcases/: Technical notes, deployment guides, feature inventories, and CSV-based QA evidence used to validate and explain the project.
[645] (isselectedend) This organization allows independent development and testing of individual system components while reducing coupling between modules.
[647] (Heading 2) A.3. Incident Reporting Logic (Excerpt Description)
[648] (isselectedend) The incident reporting system is implemented through the mobile reporting screen and supporting hooks responsible for handling form state, validation, draft persistence, media selection, location picking, ML preview toggles, anonymous defaults, offline queueing, and communication with backend incident APIs.
[649] (isselectedend) Key features of the reporting implementation include:
[650] (isselectedend) • User authentication and identity verification • Incident title, description, photo, and video submission • Location tagging using current location or map selection • Draft saving and offline queueing • Optional anonymous submission • ML-assisted category and risk preview • Structured API communication with idempotency support
[651] (isselectedend) This modular approach allows reporting functionality to be extended independently of other system components.
[653] (Heading 2) A.4. Machine Learning Processing Logic (Excerpt Description)
[654] (isselectedend) The machine-learning processing system is designed as an independent FastAPI service interacting with backend processing modules. Submitted reports can be analyzed for categorization, risk, toxicity, duplicate candidates, contextual duplicate comparison, media evidence judgment, area insights, dashboard insights, and witness-constellation synthesis depending on the configured provider.
[655] (isselectedend) The processing logic includes:
[656] (isselectedend) • Incident categorization based on submitted report content • Duplicate detection through embeddings and optional pairwise comparison • Risk scoring and toxicity review • Advisory media evidence judgment for photos and videos • Analytics and area insight generation • Redis or in-memory cache support for repeated ML calls
[657] (isselectedend) Separating machine learning logic from the main application workflow improves maintainability and allows future retraining or model replacement without affecting other system components.
[659] (Heading 2) A.5. Moderation and Verification Implementation
[660] (isselectedend) The moderation system is implemented through a role-protected dashboard that allows staff to review incidents, inspect ML and media evidence outputs, verify or reject reports, update categories, link or dismiss duplicates, activate witness constellations, communicate through timelines, and coordinate law-enforcement follow-up.
[661] (isselectedend) This module supports functionalities such as:
[662] (isselectedend) • Reviewing submitted reports • Approving, rejecting, escalating, or updating incidents • Managing duplicate report verification • Retrying media judgment • Viewing timelines and internal comments • Managing users, settings, access requests, analytics, and law-enforcement case status
[663] (isselectedend) This structured approach improves system reliability and helps ensure the credibility of user-submitted information.
[665] (Heading 2) A.6. Backend and Database Management
[666] (isselectedend) Backend services are responsible for API communication, request validation, data processing, user authentication, role authorization, upload handling, realtime coordination, notification delivery, scheduled jobs, and system-wide coordination between application modules. Persistent data storage is managed through PostgreSQL with PostGIS geospatial support.
[667] (isselectedend) This system ensures:
[668] (isselectedend) • Secure storage of user, incident, report, media, and ML information • Geospatial querying through PostGIS • Notifications, follows, saved areas, comments, and witness constellation data • Reliable communication between mobile, dashboard, backend, and ML services • Consistent synchronization of report and moderation data
[669] (isselectedend) The backend architecture was designed to support future scalability and increased reporting activity as the system evolves.
[671] (Heading 2) A.7. Remarks on Code Availability
[672] (Normal (Web)) This appendix provides a conceptual overview of the implemented system architecture rather than exhaustive source code listings. The complete source code of the SafeSignal project is available in electronic format and can be provided separately for further review, testing, or academic evaluation.

# Tables

## Table 1: rows=4 cols=2
R1: Student(s) | Rabih Hajj Hassan, ID 202111009 Hadi Najem, ID 202112356
R2: Major | CS
R3: Campus | BA
R4: Supervisor(s) | Dr. Youssef Keryakos

## Table 2: rows=12 cols=5
R1: Task ID | Task Description | Start Week | End Week | Duration
R2: T1 | Research and domain analysis | Week 1 | Week 2 | 2 weeks
R3: T2 | Requirements gathering and system planning | Week 2 | Week 3 | 2 weeks
R4: T3 | System architecture and database design | Week 3 | Week 4 | 2 weeks
R5: T4 | Mobile application development | Week 4 | Week 6 | 3 weeks
R6: T5 | Backend API development | Week 6 | Week 8 | 3 weeks
R7: T6 | Database implementation and integration | Week 7 | Week 10 | 4 weeks
R8: T7 | Machine learning service development | Week 9 | Week 11 | 3 weeks
R9: T8 | Moderator dashboard development | Week 9 | Week 12 | 4 weeks
R10: T9 | API integration and real-time communication | Week 11 | Week 13 | 3 weeks
R11: T10 | System testing and debugging | Week 12 | Week 13 | 2 weeks
R12: T11 | Final documentation and report writing | Week 12 | Week 14 | 3 weeks

## Table 3: rows=12 cols=4
R1: Criterion | Official / Government Platforms | Community-driven Platforms | Proposed Solution: SafeSignal
R2: Development Team Size | Large institutional teams | Small development teams | Small academic team (2 students)
R3: Platform Type | Enterprise web/mobile systems | Lightweight mobile/web apps | Cross-platform mobile + dashboard
R4: Infrastructure | Large-scale cloud infrastructure | Moderate cloud infrastructure | Modular academic architecture
R5: Source Code Accessibility | Usually proprietary | Often partially open | Fully accessible and documented
R6: Verification System | Manual institutional review | Community moderation | ML + human moderation
R7: Data Processing | Enterprise-scale processing | Lightweight processing | AI classification + duplicate detection
R8: User Authentication | Secure institutional systems | Basic authentication | Secure authentication + anonymous reporting
R9: Real-time Features | High reliability systems | Limited in some cases | Real-time notifications + incident tracking
R10: Development Cost | High budget | Low to moderate | Minimal budget
R11: Academic Suitability | Low | Moderate | High
R12: Extensibility | Limited flexibility | Generally extensible | Designed for future expansion

## Table 4: rows=6 cols=3
R1: Area | Purpose in SafeSignal | Evidence used
R2: Login and access request | Validate public entry, credential handling, input validation, and access-request feedback. | Login, authentication, and apply-access testcase records.
R3: Moderator dashboard | Review system overview, report totals, map panel behavior, and recent activity consistency. | Dashboard and cross-page consistency testcase records.
R4: Reports workflow | Evaluate queue loading, report detail, keyboard shortcuts, splitter behavior, bulk actions, escalation, and rejection. | Reports and report-detail testcase records.
R5: Users and settings | Validate user filtering, invitation controls, profile editing, preferences, notification controls, and security controls. | Users and settings testcase records.
R6: Analytics and law-enforcement interface | Evaluate period filters, populated analytics, LE navigation, queue controls, and incident detail behavior. | Data Analysis Center and LE testcase records.

## Table 5: rows=5 cols=3
R1: Source | Role in evaluation | Main information extracted
R2: unified-test-cases.csv | Primary consolidated result set. | 62 result rows, 39 passes, 23 failures, and 16 unique bug identifiers.
R3: qa-test-results-2026-04-28.csv | Focused QA run. | Login, dashboard, map integration, access status, and console stability observations.
R4: qa-test-results-2026-04-28-broad.csv | Broad dashboard regression run. | Authentication, reports, users, settings, analytics, and workflow coverage.
R5: qa-test-results-2026-04-28-untested-vectors.csv | Additional coverage pass. | Logged-out routing, keyboard shortcuts, resize interaction, period filters, settings controls, and LE workflows.

## Table 6: rows=6 cols=3
R1: Metric | Value | Interpretation
R2: Recorded result rows | 62 | Total observations available in the consolidated testcase file.
R3: Passing rows | 39 | Workflows that matched the expected behavior.
R4: Failing rows | 23 | Workflows with defects, missing feedback, inconsistent state, or blocked integration behavior.
R5: Observed pass rate | 62.9% | The prototype is functional in many common paths but not ready to be considered fully stable.
R6: Unique bug identifiers | 16 | Distinct defect identifiers referenced by failing records.

## Table 7: rows=9 cols=5
R1: Functional area | Rows | Pass | Fail | Pass rate
R2: Authentication and entry | 23 | 19 | 4 | 82.6%
R3: Dashboard and analytics | 11 | 7 | 4 | 63.6%
R4: Reports and moderation | 11 | 6 | 5 | 54.5%
R5: Users and administration | 4 | 1 | 3 | 25.0%
R6: Settings and preferences | 7 | 3 | 4 | 42.9%
R7: Law-enforcement interface | 4 | 1 | 3 | 25.0%
R8: Non-functional/runtime | 1 | 1 | 0 | 100.0%
R9: Other | 1 | 1 | 0 | 100.0%

## Table 8: rows=9 cols=4
R1: Test ID | Area | Result | Observed result and interpretation
R2: TC-F-03 | Authentication | Pass | Demo moderator login redirected to the dashboard with authenticated sidebar navigation visible. This confirms the basic login path.
R3: TC-AUTH-05 | Routing | Pass | Protected and unknown logged-out routes redirected to the login page without rendering protected content.
R4: TC-REP-08 | Reports queue | Pass | The queue/detail splitter moved successfully and both panels remained usable after resizing.
R5: TC-DAC-04 | Analytics | Pass | The ninety-day and one-year filters produced populated analytics, including report counts, trend data, hotspot data, and category data.
R6: TC-REP-01 | Reports queue | Fail | The all-reports view showed zero reports despite other views reporting active data, which indicates inconsistent report sourcing or filtering.
R7: TC-USR-04 | Access workflow | Fail | A newly requested law-enforcement user appeared as active while the login flow still treated the account as pending approval.
R8: TC-SET-05 | Settings security | Fail | Password visibility worked, but the control lacked accessible label text and the two-factor checkbox was not manually interactable.
R9: TC-LEI-02 | LE queue | Fail | Search and splitter behavior worked, but combined filters produced stale detail state and all-active filtering displayed closed incidents.

## Table 9: rows=1 cols=2
R1: DBMS | Database Management System

## Table 10: rows=1 cols=2
R1: SQL | Structured Query Language

## Table 11: rows=1 cols=2
R1: REST | Representational State Transfer

## Table 12: rows=1 cols=2
R1: SDLC | Software Development Life Cycle

## Table 13: rows=1 cols=2
R1: IEEE | Institute of Electrical and Electronics Engineers

## Table 14: rows=1 cols=2
R1: ORM | Object Relational Mapping

## Table 15: rows=1 cols=2
R1: CI/CD | Continuous Integration / Continuous Deployment

## Table 16: rows=1 cols=2
R1: NLP | Natural Language Processing

## Table 17: rows=1 cols=2
R1: SMS | Short Message Service

## Table 18: rows=1 cols=2
R1: OTP | One-Time Password

## Table 19: rows=1 cols=2
R1: CRUD Operations | Create, Read, Update, Delete Operations