/**
 * Reusable Pagination Component
 * 
 * Extracted from Dashboard implementation for use across the application.
 * Provides page navigation UI with customizable callbacks.
 * 
 * Usage:
 * ```javascript
 * import { PaginationManager } from './pagination.js';
 * 
 * const pagination = new PaginationManager({
 *   containerId: 'myPaginationContainer',
 *   onPageChange: (page) => loadData(page),
 *   perPage: 50
 * });
 * 
 * pagination.render(currentPage, totalCount);
 * ```
 */

export class PaginationManager {
  constructor(options = {}) {
    this.containerId = options.containerId;
    this.onPageChange = options.onPageChange || (() => {});
    this.perPage = options.perPage || 50;
    this.currentPage = 1;
    this.totalCount = 0;
  }

  /**
   * Render pagination controls
   * @param {number} currentPage - Current page number (1-indexed)
   * @param {number} totalCount - Total number of items
   * @param {number} perPage - Items per page (optional, uses default if not provided)
   */
  render(currentPage, totalCount, perPage = null) {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn(`[Pagination] Container #${this.containerId} not found`);
      return;
    }

    this.currentPage = currentPage;
    this.totalCount = totalCount;
    if (perPage) this.perPage = perPage;

    // No items
    if (totalCount === 0) {
      container.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(totalCount / this.perPage);

    // Single page
    if (totalPages <= 1) {
      container.innerHTML = `
        <span class="pagination-info">
          Showing ${totalCount} item${totalCount !== 1 ? "s" : ""}
        </span>
      `;
      return;
    }

    // Multiple pages - build full pagination UI
    let html = `
      <span class="pagination-info">
        Page ${currentPage} of ${totalPages} (${totalCount} total)
      </span>
      <div class="pagination-buttons">
    `;

    // Previous button
    if (currentPage > 1) {
      html += `
        <button class="pagination-btn" data-page="${currentPage - 1}" title="Previous page">
          <i class="fas fa-chevron-left"></i>
        </button>
      `;
    }

    // Page numbers (show first, current-1, current, current+1, last)
    const pages = new Set();
    pages.add(1); // Always show first page
    if (currentPage > 1) pages.add(currentPage - 1);
    pages.add(currentPage);
    if (currentPage < totalPages) pages.add(currentPage + 1);
    pages.add(totalPages); // Always show last page

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    let lastPage = 0;

    sortedPages.forEach((p) => {
      // Add ellipsis if there's a gap
      if (lastPage && p - lastPage > 1) {
        html += '<span class="pagination-ellipsis">...</span>';
      }

      const activeClass = p === currentPage ? "active" : "";
      html += `
        <button class="pagination-btn ${activeClass}" data-page="${p}" title="Go to page ${p}">
          ${p}
        </button>
      `;
      lastPage = p;
    });

    // Next button
    if (currentPage < totalPages) {
      html += `
        <button class="pagination-btn" data-page="${currentPage + 1}" title="Next page">
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
          this.onPageChange(page);
        }
      });
    });
  }

  /**
   * Update pagination without re-rendering (e.g., after perPage change)
   * @param {number} newPerPage - New items per page
   */
  updatePerPage(newPerPage) {
    this.perPage = newPerPage;
    // Adjust current page to stay within bounds
    const totalPages = Math.ceil(this.totalCount / this.perPage);
    if (this.currentPage > totalPages) {
      this.currentPage = Math.max(1, totalPages);
    }
    this.render(this.currentPage, this.totalCount);
  }

  /**
   * Get pagination state
   * @returns {Object} Current pagination state
   */
  getState() {
    return {
      currentPage: this.currentPage,
      totalCount: this.totalCount,
      perPage: this.perPage,
      totalPages: Math.ceil(this.totalCount / this.perPage),
      offset: (this.currentPage - 1) * this.perPage
    };
  }

  /**
   * Reset to first page
   */
  reset() {
    this.currentPage = 1;
    this.render(1, this.totalCount);
  }
}

/**
 * Create and initialize a pagination manager
 * @param {Object} options - Configuration options
 * @returns {PaginationManager} Pagination manager instance
 */
export function createPagination(options) {
  return new PaginationManager(options);
}

export default PaginationManager;
