/**
 * Runners Component - Manage and execute saved/temporary runners
 * Part of unified runner architecture (Phase 3)
 */

class RunnersManager {
  constructor() {
    this.runners = [];
    this.selectedRunner = null;
    this.refreshInterval = null;
    this.runningRunners = new Set(); // Track which runners are currently executing
    this.isCreatingRunner = false; // Prevent duplicate runner creation
    
    // Pagination state
    this.currentPage = 1;
    this.perPage = 50;
    this.totalCount = 0;
    this.searchQuery = "";
    this.searchTimeout = null;
  }

  async initialize() {
    console.log("[Runners] Initializing runners manager...");

    // Ensure runner tables exist (for databases created before runner feature)
    try {
      const response = await chrome.runtime.sendMessage({
        action: "ensureRunnerTables",
      });
      if (response && response.success) {
        console.log("[Runners] " + response.message);
      }
    } catch (error) {
      console.warn("[Runners] Could not ensure tables:", error);
    }

    // Setup event listeners
    this.setupEventListeners();

    // Load runners
    await this.loadRunners();

    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => this.loadRunners(), 30000);
  }

  setupEventListeners() {
    // Create new runner button
    const btnCreateRunner = document.getElementById("btnCreateRunner");
    if (btnCreateRunner) {
      btnCreateRunner.addEventListener("click", () =>
        this.showCreateRunnerModal()
      );
    }

    // Refresh button
    const btnRefreshRunners = document.getElementById("btnRefreshRunners");
    if (btnRefreshRunners) {
      btnRefreshRunners.addEventListener("click", () => this.loadRunners());
    }

    // Search/filter
    const runnerSearch = document.getElementById("runnerSearch");
    if (runnerSearch) {
      runnerSearch.addEventListener("input", (e) => {
        // Debounce search - wait 300ms after user stops typing
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          this.currentPage = 1; // Reset to first page on new search
          this.loadRunners(1);
        }, 300);
      });
    }

    const runnerTypeFilter = document.getElementById("runnerTypeFilter");
    if (runnerTypeFilter) {
      runnerTypeFilter.addEventListener("change", () => this.filterRunners());
    }

    // Event delegation for runner action buttons
    const runnersGrid = document.getElementById("runnersGrid");
    if (runnersGrid) {
      runnersGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".runner-action-btn");
        if (!btn) return;

        const action = btn.dataset.action;
        const runnerId = btn.dataset.runnerId;

        if (!action || !runnerId) return;

        switch (action) {
          case "run":
            this.runRunner(runnerId);
            break;
          case "view":
            this.showRunnerDetails(runnerId);
            break;
          case "more":
            this.showRunnerMenu(e, runnerId);
            break;
        }
      });
    }

    // Event delegation for modal close buttons
    document.addEventListener("click", (e) => {
      // Close modal when clicking X button or Close button
      if (
        e.target.closest(".modal-close") ||
        e.target.closest(".close-modal-btn")
      ) {
        const modal = e.target.closest(".modal");
        if (modal) {
          modal.style.display = "none";
        }
      }

      // Close modal when clicking outside modal content
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
      }

      // Handle view results button clicks
      const viewResultsBtn = e.target.closest(".view-results-btn");
      if (viewResultsBtn) {
        const executionId = viewResultsBtn.dataset.executionId;
        if (executionId) {
          this.showExecutionResults(executionId);
        }
      }

      // Handle convert to saved button clicks
      const convertBtn = e.target.closest(".convert-to-saved-btn");
      if (convertBtn) {
        const runnerId = convertBtn.dataset.runnerId;
        if (runnerId) {
          this.convertToSaved(runnerId);
        }
      }
    });
  }

  async loadRunners(page = 1) {
    const runnersGrid = document.getElementById("runnersGrid");
    this.currentPage = page;

    try {
      // Show loading state
      if (runnersGrid) {
        runnersGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-color);"></i>
            <p style="margin-top: 12px; color: var(--text-secondary);">Loading runners...</p>
          </div>
        `;
      }

      const offset = (page - 1) * this.perPage;
      const response = await chrome.runtime.sendMessage({
        action: "getAllRunners",
        offset: offset,
        limit: this.perPage,
        searchQuery: this.searchQuery || null
      });

      if (response && response.success) {
        this.runners = response.runners || [];
        this.totalCount = response.totalCount || 0;
        this.renderRunners();
        this.renderPagination();
      } else {
        // Show error in grid
        if (runnersGrid) {
          runnersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
              <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: var(--error-color);"></i>
              <p style="margin-top: 12px; color: var(--error-color);">
                Failed to load runners: ${response?.error || "Unknown error"}
              </p>
              <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                Use the refresh button above to try again
              </p>
            </div>
          `;
        }
        this.showToast(
          "Failed to load runners: " + (response?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error loading runners:", error);

      // Show error in grid
      if (runnersGrid) {
        runnersGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: var(--error-color);"></i>
            <p style="margin-top: 12px; color: var(--error-color);">
              Error loading runners: ${error.message}
            </p>
            <p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
              Use the refresh button above to try again
            </p>
          </div>
        `;
      }

      this.showToast("Error loading runners: " + error.message, "error");
    }
  }

  renderPagination() {
    const container = document.getElementById("runnersPagination");
    if (!container) return;

    // No items
    if (this.totalCount === 0) {
      container.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.perPage);

    // Single page
    if (totalPages <= 1) {
      container.innerHTML = `
        <span class="pagination-info">
          Showing ${this.totalCount} runner${this.totalCount !== 1 ? "s" : ""}
        </span>
      `;
      return;
    }

    // Multiple pages - build pagination UI
    let html = `
      <span class="pagination-info">
        Page ${this.currentPage} of ${totalPages} (${this.totalCount} total)
      </span>
      <div class="pagination-buttons">
    `;

    // Previous button
    if (this.currentPage > 1) {
      html += `
        <button class="pagination-btn" data-page="${this.currentPage - 1}" title="Previous page">
          <i class="fas fa-chevron-left"></i>
        </button>
      `;
    }

    // Page numbers
    const pages = new Set();
    pages.add(1);
    if (this.currentPage > 1) pages.add(this.currentPage - 1);
    pages.add(this.currentPage);
    if (this.currentPage < totalPages) pages.add(this.currentPage + 1);
    pages.add(totalPages);

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    let lastPage = 0;

    sortedPages.forEach((p) => {
      if (lastPage && p - lastPage > 1) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
      const activeClass = p === this.currentPage ? "active" : "";
      html += `
        <button class="pagination-btn ${activeClass}" data-page="${p}" title="Go to page ${p}">
          ${p}
        </button>
      `;
      lastPage = p;
    });

    // Next button
    if (this.currentPage < totalPages) {
      html += `
        <button class="pagination-btn" data-page="${this.currentPage + 1}" title="Next page">
          <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }

    html += "</div>";
    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll(".pagination-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page);
        if (page && page !== this.currentPage) {
          this.loadRunners(page);
        }
      });
    });
  }

  renderRunners() {
    const runnersGrid = document.getElementById("runnersGrid");
    if (!runnersGrid) return;

    console.log(
      `[Runners] Rendering ${this.runners.length} runners:`,
      this.runners.map((r) => ({
        id: r.id,
        name: r.name,
        requests: r.total_requests,
      }))
    );

    if (this.runners.length === 0) {
      runnersGrid.innerHTML = `
        <div style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        ">
          <i class="fas fa-play-circle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
          <h3 style="margin: 0 0 8px 0;">No Runners Yet</h3>
          <p style="margin: 0;">Create your first runner using the "+ New Runner" button above.</p>
        </div>
      `;
      return;
    }

    // Group runners by type
    const permanent = this.runners.filter((r) => !r.is_temporary);
    const temporary = this.runners.filter((r) => r.is_temporary);

    let html = "";

    // Permanent runners section
    if (permanent.length > 0) {
      html += `
        <div style="grid-column: 1 / -1; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">
            <i class="fas fa-bookmark"></i> Saved Runners (${permanent.length})
          </h3>
        </div>
      `;
      permanent.forEach((runner) => {
        html += this.renderRunnerCard(runner);
      });
    }

    // Temporary runners section
    if (temporary.length > 0) {
      html += `
        <div style="grid-column: 1 / -1; margin: 24px 0 12px 0;">
          <h3 style="margin: 0; font-size: 16px; color: var(--text-secondary);">
            <i class="fas fa-clock"></i> Recent Quick Runs (${temporary.length})
            <span style="font-size: 12px; font-weight: normal; margin-left: 8px;">Auto-deleted after 7 days</span>
          </h3>
        </div>
      `;
      temporary.forEach((runner) => {
        html += this.renderRunnerCard(runner);
      });
    }

    runnersGrid.innerHTML = html;
  }

  renderRunnerCard(runner) {
    const lastRun = runner.last_run_at
      ? new Date(runner.last_run_at).toLocaleString()
      : "Never";

    const successRate =
      runner.run_count > 0
        ? Math.round(
            (runner.total_success /
              (runner.run_count * runner.total_requests)) *
              100
          )
        : 0;

    const isTemporary = runner.is_temporary;
    const badge = isTemporary
      ? '<span class="runner-badge temporary">Quick Run</span>'
      : '<span class="runner-badge permanent">Saved</span>';

    // Check if this runner is currently executing (with safety check)
    if (!this.runningRunners) {
      this.runningRunners = new Set();
    }
    const isRunning = this.runningRunners.has(runner.id);
    const runButtonClass = isRunning
      ? "runner-action-btn running"
      : "runner-action-btn";
    const runButtonIcon = isRunning ? "fa-spinner fa-spin" : "fa-play";
    const runButtonTitle = isRunning ? "Running..." : "Run Now";
    const runButtonDisabled = isRunning ? "disabled" : "";

    return `
      <div class="runner-card ${
        isRunning ? "runner-executing" : ""
      }" data-runner-id="${runner.id}">
        <div class="runner-card-header">
          <div>
            <h4 class="runner-card-title">
              <i class="fas ${
                isRunning ? "fa-sync fa-spin" : "fa-play-circle"
              }"></i>
              ${this.escapeHtml(runner.name)}
            </h4>
            ${badge}
            ${
              isRunning
                ? '<span class="runner-badge status">Running...</span>'
                : ""
            }
          </div>
          <div class="runner-card-actions">
            <button 
              class="icon-btn ${runButtonClass}" 
              title="${runButtonTitle}"
              data-action="run"
              data-runner-id="${runner.id}"
              ${runButtonDisabled}
            >
              <i class="fas ${runButtonIcon}"></i>
            </button>
            <button 
              class="icon-btn runner-action-btn" 
              title="View Details"
              data-action="view"
              data-runner-id="${runner.id}"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              class="icon-btn runner-action-btn" 
              title="More Actions"
              data-action="more"
              data-runner-id="${runner.id}"
            >
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>
        
        ${
          runner.description
            ? `
          <p class="runner-card-description">${this.escapeHtml(
            runner.description
          )}</p>
        `
            : ""
        }
        
        <div class="runner-card-stats">
          <div class="runner-stat">
            <i class="fas fa-list"></i>
            <span>${runner.total_requests || 0} requests</span>
          </div>
          <div class="runner-stat">
            <i class="fas fa-history"></i>
            <span>${runner.run_count || 0} executions</span>
          </div>
          <div class="runner-stat">
            <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
            <span>${successRate}% success</span>
          </div>
        </div>
        
        <div class="runner-card-footer">
          <span class="runner-last-run">
            <i class="fas fa-clock"></i> Last run: ${lastRun}
          </span>
          ${
            isTemporary
              ? `
            <button 
              class="link-btn convert-to-saved-btn" 
              data-runner-id="${runner.id}"
              title="Save this runner permanently"
            >
              <i class="fas fa-save"></i> Save
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  async runRunner(runnerId) {
    try {
      // Ensure runningRunners is initialized
      if (!this.runningRunners) {
        this.runningRunners = new Set();
      }

      // Mark as running
      this.runningRunners.add(runnerId);
      this.updateRunnerCardState(runnerId);

      this.showToast("Starting runner...", "info");

      const response = await chrome.runtime.sendMessage({
        action: "runRunner",
        runnerId,
      });

      if (response && response.success) {
        this.showToast("Runner completed successfully!", "success");
      } else {
        this.showToast(
          "Runner failed: " + (response?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error running runner:", error);
      this.showToast("Error running runner", "error");
    } finally {
      // Remove from running state
      this.runningRunners.delete(runnerId);
      this.updateRunnerCardState(runnerId);

      // Reload runners to update stats
      setTimeout(() => this.loadRunners(), 1000);
    }
  }

  // Update individual runner card state without full reload
  updateRunnerCardState(runnerId) {
    // Ensure runningRunners is initialized
    if (!this.runningRunners) {
      this.runningRunners = new Set();
    }

    const card = document.querySelector(`[data-runner-id="${runnerId}"]`);
    if (!card) return;

    const isRunning = this.runningRunners.has(runnerId);
    const runButton = card.querySelector('[data-action="run"]');
    const titleIcon = card.querySelector(".runner-card-title i");
    const statusBadge = card.querySelector(".runner-badge.status");

    if (isRunning) {
      // Update to running state
      card.classList.add("runner-executing");
      if (runButton) {
        runButton.classList.add("running");
        runButton.disabled = true;
        runButton.title = "Running...";
        const icon = runButton.querySelector("i");
        if (icon) {
          icon.className = "fas fa-spinner fa-spin";
        }
      }
      if (titleIcon) {
        titleIcon.className = "fas fa-sync fa-spin";
      }
      // Add status badge if it doesn't exist
      if (!statusBadge) {
        const badgeContainer = card.querySelector(".runner-card-header > div");
        if (badgeContainer) {
          const badge = document.createElement("span");
          badge.className = "runner-badge status";
          badge.textContent = "Running...";
          badgeContainer.appendChild(badge);
        }
      }
    } else {
      // Update to idle state
      card.classList.remove("runner-executing");
      if (runButton) {
        runButton.classList.remove("running");
        runButton.disabled = false;
        runButton.title = "Run Now";
        const icon = runButton.querySelector("i");
        if (icon) {
          icon.className = "fas fa-play";
        }
      }
      if (titleIcon) {
        titleIcon.className = "fas fa-play-circle";
      }
      // Remove status badge
      if (statusBadge) {
        statusBadge.remove();
      }
    }
  }

  async showRunnerDetails(runnerId) {
    try {
      // Load runner definition and execution history
      const [defResponse, historyResponse] = await Promise.all([
        chrome.runtime.sendMessage({
          action: "getRunnerDefinition",
          runnerId,
        }),
        chrome.runtime.sendMessage({
          action: "getRunnerHistory",
          runnerId,
          limit: 10,
        }),
      ]);

      if (!defResponse?.success || !historyResponse?.success) {
        this.showToast("Failed to load runner details", "error");
        return;
      }

      const runner = defResponse.runner;
      const executions = historyResponse.executions || [];

      // Show details modal
      this.renderRunnerDetailsModal(runner, executions);
      document.getElementById("runnerDetailsModal").style.display = "flex";
    } catch (error) {
      console.error("[Runners] Error loading runner details:", error);
      this.showToast("Error loading details", "error");
    }
  }

  renderRunnerDetailsModal(runner, executions) {
    const modal = document.getElementById("runnerDetailsModal");
    if (!modal) return;

    const executionsHtml =
      executions.length > 0
        ? executions
            .map(
              (exec) => `
          <tr>
            <td>${new Date(exec.start_time).toLocaleString()}</td>
            <td>
              <span class="status-badge status-${exec.status}">${
                exec.status
              }</span>
            </td>
            <td>${
              exec.duration ? (exec.duration / 1000).toFixed(2) + "s" : "N/A"
            }</td>
            <td>${exec.success_count || 0} / ${exec.total_requests || 0}</td>
            <td>
              <button 
                class="link-btn view-results-btn" 
                data-execution-id="${exec.id}"
              >
                <i class="fas fa-list"></i> View Results
              </button>
            </td>
          </tr>
        `
            )
            .join("")
        : '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No executions yet</td></tr>';

    // Parse variables if they're stored as JSON string
    let variables = [];
    if (runner.variables) {
      try {
        variables = typeof runner.variables === 'string' 
          ? JSON.parse(runner.variables) 
          : runner.variables;
      } catch (e) {
        console.warn('[Runners] Failed to parse variables:', e);
      }
    }

    // Build variables section HTML
    const variablesHtml = variables.length > 0
      ? `
        <div class="details-section">
          <h3><i class="fas fa-code"></i> Variables in Use (${variables.length})</h3>
          <div class="variables-list">
            ${variables.map(variable => `
              <div class="variable-item">
                <div class="variable-name">
                  <i class="fas fa-dollar-sign"></i>
                  <code>{{${this.escapeHtml(variable.name)}}}</code>
                </div>
                <div class="variable-value">
                  <span class="value-preview">${this.escapeHtml(variable.value || '(not set)')}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <style>
            .variables-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
              margin-top: 12px;
            }
            .variable-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background: var(--surface-color);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              gap: 16px;
            }
            .variable-name {
              display: flex;
              align-items: center;
              gap: 8px;
              font-weight: 500;
              color: var(--text-primary);
            }
            .variable-name i {
              color: var(--primary-color);
              font-size: 12px;
            }
            .variable-name code {
              background: var(--background-color);
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 13px;
              color: var(--primary-color);
            }
            .variable-value {
              flex: 1;
              text-align: right;
            }
            .value-preview {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: var(--text-secondary);
              padding: 4px 8px;
              background: var(--background-color);
              border-radius: 4px;
              max-width: 300px;
              display: inline-block;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>
        </div>
      `
      : '';

    const modalContent = modal.querySelector(".modal-body");
    modalContent.innerHTML = `
      <div class="runner-details">
        <div class="details-section">
          <h3><i class="fas fa-info-circle"></i> Runner Information</h3>
          <table class="details-table">
            <tr>
              <th>Name:</th>
              <td>${this.escapeHtml(runner.name)}</td>
            </tr>
            ${
              runner.description
                ? `
              <tr>
                <th>Description:</th>
                <td>${this.escapeHtml(runner.description)}</td>
              </tr>
            `
                : ""
            }
            <tr>
              <th>Type:</th>
              <td>${
                runner.is_temporary
                  ? '<span class="runner-badge temporary">Quick Run</span>'
                  : '<span class="runner-badge permanent">Saved</span>'
              }</td>
            </tr>
            <tr>
              <th>Execution Mode:</th>
              <td>${runner.execution_mode}</td>
            </tr>
            <tr>
              <th>Total Requests:</th>
              <td>${runner.total_requests || 0}</td>
            </tr>
            ${variables.length > 0 ? `
            <tr>
              <th>Variables:</th>
              <td>
                <span class="badge" style="background: var(--info-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                  ${variables.length} variable${variables.length !== 1 ? 's' : ''}
                </span>
              </td>
            </tr>
            ` : ''}
            <tr>
              <th>Total Runs:</th>
              <td>${runner.run_count || 0}</td>
            </tr>
            <tr>
              <th>Created:</th>
              <td>${new Date(runner.created_at).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        ${variablesHtml}

        <div class="details-section">
          <h3><i class="fas fa-history"></i> Execution History</h3>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Success</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${executionsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  async showExecutionResults(executionId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getExecutionResults",
        executionId,
      });

      if (!response?.success) {
        this.showToast("Failed to load execution results", "error");
        return;
      }

      const results = response.results || [];

      // Show results in a new modal or expand section
      alert(
        `Execution Results:\n\n${results.length} results loaded\n\nTODO: Implement results view UI`
      );
    } catch (error) {
      console.error("[Runners] Error loading execution results:", error);
      this.showToast("Error loading results", "error");
    }
  }

  async convertToSaved(runnerId) {
    if (!confirm("Convert this quick run to a permanent saved runner?")) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: "convertToSavedRunner",
        runnerId,
      });

      if (response && response.success) {
        this.showToast("Runner saved successfully!", "success");
        await this.loadRunners();
      } else {
        this.showToast(
          "Failed to save runner: " + (response?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error converting runner:", error);
      this.showToast("Error saving runner", "error");
    }
  }

  async deleteRunner(runnerId) {
    if (
      !confirm(
        "Are you sure you want to delete this runner? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: "deleteRunner",
        runnerId,
      });

      if (response && response.success) {
        this.showToast("Runner deleted successfully!", "success");
        await this.loadRunners();
      } else {
        this.showToast(
          "Failed to delete runner: " + (response?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error deleting runner:", error);
      this.showToast("Error deleting runner", "error");
    }
  }

  async editRunner(runnerId) {
    try {
      // Get runner details
      const response = await chrome.runtime.sendMessage({
        action: "getRunnerDefinition",
        runnerId,
      });

      if (!response?.success) {
        this.showToast("Failed to load runner details", "error");
        return;
      }

      const runner = response.runner;
      const newName = prompt("Runner Name:", runner.name);

      if (newName === null) return; // Cancelled
      if (!newName.trim()) {
        this.showToast("Name cannot be empty", "error");
        return;
      }

      const newDescription = prompt(
        "Description (optional):",
        runner.description || ""
      );

      // Update runner
      const updateResponse = await chrome.runtime.sendMessage({
        action: "updateRunnerMetadata",
        runnerId,
        name: newName.trim(),
        description: newDescription?.trim() || null,
      });

      if (updateResponse?.success) {
        this.showToast("Runner updated successfully!", "success");
        await this.loadRunners();
      } else {
        this.showToast(
          "Failed to update runner: " +
            (updateResponse?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error editing runner:", error);
      this.showToast("Error updating runner", "error");
    }
  }

  async duplicateRunner(runnerId) {
    try {
      // Get runner definition and requests
      const response = await chrome.runtime.sendMessage({
        action: "getRunnerDefinition",
        runnerId,
      });

      if (!response?.success) {
        this.showToast("Failed to load runner", "error");
        return;
      }

      const runner = response.runner;
      const requests = response.requests || [];

      // Create duplicate with new ID and name
      const now = Date.now();
      const newRunnerId = `runner_${now}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const definition = {
        id: newRunnerId,
        name: `${runner.name} (Copy)`,
        description: runner.description,
        collection_id: runner.collection_id,
        execution_mode: runner.execution_mode,
        delay_ms: runner.delay_ms,
        follow_redirects: runner.follow_redirects,
        validate_status: runner.validate_status,
        use_variables: runner.use_variables,
        header_overrides: runner.header_overrides,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      const newRequests = requests.map((req, idx) => ({
        id: `${newRunnerId}_req_${idx}_${Math.random()
          .toString(36)
          .substr(2, 6)}`,
        runner_id: newRunnerId,
        sequence_order: req.sequence_order,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        domain: req.domain,
        page_url: req.page_url,
        captured_request_id: req.captured_request_id,
        assertions: req.assertions,
        description: req.description,
        is_enabled: req.is_enabled,
        created_at: now,
      }));

      const createResponse = await chrome.runtime.sendMessage({
        action: "createRunner",
        definition,
        requests: newRequests,
      });

      if (createResponse?.success) {
        this.showToast("Runner duplicated successfully!", "success");
        await this.loadRunners();
      } else {
        this.showToast(
          "Failed to duplicate runner: " +
            (createResponse?.error || "Unknown error"),
          "error"
        );
      }
    } catch (error) {
      console.error("[Runners] Error duplicating runner:", error);
      this.showToast("Error duplicating runner", "error");
    }
  }

  async exportRunner(runnerId) {
    try {
      // Get runner definition and requests
      const response = await chrome.runtime.sendMessage({
        action: "getRunnerDefinition",
        runnerId,
      });

      if (!response?.success) {
        this.showToast("Failed to load runner", "error");
        return;
      }

      const runner = response.runner;
      const requests = response.requests || [];

      // Create export data
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        runner: runner,
        requests: requests,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `runner_${runner.name.replace(
        /[^a-z0-9]/gi,
        "_"
      )}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast("Runner exported successfully!", "success");
    } catch (error) {
      console.error("[Runners] Error exporting runner:", error);
      this.showToast("Error exporting runner", "error");
    }
  }

  showRunnerMenu(event, runnerId) {
    event.stopPropagation();

    // Remove any existing menu
    const existingMenu = document.querySelector(".runner-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement("div");
    menu.className = "runner-context-menu";
    menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">
        <i class="fas fa-edit"></i> Edit Runner
      </div>
      <div class="context-menu-item" data-action="duplicate">
        <i class="fas fa-copy"></i> Duplicate
      </div>
      <div class="context-menu-item" data-action="export">
        <i class="fas fa-download"></i> Export
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" data-action="delete">
        <i class="fas fa-trash"></i> Delete
      </div>
    `;

    // Position menu near the button
    const rect = event.target.closest("button").getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left - 150}px`; // Align to right of button
    menu.style.zIndex = "10000";

    // Add click handlers
    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        const action = e.currentTarget.dataset.action;
        menu.remove();

        switch (action) {
          case "edit":
            await this.editRunner(runnerId);
            break;
          case "duplicate":
            await this.duplicateRunner(runnerId);
            break;
          case "export":
            await this.exportRunner(runnerId);
            break;
          case "delete":
            await this.deleteRunner(runnerId);
            break;
        }
      });
    });

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);

    document.body.appendChild(menu);
  }

  async showCreateRunnerModal() {
    const modal = document.getElementById("runnerWizardModal");
    if (!modal) return;

    // Reset wizard state
    this.wizardState = {
      currentStep: 1,
      selectedDomain: null,
      selectedPage: null,
      selectedType: null,
      selectedRequests: [],
      variables: [],
      config: {},
    };

    // Show modal and load domains
    modal.style.display = "block";
    this.updateWizardStep(1);
    await this.loadWizardDomains();

    // Setup event listeners (only once)
    if (!this.wizardListenersSetup) {
      this.setupWizardListeners();
      this.wizardListenersSetup = true;
    }
  }

  setupWizardListeners() {
    // Domain change
    document
      .getElementById("wizardDomainSelect")
      .addEventListener("change", async (e) => {
        this.wizardState.selectedDomain = e.target.value;
        this.wizardState.selectedPage = null;
        this.wizardState.selectedType = null;
        this.wizardState.selectedRequests = [];
        await this.loadWizardPages(e.target.value);
        await this.loadWizardRequests();
      });

    // Page change
    document
      .getElementById("wizardPageSelect")
      .addEventListener("change", async (e) => {
        this.wizardState.selectedPage = e.target.value;
        await this.loadWizardRequests();
      });

    // Type change
    document
      .getElementById("wizardTypeSelect")
      .addEventListener("change", async (e) => {
        this.wizardState.selectedType = e.target.value;
        await this.loadWizardRequests();
      });

    // Mode change (show/hide delay)
    document.getElementById("wizardMode").addEventListener("change", (e) => {
      const delayGroup = document.getElementById("wizardDelayGroup");
      delayGroup.style.display =
        e.target.value === "sequential" ? "block" : "none";
    });

    // Navigation buttons
    document.getElementById("wizardPrevBtn").addEventListener("click", () => {
      this.wizardPreviousStep();
    });

    document.getElementById("wizardNextBtn").addEventListener("click", () => {
      this.wizardNextStep();
    });

    document.getElementById("wizardCreateBtn").addEventListener("click", () => {
      this.createRunnerFromWizard();
    });

    // Add variable button
    document.getElementById("btnAddVariable").addEventListener("click", () => {
      this.addVariable();
    });

    // Cancel/Close
    const closeWizard = () => {
      document.getElementById("runnerWizardModal").style.display = "none";
      this.wizardState = null;
    };
    document
      .getElementById("wizardCancelBtn")
      .addEventListener("click", closeWizard);
    document
      .getElementById("closeRunnerWizard")
      .addEventListener("click", closeWizard);
  }

  async loadWizardDomains() {
    const select = document.getElementById("wizardDomainSelect");
    select.innerHTML = '<option value="">Loading...</option>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "getDomains",
        timeRange: 604800, // Last 7 days
      });

      if (
        response &&
        response.success &&
        response.domains &&
        response.domains.length > 0
      ) {
        select.innerHTML =
          '<option value="">Select a domain...</option>' +
          response.domains
            .map((domainObj) => {
              const domain = domainObj.domain;
              return `<option value="${domain}">${domain} (${domainObj.requestCount} requests)</option>`;
            })
            .join("");
      } else {
        select.innerHTML = '<option value="">No domains found</option>';
      }
    } catch (error) {
      console.error("[Wizard] Failed to load domains:", error);
      select.innerHTML = '<option value="">Error loading domains</option>';
    }
  }

  async loadWizardPages(domain) {
    const select = document.getElementById("wizardPageSelect");
    const typeSelect = document.getElementById("wizardTypeSelect");

    if (!domain) {
      select.disabled = true;
      typeSelect.disabled = true;
      select.innerHTML = '<option value="">Select domain first</option>';
      return;
    }

    select.innerHTML = '<option value="">Loading...</option>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "getPagesByDomain",
        domain: domain,
        timeRange: 604800, // Last 7 days
      });

      if (
        response &&
        response.success &&
        response.pages &&
        response.pages.length > 0
      ) {
        select.disabled = false;
        typeSelect.disabled = false;
        select.innerHTML =
          '<option value="">All pages</option>' +
          response.pages
            .map((pageObj) => {
              const pageUrl = pageObj.pageUrl;
              const count = pageObj.requestCount || 0;
              // Extract path from URL for cleaner display
              try {
                const url = new URL(pageUrl);
                const displayPath = url.pathname + url.search || "/";
                return `<option value="${pageUrl}">${displayPath} (${count} req)</option>`;
              } catch (e) {
                return `<option value="${pageUrl}">${pageUrl} (${count} req)</option>`;
              }
            })
            .join("");
      } else {
        select.innerHTML = '<option value="">No pages found</option>';
      }
    } catch (error) {
      console.error("[Wizard] Failed to load pages:", error);
      select.innerHTML = '<option value="">Error loading pages</option>';
    }
  }

  async loadWizardRequests() {
    const container = document.getElementById("wizardRequestList");
    const countEl = document.getElementById("wizardRequestCount");

    if (!this.wizardState.selectedDomain) {
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary)">Select a domain to view available requests</div>';
      countEl.textContent = "0 requests selected";
      return;
    }

    if (this.wizardState.selectedPage === null) {
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary)">Select a page to view available requests</div>';
      countEl.textContent = "0 requests selected";
      return;
    }

    container.innerHTML =
      '<div style="padding: 20px; text-align: center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "getRequestsByFilters",
        filters: {
          domain: this.wizardState.selectedDomain,
          pageUrl: this.wizardState.selectedPage || null,
          type: this.wizardState.selectedType || null,
        },
      });

      if (response && response.success && response.requests) {
        const requests = response.requests;

        if (requests.length === 0) {
          container.innerHTML =
            '<div style="padding: 20px; text-align: center; color: var(--text-secondary)">No requests found with these filters</div>';
          countEl.textContent = "0 requests available";
          return;
        }

        // Store full request data for later use
        this.wizardState.availableRequests = requests;

        container.innerHTML = requests
          .map(
            (req, idx) => `
          <div class="request-item">
            <input type="checkbox" id="req-${idx}" data-index="${idx}">
            <div class="request-details">
              <div class="request-url">${req.url}</div>
              <div class="request-meta">
                <span class="request-method">${req.method}</span>
                <span>${req.type || "unknown"}</span>
                <span>${new Date(req.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        `
          )
          .join("");

        // Add change listeners to checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.addEventListener("change", () => {
            this.updateSelectedRequests();
          });
        });

        countEl.textContent = `0 of ${requests.length} requests selected`;
      } else {
        container.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-danger)">Error loading requests</div>';
      }
    } catch (error) {
      console.error("[Wizard] Failed to load requests:", error);
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-danger)">Error loading requests</div>';
    }
  }

  updateSelectedRequests() {
    const checkboxes = document.querySelectorAll(
      '#wizardRequestList input[type="checkbox"]:checked'
    );
    const countEl = document.getElementById("wizardRequestCount");
    const total = document.querySelectorAll(
      '#wizardRequestList input[type="checkbox"]'
    ).length;

    // Get full request data from stored array (headers/body will be fetched in Step 3)
    this.wizardState.selectedRequests = Array.from(checkboxes).map((cb) => {
      const idx = parseInt(cb.dataset.index);
      const fullReq = this.wizardState.availableRequests[idx];

      return {
        id: fullReq.id,
        url: fullReq.url,
        method: fullReq.method,
        type: fullReq.type,
        status: fullReq.status,
        timestamp: fullReq.timestamp,
        page_url: fullReq.page_url,
      };
    });

    // Auto-extract variables from headers and body
    this.autoExtractVariables();

    countEl.textContent = `${this.wizardState.selectedRequests.length} of ${total} requests selected`;
  }

  autoExtractVariables() {
    // Extract common variable patterns from requests
    const potentialVars = new Map();

    this.wizardState.selectedRequests.forEach((req) => {
      // Check headers for tokens/keys
      if (req.headers) {
        try {
          const headers =
            typeof req.headers === "string"
              ? JSON.parse(req.headers)
              : req.headers;

          // Look for Authorization headers
          if (headers.Authorization) {
            const authValue = headers.Authorization;
            if (
              authValue.startsWith("Bearer ") &&
              !potentialVars.has("authToken")
            ) {
              potentialVars.set("authToken", authValue.replace("Bearer ", ""));
            } else if (
              authValue.startsWith("Token ") &&
              !potentialVars.has("apiToken")
            ) {
              potentialVars.set("apiToken", authValue.replace("Token ", ""));
            }
          }

          // Look for API keys
          if (headers["X-API-Key"] && !potentialVars.has("apiKey")) {
            potentialVars.set("apiKey", headers["X-API-Key"]);
          }
          if (headers["Api-Key"] && !potentialVars.has("apiKey")) {
            potentialVars.set("apiKey", headers["Api-Key"]);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Check URL for common patterns like IDs
      try {
        const url = new URL(req.url);
        const pathParts = url.pathname.split("/").filter((p) => p);

        // Look for numeric IDs in path
        pathParts.forEach((part, idx) => {
          if (/^\d+$/.test(part) && idx > 0) {
            const prevPart = pathParts[idx - 1];
            const varName = `${prevPart}Id`;
            if (!potentialVars.has(varName)) {
              potentialVars.set(varName, part);
            }
          }
        });
      } catch (e) {
        // Ignore URL parse errors
      }
    });

    // Add extracted variables to wizard state if not already present
    potentialVars.forEach((value, name) => {
      if (!this.wizardState.variables.some((v) => v.name === name)) {
        this.wizardState.variables.push({ name, value });
      }
    });
  }

  async updateWizardStep(step) {
    // Update progress indicator
    document.querySelectorAll(".wizard-step").forEach((el) => {
      const stepNum = parseInt(el.dataset.step);
      el.classList.remove("active", "completed");
      if (stepNum === step) {
        el.classList.add("active");
      } else if (stepNum < step) {
        el.classList.add("completed");
      }
    });

    // Show/hide content
    document.querySelectorAll(".wizard-content").forEach((el) => {
      el.classList.remove("active");
      el.style.display = "none";
    });
    const currentContent = document.getElementById(`wizardStep${step}`);
    if (currentContent) {
      currentContent.classList.add("active");
      currentContent.style.display = "block";
    }

    // Load step-specific data
    if (step === 3) {
      this.loadRequestsEditor();
      // Load existing variables from settings
      if (this.wizardState.variables.length === 0) {
        await this.loadExistingVariables();
      }
    }

    // Update buttons
    const prevBtn = document.getElementById("wizardPrevBtn");
    const nextBtn = document.getElementById("wizardNextBtn");
    const createBtn = document.getElementById("wizardCreateBtn");

    prevBtn.style.display = step > 1 ? "block" : "none";
    nextBtn.style.display = step < 4 ? "block" : "none";
    createBtn.style.display = step === 4 ? "block" : "none";

    this.wizardState.currentStep = step;
  }

  wizardNextStep() {
    const currentStep = this.wizardState.currentStep;

    // Validate current step
    if (currentStep === 1) {
      if (!this.wizardState.selectedDomain) {
        alert("Please select a domain");
        return;
      }
      if (this.wizardState.selectedPage === null) {
        alert("Please select a page (or choose 'All pages')");
        return;
      }
      // Check actual DOM state for selected checkboxes
      const checkedBoxes = document.querySelectorAll(
        '#wizardRequestList input[type="checkbox"]:checked'
      );
      if (checkedBoxes.length === 0) {
        alert("Please select at least one request");
        return;
      }
    }

    if (currentStep === 4) {
      const name = document.getElementById("wizardRunnerName").value.trim();
      if (!name) {
        alert("Please enter a runner name");
        return;
      }
    }

    if (currentStep < 4) {
      this.updateWizardStep(currentStep + 1);
    }
  }

  wizardPreviousStep() {
    const currentStep = this.wizardState.currentStep;
    if (currentStep > 1) {
      this.updateWizardStep(currentStep - 1);
    }
  }

  async loadExistingVariables() {
    try {
      // Import settingsManager dynamically if not already available
      if (!window.settingsManager) {
        const module = await import(
          "../../lib/shared-components/settings-manager.js"
        );
        window.settingsManager = module.default;
        await window.settingsManager.initialize();
      }

      const existingVars = window.settingsManager.getVariables();
      console.log("[Wizard] Loaded existing variables:", existingVars);

      // Add to wizard state if not already present
      existingVars.forEach((v) => {
        if (!this.wizardState.variables.some((wv) => wv.name === v.name)) {
          this.wizardState.variables.push({
            id: v.id,
            name: v.name,
            value: v.value,
            description: v.description || "",
            isGlobal: true, // Mark as coming from global settings
          });
        }
      });

      this.renderVariablesList();
    } catch (error) {
      console.error("[Wizard] Failed to load existing variables:", error);
    }
  }

  async loadRequestsEditor() {
    const container = document.getElementById("wizardRequestsEditor");

    if (this.wizardState.selectedRequests.length === 0) {
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-secondary)">No requests selected</div>';
      return;
    }

    // Show loading indicator
    container.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary)"><i class="fas fa-spinner fa-spin"></i> Loading request details...</div>';

    // Also render variables list if variables were auto-extracted
    if (this.wizardState.variables.length > 0) {
      this.renderVariablesList();
    }

    // Fetch headers and body for ALL requests in parallel (much faster)
    await Promise.all(
      this.wizardState.selectedRequests.map(async (req) => {
        // Fetch headers and body in parallel for this request
        const [headers, body] = await Promise.all([
          this.getRequestHeaders(req.id),
          this.getRequestBody(req.id),
        ]);
        req.headers = headers || {};
        req.body = body || null;
      })
    );

    container.innerHTML = this.wizardState.selectedRequests
      .map((req, idx) => {
        // Format headers for display (already an object with header name/value pairs)
        let headersStr = "";
        if (req.headers && Object.keys(req.headers).length > 0) {
          try {
            headersStr = JSON.stringify(req.headers, null, 2);
          } catch (e) {
            console.error(
              `[Wizard] Failed to stringify headers for request #${idx}:`,
              e
            );
            headersStr = String(req.headers);
          }
        }

        // Format body for display (already parsed as object in updateSelectedRequests)
        let bodyStr = "";
        if (req.body) {
          try {
            bodyStr =
              typeof req.body === "object"
                ? JSON.stringify(req.body, null, 2)
                : String(req.body);
          } catch (e) {
            console.error(
              `[Wizard] Failed to stringify body for request #${idx}:`,
              e
            );
            bodyStr = String(req.body);
          }
        }

        return `
      <div class="request-editor-item" data-index="${idx}" style="border-bottom: 1px solid var(--border-color); padding: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: var(--primary-color);">${req.method} #${
          idx + 1
        }</strong>
          <button class="toggle-request-details" data-index="${idx}" style="background: none; border: none; cursor: pointer; color: var(--text-secondary);">
            <i class="fas fa-chevron-down"></i>
          </button>
        </div>
        <div class="request-url-preview" style="font-size: 12px; color: var(--text-secondary); word-break: break-all;">${
          req.url
        }</div>
        <div class="request-details-editor" data-index="${idx}" style="display: none; margin-top: 12px;">
          <div style="margin-bottom: 8px;">
            <label style="font-size: 12px; color: var(--text-secondary);">URL:</label>
            <input type="text" class="request-url-input" data-index="${idx}" value="${
          req.url
        }" 
              style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; font-family: monospace;" />
          </div>
          <div style="margin-bottom: 8px;">
            <label style="font-size: 12px; color: var(--text-secondary);">Headers (JSON):</label>
            <textarea class="request-headers-input" data-index="${idx}" rows="3" placeholder='{"Authorization": "Bearer {{token}}"}'
              style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; font-family: monospace;">${headersStr}</textarea>
            <small style="color: var(--text-secondary); font-size: 11px;">Use {{variableName}} to reference variables</small>
          </div>
          <div style="margin-bottom: 8px;">
            <label style="font-size: 12px; color: var(--text-secondary);">Body:</label>
            <textarea class="request-body-input" data-index="${idx}" rows="3" placeholder='{"key": "{{value}}"}'
              style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px; font-family: monospace;">${bodyStr}</textarea>
            <small style="color: var(--text-secondary); font-size: 11px;">Use {{variableName}} to reference variables</small>
          </div>
          <div style="margin-bottom: 8px;">
            <label style="font-size: 12px; color: var(--text-secondary);">Description:</label>
            <input type="text" class="request-description-input" data-index="${idx}" value="${
          req.description || ""
        }" placeholder="Optional description"
              style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px;" />
          </div>
        </div>
      </div>
    `;
      })
      .join("");

    // Add event listeners for toggling details
    container.querySelectorAll(".toggle-request-details").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = e.currentTarget.dataset.index;
        const details = container.querySelector(
          `.request-details-editor[data-index="${idx}"]`
        );
        const icon = e.currentTarget.querySelector("i");

        if (details.style.display === "none") {
          details.style.display = "block";
          icon.className = "fas fa-chevron-up";
        } else {
          details.style.display = "none";
          icon.className = "fas fa-chevron-down";
        }
      });
    });

    // Add event listeners for input changes
    container.querySelectorAll(".request-url-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.wizardState.selectedRequests[idx].url = e.target.value;
      });
    });

    container.querySelectorAll(".request-headers-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.wizardState.selectedRequests[idx].headers = e.target.value;
      });
    });

    container.querySelectorAll(".request-body-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const idx = parseInt(e.target.dataset.index);
        this.wizardState.selectedRequests[idx].body = e.target.value;
      });
    });

    container
      .querySelectorAll(".request-description-input")
      .forEach((input) => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.index);
          this.wizardState.selectedRequests[idx].description = e.target.value;
        });
      });
  }

  async addVariable() {
    const name = prompt("Variable name (without {{ }}):");
    if (!name) return;

    // Validate name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      alert(
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
      );
      return;
    }

    // Check if variable already exists in local list
    if (this.wizardState.variables.some((v) => v.name === name)) {
      alert("Variable with this name already exists");
      return;
    }

    const value = prompt("Variable value:");
    if (value === null) return;

    const description = prompt("Variable description (optional):", "");

    try {
      // Import settingsManager dynamically if not already available
      if (!window.settingsManager) {
        const module = await import(
          "../../lib/shared-components/settings-manager.js"
        );
        window.settingsManager = module.default;
        await window.settingsManager.initialize();
      }

      // Add variable using settingsManager (saves to both storage and database)
      await window.settingsManager.addVariable({
        name,
        value,
        description: description || "",
      });

      // Add to local wizard state
      const newVariable = {
        name,
        value,
        description: description || "",
        isGlobal: true,
        id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      this.wizardState.variables.push(newVariable);

      console.log(`[Wizard] Variable "${name}" saved to global settings`);

      // Trigger storage changed event to notify other components
      window.dispatchEvent(
        new CustomEvent("settingsChanged", {
          detail: { key: "variables" },
        })
      );

      alert(`Variable "${name}" created successfully!`);
    } catch (error) {
      console.error("[Wizard] Failed to save variable:", error);
      alert(`Failed to save variable: ${error.message}`);
      return;
    }

    this.renderVariablesList();
  }

  renderVariablesList() {
    const container = document.getElementById("wizardVariablesList");

    if (this.wizardState.variables.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; color: var(--text-secondary); padding: 8px">No variables defined. Click "Add Variable" to create one or use existing global variables.</div>';
      return;
    }

    container.innerHTML = this.wizardState.variables
      .map(
        (variable, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid var(--border-color);">
        <div style="flex: 1;">
          <strong style="font-family: monospace; color: var(--primary-color);">{{${
            variable.name
          }}}</strong>
          ${
            variable.isGlobal
              ? '<span style="margin-left: 6px; font-size: 10px; background: var(--primary-color); color: white; padding: 2px 6px; border-radius: 3px;">Global</span>'
              : ""
          }
          <span style="margin-left: 12px; color: var(--text-secondary); font-size: 12px;">=</span>
          <span style="margin-left: 8px; font-family: monospace; font-size: 12px;">${
            variable.value
          }</span>
          ${
            variable.description
              ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${variable.description}</div>`
              : ""
          }
        </div>
        <div>
          <button class="edit-variable-btn" data-index="${idx}" style="background: none; border: none; cursor: pointer; color: var(--primary-color); padding: 4px 8px;">
            <i class="fas fa-edit"></i>
          </button>
          ${
            !variable.isGlobal
              ? `<button class="delete-variable-btn" data-index="${idx}" style="background: none; border: none; cursor: pointer; color: var(--danger-color); padding: 4px 8px;">
            <i class="fas fa-trash"></i>
          </button>`
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners
    container.querySelectorAll(".edit-variable-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.editVariable(idx);
      });
    });

    container.querySelectorAll(".delete-variable-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        if (
          confirm(
            `Delete variable "{{${this.wizardState.variables[idx].name}}}"?`
          )
        ) {
          this.wizardState.variables.splice(idx, 1);
          this.renderVariablesList();
        }
      });
    });
  }

  async editVariable(idx) {
    const variable = this.wizardState.variables[idx];
    const newValue = prompt(
      `Edit value for "{{${variable.name}}}"`,
      variable.value
    );
    if (newValue !== null && newValue !== variable.value) {
      variable.value = newValue;

      // If it's a global variable, update in global settings too
      if (variable.isGlobal && variable.id) {
        try {
          // Import settingsManager dynamically if not already available
          if (!window.settingsManager) {
            const module = await import(
              "../../lib/shared-components/settings-manager.js"
            );
            window.settingsManager = module.default;
            await window.settingsManager.initialize();
          }

          // Update using settingsManager
          await window.settingsManager.updateVariable(variable.id, {
            value: newValue,
          });

          console.log(
            `[Wizard] Variable "${variable.name}" updated in global settings`
          );

          // Trigger storage changed event
          window.dispatchEvent(
            new CustomEvent("settingsChanged", {
              detail: { key: "variables" },
            })
          );
        } catch (error) {
          console.error(
            "[Wizard] Failed to update variable in global settings:",
            error
          );
          alert(`Failed to update variable: ${error.message}`);
        }
      }

      this.renderVariablesList();
    }
  }

  async createRunnerFromWizard() {
    // Prevent double-clicking
    if (this.isCreatingRunner) {
      console.log(
        "[Wizard] Runner creation already in progress, ignoring duplicate call"
      );
      return;
    }

    // Validate step 4
    const name = document.getElementById("wizardRunnerName").value.trim();
    if (!name) {
      alert("Please enter a runner name");
      return;
    }

    // Set flag to prevent double-creation
    this.isCreatingRunner = true;

    // Collect all configuration
    const now = Date.now();
    // Generate unique ID with high entropy
    const randomPart =
      Math.random().toString(36).substr(2, 9) +
      Math.random().toString(36).substr(2, 9);
    const runnerId = `runner_${now}_${randomPart}`;
    const definition = {
      id: runnerId,
      name: name,
      description: document
        .getElementById("wizardRunnerDescription")
        .value.trim(),
      collection_id: null,
      execution_mode: document.getElementById("wizardMode").value,
      delay_ms: parseInt(document.getElementById("wizardDelay").value) || 1000,
      follow_redirects: document.getElementById("wizardFollowRedirects")
        .checked,
      validate_status: document.getElementById("wizardValidateStatus").checked,
      use_variables: document.getElementById("wizardUseVariables").checked,
      header_overrides: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const requests = this.wizardState.selectedRequests.map((req, idx) => {
      // Extract domain from URL if not provided
      let domain = this.wizardState.selectedDomain;
      let pageUrl = this.wizardState.selectedPage;

      if (!domain) {
        try {
          const urlObj = new URL(req.url);
          domain = urlObj.hostname;
        } catch (e) {
          domain = "unknown";
        }
      }

      // Use empty string "All pages" as the URL, or the actual page URL, or domain as fallback
      if (!pageUrl || pageUrl === "") {
        pageUrl = `https://${domain}`; // Fallback to domain root
      }

      return {
        id: `${runnerId}_req_${idx}_${Math.random().toString(36).substr(2, 6)}`,
        runner_id: runnerId,
        url: req.url,
        method: req.method,
        sequence_order: idx + 1,
        domain: domain,
        page_url: pageUrl,
        headers: req.headers || null,
        body: req.body || null,
        captured_request_id: req.id || null,
        assertions: req.assertions || null,
        description: req.description || null,
        is_enabled: true,
        created_at: now,
      };
    });

    // Add variables to definition if any
    if (this.wizardState.variables.length > 0) {
      definition.variables = this.wizardState.variables;
    }

    // Show loading state
    const createBtn = document.getElementById("wizardCreateBtn");
    const originalText = createBtn.innerHTML;
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "createRunner",
        definition: definition,
        requests: requests,
      });

      if (response && response.success) {
        // Close modal
        document.getElementById("runnerWizardModal").style.display = "none";

        // Show success message
        this.showToast(`✓ Runner "${name}" created successfully!`, "success");

        // Wait for database write to complete before reloading
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reload runners list
        await this.loadRunners();
      } else {
        throw new Error(response?.error || "Failed to create runner");
      }
    } catch (error) {
      console.error("[Wizard] Failed to create runner:", error);
      alert(`Failed to create runner: ${error.message}`);
      createBtn.disabled = false;
      createBtn.innerHTML = originalText;
    } finally {
      // Always reset the flag
      this.isCreatingRunner = false;
    }
  }

  filterRunners(searchTerm = "") {
    const typeFilter =
      document.getElementById("runnerTypeFilter")?.value || "all";
    const search =
      searchTerm.toLowerCase() ||
      document.getElementById("runnerSearch")?.value.toLowerCase() ||
      "";

    const cards = document.querySelectorAll(".runner-card");
    cards.forEach((card) => {
      const runnerId = card.dataset.runnerId;
      const runner = this.runners.find((r) => r.id === runnerId);

      if (!runner) {
        card.style.display = "none";
        return;
      }

      // Type filter
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "saved" && !runner.is_temporary) ||
        (typeFilter === "temporary" && runner.is_temporary);

      // Search filter
      const matchesSearch =
        !search ||
        runner.name.toLowerCase().includes(search) ||
        (runner.description &&
          runner.description.toLowerCase().includes(search));

      card.style.display = matchesType && matchesSearch ? "" : "none";
    });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Fetch request headers from database (same as dashboard)
  async getRequestHeaders(requestId) {
    try {
      const escapeStr = (val) => {
        if (val === undefined || val === null) return "NULL";
        return `'${String(val).replace(/'/g, "''")}'`;
      };

      const response = await chrome.runtime.sendMessage({
        action: "executeDirectQuery",
        query: `
          SELECT name, value
          FROM bronze_request_headers
          WHERE request_id = ${escapeStr(requestId)} AND header_type = 'request'
          ORDER BY name
        `,
      });

      if (response && response.success && response.data) {
        // Convert array of {name, value} to object {name: value}
        const headersObj = {};
        response.data.forEach((header) => {
          headersObj[header.name] = header.value;
        });
        return headersObj;
      }
      return {};
    } catch (error) {
      console.error("[Wizard] Error fetching headers:", error);
      return {};
    }
  }

  // Fetch request body from database (same as dashboard)
  async getRequestBody(requestId) {
    try {
      const escapeStr = (val) => {
        if (val === undefined || val === null) return "NULL";
        return `'${String(val).replace(/'/g, "''")}'`;
      };

      const response = await chrome.runtime.sendMessage({
        action: "executeDirectQuery",
        query: `
          SELECT request_body
          FROM bronze_requests
          WHERE id = ${escapeStr(requestId)}
        `,
      });

      if (
        response &&
        response.success &&
        response.data &&
        response.data.length > 0
      ) {
        return response.data[0].request_body;
      }
      return null;
    } catch (error) {
      console.error("[Wizard] Error fetching request body:", error);
      return null;
    }
  }

  showToast(message, type = "info") {
    // Reuse dashboard toast if available
    if (window.dashboardManager && window.dashboardManager.showToast) {
      window.dashboardManager.showToast(message, type);
    } else {
      console.log(`[Runners] ${type.toUpperCase()}: ${message}`);
    }
  }

  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Initialize when page loads
let runnersManager = null;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize when runners tab is first shown
  const runnersTab = document.querySelector('[data-tab="runners"]');
  if (runnersTab) {
    runnersTab.addEventListener(
      "click",
      () => {
        if (!runnersManager) {
          runnersManager = new RunnersManager();
          window.runnersManager = runnersManager; // Expose globally for onclick handlers
          runnersManager.initialize();
        }
      },
      { once: true }
    );
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (runnersManager) {
    runnersManager.cleanup();
  }
});

// Export for use in other modules
window.runnersManager = null;
export default RunnersManager;
