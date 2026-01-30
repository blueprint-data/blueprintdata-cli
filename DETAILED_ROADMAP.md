# Detailed Roadmap

Granular task breakdown for BlueprintData CLI development (1-2 day tickets).

---

## Table of Contents

1. [Phase 6: CLI Integration](#phase-6-cli-integration)
2. [Phase 7: Testing & Polish](#phase-7-testing--polish)
3. [Post-MVP: Enhanced Analytics](#post-mvp-enhanced-analytics)
4. [Post-MVP: Collaboration Features](#post-mvp-collaboration-features)

---

## Phase 6: CLI Integration

**Goal**: Complete the `analytics chat` command and wire up all components.

**Estimated Duration**: 1-2 weeks (5-10 work days)

---

### Task 6.1: Database Initialization Command

**Effort**: 1 day
**Priority**: Critical
**Dependencies**: None

**Description**:
Create a command to initialize the SQLite database and run migrations. This should be called by the chat command but can also be run standalone.

**Files to Create/Modify**:
- `apps/cli/src/commands/analytics/db-init.ts` (new)
- `apps/cli/src/commands/analytics/index.ts` (update)
- `packages/@blueprintdata/database/src/migrations.ts` (new)

**Implementation**:
1. Create `db-init.ts` command
2. Check if database exists at `.blueprintdata/analytics.db`
3. If not, create database file
4. Run Drizzle migrations
5. Verify schema is correct
6. Report success/failure

**Acceptance Criteria**:
- [ ] `blueprintdata analytics db-init` creates database
- [ ] Migrations run successfully
- [ ] Can be run multiple times safely (idempotent)
- [ ] Proper error messages if fails
- [ ] Creates `.blueprintdata/` directory if not exists

---

### Task 6.2: ChatService Implementation

**Effort**: 2 days
**Priority**: Critical
**Dependencies**: Task 6.1

**Description**:
Implement the `ChatService` class that orchestrates starting the gateway server, web UI, and managing the process lifecycle.

**Files to Create/Modify**:
- `apps/cli/src/services/analytics/ChatService.ts` (new)
- `apps/cli/src/services/analytics/index.ts` (update)

**Implementation**:
1. Load analytics configuration from `.blueprintdata/config.json`
2. Verify authentication (check `~/.blueprintdata/auth.json`)
3. Initialize database (call db-init logic)
4. Create `GatewayServer` instance with AgentService
5. Start gateway on configured port
6. Serve web UI static files
7. Open browser to `http://localhost:<port>`
8. Handle graceful shutdown (Ctrl+C)

**Acceptance Criteria**:
- [ ] `ChatService.start()` method works
- [ ] Gateway server starts successfully
- [ ] Web UI is accessible in browser
- [ ] Authentication is required
- [ ] Graceful shutdown on Ctrl+C
- [ ] Proper error handling for missing config
- [ ] Ports are configurable via config

---

### Task 6.3: Analytics Chat Command

**Effort**: 1 day
**Priority**: Critical
**Dependencies**: Task 6.2

**Description**:
Create the `blueprintdata analytics chat` command that uses `ChatService`.

**Files to Create/Modify**:
- `apps/cli/src/commands/analytics/chat.ts` (new)
- `apps/cli/src/commands/analytics/index.ts` (update)
- `apps/cli/src/cli.ts` (update)

**Implementation**:
1. Define command with Commander.js
2. Check if analytics initialized (config exists)
3. If not initialized, prompt user to run `init`
4. Check authentication status
5. If not authenticated, prompt to register/login
6. Create `ChatService` instance
7. Call `start()` method
8. Display status messages to user
9. Keep process running until Ctrl+C

**Acceptance Criteria**:
- [ ] `blueprintdata analytics chat` command exists
- [ ] Checks for initialization
- [ ] Checks for authentication
- [ ] Starts chat service successfully
- [ ] Opens browser automatically
- [ ] Clear user messages for each step
- [ ] Handles Ctrl+C gracefully

---

### Task 6.4: Gateway Static File Serving

**Effort**: 1 day
**Priority**: Critical
**Dependencies**: None

**Description**:
Update the `GatewayServer` to serve static files from the built web UI.

**Files to Modify**:
- `packages/@blueprintdata/gateway/src/index.ts`

**Implementation**:
1. Add HTTP route handler for static files
2. Serve files from `apps/web/dist` directory
3. Handle SPA routing (serve index.html for all routes)
4. Set appropriate content-type headers
5. Handle 404s for missing files

**Acceptance Criteria**:
- [ ] Gateway serves web UI static files
- [ ] `GET /` returns index.html
- [ ] `GET /assets/*` returns static assets
- [ ] SPA routing works (all routes serve index.html)
- [ ] Proper content-type headers
- [ ] 404 for truly missing files

---

### Task 6.5: Gateway-Agent Integration

**Effort**: 2 days
**Priority**: Critical
**Dependencies**: None

**Description**:
Wire up the gateway to invoke the `AgentService` when receiving chat messages.

**Files to Modify**:
- `packages/@blueprintdata/gateway/src/index.ts`
- `packages/@blueprintdata/analytics/src/agent/AgentService.ts`

**Implementation**:
1. Pass `AgentService` instance to `GatewayServer` constructor
2. On receiving chat message from WebSocket:
   - Save message to database
   - Invoke `AgentService.processMessage()`
   - Stream agent responses back to client
   - Save assistant messages to database
3. Handle tool calls:
   - Execute tools via `ToolRegistry`
   - Send tool results back to LLM
   - Stream final response to client
4. Handle errors gracefully

**Acceptance Criteria**:
- [ ] Gateway invokes agent on chat messages
- [ ] Messages saved to database
- [ ] Agent responses streamed to client
- [ ] Tool execution works (query, search, chart)
- [ ] Tool results displayed in UI
- [ ] Errors handled and displayed
- [ ] Message history persists

---

### Task 6.6: Agent Tool Registration

**Effort**: 1 day
**Priority**: Critical
**Dependencies**: Task 6.2

**Description**:
Register all agent tools when starting the chat service.

**Files to Modify**:
- `apps/cli/src/services/analytics/ChatService.ts`
- `packages/@blueprintdata/analytics/src/agent/AgentService.ts`

**Implementation**:
1. Load warehouse connector from config
2. Load agent context path from config
3. Create tool instances:
   - `QueryTool` with warehouse connector
   - `ContextSearchTool` with context path
   - `ChartTool`
4. Register tools with `ToolRegistry`
5. Pass registry to `AgentService`

**Acceptance Criteria**:
- [ ] Tools registered on startup
- [ ] QueryTool can access warehouse
- [ ] ContextSearchTool can read context files
- [ ] ChartTool can generate configs
- [ ] AgentService has access to all tools
- [ ] Tool execution logged

---

### Task 6.7: Browser Auto-Launch

**Effort**: 0.5 days
**Priority**: Medium
**Dependencies**: Task 6.3

**Description**:
Automatically open browser when chat starts.

**Files to Modify**:
- `apps/cli/src/services/analytics/ChatService.ts`

**Implementation**:
1. Use `open` package (or similar) to launch browser
2. Open `http://localhost:<port>`
3. Handle errors if browser can't be opened
4. Add `--no-open` flag to skip auto-launch

**Acceptance Criteria**:
- [ ] Browser opens automatically
- [ ] Opens to correct URL
- [ ] Handles errors gracefully
- [ ] `--no-open` flag works
- [ ] Works on macOS, Linux, Windows

---

### Task 6.8: Session Management

**Effort**: 1 day
**Priority**: High
**Dependencies**: Task 6.5

**Description**:
Implement session management so users can have multiple chat sessions and resume them.

**Files to Modify**:
- `packages/@blueprintdata/gateway/src/index.ts`
- `packages/@blueprintdata/database/src/schema.ts`

**Implementation**:
1. Create new session on first message
2. Associate messages with session ID
3. Allow listing past sessions
4. Allow resuming a session
5. Display session title/preview in UI

**Acceptance Criteria**:
- [ ] New sessions created automatically
- [ ] Messages associated with sessions
- [ ] Can list sessions via API
- [ ] Can resume a session
- [ ] Session metadata saved (title, created_at)
- [ ] UI shows session list

---

### Task 6.9: CLI Documentation

**Effort**: 0.5 days
**Priority**: Medium
**Dependencies**: All Phase 6 tasks

**Description**:
Update documentation for the chat command.

**Files to Modify**:
- `docs/features/ANALYTICS.md`
- `README.md`

**Implementation**:
1. Document `analytics chat` command
2. Document `analytics db-init` command
3. Add troubleshooting section
4. Update examples
5. Add screenshots (if available)

**Acceptance Criteria**:
- [ ] Documentation is complete
- [ ] Usage examples included
- [ ] Troubleshooting section added
- [ ] Clear for new users

---

### Task 6.10: End-to-End Testing

**Effort**: 1 day
**Priority**: High
**Dependencies**: All Phase 6 tasks

**Description**:
Manual testing of the complete chat flow.

**Test Cases**:
1. Fresh initialization → chat works
2. Resume session → history loads
3. Query execution → results displayed
4. Context search → relevant info returned
5. Chart generation → chart renders
6. Error handling → errors displayed
7. Authentication → login required
8. Multiple users → isolation works

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] User experience smooth
- [ ] Documentation accurate

---

## Phase 7: Testing & Polish

**Goal**: Comprehensive testing, error handling, performance optimization, and documentation.

**Estimated Duration**: 2-3 weeks (10-15 work days)

---

### Task 7.1: Unit Tests for Auth Package

**Effort**: 1 day
**Priority**: High
**Dependencies**: None

**Description**:
Write comprehensive unit tests for the auth package.

**Files to Create**:
- `packages/@blueprintdata/auth/src/__tests__/PasswordHasher.test.ts`
- `packages/@blueprintdata/auth/src/__tests__/TokenManager.test.ts`
- `packages/@blueprintdata/auth/src/__tests__/AuthService.test.ts`

**Tests to Write**:

**PasswordHasher**:
- [ ] `hash()` creates valid bcrypt hash
- [ ] `verify()` validates correct password
- [ ] `verify()` rejects incorrect password
- [ ] Hash is different each time

**TokenManager**:
- [ ] `generate()` creates valid JWT
- [ ] `verify()` validates correct token
- [ ] `verify()` rejects expired token
- [ ] `verify()` rejects invalid signature
- [ ] Payload contains user ID

**AuthService**:
- [ ] `register()` creates user
- [ ] `register()` rejects duplicate username
- [ ] `register()` validates password strength
- [ ] `login()` returns token for valid credentials
- [ ] `login()` rejects invalid credentials
- [ ] `logout()` invalidates token

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] 80%+ coverage for auth package
- [ ] Mocks used for database

---

### Task 7.2: Unit Tests for Agent Tools

**Effort**: 2 days
**Priority**: High
**Dependencies**: None

**Description**:
Write unit tests for all agent tools.

**Files to Create**:
- `packages/@blueprintdata/analytics/src/tools/__tests__/QueryTool.test.ts`
- `packages/@blueprintdata/analytics/src/tools/__tests__/ContextSearchTool.test.ts`
- `packages/@blueprintdata/analytics/src/tools/__tests__/ChartTool.test.ts`

**Tests to Write**:

**QueryTool**:
- [ ] Executes SELECT query successfully
- [ ] Blocks INSERT/UPDATE/DELETE
- [ ] Blocks DDL statements
- [ ] Respects row limit
- [ ] Respects timeout
- [ ] Returns formatted results
- [ ] Handles warehouse errors

**ContextSearchTool**:
- [ ] Searches across all context files
- [ ] Returns relevant excerpts
- [ ] Handles missing context directory
- [ ] Fuzzy matching works
- [ ] Returns top N results

**ChartTool**:
- [ ] Generates line chart config
- [ ] Generates bar chart config
- [ ] Generates pie chart config
- [ ] Validates input data
- [ ] Handles edge cases

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] 75%+ coverage for tools
- [ ] Mock warehouse connector used

---

### Task 7.3: Integration Tests for WebSocket Communication

**Effort**: 2 days
**Priority**: High
**Dependencies**: None

**Description**:
Write integration tests for WebSocket communication between client and gateway.

**Files to Create**:
- `apps/cli/src/__tests__/integration/websocket.test.ts`

**Tests to Write**:
- [ ] Client can connect to gateway
- [ ] JWT authentication works
- [ ] Invalid token rejected
- [ ] Chat messages sent/received
- [ ] Tool calls execute correctly
- [ ] Tool results returned
- [ ] Errors propagated to client
- [ ] Multiple clients isolated
- [ ] Heartbeat/ping-pong works
- [ ] Reconnection works

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Tests use real WebSocket
- [ ] Tests use test database
- [ ] Cleanup after tests

---

### Task 7.4: End-to-End Tests for Chat Flow

**Effort**: 2 days
**Priority**: High
**Dependencies**: None

**Description**:
Write end-to-end tests for the complete chat experience.

**Files to Create**:
- `apps/cli/src/__tests__/e2e/chat-flow.test.ts`

**Tests to Write**:
- [ ] User registration → login → chat
- [ ] Send message → receive response
- [ ] Execute query → see results
- [ ] Generate chart → render chart
- [ ] Search context → find info
- [ ] Create session → resume session
- [ ] Multiple sessions work
- [ ] Logout → can't access chat

**Acceptance Criteria**:
- [ ] All tests pass
- [ ] Tests spawn real processes
- [ ] Tests use test database
- [ ] Tests clean up after

---

### Task 7.5: Error Handling Improvements

**Effort**: 2 days
**Priority**: High
**Dependencies**: Tasks 7.1-7.4

**Description**:
Improve error handling throughout the system based on test findings.

**Areas to Improve**:
1. **Gateway**: Handle WebSocket errors gracefully
2. **Agent**: Retry failed tool executions
3. **Database**: Handle connection errors
4. **Warehouse**: Handle query timeouts
5. **LLM**: Handle API rate limits

**Files to Modify**:
- `packages/@blueprintdata/gateway/src/index.ts`
- `packages/@blueprintdata/analytics/src/agent/AgentService.ts`
- `packages/@blueprintdata/database/src/db.ts`
- `packages/@blueprintdata/warehouse/src/*.ts`
- `packages/@blueprintdata/analytics/src/llm/client.ts`

**Acceptance Criteria**:
- [ ] All errors have clear messages
- [ ] Errors logged appropriately
- [ ] User-facing errors are friendly
- [ ] Retry logic for transient failures
- [ ] Graceful degradation where possible

---

### Task 7.6: Performance Optimization

**Effort**: 2 days
**Priority**: Medium
**Dependencies**: Tasks 7.1-7.4

**Description**:
Optimize performance based on profiling and benchmarks.

**Optimization Areas**:
1. **Query Execution**: Add query result caching
2. **Context Search**: Index context files for faster search
3. **LLM Calls**: Cache common responses
4. **Database Queries**: Add indexes, optimize queries
5. **WebSocket**: Reduce message payload sizes

**Files to Modify**:
- `packages/@blueprintdata/analytics/src/tools/implementations/QueryTool.ts`
- `packages/@blueprintdata/analytics/src/tools/implementations/ContextSearchTool.ts`
- `packages/@blueprintdata/analytics/src/llm/client.ts`
- `packages/@blueprintdata/database/src/schema.ts`
- `packages/@blueprintdata/gateway/src/index.ts`

**Benchmarks**:
- [ ] Query execution: < 3 seconds (p95)
- [ ] Context search: < 1 second
- [ ] LLM response: < 5 seconds (p95)
- [ ] WebSocket latency: < 100ms

**Acceptance Criteria**:
- [ ] All benchmarks met
- [ ] No performance regressions
- [ ] Profiling data collected
- [ ] Optimization documented

---

### Task 7.7: Documentation Improvements

**Effort**: 2 days
**Priority**: High
**Dependencies**: All Phase 7 tasks

**Description**:
Update all documentation based on testing findings and user feedback.

**Files to Update**:
- `README.md`
- `docs/features/ANALYTICS.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/PUBLISHING.md`

**Updates Needed**:
1. Add troubleshooting sections
2. Update examples with real output
3. Add screenshots/GIFs
4. Document common errors
5. Update API references
6. Add FAQ section
7. Update architecture diagrams

**Acceptance Criteria**:
- [ ] All docs reviewed and updated
- [ ] No outdated information
- [ ] Examples are accurate
- [ ] Screenshots added
- [ ] FAQ covers common issues

---

### Task 7.8: User Experience Refinements

**Effort**: 2 days
**Priority**: Medium
**Dependencies**: Tasks 7.1-7.6

**Description**:
Polish the user experience based on feedback.

**Refinements**:
1. **CLI Messages**: Improve status messages
2. **Error Messages**: Make errors actionable
3. **Loading States**: Add progress indicators
4. **Web UI**: Polish chat interface
5. **Onboarding**: Improve first-time experience

**Files to Modify**:
- `apps/cli/src/commands/analytics/*.ts`
- `apps/web/src/features/chat/components/*.tsx`
- `apps/web/src/features/auth/components/*.tsx`

**Acceptance Criteria**:
- [ ] User feedback incorporated
- [ ] Loading states everywhere
- [ ] Error messages are helpful
- [ ] First-time experience smooth
- [ ] UI polish applied

---

### Task 7.9: Release Preparation

**Effort**: 1 day
**Priority**: Critical
**Dependencies**: All Phase 7 tasks

**Description**:
Prepare for the 1.0.0 release.

**Checklist**:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] Version bumped to 1.0.0
- [ ] Release notes drafted
- [ ] Migration guide (if needed)
- [ ] Breaking changes documented
- [ ] Security review complete

**Files to Update**:
- `CHANGELOG.md`
- `package.json` (version)
- Release notes (GitHub)

**Acceptance Criteria**:
- [ ] Release checklist complete
- [ ] Ready to publish to NPM
- [ ] Announcement ready

---

### Task 7.10: Beta Testing & Feedback Collection

**Effort**: 1 week (ongoing)
**Priority**: High
**Dependencies**: Tasks 7.1-7.8

**Description**:
Conduct beta testing with early users and collect feedback.

**Activities**:
1. Recruit 10+ beta testers
2. Provide test accounts/projects
3. Collect feedback via surveys
4. Monitor error logs
5. Hold feedback sessions
6. Prioritize issues

**Feedback Areas**:
- Ease of setup
- Feature completeness
- Performance
- Documentation quality
- Bug reports
- Feature requests

**Acceptance Criteria**:
- [ ] 10+ beta users onboarded
- [ ] Feedback collected and categorized
- [ ] Critical issues fixed
- [ ] User satisfaction > 80%

---

## Post-MVP: Enhanced Analytics

**Goal**: Extend agent capabilities with advanced features.

---

### Task EA.1: Data Quality Tool

**Effort**: 2 days
**Priority**: High
**Dependencies**: Phase 7 complete

**Description**:
Add a tool for checking data quality (nulls, duplicates, anomalies).

**Files to Create**:
- `packages/@blueprintdata/analytics/src/tools/implementations/DataQualityTool.ts`
- `packages/@blueprintdata/analytics/src/tools/implementations/__tests__/DataQualityTool.test.ts`

**Tool Capabilities**:
- Check null percentages by column
- Detect duplicate rows
- Find outliers/anomalies
- Check for referential integrity
- Validate against expectations

**Acceptance Criteria**:
- [ ] Tool registered with agent
- [ ] Returns quality report
- [ ] Unit tests pass
- [ ] Documentation added

---

### Task EA.2: Lineage Visualization Tool

**Effort**: 3 days
**Priority**: Medium
**Dependencies**: Phase 7 complete

**Description**:
Add a tool to generate interactive lineage visualizations.

**Files to Create**:
- `packages/@blueprintdata/analytics/src/tools/implementations/LineageTool.ts`
- `apps/web/src/features/chat/components/LineageVisualization.tsx`

**Implementation**:
1. Parse dbt model refs and sources
2. Build dependency graph
3. Generate D3.js or Mermaid diagram
4. Render in chat UI
5. Allow zooming/panning

**Acceptance Criteria**:
- [ ] Generates lineage graph
- [ ] Interactive visualization
- [ ] Handles large graphs
- [ ] Documentation added

---

### Task EA.3: Snowflake Connector

**Effort**: 3 days
**Priority**: High
**Dependencies**: Phase 7 complete

**Description**:
Add support for Snowflake data warehouse.

**Files to Create**:
- `packages/@blueprintdata/warehouse/src/SnowflakeConnector.ts`
- `packages/@blueprintdata/warehouse/src/__tests__/SnowflakeConnector.test.ts`

**Implementation**:
1. Extend `BaseWarehouseConnector`
2. Implement Snowflake-specific methods
3. Handle authentication (key pair, password, OAuth)
4. Test connection
5. Add to factory

**Acceptance Criteria**:
- [ ] Snowflake connector works
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Init command supports Snowflake

---

### Task EA.4: Auto-Sync on File Changes

**Effort**: 2 days
**Priority**: Medium
**Dependencies**: Phase 7 complete

**Description**:
Watch for dbt file changes and automatically sync context.

**Files to Create**:
- `apps/cli/src/services/analytics/WatchService.ts`
- `apps/cli/src/commands/analytics/watch.ts`

**Implementation**:
1. Use `chokidar` to watch dbt files
2. Debounce changes (wait for batch)
3. Trigger sync automatically
4. Report status to user
5. Optional: notify chat users

**Acceptance Criteria**:
- [ ] Watches dbt directory
- [ ] Syncs on changes
- [ ] Debouncing works
- [ ] Can disable auto-sync

---

## Post-MVP: Collaboration Features

**Goal**: Enable team collaboration.

---

### Task CF.1: Slack Bot Setup

**Effort**: 3 days
**Priority**: High
**Dependencies**: Phase 7 complete

**Description**:
Create a Slack bot that allows asking questions in Slack channels.

**Files to Create**:
- `packages/@blueprintdata/slack/` (new package)
- `packages/@blueprintdata/slack/src/SlackBot.ts`

**Implementation**:
1. Set up Slack app with Bot token
2. Listen for mentions
3. Forward questions to agent
4. Post responses in thread
5. Handle authentication

**Acceptance Criteria**:
- [ ] Slack bot responds to mentions
- [ ] Answers questions correctly
- [ ] Threads conversations
- [ ] Documentation for setup

---

### Task CF.2: Multi-User Database Schema

**Effort**: 2 days
**Priority**: High
**Dependencies**: Phase 7 complete

**Description**:
Migrate from SQLite to PostgreSQL for multi-user support.

**Files to Modify**:
- `packages/@blueprintdata/database/src/schema.ts`
- `packages/@blueprintdata/database/src/db.ts`

**Schema Changes**:
- Add `organizations` table
- Add `teams` table
- Add `memberships` table
- Update foreign keys
- Add indexes

**Acceptance Criteria**:
- [ ] PostgreSQL support added
- [ ] Migration from SQLite works
- [ ] Multi-tenancy supported
- [ ] Documentation updated

---

### Task CF.3: Role-Based Access Control

**Effort**: 3 days
**Priority**: High
**Dependencies**: Task CF.2

**Description**:
Implement RBAC for different user roles.

**Roles**:
- Admin: Full access
- Analyst: Can query, search, view
- Viewer: Read-only access

**Files to Modify**:
- `packages/@blueprintdata/auth/src/types.ts`
- `packages/@blueprintdata/auth/src/AuthService.ts`
- `packages/@blueprintdata/gateway/src/index.ts`

**Acceptance Criteria**:
- [ ] Roles defined
- [ ] Permissions enforced
- [ ] Tools respect permissions
- [ ] Tests cover RBAC

---

### Task CF.4: Shared Sessions

**Effort**: 2 days
**Priority**: Medium
**Dependencies**: Task CF.2

**Description**:
Allow multiple users to collaborate in same chat session.

**Files to Modify**:
- `packages/@blueprintdata/gateway/src/index.ts`
- `packages/@blueprintdata/database/src/schema.ts`

**Implementation**:
1. Add session sharing
2. Broadcast messages to all participants
3. Show participant list
4. Typing indicators

**Acceptance Criteria**:
- [ ] Users can join sessions
- [ ] Messages broadcast to all
- [ ] Participant list shown
- [ ] Real-time updates

---

## Task Estimation Summary

### Phase 6: CLI Integration
- **Total Effort**: 10-12 days
- **Critical Path**: Tasks 6.1 → 6.2 → 6.3 → 6.5

### Phase 7: Testing & Polish
- **Total Effort**: 15-20 days
- **Critical Path**: Tasks 7.1-7.4 → 7.5 → 7.7 → 7.9

### Post-MVP Features
- **Enhanced Analytics**: 15-20 days
- **Collaboration Features**: 15-20 days

---

## Notes

- All effort estimates are for 1 developer
- Estimates assume familiarity with codebase
- Testing time included in estimates
- Documentation time included in estimates
- Buffer recommended for unexpected issues

---

**Last Updated**: 2026-01-29
