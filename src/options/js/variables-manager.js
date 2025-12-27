/**
 * Variables Manager for Options Page
 * Handles UI and interaction for managing curl/fetch variables
 */

import settingsManager from "../../lib/shared-components/settings-ui-coordinator.js";

export class VariablesManager {
  constructor() {
    this.currentEditingId = null;
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.variablesContainer = document.getElementById("variablesListContainer");
    this.addVariableBtn = document.getElementById("addVariableBtn");
    this.variablesEnabledToggle = document.getElementById("variablesEnabled");
    this.variablesAutoDetectToggle = document.getElementById(
      "variablesAutoDetect"
    );

    // Modal elements
    this.modal = document.getElementById("variableEditorModal");
    this.modalTitle = document.getElementById("variableEditorTitle");
    this.variableNameInput = document.getElementById("variableName");
    this.variableValueInput = document.getElementById("variableValue");
    this.variableDescriptionInput = document.getElementById(
      "variableDescription"
    );
    this.saveVariableBtn = document.getElementById("saveVariableBtn");
    this.cancelVariableBtn = document.getElementById("cancelVariableBtn");
  }

  attachEventListeners() {
    // Add variable button
    this.addVariableBtn?.addEventListener("click", () =>
      this.openAddVariableModal()
    );

    // Modal buttons
    this.saveVariableBtn?.addEventListener("click", () => this.saveVariable());
    this.cancelVariableBtn?.addEventListener("click", () => this.closeModal());

    // Close modal on X button click
    this.modal
      ?.querySelector(".close-modal")
      ?.addEventListener("click", () => this.closeModal());

    // Close modal on outside click
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Toggle settings
    this.variablesEnabledToggle?.addEventListener("change", (e) => {
      this.updateSettings({ enabled: e.target.checked });
    });

    this.variablesAutoDetectToggle?.addEventListener("change", (e) => {
      this.updateSettings({ autoDetect: e.target.checked });
    });

    // Form validation
    this.variableNameInput?.addEventListener("input", (e) => {
      this.validateVariableName(e.target);
    });
  }

  async initialize() {
    await settingsManager.initialize();
    this.loadSettings();
    this.renderVariables();

    // Listen for settings changes from other components (e.g., runner wizard)
    window.addEventListener("settingsChanged", (event) => {
      if (event.detail && event.detail.key === "variables") {
        console.log(
          "[VariablesManager] Settings changed, refreshing variables"
        );
        // Reload settings from storage and re-render
        settingsManager.initialize().then(() => {
          this.renderVariables();
        });
      }
    });
  }

  loadSettings() {
    // Null-safe access to settings with fallback
    const settings = settingsManager.settings?.variables || { enabled: true, autoDetect: true, list: [] };
    if (this.variablesEnabledToggle) {
      this.variablesEnabledToggle.checked = settings.enabled !== false;
    }
    if (this.variablesAutoDetectToggle) {
      this.variablesAutoDetectToggle.checked = settings.autoDetect !== false;
    }
  }

  renderVariables() {
    const variables = settingsManager.getVariables();

    if (!this.variablesContainer) return;

    if (variables.length === 0) {
      this.variablesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-variable"></i>
          <p>No variables defined yet</p>
          <p class="description">Click "Add Variable" to create your first variable</p>
        </div>
      `;
      return;
    }

    this.variablesContainer.innerHTML = variables
      .map((variable) => this.createVariableItem(variable))
      .join("");

    // Attach event listeners to action buttons
    this.attachVariableActionListeners();
  }

  createVariableItem(variable) {
    const createdDate = new Date(variable.createdAt).toLocaleDateString();
    const updatedDate = new Date(variable.updatedAt).toLocaleDateString();

    return `
      <div class="variable-item" data-id="${variable.id}">
        <div class="variable-header">
          <div class="variable-name">\${${variable.name}}</div>
          <div class="variable-actions">
            <button class="edit-btn" data-action="edit" data-id="${
              variable.id
            }">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="delete-btn" data-action="delete" data-id="${
              variable.id
            }">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
        <div class="variable-value">${this.maskValue(variable.value)}</div>
        ${
          variable.description
            ? `<div class="variable-description">${this.escapeHtml(
                variable.description
              )}</div>`
            : ""
        }
        <div class="variable-meta">
          <span title="Created on ${createdDate}"><i class="fas fa-calendar-plus"></i> Created: ${createdDate}</span>
          <span title="Last updated on ${updatedDate}"><i class="fas fa-calendar-check"></i> Updated: ${updatedDate}</span>
        </div>
      </div>
    `;
  }

  maskValue(value) {
    if (!value) return "<em>empty</em>";
    if (value.length <= 8) return this.escapeHtml(value);
    return (
      this.escapeHtml(value.substring(0, 4)) +
      "•".repeat(8) +
      this.escapeHtml(value.substring(value.length - 4))
    );
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  attachVariableActionListeners() {
    const editButtons = this.variablesContainer.querySelectorAll(
      '[data-action="edit"]'
    );
    const deleteButtons = this.variablesContainer.querySelectorAll(
      '[data-action="delete"]'
    );

    editButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.openEditVariableModal(id);
      });
    });

    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        this.deleteVariable(id);
      });
    });
  }

  openAddVariableModal() {
    this.currentEditingId = null;
    this.modalTitle.textContent = "Add Variable";
    this.variableNameInput.value = "";
    this.variableValueInput.value = "";
    this.variableDescriptionInput.value = "";
    this.variableNameInput.disabled = false;
    this.modal.style.display = "block";
    this.variableNameInput.focus();
  }

  openEditVariableModal(id) {
    const variables = settingsManager.getVariables();
    const variable = variables.find((v) => v.id === id);

    if (!variable) {
      this.showToast("Variable not found", "error");
      return;
    }

    this.currentEditingId = id;
    this.modalTitle.textContent = "Edit Variable";
    this.variableNameInput.value = variable.name;
    this.variableValueInput.value = variable.value;
    this.variableDescriptionInput.value = variable.description || "";
    this.variableNameInput.disabled = true; // Can't change name during edit
    this.modal.style.display = "block";
    this.variableValueInput.focus();
  }

  closeModal() {
    this.modal.style.display = "none";
    this.currentEditingId = null;
  }

  validateVariableName(input) {
    const isValid = settingsManager.isValidVariableName(input.value);
    if (input.value && !isValid) {
      input.setCustomValidity(
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores."
      );
    } else {
      input.setCustomValidity("");
    }
    return isValid;
  }

  async saveVariable() {
    const name = this.variableNameInput.value.trim();
    const value = this.variableValueInput.value.trim();
    const description = this.variableDescriptionInput.value.trim();

    // Validation
    if (!name) {
      this.showToast("Variable name is required", "error");
      this.variableNameInput.focus();
      return;
    }

    if (!this.validateVariableName(this.variableNameInput)) {
      this.showToast("Invalid variable name format", "error");
      return;
    }

    if (!value) {
      this.showToast("Variable value is required", "error");
      this.variableValueInput.focus();
      return;
    }

    try {
      console.log("[Variables UI] Saving variable:", {
        name,
        hasValue: !!value,
        description,
      });

      if (this.currentEditingId) {
        // Update existing variable
        console.log("[Variables UI] Updating variable:", this.currentEditingId);
        await settingsManager.updateVariable(this.currentEditingId, {
          value,
          description,
        });
        this.showToast("Variable updated successfully", "success");
      } else {
        // Add new variable
        console.log("[Variables UI] Adding new variable:", name);
        const result = await settingsManager.addVariable({
          name,
          value,
          description,
        });
        console.log("[Variables UI] Variable added, result:", result);
        this.showToast("Variable added successfully", "success");
      }

      this.closeModal();
      this.renderVariables();
    } catch (error) {
      console.error("Failed to save variable:", error);
      this.showToast(error.message || "Failed to save variable", "error");
    }
  }

  async deleteVariable(id) {
    const variables = settingsManager.getVariables();
    const variable = variables.find((v) => v.id === id);

    if (!variable) {
      this.showToast("Variable not found", "error");
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete the variable "${variable.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await settingsManager.deleteVariable(id);
      this.showToast("Variable deleted successfully", "success");
      this.renderVariables();
    } catch (error) {
      console.error("Failed to delete variable:", error);
      this.showToast("Failed to delete variable", "error");
    }
  }

  async updateSettings(updates) {
    try {
      // Null-safe access with fallback
      const currentSettings = settingsManager.settings?.variables || { enabled: true, autoDetect: true, list: [] };
      await settingsManager.updateSettings({
        variables: {
          ...currentSettings,
          ...updates,
        },
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
      this.showToast("Failed to update settings", "error");
    }
  }

  showToast(message, type = "info") {
    // Create toast element if it doesn't exist
    let toast = document.getElementById("variablesToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "variablesToast";
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }

    // Set color based on type
    const colors = {
      success: "#48bb78",
      error: "#f56565",
      info: "#4299e1",
      warning: "#ed8936",
    };
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;

    // Show toast
    toast.style.opacity = "1";

    // Hide after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
    }, 3000);
  }
}

// Export singleton instance
export default new VariablesManager();
