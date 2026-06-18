# Extracted text from FYP Report_Rabih hajj hassan_Latest.docx

[0] (Normal) ANTONINE UNIVERSITY
[1] (Body Text) Faculty of Engineering and Technology
[2] (Body Text) Department of Technology in Computer Science
[8] (Body Text) SafeSignal
[17] (Body Text) Fall / Spring 2026
[18] (Normal) Leave this page blank
[44] (Footer) Insert a brief dedication (Optional)
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
[78] (toc 2)  Risk considerations included data reliability, system scalability, machine learning accuracy, and secure handling of sensitive user information. Additional challenges involved maintaining location privacy, ensuring reliable real-time communication between system components, and preventing misuse through inaccurate or malicious submissions. To mitigate these risks, the project scope was focused on core functionalities such as reporting, intelligent classification, moderation workflows, and secure data processing, while ensuring that the system architecture supports future enhancements. Trade-offs were made between advanced feature complexity and overall system performance, prioritizing reliability, security, and real-time responsiveness over unnecessary architectural complexity. 3
[79] (toc 2) 4. Report Outline 3
[80] (toc 1) CHAPTER II: PROJECT REQUIREMEMTS AND CONSTRAINTS 4
[81] (toc 2) 1. Introduction 4
[82] (toc 2) 2. Project Planning 4
[83] (toc 2) 2.1. Team management (if applicable) 4
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
[96] (toc 1) CHAPTER III: EXISITING SOLUTIONS 9
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
[121] (toc 2) 2.1. Input bloc. 19
[122] (toc 2) 2.2. Processing bloc 19
[123] (toc 2) 2.3. Communication bloc 19
[124] (toc 2) 3. Software development and implementation 19
[125] (toc 2) 3.1. Database structure 20
[126] (toc 2) 3.2. Software functionalities 20
[127] (toc 2) The main software functionalities implemented in the project include: 20
[128] (toc 2)  Incident Reporting System: Implements the core reporting functionality, allowing users to submit safety or crime-related incidents through text descriptions, image uploads, and location tagging and optional anonymous submission. Input validation mechanisms were implemented to ensure data consistency and completeness before submission. 20
[129] (toc 2)  Machine Learning Processing System: Enables automated analysis of submitted reports through incident categorization, duplicate detection, and confidence scoring. Processing logic was separated from the main application workflow to allow independent retraining and future model improvements 20
[130] (toc 2)  Moderation and Verification System: Implements report review functionality through a moderator dashboard, allowing moderators to validate submissions, reject invalid reports, merge duplicate reports, and escalate verified incidents when necessary. 20
[131] (toc 2)  Data and Report Management System: Supports storage, retrieval, and updating of submitted reports along with associated metadata such as report status, timestamps, and location information. The system was designed to ensure efficient organization and tracking of incident records. 20
[132] (toc 2)  System State Management: Handles application states such as report submission status, processing workflows, notification updates, moderation changes, and synchronization between system components. 21
[133] (toc 2) Each functionality was implemented as a distinct module, reducing coupling and improving system clarity. 21
[134] (toc 2) 4. Conclusion 21
[135] (toc 1) CHAPTER VI: EXPERIMENTS AND RESULTS 21
[136] (toc 2) 1. Introduction 21
[137] (toc 2) 2. Prototype/application 21
[138] (toc 2) 3. Experimental approach 22
[139] (toc 2) 4. System tests/simulations/experiments 23
[140] (toc 2) Authentication and access control 24
[141] (toc 2) Reports and moderation workflow 24
[142] (toc 2) Dashboard and analytics consistency 24
[143] (toc 2) Users, settings, and law-enforcement workflows 25
[144] (toc 2) Representative test results 25
[145] (toc 2) Test result 26
[146] (toc 2) Test interpretation 26
[147] (toc 2) Discussion 26
[148] (toc 2) 5. Impact of the proposed solution 26
[149] (toc 2) 6. Conclusion 27
[150] (toc 1) CHAPTER VII: GENERAL CONCLUSION 28
[151] (toc 2) 1. Report Summary 28
[152] (toc 2) 2. Future work and Perspectives 29
[153] (toc 1) REFERENCES i
[154] (toc 1) LIST OF ACRONYMS ii
[155] (toc 1) LIST OF FIGURES iii
[156] (toc 1) LIST OF TABLES iv
[157] (toc 1) APPENDIX A vi
[158] (toc 1) Code Structure and Implementation Excerpts vi
[159] (toc 2) 1. A.1. Purpose of the Appendix vi
[160] (toc 2) 2. A.2. Project Directory Structure vi
[161] (toc 2) 3. A.3. Incident Reporting Logic (Excerpt Description) vii
[162] (toc 2) 4. A.4. Machine Learning Processing Logic (Excerpt Description) vii
[163] (toc 2) 5. A.5. Moderation and Verification Implementation viii
[164] (toc 2) 6. A.6. Backend and Database Management viii
[165] (toc 2) 7. A.7. Remarks on Code Availability ix
[171] (Heading 1) CHAPTER 1: GENERAL INTRODUCTION
[172] (Heading 2) Problem Identification (context, general problem)
[173] (Normal) Public safety and civic technology have become increasingly important domains that combine software engineering, data management, real-time systems, and user interaction. Modern community-driven platforms require a solid understanding of system architecture, mobile development, data processing, and user-centered design. As a result, they represent an important application area for computer science graduates seeking to apply theoretical knowledge to real-world societal challenges.
[175] (Normal) Despite the growing global adoption of smart city solutions, community-based incident reporting systems remain underdeveloped in Lebanon. Traditional reporting methods, such as hotlines or in-person reports, are often inefficient and lack transparency. Existing digital solutions are limited in number and frequently suffer from issues such as poor usability, lack of trust, and minimal public engagement. This gap is not due to a lack of technical capability, but rather limited infrastructure and the absence of structured platforms that support community-driven safety reporting. Consequently, citizens often lack effective tools to report incidents and stay informed about local safety concerns.
[177] (Normal) From a technical perspective, building a real-time incident reporting system represents a complex engineering problem. It involves the integration of multiple components such as cross-platform mobile interfaces, backend API services, geolocation and mapping systems, database management, machine learning services, and real-time communication mechanisms. These components must work together to ensure reliable data collection, processing, and retrieval. Additionally, challenges such as handling duplicate reports, processing media evidence, filtering misinformation, and maintaining system scalability significantly increase overall system complexity.
[179] (Normal) Another challenge lies in ensuring data credibility and user trust. Many existing platforms lack effective verification mechanisms, leading to inaccurate or misleading information. Incorporating intelligent techniques such as machine learning for report classification, duplicate detection, confidence scoring, and media analysis, along with human moderation and escalation workflows, introduces additional design and implementation challenges. Furthermore, balancing transparency, privacy preservation, and secure handling of sensitive incident data adds another layer of complexity to the system.
[181] (Normal) Within this context, there is a need for an academically grounded project that demonstrates how a scalable, intelligent, and user-centered incident reporting system can be designed, implemented, and evaluated using accessible technologies. Such a project can serve as both a technical proof of concept and a foundation for future development in the domain of civic technology and public safety.
[183] (Heading 2) Problem Statement / Formulation
[184] (Normal) The problem addressed in this project is the lack of effective technology-driven platforms that enable communities to report, verify, and track safety-related incidents in a reliable and transparent manner. Specifically, there is a need to design and implement a scalable system that supports real-time incident reporting, media evidence submission, intelligent data processing, and secure verification workflows through both automated and human-assisted moderation mechanisms.
[186] (Normal) The objective of this project is to develop a functional mobile-based application that enables users to submit and monitor safety-related reports using geolocation data, images, videos, and textual descriptions. The system incorporates machine learning techniques for incident categorization, duplicate detection, and intelligent report analysis, along with a moderator dashboard that allows report validation and escalation to authorized entities when necessary. This project is relevant to computer science students, civic technology initiatives, and organizations seeking practical applications of software engineering and intelligent systems in public safety. The proposed solution targets mobile platforms and is intended to serve as both a functional system and a technical foundation for future development.
[187] (Heading 2) Solution Approach / Methodology
[188] (Normal) The methodology adopted in this project follows an engineering design approach, emphasizing iterative development, modular system architecture, and continuous testing. The system is developed as a cross-platform mobile application using React Native and Expo, supported by a backend API built with Node.js and Express, alongside machine learning services implemented in Python to ensure scalability and maintainability.
[190] (Normal) The development process began with identifying functional requirements, including user authentication, incident reporting, geolocation tracking, media upload support, real-time notifications, witness corroboration, report categorization, duplicate detection, and moderation workflows. Based on these requirements, multiple design alternatives were explored, focusing on system modularity, efficient data flow, and future extensibility. Core system components were designed as independent modules, including the mobile application, backend API services, machine learning services, database layer, and moderator dashboard, reducing coupling and improving maintainability.
[192] (Normal) Implementation was carried out incrementally, with each subsystem developed, tested, and refined before full system integration. Particular attention was given to API communication, database operations, real-time synchronization, and user interaction to ensure reliable report submission and system responsiveness. System-level testing scenarios were used to evaluate reporting accuracy, machine learning classification performance, duplicate detection reliability, notification delivery, and overall application stability, allowing early identification and correction of design and performance issues.
[193] (Heading 2) Risk considerations included data reliability, system scalability, machine learning accuracy, and secure handling of sensitive user information. Additional challenges involved maintaining location privacy, ensuring reliable real-time communication between system components, and preventing misuse through inaccurate or malicious submissions. To mitigate these risks, the project scope was focused on core functionalities such as reporting, intelligent classification, moderation workflows, and secure data processing, while ensuring that the system architecture supports future enhancements. Trade-offs were made between advanced feature complexity and overall system performance, prioritizing reliability, security, and real-time responsiveness over unnecessary architectural complexity.
[194] (Heading 2) Report Outline
[195] (Normal) This report is structured into seven chapters. Chapter II presents the project requirements and constraints, including planning, functional requirements, and technical limitations. Chapter III reviews existing solutions and related works in the field of civic technology and community-based incident reporting systems. Chapter IV details the proposed solution and overall system architecture, including mobile, backend, and machine learning components. Chapter V describes the development and implementation process of the system, including mobile application features, backend services, and data processing modules. Chapter VI presents the system testing, evaluation results, and performance analysis. Finally, Chapter VII concludes the report with a summary of the work and perspectives for future development.
[199] (Heading 1) CHAPTER II: PROJECT REQUIREMEMTS AND CONSTRAINTS
[200] (Heading 2) Introduction
[201] (Normal) This chapter presents the requirements and constraints that guided the design and development of the SafeSignal system. Following the problem formulation introduced in Chapter I, the objective of this chapter is to define the planning strategy, functional requirements, and limitations that frame the scope of the project. These elements are essential to ensure that the proposed solution remains feasible, coherent, and aligned with academic and technical expectations.
[202] (Normal) The chapter begins with an overview of the project planning process, including time management and task organization. It then details the functional requirements that define the core objectives of the system, such as incident reporting, data processing, and moderation workflows. Finally, the chapter outlines the technical and non-technical constraints that influenced design decisions, as well as the standards, regulations, and ethical considerations relevant to the project, particularly in terms of data privacy and user protection.
[203] (Heading 2) Project Planning
[204] (Normal) Effective project planning was essential to ensure the successful development of the SafeSignal system within the limited timeframe of a final-year project. Given the multidisciplinary nature of the system, the planning phase focused on defining clear milestones, managing development time efficiently, and prioritizing core system functionalities such as incident reporting, data processing, and moderation workflows.
[205] (Heading3) Team management (if applicable)
[206] (Normal) This section will be assessed according to PI5.b.
[207] (Normal) This project was carried out by a team of two students, both enrolled at the BA campus. Responsibilities were distributed based on individual technical strengths while maintaining continuous collaboration throughout the development process. Core tasks such as system design, mobile application development, backend implementation, and machine learning integration were shared between the team members.
[208] (Normal) Regular communication was maintained to ensure consistency in design decisions, risk management, and progress tracking. This collaborative approach helped mitigate development delays and ensured alignment between system implementation and project objectives.
[210] (Heading3) Time management
[211] (Heading3) Time management was a critical factor due to the complexity of the system and the academic constraints imposed by the semester schedule. The project was divided into several phases, including research, system design, mobile application development, backend implementation, machine learning integration, testing, and documentation. Each phase was assigned a specific timeframe to prevent scope creep and ensure steady progress.
[212] (Heading4) Gantt Chart
[213] (Heading4) A Gantt chart was used to visualize the project timeline and monitor progress across different development stages. The chart outlined key milestones such as technology familiarization, system design, mobile application development, backend implementation, machine learning integration, system testing, and report writing. This planning tool allowed for better anticipation of risks and facilitated timely adjustments when delays occurred.
[216] (Heading3) Budget
[217] (Heading3) The project was developed with minimal financial cost. Most development tools and frameworks used, including React Native, Node.js, Python libraries, and version control systems, are open-source or freely available for development purposes. The primary expenses were limited to optional third-party services such as cloud hosting infrastructure, database hosting, geolocation API services, and external AI service usage for machine learning functionalities. Overall, the project adhered to a low-budget model, making it accessible and reproducible within similar academic and research environments.
[219] (Heading 2) Project functional requirements
[220] (Normal) The functional requirements define the essential capabilities that the system must provide to fulfill the objectives of the project. These requirements serve as measurable criteria to evaluate whether the proposed solution successfully addresses the problem statement.
[222] (Normal) The primary functional requirements of the project are as follows:
[223] (Normal) The system shall allow users to register, authenticate, and securely access the application.
[224] (Normal) The system shall allow users to submit incident reports including text descriptions, images, videos, category selection, severity level, and geolocation data.
[225] (Normal) The system shall support anonymous report submission while preserving user privacy.
[226] (Normal) The system shall implement automated machine learning processing for incident categorization and intelligent report analysis.
[227] (Normal) The system shall include a duplicate detection mechanism to identify and group similar or repeated incident reports.
[228] (Normal) The system shall provide real-time notifications regarding report status updates and nearby incidents.
[229] (Normal) The system shall provide a witness corroboration mechanism allowing nearby users to confirm submitted incidents.
[230] (Normal) The system shall provide a moderator dashboard for reviewing, validating, merging duplicate reports, and escalating verified incidents when necessary.
[231] (Normal) The system shall implement secure backend infrastructure ensuring reliable storage and retrieval of incident data.
[232] (Normal) The system shall provide users with map-based visualization and tracking of reported incidents.
[234] (Normal) Failure to meet any of these core requirements would prevent the project from achieving its primary objectives.
[236] (Heading 2) Project constraints
[237] (Normal) In parallel with functional requirements, several constraints influenced the design and implementation of the project. These constraints were carefully considered to ensure feasibility and compliance with academic expectations.
[238] (Heading3) Technical constraints
[239] (Normal) Technical constraints represent explicit limitations that directly affected system design and implementation. The main technical constraints identified for this project include:
[240] (Normal) The use of specific technologies including React Native, Node.js, PostgreSQL, machine learning services, and third-party APIs as the primary development stack.
[241] (Normal) Execution on standard mobile devices without reliance on high-end hardware or processing capabilities.
[242] (Normal) Near real-time responsiveness requirements to ensure smooth user interaction and timely report submission and retrieval.
[243] (Normal) Limited development time, restricting the scope of implemented features and system complexity.
[244] (Normal) The necessity to maintain code readability, modularity, and scalability for academic evaluation.
[245] (Normal) These constraints required careful optimization and prioritization of core system features to ensure stability, performance, and usability.
[247] (Heading3) Non-technical constraints
[249] (Normal) Non-technical constraints encompass factors beyond direct technical implementation. These include:
[250] (Normal) Usability: The system must feature an intuitive user interface and clear feedback mechanisms to ensure accessibility for a wide range of users.
[251] (Normal) Maintainability: The codebase must be structured and documented to facilitate future development and system expansion.
[252] (Normal) Ethical considerations: The project must ensure responsible handling of user-generated content, respect intellectual property rights, and avoid misuse of submitted data.
[253] (Normal) Privacy and data protection: Special attention must be given to protecting user identity and sensitive location information while maintaining system functionality.
[254] (Normal) Schedule constraints: The project had to be completed within the academic semester timeframe.
[255] (Normal) Trust and misuse prevention: The system must minimize false reporting and implement safeguards against malicious or misleading submissions.
[256] (Normal) Special attention was given to ethical obligations, particularly regarding user privacy, transparency in system behavior, and responsible use of community-submitted information.
[258] (Heading3) Standards / codes / regulations / policies
[259] (Normal) While civic technology systems are not governed by a single universal standard, several software engineering guidelines and policies were considered during the project. These include software development life cycle (SDLC) best practices, coding standards for readability and maintainability, data protection principles, and general cybersecurity practices to ensure system integrity and user safety.
[260] (Normal) Relevant standards and guidelines considered in this project include:
[261] (Normal) Software development life cycle (SDLC) models such as iterative and incremental development.
[262] (Normal) General principles from IEEE standards related to software quality, documentation, and system design.
[263] (Normal) Data privacy and protection principles related to the handling of user-generated content and location data.
[264] (Normal) Copyright and intellectual property laws governing the use of third-party libraries, APIs, and assets.
[265] (Normal) Ethical guidelines promoting responsible software development, transparency, and user safety.
[266] (Normal) Secure data handling practices for storage and transmission of sensitive location, media, and user-generated incident data.
[267] (Normal) Although full compliance with all industry standards was not feasible within the project scope, awareness and selective application of relevant guidelines contributed to the overall quality, reliability, and ethical integrity of the system.
[270] (Heading 2) Conclusion
[271] (Normal) This chapter defined the functional and non-functional requirements, constraints, and guiding standards that shaped the design and development of the SafeSignal system. These specifications ensured that the project remained feasible within academic limitations while maintaining a clear focus on usability, reliability, and ethical responsibility. Together, they provide a structured foundation for the system’s design and implementation in the following chapters
[273] (Heading 1) CHAPTER III: EXISITING SOLUTIONS
[274] (Heading 2) Introduction
[275] (Normal) The objective of this chapter is to analyze existing solutions and related works relevant to the development of community-based incident reporting and civic technology systems, with particular emphasis on real-time reporting platforms, public safety applications, and intelligent data processing approaches. Understanding existing solutions is essential to identify current technological approaches, design practices, and limitations that influence the development of similar systems.
[276] (Normal) This chapter first introduces the general context and application domain of civic technology and public safety systems. It then presents and categorizes existing solutions based on functionality, verification mechanisms, and technical implementation. A comparative study is conducted to highlight the strengths and weaknesses of these solutions. Finally, the chapter concludes by defining clear project objectives derived from the analysis of related works.
[277] (Heading 2) Context and Domain of application
[278] (Normal) The domain of application for this project lies within civic technology and community-based public safety systems, specifically mobile platforms designed for real-time incident reporting and information sharing. These systems are characterized by user-generated reporting, geolocation integration, data verification mechanisms, and public access to safety-related information.
[279] (Normal) Historically, digital reporting systems and smart city technologies have become increasingly important in improving communication between citizens and authorities. Despite the growth of modern communication technologies, many communities still lack accessible and transparent platforms for reporting and tracking safety-related incidents. This makes community-driven reporting systems particularly relevant for both academic research and practical implementation.
[280] (Normal) Public safety reporting systems combine mobile computing, backend services, secure database management, geolocation technologies, real-time communication systems, and intelligent data processing services. From a technical standpoint, they require careful system design, secure authentication mechanisms, media handling, scalable APIs, real-time notification delivery, and reliable moderation workflows. Additionally, integrating machine learning techniques for report categorization, duplicate detection, and intelligent report analysis introduces further complexity. These characteristics make such systems strong candidates for studying real-world software engineering and intelligent system design within a computer science framework..
[283] (Heading 2) Existing Solutions /Methods
[284] (Normal) Existing solutions in the domain of community-based incident reporting and public safety systems can be broadly classified into two main categories: official or government-supported reporting platforms and community-driven or crowdsourced reporting solutions.
[286] (Heading3) First category of methods /Solutions /Algorithms
[287] (Normal) Official and government-supported reporting platforms are typically developed by public institutions or large organizations with access to dedicated infrastructure, specialized development teams, and enterprise-level resources. These systems often serve as benchmarks for reliability, scalability, and secure handling of large volumes of sensitive public safety data.
[288] (Heading4) Algorithm 1
[289] (Normal) Official and large-scale reporting platforms often rely on sophisticated backend infrastructures and highly customized system architectures. Core functionalities such as real-time data processing, incident verification, secure user authentication, geolocation services, media processing, and user management are typically tightly integrated and optimized for scalability and reliability. These systems frequently implement advanced techniques such as automated classification algorithms, duplicate detection systems, event-driven architectures, and large-scale database management solutions.
[290] (Normal) While these approaches result in robust and efficient systems, they are often difficult to replicate in an academic context due to limited access to implementation details, proprietary technologies, and the scale of infrastructure and resources required.
[292] (Heading4) Method 1
[293] (Heading4) From a design perspective, large-scale reporting platforms emphasize reliable data flow, secure user authentication, responsive user interaction, and efficient information management. System design is carefully structured to support real-time reporting, media evidence handling, incident tracking, moderation workflows, and scalable data processing while maintaining usability and accessibility for a broad range of users. However, these design methodologies often rely on extensive infrastructure, large datasets, and dedicated development teams, which are not feasible within the constraints of a final-year project.
[295] (Heading3) Second category of methods /Solutions /Algorithms
[296] (Heading3) Community-driven and independent reporting platforms represent a more accessible category of existing solutions, particularly relevant to academic projects. These systems often rely on open-source or widely available technologies such as cross-platform mobile frameworks like React Native, backend technologies such as Node.js, cloud-hosted databases such as PostgreSQL, and machine learning services built using Python-based frameworks.
[297] (Heading4) Algorithm 1
[298] (Normal) Open-source frameworks and development tools provide developers with access to source code, extensive documentation, and active community support. These technologies support modular development, REST API integration, real-time communication mechanisms, database connectivity, authentication systems, and rapid prototyping. Cross-platform mobile frameworks and modern backend technologies are designed to support scalable application development through component-based architectures and high-level programming environments.
[299] (Normal) Such technologies enable developers to focus on system functionality and application design rather than low-level infrastructure implementation. However, they still require careful architectural planning to avoid tightly coupled components, security vulnerabilities, and performance bottlenecks.
[300] (Heading4) Method 1
[301] (Normal) Community-driven reporting platforms often prioritize accessibility, usability, privacy protection, and public trust over enterprise-level infrastructure and large-scale deployment features. Development practices in this category emphasize iterative design, modular architectures, and user feedback to improve system effectiveness and reliability. While this approach aligns well with academic constraints, smaller-scale systems may lack the scalability, optimization, and extensive datasets available in large commercial platforms due to limited resources.
[302] (Normal) Nevertheless, these development practices provide valuable insights into scalable system design, data management, and user-centered application development.
[304] (Heading 2) Comparative study
[305] (Normal) A comparative analysis of official large-scale reporting platforms and community-driven solutions highlights several key differences and similarities. Large-scale platforms offer higher levels of scalability, infrastructure reliability, and data processing capabilities but often require significant resources, dedicated teams, and proprietary technologies. Community-driven solutions, on the other hand, emphasize accessibility, flexibility, and modularity, making them more suitable for academic and small-scale projects.
[306] (Normal) Both categories rely on similar fundamental principles, such as efficient data management, responsive user interaction, and reliable reporting mechanisms. However, community-driven solutions place greater emphasis on extensibility, usability, and maintainability, which aligns closely with the objectives of this project.
[307] (Normal) Comparative Analysis Table
[309] (Heading 2) Project Objectives
[310] (Normal) Based on the analysis of existing solutions, the following objectives were defined for the SafeSignal project:
[311] (Normal) To develop a functional mobile-based incident reporting system using accessible and scalable technologies.
[312] (Normal) To implement modular reporting, categorization, and moderation components that can be extended in future iterations.
[313] (Normal) To integrate machine learning techniques for incident classification and duplicate detection.
[314] (Normal) To design a user-friendly system that supports real-time reporting, notifications, witness corroboration, and tracking of safety-related incidents.
[315] (Normal) To ensure code readability, maintainability, scalability, and academic clarity.
[316] (Normal) To create a prototype that can be further expanded beyond the FYP into a deployable community-oriented platform.
[317] (Normal) These objectives aim to balance technical feasibility with practical impact while remaining within the scope of a final-year project.
[318] (Heading 2) Conclusion
[319] (Normal) This chapter reviewed existing solutions in the domain of community-based incident reporting and civic technology systems, highlighting both large-scale official platforms and community-driven approaches. Through this analysis, the limitations of large-scale centralized solutions and the advantages of open-source, flexible, and modular development practices were identified. The insights gained from this study informed the definition of clear project objectives and guided the design choices presented in the following chapter, which details the proposed solution and system architecture.
[320] (Heading 1) CHAPTER IV: PROPOSED SOLUTION / DESIGN / METHOD
[321] (Heading 2) Introduction
[322] (Normal) This chapter presents the proposed solution developed to address the problem identified in the previous chapters. It details the overall design philosophy, system architecture, and the main functional blocks that constitute the SafeSignal system. The objective of this chapter is to provide a clear and structured description of how the proposed solution was conceived and how it improves upon existing approaches while remaining feasible within the constraints of an academic project.
[323] (Normal) The proposed solution emphasizes modularity, scalability, maintainability, and secure handling of user-generated safety data, allowing the developed system to serve both as a functional civic technology platform and as a technical foundation for future expansion. This chapter first introduces the global architecture of the project, then refines it into detailed system components, and finally describes the main design blocks and their interactions.
[324] (Heading 2) Design of the proposed solution
[325] (Normal) The proposed solution consists of a mobile-based incident reporting system developed using React Native for the mobile application, supported by backend API services developed using Node.js and machine learning services implemented in Python and a relational database implemented using PostgreSQL for secure data storage and management. The system is designed around a modular architecture that separates the mobile client, moderator dashboard, backend services, data management layer, and machine learning modules. This separation of concerns ensures clarity in development and simplifies future extensions such as additional reporting features, improved classification models, or expanded moderation capabilities.
[326] (Normal) The design process followed an iterative approach, starting with a high-level architectural vision and gradually refining each subsystem. Design decisions were driven by functional requirements, technical constraints, and the need for scalability, reliability, and extensibility.
[327] (Heading3) Solution architecture (project architecture)
[328] (Normal) At the project level, the system architecture is organized into four main layers:
[329] (Normal) • Mobile Application Layer: This layer includes all user-facing functionalities, such as authentication, incident reporting, media upload, geolocation tagging, report browsing, and notification handling. It serves as the primary interaction point for citizens using the system.
[331] (Normal) • Backend Services Layer: This layer manages API communication, user authentication, request handling, business logic execution, and communication between frontend interfaces and internal services. It coordinates system-wide data exchange and processing.
[332] (Normal) • Machine Learning and Processing Layer: This layer handles intelligent system functions such as incident categorization, duplicate detection, confidence scoring, and report analysis. It supports automated verification and assists moderators during decision making.
[333] (Normal) • Database and Data Management Layer: This layer manages persistent storage of reports, user accounts, media metadata, location data, incident history, and system-generated classifications while ensuring secure and efficient data retrieval.
[334] (Normal) This layered architecture promotes maintainability, scalability, and efficient separation of system responsibilities.
[335] (Heading3) Refined solution architecture (system architecture)
[336] (Normal) At a more detailed level, the system architecture is refined into interacting components, each responsible for a specific functionality:
[337] (Normal) • Mobile Application Module: Manages user registration, authentication, report creation, media uploads, geolocation tagging, incident browsing, and user notifications. It acts as the main interface between users and the system.
[338] (Normal) • Backend API Module: Handles request processing, authentication management, API routing, data validation, and communication between frontend interfaces, machine learning services, and database systems.
[339] (Normal) • Machine Learning Module: Responsible for automated incident categorization, duplicate detection, confidence scoring, and intelligent report analysis using trained machine learning models and AI-based processing services.
[340] (Normal) • Moderator Dashboard Module: Provides moderators with tools for reviewing submitted incidents, validating reports, merging duplicate submissions, monitoring analytics, and escalating verified reports when necessary.
[341] (Normal) • Real-Time Communication Module: Handles live notifications, report status updates, and synchronization between users, moderators, and backend services to ensure near real-time system responsiveness.
[342] (Normal) • Database Management Module: Oversees secure storage, retrieval, and synchronization of user data, reports, location information, media metadata, and system-generated analytical results.
[343] (Normal) This refined architecture ensures that each system component has a well-defined responsibility, reducing coupling and improving system maintainability.
[347] (Heading 2) Design blocks description
[348] (Normal) The proposed solution can be decomposed into several design blocks, each corresponding to a core system function.
[349] (Normal) User Interaction Block: Implements user-facing functionalities including authentication, incident reporting forms, anonymous reporting options, media uploads, notification management, and location selection.
[351] (Normal) Reporting Processing Block: This block manages incident report submission and processing. It handles user-submitted descriptions, media uploads, and location metadata, then performs data validation and preprocessing before sending reports to backend services for storage, classification, and duplicate detection. It ensures efficient and reliable handling of submitted information.
[354] (Normal) Geolocation and Mapping Block: This block manages all location-based functionalities within the system. It captures geographic coordinates during report submission, links incidents to precise locations, and supports map-based visualization of reported incidents. It also enables users to browse nearby incidents, improving awareness and supporting effective incident tracking..
[356] (Normal) Machine Learning Analysis Block: Introduces automated analysis of reports for incident categorization, duplicate detection, confidence scoring, and intelligent content analysis. This block applies trained machine learning models and AI services to improve data quality, reduce redundancy, and support moderator decision making
[358] (Normal) Moderation and Resolution Block: Provides functionality for reviewing, validating, merging duplicate reports, monitoring incident analytics, and escalating verified incidents to authorized entities when necessary. It ensures that verified incidents are properly managed and tracked throughout their lifecycle
[360] (Normal) Each block communicates with others through defined interfaces, ensuring coherence while preserving modularity.
[362] (Heading 2) Conclusion
[363] (Normal) This chapter presented the proposed solution for the SafeSignal system, detailing its architectural design and core components. By adopting a layered and modular approach, the proposed solution balances technical rigor, system security, usability, and scalability. The architecture supports current functional requirements while allowing future expansion, making it suitable both as an academic project and as a foundation for a deployable public safety and civic technology platform.
[364] (Normal) The next chapter will focus on the development and implementation process, describing how these design concepts were translated into a working system.
[366] (Heading 1) CHAPTER V: DEVELOPMENT AND IMPLEMENTATION
[367] (Heading 2) Introduction
[368] (Normal) This chapter describes the development and implementation process of the proposed solution presented in Chapter IV. It explains how the system architecture and design components were translated into a functional SafeSignal system through concrete technical decisions and implementation strategies. The chapter details both the software technologies used and the methods adopted to implement core functionalities such as mobile report submission, backend API services, machine learning processing, real-time communication, and moderator verification workflows
[369] (Normal) The objective of this chapter is to demonstrate the practical realization of the project while justifying the technological choices made during development. Particular emphasis is placed on modularity, code organization, scalability, and maintainability, ensuring that the developed system aligns with both academic standards and professional software engineering practices.
[370] (Heading 2) Hardware development and implementation
[372] (Normal) This project does not require specialized hardware components, as it is a software-based system intended to run on standard mobile devices and conventional development computers. All development and testing were conducted using standard personal computing hardware, while the final application is designed to operate on commonly available smartphones with standard networking and location service capabilities.
[374] (Normal) The absence of dedicated hardware components allowed the development process to focus entirely on software architecture, system integration, and application functionality. Data processing, user interaction, geolocation handling, and feedback mechanisms were implemented through software modules within the mobile application and backend environment. This approach is advantageous, as it allows the system to operate efficiently on widely accessible devices without requiring specialized hardware resources.
[383] (Heading3) Input bloc.
[384] (Normal) The input block is responsible for capturing and interpreting user actions such as account authentication, incident submission, media uploads, location selection, and report browsing. User input is processed through the mobile application interface, where interactions are converted into structured data that can be validated and transmitted efficiently. Input data is then forwarded to the reporting module, where it is validated and prepared for backend processing, machine learning analysis, and secure storage.
[385] (Heading3) Processing bloc
[386] (Normal) The processing block handles real-time system operations including backend request handling, data validation, machine learning analysis, and moderation workflow processing. This block ensures reliable handling of submitted reports and automated system actions.
[387] (Normal) Key processing tasks include:
[388] (Normal) Validating user-submitted data such as descriptions, uploaded media, and location information.
[389] (Normal) Processing reports through machine learning models for categorization, duplicate detection, and confidence scoring.
[390] (Normal) Updating system records such as report status, moderation decisions, and verification results.
[391] (Heading3) Communication bloc
[392] (Normal) The communication block manages data exchange between the mobile application, backend services, machine learning modules, and moderator dashboard. It handles API requests, real-time notifications, report synchronization, and communication between system components. Communication mechanisms were designed to reduce direct dependencies between modules, improving scalability, maintainability, and overall system efficiency.
[394] (Heading 2) Software development and implementation
[395] (Normal) The software implementation constitutes the core of the project. Development was carried out using modern cross-platform mobile development technologies, backend API services, machine learning frameworks, and a relational database implemented using PostgreSQL, providing a scalable and modular architecture suitable for iterative development. These technologies provide modular architecture, efficient API communication, and scalable system development suitable for rapid prototyping and iterative development.
[399] (Heading3) Database structure
[400] (Normal) The project relies on an external database system implemented using PostgreSQL to manage persistent storage of system data. The database stores essential information such as user accounts, submitted incident reports, report status updates, location data, uploaded media metadata, and moderation-related records. This structured storage approach ensures reliable data organization, efficient retrieval, and secure handling of user-generated information.
[401] (Normal) The use of a relational database system improves system scalability and supports efficient communication between the mobile application, backend services, and machine learning components. Database operations were designed to allow insertion, retrieval, updating, and management of incident records while maintaining data consistency across different system modules.
[402] (Normal) This database architecture provides a strong foundation for future system expansion, allowing the platform to support larger user bases, increased reporting activity, and more advanced analytical functionalities as the project evolves beyond its current prototype stage.
[403] (Heading3) Software functionalities
[404] (Heading3) The main software functionalities implemented in the project include:
[405] (Heading3) Incident Reporting System: Implements the core reporting functionality, allowing users to submit safety or crime-related incidents through text descriptions, image uploads, and location tagging and optional anonymous submission. Input validation mechanisms were implemented to ensure data consistency and completeness before submission.
[406] (Heading3) Machine Learning Processing System: Enables automated analysis of submitted reports through incident categorization, duplicate detection, and confidence scoring. Processing logic was separated from the main application workflow to allow independent retraining and future model improvements
[407] (Heading3) Moderation and Verification System: Implements report review functionality through a moderator dashboard, allowing moderators to validate submissions, reject invalid reports, merge duplicate reports, and escalate verified incidents when necessary.
[408] (Heading3) Data and Report Management System: Supports storage, retrieval, and updating of submitted reports along with associated metadata such as report status, timestamps, and location information. The system was designed to ensure efficient organization and tracking of incident records.
[409] (Heading3) System State Management: Handles application states such as report submission status, processing workflows, notification updates, moderation changes, and synchronization between system components.
[410] (Heading3) Each functionality was implemented as a distinct module, reducing coupling and improving system clarity.
[411] (Heading 2) Conclusion
[412] (Normal) This chapter detailed the development and implementation of the SafeSignal system, explaining how design concepts were translated into a working application. Through the use of modern mobile development frameworks, backend technologies, and machine learning services, modular architecture, and iterative development practices, the project achieved its functional objectives within the constraints of an academic environment. The following chapter presents the experimental evaluation of the system, including system testing and result analysis used to validate the proposed solution.
[440] (Heading 1) CHAPTER VI: EXPERIMENTS AND RESULTS
[441] (Heading 2) Introduction
[442] (Normal) This chapter presents the experimental evaluation of SafeSignal, with emphasis on the moderator dashboard and the workflows that support incident review, access control, analytics, and law-enforcement coordination.
[443] (Normal) The consolidated testcases contains 62 recorded result rows. Of these, 39 passed and 23 failed, producing an observed pass rate of 62.9 percent for the evaluated prototype. These results show that the main authentication and dashboard flows are usable, but they also identify important limitations in data consistency, role handling, report-state transitions, settings controls, and external map loading.
[444] (Heading 2) Prototype/application
[445] (Normal) The evaluated prototype is the SafeSignal web-based moderator dashboard. It provides a secure login entry point, a dashboard overview, a report queue, detailed incident review actions, user and access-request administration, a data analysis center, settings screens, and a law-enforcement interface.
[447] (Normal) Table 6.1: Application areas evaluated in the experiment
[449] (Heading 2) Experimental approach
[450] (Normal) The experiment followed a functional system-testing approach. Each testcase defined a view, feature, identifier, test title, description, ordered steps, expected result, actual result, outcome, and bug identifier when applicable. This structure allowed each observation to be compared directly against the intended behavior of the prototype.
[451] (Normal) The main acceptance criterion was behavioral agreement between the expected and actual result. A testcase passed when the observed screen state, validation behavior, navigation result, or workflow output matched the expected result. A testcase failed when the system exposed inconsistent data, missing feedback, inaccessible controls, incorrect role behavior, stale UI state, or external integration failures.
[452] (Normal) The principal metrics were the number of recorded result rows, pass and fail counts, observed pass rate, number of unique bug identifiers, and failure distribution by functional area. Qualitative interpretation was also used because many behaviors, such as stale detail panels or unclear success feedback, are better explained through the actual result text than through a numerical value alone.
[454] (Normal) Table 6.2: Evidence sources used for Chapter VI
[456] (Heading 2) System tests/simulations/experiments
[457] (Normal) The system tests were organized around the main workflows of the prototype. The goal was not to simulate physical hardware, but to verify whether the implemented software behaved correctly when users navigated through the dashboard and performed realistic moderation and administration tasks.
[459] (Normal) Table 6.3: Overall testcase result summary
[461] (Normal) Table 6.4: Result distribution by functional area
[463] (Heading3) Authentication and access control
[464] (Normal) Authentication was one of the strongest evaluated areas. The login page presented clear SafeSignal branding, visible login and apply-access actions, usable password visibility controls, and actionable validation messages for empty, malformed, and invalid credentials. Demo moderator credentials successfully redirected the user into the authenticated dashboard, and direct access to protected logged-out routes redirected to the login page without exposing protected content.
[465] (Normal) One access-control limitation remained: moderator attempts to reach restricted admin and law-enforcement routes silently redirected to the dashboard instead of showing an explicit access-denied message. This behavior protects the restricted pages from exposure, but it weakens user feedback and should be improved so unauthorized users understand why the target route was not opened.
[466] (Heading3) Reports and moderation workflow
[467] (Normal) The reports workflow showed a mixed result. Keyboard shortcuts for selecting the next report and opening escalation or rejection flows worked as expected, and the queue/detail splitter remained usable after resizing. However, the default all-reports view showed zero reports while the dashboard displayed forty-seven total reports, indicating a data-source or filtering inconsistency. Bulk rejection and escalation also exposed state-transition defects, and single-report rejection was allowed on an already rejected report.
[468] (Normal) These results indicate that the moderation interface contains useful interaction mechanics but still needs stricter state validation. The system should prevent duplicate or contradictory actions and should refresh report lists consistently after a status-changing operation.
[469] (Heading3) Dashboard and analytics consistency
[470] (Normal) The dashboard and analytics tests confirmed that some analytics views populate correctly. For example, the Data Analysis Center updated the ninety-day period to thirty-one reports and the one-year period to forty-seven reports with visible trend, hotspot, and category data. At the same time, the thirty-day analytics view showed zero reports while the dashboard showed forty-seven reports, and the reports page also showed zero reports in the all-reports queue.
[471] (Normal) The main interpretation is that the prototype has working analytics presentation components but inconsistent shared data boundaries. A common report-count source of truth is needed so dashboard cards, report queues, and analytics filters describe the same dataset.
[472] (Heading3) Users, settings, and law-enforcement workflows
[473] (Normal) User administration tests found both functional and inconsistent behavior. Filtering could narrow the list, but the detail pane retained a previously selected user when no filtered users remained. Access-request handling also produced contradictory states: a new law-enforcement account was blocked at login as pending approval while the users page listed the same account as active. The invite-user control appeared clickable but did not produce visible feedback.
[474] (Normal) Settings tests identified several interaction and feedback issues. Profile and preference values changed immediately even where the interface implied a save step, browser and sound notification toggles were not manually interactable, and the password or two-factor controls lacked complete accessibility and interaction behavior. The law-enforcement interface also required improvement because a successful LE login still showed Moderator Dashboard branding and exposed moderator-oriented navigation.
[475] (Heading3) Representative test results
[476] (Normal) Table 6.5: Representative testcase outcomes
[478] (Heading3) Test result
[479] (Normal) The overall test result was 39 passing rows and 23 failing rows out of 62 recorded rows. Authentication, logged-out routing, keyboard shortcuts, panel resizing, selected analytics period filters, and several baseline dashboard flows behaved correctly. The most important failure clusters were data consistency across dashboard, reports, and analytics views; report status-transition handling; user and access-request state consistency; settings control reachability; map resource loading; and role-specific law-enforcement navigation.
[480] (Heading3) Test interpretation
[481] (Normal) The results show that SafeSignal is not merely a static interface: multiple end-to-end workflows can be executed successfully, including login, route protection, report navigation, analytics filtering, and selected law-enforcement detail interactions. However, the failures show that the prototype still needs stronger state synchronization and clearer feedback before it can be considered robust.
[482] (Normal) The repeated data-consistency failures are especially significant because SafeSignal depends on trustworthy incident counts and report status. If dashboard totals, report queues, and analytics cards do not agree, moderators may make decisions from conflicting information. The report-state and user-state failures are also important because they affect operational trust: a rejected report should not be rejected again, and a pending account should not appear active in another administrative view.
[483] (Heading3) Discussion
[484] (Normal) The passing tests validate the feasibility of the proposed solution and confirm that the main user journeys are present. The failing tests are useful because they reveal concrete improvement targets rather than abstract weaknesses. Most issues are implementation and consistency problems, not evidence that the overall architecture is unsuitable.
[485] (Normal) The main limitation of this evaluation is that it was performed on a local prototype dataset and local dashboard server. The test files do not provide load-testing, security penetration testing, mobile application field testing, or machine-learning precision and recall measurements. In addition, external Google Maps resources failed in the test environment because of proxy-related resource errors, so map failures should be rechecked in a network environment where the map service is reachable.
[486] (Heading 2) Impact of the proposed solution
[487] (Normal) The proposed solution has practical impact because it demonstrates how a structured incident-reporting workflow can connect public reports, moderator review, analytics, and law-enforcement follow-up in one prototype. Even with the limitations identified by testing, the application shows that community safety reporting can be organized into clear operational stages instead of remaining as unstructured messages.
[488] (Normal) From a technical perspective, the project combines web dashboard development, role-based navigation, report-management workflows, analytics views, and integration points such as maps. The testing results provide a realistic engineering roadmap: stabilize shared data sources, strengthen role-specific access behavior, improve form and toggle accessibility, and make status transitions deterministic.
[489] (Normal) From a societal and educational perspective, SafeSignal offers a practical example of civic technology built within academic constraints. The prototype is not presented as a final production deployment, but the experiments show that the concept is feasible and that further development can be guided by measurable defects and observable user workflows.
[490] (Heading 2) Conclusion
[491] (Normal) This chapter presented the experimental evaluation of SafeSignal using evidence from the project testcase records and dashboard artifacts. The evaluation covered 62 recorded testcase results across authentication, routing, dashboard analytics, reports, users, settings, law-enforcement workflows, and runtime behavior. The result was 39 passes and 23 failures, corresponding to an observed pass rate of 62.9 percent.
[492] (Normal) The experiments confirm that SafeSignal has a working functional foundation, especially in authentication, basic navigation, selected analytics filters, and report-interface interactions. They also show that the next development cycle should focus on shared data consistency, clearer access-control feedback, reliable moderation state transitions, accessible settings controls, law-enforcement role separation, and retesting of external map loading. These findings provide a concrete basis for the final conclusion and future work of the project.
[493] (Heading 1) CHAPTER VII: GENERAL CONCLUSION
[494] (Heading 2) Report Summary
[495] (Normal) This project addressed the design and development of a functional prototype for a community-based incident reporting system titled SafeSignal. The primary objective was to demonstrate the feasibility of building a scalable and extensible software system within the constraints of a final-year computer science project, while also highlighting the potential of civic technology as a practical application of modern software engineering and intelligent systems development.
[497] (Normal) The project successfully delivered a functional mobile-based application integrating core system features such as incident reporting, media and location submission, machine learning-based incident classification, duplicate detection, moderator verification workflows, and secure backend data management. The system architecture was designed with modularity and maintainability in mind, allowing individual components to be modified or extended independently. The implemented modules work together to provide a structured workflow that supports efficient reporting, validation, and tracking of safety-related incidents.
[499] (Normal) From a technical perspective, the project applied key software engineering principles including modular design, iterative development, machine learning integration, and continuous testing. System-based experiments validated the functionality, reliability, and stability of the implemented components, confirming that the project met its functional requirements. Compared to existing solutions, the proposed system achieves a balance between practical usability and academic accessibility, offering flexibility for future development while maintaining structured system design and documentation.
[501] (Normal) Beyond its technical achievements, the project contributes to the local academic and societal context by demonstrating that accessible technologies can be used to develop practical solutions addressing real-world community challenges. The work serves as a foundation for future exploration of civic technology development within Lebanon and highlights the relevance of software engineering and intelligent systems in solving modern public safety and community communication problems.
[510] (Heading 2) Future work and Perspectives
[511] (Normal) While the current implementation fulfills the objectives of a functional prototype, several avenues for future work and improvement have been identified. From a system perspective, additional features such as real-time notifications, direct communication channels with authorities, and improved incident tracking mechanisms could significantly enhance overall functionality and user engagement. Expanding the reporting system to support a wider range of incident categories and more detailed status updates would further improve the platform’s effectiveness.
[513] (Normal) From a technical standpoint, future iterations could integrate more advanced machine learning models for improved incident classification, more accurate duplicate detection algorithms, and stronger data processing capabilities. Additional improvements such as distributed cloud deployment, enhanced security mechanisms, improved privacy controls, and advanced analytics dashboards could further improve system scalability, reliability, and overall user experience.
[515] (Normal) On a broader scale, the project opens perspectives for transforming the prototype into a fully deployable community-driven civic technology platform. With further development, large-scale testing, and collaboration with public safety organizations or local authorities, SafeSignal could evolve into a practical solution that contributes to improving community safety and public awareness. The project also provides a reference framework for future students interested in developing technology-based solutions for real-world social challenges, encouraging innovation and practical problem-solving within academic environments.
[517] (Heading 1) REFERENCES
[519] (Normal) React Native Documentation, React Native Official Documentation. Available at: React Native Documentation
[520] (Normal) Node.js Documentation, Node.js Official Documentation. Available at: Node.js Documentation
[521] (Normal) Express Documentation, Express.js Official Documentation. Available at: Express Documentation
[522] (Normal) PostgreSQL Documentation, PostgreSQL Official Documentation. Available at: PostgreSQL Documentation
[523] (Normal) FastAPI Documentation, FastAPI Official Documentation. Available at: FastAPI Documentation
[524] (Normal) Socket.IO Documentation, Socket.IO Official Documentation. Available at: Socket.IO Documentation
[525] (Normal) Sommerville, Software Engineering, 10th Edition, Pearson Education, 2015.
[526] (Normal) OWASP Foundation, Web Application Security Best Practices. Available at: OWASP Foundation
[527] (Normal) Google Developers, Geolocation API Documentation. Available at: Google Maps Platform
[528] (Normal) IEEE Code of Ethics, IEEE Professional and Ethical Standards. Available at: IEEE Ethics Standards
[531] (Heading 1) LIST OF ACRONYMS
[556] (Heading 1) LIST OF FIGURES
[558] (Normal) Provides a list of all the figure titles in the report for direct access and their page number
[561] (Subtitle) Figure 1: Figure title (caption) (Page number)
[562] (Subtitle) Figure 2: Figure title (caption) (Page number)
[566] (Heading 1) LIST OF TABLES
[568] (Normal) Provides a list of all the table titles in the report for direct access and their page number
[570] (Subtitle) Table 1: Table title (caption) (Page 5)
[571] (Subtitle) Table 2: Table title (caption) (Page 11-12)
[601] (Normal) APPENDICES
[617] (Heading 1) APPENDIX A
[619] (Heading 1) Code Structure and Implementation Excerpts
[620] (Heading 2) A.1. Purpose of the Appendix
[621] (isselectedend) This appendix provides supplementary technical information that supports the understanding of the SafeSignal system implementation presented throughout the main chapters of the report. It focuses on the organization of the codebase, the architectural structure adopted during development, and selected implementation descriptions illustrating the main functionalities of the system.
[622] (isselectedend) In accordance with academic guidelines, the appendix does not contain the complete source code of the project. The full codebase is provided separately in electronic format. Only representative implementation descriptions and structural explanations are included here to clarify system design decisions and implementation logic.
[624] (Heading 2) A.2. Project Directory Structure
[625] (isselectedend) The SafeSignal project follows a modular directory structure to ensure maintainability, readability, scalability, and separation of concerns between the mobile application, backend services, machine learning modules, and database interaction layers.
[626] (isselectedend) A simplified representation of the project structure is shown below:
[627] (isselectedend) • mobile/ o User authentication screens o Incident reporting screens o Report browsing and tracking screens o Location selection and media upload components
[628] (isselectedend) • backend/ o API routes and request handling o Authentication services o Report processing logic o Moderation workflow controllers
[629] (isselectedend) • ml/ o Incident classification models o Duplicate detection logic o Data preprocessing scripts o Model inference services
[630] (isselectedend) • database/ o PostgreSQL schema definitions o Database connection management o Query handling and data persistence
[631] (isselectedend) • config/ o Environment configuration files o API settings o Security configuration
[632] (isselectedend) This organization allows independent development and testing of individual system components while reducing coupling between modules.
[634] (Heading 2) A.3. Incident Reporting Logic (Excerpt Description)
[635] (isselectedend) The incident reporting system is implemented through a dedicated reporting module responsible for handling user submissions, input validation, media uploads, geolocation data collection, and communication with backend services. User input is processed through structured API requests to ensure consistent formatting and secure data transfer.
[636] (isselectedend) Key features of the reporting implementation include:
[637] (isselectedend) • User authentication and identity verification • Incident description and media submission • Location tagging using geolocation services • Input validation before backend submission • Structured API communication with backend services
[638] (isselectedend) This modular approach allows reporting functionality to be extended independently of other system components.
[640] (Heading 2) A.4. Machine Learning Processing Logic (Excerpt Description)
[641] (isselectedend) The machine learning processing system is designed as an independent service interacting with backend processing modules. Submitted reports are analyzed automatically to improve report organization and reduce duplicate or redundant submissions.
[642] (isselectedend) The processing logic includes:
[643] (isselectedend) • Incident categorization based on submitted report content • Duplicate detection through similarity comparison algorithms • Confidence scoring for classification accuracy • Preprocessing and formatting of incoming report data
[644] (isselectedend) Separating machine learning logic from the main application workflow improves maintainability and allows future retraining or model replacement without affecting other system components.
[646] (Heading 2) A.5. Moderation and Verification Implementation
[647] (isselectedend) The moderation system is implemented through a dedicated workflow module responsible for validating submitted reports before they are accepted into the system. Moderators interact with submitted reports through an administrative review interface that allows manual verification and decision management.
[648] (isselectedend) This module supports functionalities such as:
[649] (isselectedend) • Reviewing submitted reports • Approving or rejecting invalid submissions • Managing duplicate report verification • Updating report status throughout the review process
[650] (isselectedend) This structured approach improves system reliability and helps ensure the credibility of user-submitted information.
[652] (Heading 2) A.6. Backend and Database Management
[653] (isselectedend) Backend services are responsible for handling API communication, data processing, user authentication, and system-wide coordination between application modules. Persistent data storage is managed through a centralized database implemented using PostgreSQL.
[654] (isselectedend) This system ensures:
[655] (isselectedend) • Secure storage of user and report information • Efficient retrieval and updating of incident records • Reliable communication between frontend and backend services • Consistent synchronization of report and moderation data
[656] (isselectedend) The backend architecture was designed to support future scalability and increased reporting activity as the system evolves.
[658] (Heading 2) A.7. Remarks on Code Availability
[659] (Normal (Web)) This appendix provides a conceptual overview of the implemented system architecture rather than exhaustive source code listings. The complete source code of the SafeSignal project is available in electronic format and can be provided separately for further review, testing, or academic evaluation.

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
R8: T7 |  | Week 9 | Week 11 | 3 weeks
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