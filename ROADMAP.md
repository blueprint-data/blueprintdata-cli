# Roadmap

Product roadmap for BlueprintData CLI.

---

## Current Status

**Phase 5: Web Client** ✅ Complete (2026-01-29)

The web UI with shadcn/ui components, authentication, and chat interface is complete. The foundation for the interactive analytics experience is ready.

---

## Immediate Priorities (Q1 2026)

### Phase 6: CLI Integration (MVP Completion)

**Status**: 🚧 In Progress
**Target**: February 2026
**Effort**: 1-2 weeks

Complete the `analytics chat` command to tie together all components:

- CLI command orchestration
- Database initialization and migrations
- Gateway server lifecycle management
- Web UI process management
- Browser auto-launch
- Graceful shutdown handling

**Why**: This phase completes the MVP by connecting the web UI, gateway, agent, and database into a cohesive user experience.

**Success Criteria**:
- ✅ Users can run `blueprintdata analytics chat` successfully
- ✅ Authentication flow works end-to-end
- ✅ Chat interface connects to gateway
- ✅ Tool execution works (query, search, chart)
- ✅ Sessions persist across restarts

---

### Phase 7: Testing & Polish (MVP Completion)

**Status**: 📋 Planned
**Target**: February-March 2026
**Effort**: 2-3 weeks

Comprehensive testing, documentation, and quality improvements:

**Testing**:
- Unit tests for auth, agent, and tools
- Integration tests for WebSocket communication
- End-to-end testing of chat flow
- Target: 70%+ code coverage

**Polish**:
- Error handling improvements
- Performance optimization
- User experience refinements
- Documentation updates

**Why**: Ensures the MVP is production-ready, reliable, and maintainable.

**Success Criteria**:
- ✅ 70%+ test coverage
- ✅ All critical paths have integration tests
- ✅ End-to-end tests pass consistently
- ✅ Documentation is complete and accurate
- ✅ Performance meets benchmarks

---

## Post-MVP Features (Q2 2026)

### Enhanced Analytics Capabilities

**Target**: Q2 2026

#### Advanced Tool System

- **Data Quality Tools**: Check for nulls, duplicates, anomalies
- **Lineage Visualization**: Interactive dependency graphs
- **Performance Analysis**: Query optimization suggestions
- **Test Generation**: Automated dbt test creation

**Why**: Extends the agent's capabilities beyond querying to include data quality and optimization.

#### Multi-Warehouse Support

- **Snowflake**: Support for Snowflake data warehouse
- **Redshift**: Amazon Redshift connector
- **Databricks**: Databricks SQL warehouse support

**Why**: Expands the addressable market to teams using other warehouses.

#### Context Enhancements

- **Automatic Context Updates**: Watch for dbt changes and auto-sync
- **Semantic Layer Integration**: Support for dbt Semantic Layer
- **Custom Definitions**: User-defined metrics and glossary
- **Historical Context**: Track changes in documentation over time

**Why**: Makes the agent's understanding richer and more current.

---

### Collaboration Features

**Target**: Q2-Q3 2026

#### Slack Integration

- **Slack Bot**: Ask questions directly in Slack
- **Notifications**: Alert on important data changes
- **Shared Context**: Team-wide agent knowledge
- **Thread History**: Preserve conversations in channels

**Why**: Brings the agent into team workflows where conversations already happen.

#### Multi-User Support

- **Team Accounts**: Multiple users per dbt project
- **Role-Based Access**: Different permissions for analysts, engineers, etc.
- **Shared Sessions**: Collaborate on analysis in real-time
- **Activity History**: Audit log of queries and changes

**Why**: Scales from individual use to team collaboration.

---

## Long-Term Vision (Q3+ 2026)

### Intelligent Data Platform

#### Proactive Insights

- **Anomaly Detection**: Automatically flag unusual patterns
- **Trend Analysis**: Identify important trends in data
- **Data Quality Monitoring**: Continuous quality checks
- **Smart Alerts**: Notify users of significant changes

**Why**: Shifts from reactive (answering questions) to proactive (surfacing insights).

#### Advanced Automation

- **Auto-Documentation**: Generate and maintain dbt docs
- **Test Generation**: Create comprehensive test suites
- **Model Suggestions**: Recommend new models or optimizations
- **Code Generation**: Generate dbt models from requirements

**Why**: Reduces manual work and maintains high code quality automatically.

#### Enterprise Features

- **SSO Integration**: SAML, OAuth for enterprise auth
- **Audit Logging**: Comprehensive activity tracking
- **Data Governance**: PII detection, access controls
- **Custom Deployment**: On-premise or VPC options

**Why**: Enables adoption by large enterprises with compliance requirements.

---

### Extensibility & Ecosystem

#### Plugin System

- **Custom Tools**: Build and register custom agent tools
- **Integration Plugins**: Connect to BI tools, notebooks, etc.
- **Template Marketplace**: Share and discover project templates
- **Extension API**: Build extensions on top of BlueprintData

**Why**: Enables community contributions and ecosystem growth.

#### Developer Platform

- **API Access**: Programmatic access to agent capabilities
- **Embeddable Components**: Use chat UI in other applications
- **Webhooks**: React to events (queries, discoveries, etc.)
- **SDK**: Build applications on top of BlueprintData

**Why**: Opens up use cases beyond the CLI (notebooks, dashboards, custom apps).

---

## Technology Improvements

### Architecture Evolution

#### Distributed System (Q3 2026)

- **PostgreSQL Backend**: Move from SQLite for multi-user support
- **Redis Caching**: Cache LLM responses and query results
- **Horizontal Scaling**: Deploy multiple gateway instances
- **Message Queue**: Async processing of long-running tasks

**Why**: Supports larger teams and more concurrent users.

#### Performance Optimizations (Ongoing)

- **Query Result Caching**: Cache expensive queries
- **Incremental Context Updates**: Only re-profile changed tables
- **LLM Response Streaming**: Stream responses for better UX
- **Background Processing**: Non-blocking operations

**Why**: Keeps the experience fast as usage grows.

---

### Quality & Reliability

#### Observability (Q2 2026)

- **Metrics Collection**: Track usage, performance, errors
- **Distributed Tracing**: Trace requests through system
- **Logging Infrastructure**: Centralized, structured logs
- **Alerting**: Monitor health and availability

**Why**: Enables proactive issue detection and resolution.

#### Testing Strategy (Ongoing)

- **E2E Test Suite**: Comprehensive end-to-end tests
- **Performance Benchmarks**: Track and prevent regressions
- **Chaos Testing**: Test resilience to failures
- **Load Testing**: Validate scalability claims

**Why**: Maintains quality as the codebase grows.

---

## Success Metrics

### MVP (Phase 6-7)

- ✅ Chat interface works reliably
- ✅ 70%+ test coverage
- ✅ < 3 second response time for queries
- ✅ Documentation complete
- ✅ 10+ beta users successfully using chat

### Post-MVP (Q2 2026)

- 100+ active users
- 50%+ user retention (month-over-month)
- < 5% error rate on queries
- 90%+ user satisfaction
- 3+ new warehouses supported

### Long-Term (Q4 2026)

- 1,000+ active users
- 10+ enterprise customers
- 50+ community-contributed tools/templates
- API used by 10+ third-party integrations

---

## Release Strategy

### Versioning

- **MVP**: Version 1.0.0 after Phase 7 complete
- **Minor Releases**: New features (Q2-Q4 2026)
- **Major Releases**: Breaking changes (if needed)
- **Patch Releases**: Bug fixes (ongoing)

### Beta Program

- Invite early adopters for Phase 6 testing
- Collect feedback and iterate
- Public beta after Phase 7 completion
- General availability with 1.0.0

---

## Community & Ecosystem

### Open Source Strategy

- **Core CLI**: Open source (MIT license)
- **Community Templates**: Encourage sharing
- **Plugin Development**: Document and support
- **Contribution Guide**: Clear path for contributors

### Documentation

- **User Guides**: For each feature
- **API Reference**: Complete API docs
- **Video Tutorials**: Walkthrough videos
- **Best Practices**: Guides for common patterns

### Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Q&A and community support
- **Discord/Slack**: Real-time community chat (future)
- **Office Hours**: Regular community calls (future)

---

## Dependencies & Risks

### External Dependencies

- **LLM APIs**: Anthropic Claude, OpenAI GPT availability
- **dbt**: Compatibility with dbt Core versions
- **Warehouse Connectors**: BigQuery, Postgres, etc. API stability

### Risks & Mitigation

**Risk**: LLM API costs too high
**Mitigation**: Implement caching, use cost-effective models, offer self-hosted LLM option

**Risk**: dbt breaking changes
**Mitigation**: Pin versions, test against multiple dbt versions, maintain compatibility matrix

**Risk**: Adoption slower than expected
**Mitigation**: Focus on user feedback, iterate quickly, invest in documentation and onboarding

**Risk**: Performance issues at scale
**Mitigation**: Early load testing, performance budgets, horizontal scaling architecture

---

## Detailed Task Breakdown

For granular task breakdown with 1-2 day tickets, see [DETAILED_ROADMAP.md](DETAILED_ROADMAP.md).

---

**Last Updated**: 2026-01-29
