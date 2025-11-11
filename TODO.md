# TODO
The following tasks outline planned improvements and ongoing development goals:

- [ ] **Implement Web Application Firewall (WAF) detection**  
Introduce logic to identify and classify WAF responses, minimizing false positives during scans.

- [ ] **Refine handling of HTTP status codes**  
Current implementation treats `statusCode >= 400` as “dead.” This should be refined to accommodate context-specific response handling.

- [ ] **Add adaptive rate-limiting detection**  
Implement dynamic retry and backoff strategies for more accurate detection of rate-limiting behavior.

- [ ] **Enhance detection and mitigation of ISP-level blocking**  
Improve detection mechanisms for provider-based filtering or network interference.

- [ ] **Handle country-based restrictions without relying on VPNs**  
Explore DNS-based or proxy-less methods to identify geographically restricted content access.

- [ ] **Modularise the codebase**  
Split the code into smaller, focused modules to improve maintainability, readability, and testability.

- [ ] **Expand test coverage**  
Add unit, integration, and end-to-end tests for non-covered code areas to ensure robustness.

- [ ] **Implement recent upstream updates**  
Review and integrate upstream changes from [ryanbr/cleaner-adblock](https://github.com/ryanbr/cleaner-adblock).

- [ ] **Improve and update documentation**  
Add comprehensive comments, docstrings, and developer notes to aid future contributors and ensure all documentation reflects the current project structure and goals.
