// State Management
let students = JSON.parse(localStorage.getItem('students')) || [];
let currentSort = { column: 'name', order: 'asc' };
let currentPage = 1;
const itemsPerPage = 5;

// DOM Elements
const elements = {
    // Top Nav
    themeToggle: document.getElementById('theme-toggle'),
    toggleSidebar: document.getElementById('toggle-sidebar'),
    mobileMenu: document.getElementById('mobile-menu-btn'),
    sidebar: document.getElementById('sidebar'),

    // Dashboard Stats
    totalStudents: document.getElementById('total-students'),
    averageGrade: document.getElementById('average-grade'),
    averageAttendance: document.getElementById('average-attendance'),

    // Table elements
    tableBody: document.getElementById('table-body'),
    searchInput: document.getElementById('search-input'),
    courseFilter: document.getElementById('course-filter'),
    gradeFilter: document.getElementById('grade-filter'),
    pagination: document.getElementById('pagination'),

    // Modal elements
    modal: document.getElementById('student-modal'),
    addBtn: document.getElementById('add-student-btn'),
    closeModal: document.getElementById('close-modal'),
    cancelModal: document.getElementById('cancel-modal'),
    studentForm: document.getElementById('student-form'),
    modalTitle: document.getElementById('modal-title'),

    // Form inputs
    internalId: document.getElementById('student-internal-id'),
    studentId: document.getElementById('student-id'),
    studentName: document.getElementById('student-name'),
    studentCourse: document.getElementById('student-course'),
    studentGrade: document.getElementById('student-grade'),
    studentAttendance: document.getElementById('student-attendance'),
    courseSuggestions: document.getElementById('course-suggestions'),

    // Import/Export
    importBtn: document.getElementById('import-btn'),
    exportBtn: document.getElementById('export-btn'),
    importFile: document.getElementById('import-file')
};

let courseChartInstance = null;

// Initialize app
function init() {
    loadTheme();
    setupEventListeners();
    updateDashboard();
}

// Check initial Theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Update chart colors if chart exists
    if (courseChartInstance) {
        updateChartTheme();
    }
}

function updateThemeIcon(theme) {
    const icon = elements.themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.toggleSidebar.addEventListener('click', () => {
        elements.sidebar.classList.toggle('collapsed');
    });
    elements.mobileMenu.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
    });

    // Filtering & Searching
    elements.searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
    elements.courseFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });
    elements.gradeFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });

    // Table sorting
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Modal
    elements.addBtn.addEventListener('click', openAddModal);
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelModal.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });

    // Form
    elements.studentForm.addEventListener('submit', handleFormSubmit);

    // Form validation on input
    ['studentId', 'studentName', 'studentCourse', 'studentGrade', 'studentAttendance'].forEach(field => {
        elements[field].addEventListener('input', () => validateField(elements[field]));
    });

    // Import/Export
    elements.exportBtn.addEventListener('click', exportData);
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', importData);
}

// Data Management
function saveStudents() {
    localStorage.setItem('students', JSON.stringify(students));
    updateDashboard();
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fas fa-info-circle';
    if(type === 'success') icon = 'fas fa-check-circle';
    if(type === 'error') icon = 'fas fa-exclamation-circle';

    toast.innerHTML = `<i class="${icon}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Dashboard Update
function updateDashboard() {
    // Update Stats
    elements.totalStudents.textContent = students.length;
    
    const validGrades = students.filter(s => !isNaN(s.grade) && s.grade !== '');
    const avgGrade = validGrades.length ? 
        (validGrades.reduce((sum, s) => sum + parseFloat(s.grade), 0) / validGrades.length).toFixed(1) : 0;
    
    const validAttendance = students.filter(s => !isNaN(s.attendance) && s.attendance !== '');
    const avgAttendance = validAttendance.length ? 
        (validAttendance.reduce((sum, s) => sum + parseFloat(s.attendance), 0) / validAttendance.length).toFixed(1) : 0;

    elements.averageGrade.textContent = `${avgGrade}%`;
    elements.averageAttendance.textContent = `${avgAttendance}%`;

    updateCourseFilter();
    updateChart();
    renderTable();
}

function updateCourseFilter() {
    const courses = [...new Set(students.map(s => s.course))].sort();
    
    // Update DataList for suggestions
    elements.courseSuggestions.innerHTML = courses.map(c => `<option value="${c}">`).join('');
    
    // Update Filter Dropdown
    const currentVal = elements.courseFilter.value;
    let optionsHTML = '<option value="">All Courses</option>';
    courses.forEach(c => {
        optionsHTML += `<option value="${c}">${c}</option>`;
    });
    elements.courseFilter.innerHTML = optionsHTML;
    
    if (courses.includes(currentVal)) {
        elements.courseFilter.value = currentVal;
    }
}

// Chart.js
function updateChart() {
    const ctx = document.getElementById('courseChart').getContext('2d');
    
    const courseCount = students.reduce((acc, student) => {
        acc[student.course] = (acc[student.course] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(courseCount);
    const data = Object.values(courseCount);

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

    if (courseChartInstance) {
        courseChartInstance.destroy();
    }

    if (labels.length === 0) {
        return; // Don't draw empty chart
    }

    courseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: data,
                backgroundColor: '#4361ee',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

function updateChartTheme() {
    updateChart();
}

// Table logic
function getFilteredAndSortedStudents() {
    let result = [...students];

    // Search
    const query = elements.searchInput.value.toLowerCase();
    if (query) {
        result = result.filter(s => 
            s.name.toLowerCase().includes(query) || 
            s.id.toLowerCase().includes(query)
        );
    }

    // Course Filter
    const course = elements.courseFilter.value;
    if (course) {
        result = result.filter(s => s.course === course);
    }

    // Grade Filter
    const gradeFilter = elements.gradeFilter.value;
    if (gradeFilter) {
        result = result.filter(s => {
            const g = parseFloat(s.grade);
            if (gradeFilter === 'A') return g >= 90;
            if (gradeFilter === 'B') return g >= 80 && g < 90;
            if (gradeFilter === 'C') return g >= 70 && g < 80;
            if (gradeFilter === 'D') return g < 70;
            return true;
        });
    }

    // Sorting
    result.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];

        // Numeric sort for grade and attendance
        if (['grade', 'attendance'].includes(currentSort.column)) {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
}

function handleSort(column) {
    if (currentSort.column === column) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.order = 'asc';
    }

    // Update icons
    document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'fa-solid fa-sort';
    });
    
    const targetTh = document.querySelector(`th[data-sort="${column}"] i`);
    if (targetTh) {
        targetTh.className = currentSort.order === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
    }

    renderTable();
}

function getGradeBadgeClass(grade) {
    if (grade >= 90) return 'badge-success';
    if (grade >= 80) return 'badge-info';
    if (grade >= 70) return 'badge-warning';
    return 'badge-danger';
}

function renderTable() {
    const filtered = getFilteredAndSortedStudents();
    
    // Pagination logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage === 0) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(start, start + itemsPerPage);

    // Find top performing student across the WHOLE dataset (or filtered)
    let topGrade = -1;
    if (filtered.length > 0) {
        topGrade = Math.max(...filtered.map(s => parseFloat(s.grade)));
    }

    elements.tableBody.innerHTML = '';

    if (paginatedItems.length === 0) {
        elements.tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
    } else {
        paginatedItems.forEach(student => {
            const tr = document.createElement('tr');
            
            // Highlight top performing
            if (parseFloat(student.grade) === topGrade && topGrade >= 90) {
                tr.classList.add('top-student');
            }

            tr.innerHTML = `
                <td>${student.id}</td>
                <td>
                    <strong>${student.name}</strong>
                    ${parseFloat(student.grade) === topGrade && topGrade >= 90 ? ' <i class="fa-solid fa-crown" style="color: #f59e0b;" title="Top Student"></i>' : ''}
                </td>
                <td>${student.course}</td>
                <td><span class="badge ${getGradeBadgeClass(parseFloat(student.grade))}">${student.grade}%</span></td>
                <td>${student.attendance}%</td>
                <td class="actions-cell">
                    <button class="icon-btn edit-btn" onclick="editStudent('${student.internalId}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="icon-btn delete-btn" onclick="deleteStudent('${student.internalId}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            elements.tableBody.appendChild(tr);
        });
    }

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    elements.pagination.innerHTML = '';
    
    if (totalPages <= 1) return;

    const createBtn = (text, onClick, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.className = `page-btn ${active ? 'active' : ''}`;
        btn.textContent = text;
        btn.disabled = disabled;
        btn.addEventListener('click', onClick);
        return btn;
    };

    elements.pagination.appendChild(createBtn('Prev', () => {
        currentPage--;
        renderTable();
    }, currentPage === 1));

    for (let i = 1; i <= totalPages; i++) {
        elements.pagination.appendChild(createBtn(i, () => {
            currentPage = i;
            renderTable();
        }, false, currentPage === i));
    }

    elements.pagination.appendChild(createBtn('Next', () => {
        currentPage++;
        renderTable();
    }, currentPage === totalPages));
}

// Validation
function validateField(input) {
    const errorMsg = input.nextElementSibling;
    let isValid = true;
    let message = '';

    if (!input.value.trim()) {
        isValid = false;
        message = 'This field is required';
    } else if (input.type === 'number') {
        const val = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        if (isNaN(val) || val < min || val > max) {
            isValid = false;
            message = `Must be between ${min} and ${max}`;
        }
    }

    if (!isValid) {
        input.classList.add('invalid');
        errorMsg.textContent = message;
    } else {
        input.classList.remove('invalid');
        errorMsg.textContent = '';
    }

    return isValid;
}

// Modal and Form Logic
function openAddModal() {
    elements.studentForm.reset();
    elements.internalId.value = '';
    elements.modalTitle.textContent = 'Add Student';
    
    // Clear validation styling
    document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    
    elements.modal.classList.add('show');
}

function closeModal() {
    elements.modal.classList.remove('show');
}

function handleFormSubmit(e) {
    e.preventDefault();

    let isFormValid = true;
    ['studentId', 'studentName', 'studentCourse', 'studentGrade', 'studentAttendance'].forEach(field => {
        if (!validateField(elements[field])) isFormValid = false;
    });

    if (!isFormValid) return;

    const studentData = {
        id: elements.studentId.value.trim(),
        name: elements.studentName.value.trim(),
        course: elements.studentCourse.value.trim(),
        grade: elements.studentGrade.value,
        attendance: elements.studentAttendance.value,
        internalId: elements.internalId.value || Date.now().toString() // unique ID
    };

    const isEdit = !!elements.internalId.value;

    if (isEdit) {
        const index = students.findIndex(s => s.internalId === studentData.internalId);
        if (index !== -1) {
            students[index] = studentData;
            showToast('Student updated successfully', 'success');
        }
    } else {
        // Check if ID already exists
        if (students.some(s => s.id === studentData.id)) {
            elements.studentId.classList.add('invalid');
            elements.studentId.nextElementSibling.textContent = 'Student ID already exists';
            return;
        }
        students.push(studentData);
        showToast('Student added successfully', 'success');
    }

    saveStudents();
    closeModal();
}

// Expose functions to window for onclick handlers
window.editStudent = function(internalId) {
    const student = students.find(s => s.internalId === internalId);
    if (!student) return;

    elements.internalId.value = student.internalId;
    elements.studentId.value = student.id;
    elements.studentName.value = student.name;
    elements.studentCourse.value = student.course;
    elements.studentGrade.value = student.grade;
    elements.studentAttendance.value = student.attendance;
    
    elements.modalTitle.textContent = 'Edit Student';
    
    document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    
    elements.modal.classList.add('show');
};

window.deleteStudent = function(internalId) {
    if (confirm('Are you sure you want to delete this student?')) {
        students = students.filter(s => s.internalId !== internalId);
        saveStudents();
        showToast('Student deleted', 'success');
        
        // Adjust pagination if deleted last item on current page
        const maxPages = Math.ceil(students.length / itemsPerPage);
        if (currentPage > maxPages) {
            currentPage = Math.max(1, maxPages);
        }
        renderTable();
    }
};

// Import/Export Logic
function exportData() {
    const dataStr = JSON.stringify(students, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                
                // Add missing internalIds to imported data if needed
                const validatedData = importedData.map(item => ({
                    ...item,
                    internalId: item.internalId || Date.now().toString() + Math.random().toString(36).substr(2, 5)
                }));

                students = validatedData;
                saveStudents();
                showToast('Data imported successfully', 'success');
                currentPage = 1;
                renderTable();
            } else {
                throw new Error("Invalid format");
            }
        } catch (error) {
            showToast('Failed to import data. Invalid JSON file.', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

// Initialize
document.addEventListener('DOMContentLoaded', init);