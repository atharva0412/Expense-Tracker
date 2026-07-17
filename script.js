// Categories configuration
const categoriesConfig = {
    income: ['Salary', 'Business', 'Freelance', 'Investments', 'Other'],
    expense: ['Food & Dining', 'Rent & Bills', 'Shopping', 'Utilities', 'Entertainment', 'Travel', 'Health', 'Other']
};

// State Variables
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budgetLimit = parseFloat(localStorage.getItem("budgetLimit")) || 0;
let editingId = null;
let expenseChart = null;

// DOM Elements
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const listEl = document.getElementById("list");
const noTransactionsEl = document.getElementById("no-transactions");

const formEl = document.getElementById("transaction-form");
const formTitleEl = document.getElementById("form-title");
const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const textEl = document.getElementById("text");
const amountEl = document.getElementById("amount");
const dateEl = document.getElementById("date");
const addBtnEl = document.getElementById("addBtn");
const cancelEditBtnEl = document.getElementById("cancel-edit-btn");

const budgetLimitInput = document.getElementById("budget-limit");
const setBudgetBtn = document.getElementById("set-budget-btn");
const budgetSpentEl = document.getElementById("budget-spent");
const budgetRemainingEl = document.getElementById("budget-remaining");
const budgetProgressBar = document.getElementById("budget-progress-bar");
const budgetPercentageEl = document.getElementById("budget-percentage");

const searchInput = document.getElementById("search");
const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const sortBy = document.getElementById("sort-by");

const exportCsvBtn = document.getElementById("export-csv-btn");
const clearAllBtn = document.getElementById("clear-all-btn");

const themeBtn = document.getElementById("theme-btn");
const shortcutsBtn = document.getElementById("shortcuts-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const closeShortcutsBtn = document.getElementById("close-shortcuts-btn");
const toastContainer = document.getElementById("toast-container");

// Reusable Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    else if (type === 'error') icon = 'fa-circle-xmark';
    else if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

// Local Storage Handlers
function updateLocalStorage() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("budgetLimit", budgetLimit.toString());
}

// Set up UI Date & Categories on startup
function initializeApp() {
    // Set default date in form to today (YYYY-MM-DD local format)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateEl.value = `${year}-${month}-${day}`;

    // Populate categories select dynamic based on type select
    typeEl.addEventListener("change", populateFormCategories);
    populateFormCategories();

    // Populate search filter category dropdown
    populateFilterCategories();

    // Set Budget input placeholder/value
    if (budgetLimit > 0) {
        budgetLimitInput.value = budgetLimit;
    }

    // Load theme
    const savedTheme = localStorage.getItem("theme") || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Setup Filter/Sort listeners
    searchInput.addEventListener("input", renderTransactions);
    filterType.addEventListener("change", renderTransactions);
    filterCategory.addEventListener("change", renderTransactions);
    sortBy.addEventListener("change", renderTransactions);

    // Form submission
    formEl.addEventListener("submit", handleFormSubmit);

    // Budget events
    setBudgetBtn.addEventListener("click", handleSetBudget);

    // Action buttons
    cancelEditBtnEl.addEventListener("click", cancelEditing);
    exportCsvBtn.addEventListener("click", exportToCSV);
    clearAllBtn.addEventListener("click", handleClearAll);

    // Shortcuts modal events
    shortcutsBtn.addEventListener("click", () => shortcutsModal.classList.remove("hidden"));
    closeShortcutsBtn.addEventListener("click", () => shortcutsModal.classList.add("hidden"));
    shortcutsModal.addEventListener("click", (e) => {
        if (e.target === shortcutsModal) shortcutsModal.classList.add("hidden");
    });

    // Theme toggle
    themeBtn.addEventListener("click", toggleTheme);

    // Initialize display and calculations
    updateDashboard();
    renderTransactions();
}

// Populate Categories inside form depending on Type (Income vs Expense)
function populateFormCategories() {
    const selectedType = typeEl.value;
    const list = categoriesConfig[selectedType] || [];
    categoryEl.innerHTML = "";
    list.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.innerText = cat;
        categoryEl.appendChild(option);
    });
}

// Populate Filter Categories from combined unique categories list
function populateFilterCategories() {
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    const allCategories = [...new Set([...categoriesConfig.income, ...categoriesConfig.expense])];
    allCategories.sort().forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.innerText = cat;
        filterCategory.appendChild(option);
    });
}

// Add or Update Transaction from form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const text = textEl.value.trim();
    const amountVal = parseFloat(amountEl.value);
    const dateVal = dateEl.value;
    const typeVal = typeEl.value;
    const categoryVal = categoryEl.value;

    if (!text || isNaN(amountVal) || amountVal <= 0 || !dateVal) {
        showToast("Please enter valid transaction details.", "error");
        return;
    }

    if (editingId !== null) {
        // Edit flow
        const idx = transactions.findIndex(t => t.id === editingId);
        if (idx !== -1) {
            // Check if user is increasing expense beyond budget
            const oldAmount = transactions[idx].amount;
            const oldType = transactions[idx].type;
            
            transactions[idx] = {
                id: editingId,
                text,
                amount: amountVal,
                type: typeVal,
                category: categoryVal,
                date: dateVal
            };

            showToast("Transaction updated successfully!", "success");
            
            // Check budget if new amount is higher or switched to expense
            if (typeVal === "expense") {
                const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
                if (budgetLimit > 0 && totalExpense > budgetLimit) {
                    showToast(`Warning: Budget exceeded by ₹${(totalExpense - budgetLimit).toFixed(2)}!`, "warning");
                }
            }
        }
        cancelEditing();
    } else {
        // Add flow
        const newTransaction = {
            id: Date.now(),
            text,
            amount: amountVal,
            type: typeVal,
            category: categoryVal,
            date: dateVal
        };

        transactions.push(newTransaction);
        showToast("Transaction added successfully!", "success");

        // Check if budget exceeded after adding expense
        if (typeVal === "expense") {
            const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
            if (budgetLimit > 0 && totalExpense > budgetLimit) {
                showToast(`Warning: Monthly budget limit exceeded!`, "warning");
            }
        }
    }

    updateLocalStorage();
    updateDashboard();
    renderTransactions();

    // Reset inputs but keep date
    textEl.value = "";
    amountEl.value = "";
    textEl.focus();
}

// Edit Mode initiation
function editTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    editingId = id;
    
    // Highlight list item in DOM
    document.querySelectorAll(".transactions-list li").forEach(li => {
        li.classList.remove("editing");
        if (parseFloat(li.getAttribute("data-id")) === id) {
            li.classList.add("editing");
        }
    });

    // Load inputs
    formTitleEl.innerText = "Edit Transaction";
    typeEl.value = tx.type;
    populateFormCategories(); // Reload category dropdown matching type
    categoryEl.value = tx.category;
    textEl.value = tx.text;
    amountEl.value = tx.amount;
    dateEl.value = tx.date;

    addBtnEl.innerText = "Save Changes";
    addBtnEl.className = "btn btn-primary";
    cancelEditBtnEl.classList.remove("hidden");

    textEl.focus();
}

// Exit Edit Mode and clean up form styling
function cancelEditing() {
    editingId = null;
    formTitleEl.innerText = "Add New Transaction";
    addBtnEl.innerText = "Add Transaction";
    cancelEditBtnEl.classList.add("hidden");
    
    // Clear form except date
    textEl.value = "";
    amountEl.value = "";
    
    document.querySelectorAll(".transactions-list li").forEach(li => {
        li.classList.remove("editing");
    });
}

// Delete Transaction
function deleteTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    showToast(`"${tx.text}" deleted successfully.`, "success");

    // If currently editing this item, cancel editing
    if (editingId === id) {
        cancelEditing();
    }

    updateDashboard();
    renderTransactions();
}

// Clear all Transactions
function handleClearAll() {
    if (transactions.length === 0) {
        showToast("No transactions to clear.", "info");
        return;
    }

    if (confirm("Are you sure you want to clear all transactions? This cannot be undone.")) {
        transactions = [];
        updateLocalStorage();
        cancelEditing();
        updateDashboard();
        renderTransactions();
        showToast("All transactions cleared successfully.", "success");
    }
}

// Set budget limit
function handleSetBudget() {
    const limit = parseFloat(budgetLimitInput.value);
    if (isNaN(limit) || limit < 0) {
        showToast("Please enter a valid budget limit amount.", "error");
        return;
    }

    budgetLimit = limit;
    updateLocalStorage();
    updateDashboard();
    showToast(`Monthly budget limit set to ₹${limit.toFixed(2)}`, "success");

    // Trigger immediate warning if budget limit is lower than current expenses
    const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    if (budgetLimit > 0 && totalExpense > budgetLimit) {
        showToast(`Current expenses exceed your new budget limit by ₹${(totalExpense - budgetLimit).toFixed(2)}`, "warning");
    }
}

// Update dashboard statistics, budget bars, and chart aggregates
function updateDashboard() {
    let incomeTotal = 0;
    let expenseTotal = 0;

    transactions.forEach(t => {
        if (t.type === "income") {
            incomeTotal += t.amount;
        } else {
            expenseTotal += t.amount;
        }
    });

    const netBalance = incomeTotal - expenseTotal;

    // Formatting currency Indian rupees
    balanceEl.innerText = (netBalance < 0 ? "-" : "") + "₹" + Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    incomeEl.innerText = "₹" + incomeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expenseEl.innerText = "₹" + expenseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Handle Balance styles (warning color if negative)
    if (netBalance < 0) {
        balanceEl.style.color = "#f87171"; // soft red
    } else {
        balanceEl.style.color = "#ffffff";
    }

    // Update Budget Tracker Section
    budgetSpentEl.innerText = "₹" + expenseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    if (budgetLimit > 0) {
        const remaining = budgetLimit - expenseTotal;
        budgetRemainingEl.innerText = (remaining < 0 ? "-" : "") + "₹" + Math.abs(remaining).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Progress Calculation
        let pct = (expenseTotal / budgetLimit) * 100;
        let displayPct = Math.round(pct);
        budgetPercentageEl.innerText = `${displayPct}% of budget spent`;
        
        // Cap progress bar visually at 100%
        const fillPct = Math.min(pct, 100);
        budgetProgressBar.style.width = `${fillPct}%`;

        // Color Coding
        budgetProgressBar.className = "progress-bar-fill";
        if (pct < 80) {
            budgetProgressBar.classList.add("progress-safe");
        } else if (pct < 100) {
            budgetProgressBar.classList.add("progress-warning");
        } else {
            budgetProgressBar.classList.add("progress-danger");
        }
    } else {
        budgetRemainingEl.innerText = "₹0.00";
        budgetProgressBar.style.width = "0%";
        budgetProgressBar.className = "progress-bar-fill";
        budgetPercentageEl.innerText = "No limit set";
    }

    // Render Pie Chart
    updateChart(transactions.filter(t => t.type === "expense"));
}

// Process and render dynamically filtered list of transactions
function renderTransactions() {
    const q = searchInput.value.toLowerCase().trim();
    const typeFilter = filterType.value;
    const catFilter = filterCategory.value;
    const sortVal = sortBy.value;

    let filtered = transactions.filter(t => {
        const matchesSearch = t.text.toLowerCase().includes(q);
        const matchesType = typeFilter === "all" || t.type === typeFilter;
        const matchesCat = catFilter === "all" || t.category === catFilter;
        return matchesSearch && matchesType && matchesCat;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === "date-desc") {
            return new Date(b.date) - new Date(a.date) || b.id - a.id;
        } else if (sortVal === "date-asc") {
            return new Date(a.date) - new Date(b.date) || a.id - b.id;
        } else if (sortVal === "amount-desc") {
            return b.amount - a.amount;
        } else if (sortVal === "amount-asc") {
            return a.amount - b.amount;
        }
        return 0;
    });

    // Clear and build list items
    listEl.innerHTML = "";

    if (filtered.length === 0) {
        noTransactionsEl.classList.remove("hidden");
    } else {
        noTransactionsEl.classList.add("hidden");
        filtered.forEach(tx => {
            const li = document.createElement("li");
            li.className = tx.type === "expense" ? "expense-item" : "income-item";
            li.setAttribute("data-id", tx.id);
            
            // Mark item as editing if it matches
            if (editingId === tx.id) {
                li.classList.add("editing");
            }

            const formattedDate = formatDateString(tx.date);
            const amtPrefix = tx.type === "expense" ? "-" : "+";

            li.innerHTML = `
                <div class="item-info">
                    <span class="item-title">${escapeHTML(tx.text)}</span>
                    <div class="item-meta">
                        <span class="item-category">${tx.category}</span>
                        <span class="item-date"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-amount">${amtPrefix}₹${tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <div class="item-actions">
                        <button class="btn-icon edit-item-btn" title="Edit Transaction">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon delete-item-btn" title="Delete Transaction">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            // Setup actions listeners directly
            li.querySelector(".edit-item-btn").addEventListener("click", () => editTransaction(tx.id));
            li.querySelector(".delete-item-btn").addEventListener("click", () => deleteTransaction(tx.id));

            listEl.appendChild(li);
        });
    }
}

// Utility to display dates nicely (e.g. "15 Jul 2026")
function formatDateString(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[monthIndex] || "";
    
    return `${day} ${monthName} ${year}`;
}

// Prevent HTML injections
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Dynamic rendering and theme adjustment of Chart.js Pie Chart
function updateChart(expenseTransactions) {
    const chartCanvas = document.getElementById("expenseChart");
    const chartPlaceholder = document.getElementById("chart-placeholder");

    if (expenseTransactions.length === 0) {
        chartCanvas.classList.add("hidden");
        chartPlaceholder.classList.remove("hidden");
        if (expenseChart) {
            expenseChart.destroy();
            expenseChart = null;
        }
        return;
    }

    chartCanvas.classList.remove("hidden");
    chartPlaceholder.classList.add("hidden");

    // Aggregate expense by category
    const aggregates = {};
    expenseTransactions.forEach(t => {
        aggregates[t.category] = (aggregates[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(aggregates);
    const dataValues = Object.values(aggregates);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textPrimaryColor = isDark ? '#f8fafc' : '#1f2937';
    const gridColor = isDark ? '#334155' : '#e5e7eb';

    const colors = [
        '#6366f1', // Indigo
        '#ef4444', // Red
        '#f59e0b', // Amber
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#ec4899', // Pink
        '#8b5cf6', // Violet
        '#f97316'  // Orange
    ];

    if (expenseChart) {
        // Update data
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = dataValues;
        expenseChart.options.plugins.legend.labels.color = textPrimaryColor;
        expenseChart.update();
    } else {
        // Create chart
        const ctx = chartCanvas.getContext('2d');
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: colors,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textPrimaryColor,
                            font: {
                                family: 'Outfit',
                                size: 12,
                                weight: '500'
                            },
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        titleFont: { family: 'Outfit' },
                        bodyFont: { family: 'Outfit' },
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` ₹${val.toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

// Toggle Dark and Light Mode stylesheet variables
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem("theme", newTheme);
    
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode!`, "success");

    // Force chart re-rendering to update text labels colors
    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }
    updateDashboard();
}

// Adjust Header theme icon
function updateThemeIcon(theme) {
    const icon = themeBtn.querySelector("i");
    if (theme === 'dark') {
        icon.className = "fa-solid fa-sun";
        themeBtn.title = "Toggle Light Mode (Ctrl+Shift+D)";
    } else {
        icon.className = "fa-solid fa-moon";
        themeBtn.title = "Toggle Dark Mode (Ctrl+Shift+D)";
    }
}

// CSV exporter
function exportToCSV() {
    if (transactions.length === 0) {
        showToast("No data to export.", "info");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header row
    csvContent += "ID,Date,Title,Type,Category,Amount (INR)\r\n";

    transactions.forEach(t => {
        // Escape quotes inside title string
        const escapedTitle = `"${t.text.replace(/"/g, '""')}"`;
        const row = [
            t.id,
            t.date,
            escapedTitle,
            t.type,
            t.category,
            t.amount
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const formattedDate = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `WealthFlow_Export_${formattedDate}.csv`);
    document.body.appendChild(link); // Required for FF
    
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV Exported successfully!", "success");
}

// Keyboard shortcuts listener
window.addEventListener("keydown", (e) => {
    // 1. Close modal or cancel edit with Escape
    if (e.key === "Escape") {
        if (!shortcutsModal.classList.contains("hidden")) {
            shortcutsModal.classList.add("hidden");
            e.preventDefault();
        } else if (editingId !== null) {
            cancelEditing();
            showToast("Cancelled editing.", "info");
            e.preventDefault();
        }
    }

    // 2. Open Shortcuts with Ctrl + /
    if (e.ctrlKey && e.key === "/") {
        shortcutsModal.classList.toggle("hidden");
        e.preventDefault();
    }

    // 3. Focus Add Transaction Form title input with Alt + N (or Ctrl + Shift + A)
    if ((e.altKey && e.key.toLowerCase() === "n") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a")) {
        textEl.focus();
        e.preventDefault();
        showToast("Form focused. Add details!", "info");
    }

    // 4. Toggle Theme with Ctrl + Shift + D
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        toggleTheme();
        e.preventDefault();
    }

    // 5. Export CSV with Ctrl + Shift + E
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        exportToCSV();
        e.preventDefault();
    }
});

// Run application
document.addEventListener("DOMContentLoaded", initializeApp);