/**
 * AuraTask - Mobile-First Engine for Smartphone UX & Full Offline PWA
 * Visual Graphic Eisenhower Matrix with Interactive Below-Diagram Task List
 * Date Range Support, Manual Reordering, Inline Memo/Subtask & Timeline-Calendar Toggle Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY_TASKS = 'auratask_tasks_v4';
  const STORAGE_KEY_PROJECTS = 'auratask_projects_v4';

  const DEFAULT_PROJECTS = [
    { id: 'proj-work', name: '仕事・開発', color: '#3b82f6' },
    { id: 'proj-life', name: 'プライベート', color: '#10b981' },
    { id: 'proj-study', name: '自己啓発', color: '#8b5cf6' }
  ];

  function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDateJapanese(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年 ${months[d.getMonth()]}${d.getDate()}日 (${days[d.getDay()]})`;
  }

  const SEED_TASKS = [
    {
      id: 'task-1',
      title: 'AuraTask マトリクス図表と直下リスト表示の確認',
      completed: false,
      dueDate: getTodayDateString(),
      dueDateEnd: '',
      startTime: '09:00',
      endTime: '10:30',
      matrix: 'Q1',
      projectId: 'proj-work',
      tags: ['開発', 'UI'],
      memo: '図表直下のインタラクティブタスクリストおよびメモ・サブタスク全表示のテスト',
      subtasks: [
        { id: 'sub-1', title: '図表下へのリスト表示追加', completed: true },
        { id: 'sub-2', title: 'メモとサブタスクのカード内直接表示', completed: false }
      ],
      createdAt: new Date().toISOString(),
      isFocus: true
    },
    {
      id: 'task-2',
      title: '中長期的なスキルアップ計画の作成',
      completed: false,
      dueDate: getTodayDateString(),
      dueDateEnd: '',
      startTime: '13:00',
      endTime: '14:30',
      matrix: 'Q2',
      projectId: 'proj-study',
      tags: ['計画'],
      memo: '今年度取得目標の資格とアジャイル開発技術の習得ロードマップを整理する',
      subtasks: [
        { id: 'sub-2-1', title: '目標技術のピックアップ', completed: true },
        { id: 'sub-2-2', title: '学習スケジュールの策定', completed: false }
      ],
      createdAt: new Date().toISOString(),
      isFocus: false
    },
    {
      id: 'task-3',
      title: '急ぎの問い合わせメール返信',
      completed: false,
      dueDate: getTodayDateString(),
      dueDateEnd: '',
      startTime: '15:00',
      endTime: '15:20',
      matrix: 'Q3',
      projectId: 'proj-work',
      tags: ['連絡'],
      memo: '顧客へのサポート回答テンプレートを作成して返信する',
      subtasks: [],
      createdAt: new Date().toISOString(),
      isFocus: false
    },
    {
      id: 'task-4',
      title: '不要な古いファイルの整理',
      completed: false,
      dueDate: '',
      dueDateEnd: '',
      startTime: '',
      endTime: '',
      matrix: 'Q4',
      projectId: 'proj-life',
      tags: ['整理'],
      memo: 'デスクトップおよびダウンロードフォルダのバックアップ',
      subtasks: [],
      createdAt: new Date().toISOString(),
      isFocus: false
    }
  ];

  // Mobile App State
  const state = {
    tasks: [],
    projects: [],
    currentView: 'today',
    taskFilter: 'all',
    sortOption: 'custom',
    searchQuery: '',
    selectedDate: getTodayDateString(),
    calendarViewDate: new Date(),
    editingTaskId: null,
    tempSubtasks: [],
    aiProposedSubtasks: null,
    draggedTaskId: null,
    timelineMode: 'timeline' // 'timeline' or 'calendar'
  };

  function loadState() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      state.tasks = storedTasks ? JSON.parse(storedTasks) : SEED_TASKS;
      state.projects = storedProjects ? JSON.parse(storedProjects) : DEFAULT_PROJECTS;
    } catch (e) {
      console.error(e);
      state.tasks = SEED_TASKS;
      state.projects = DEFAULT_PROJECTS;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(state.tasks));
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(state.projects));
    } catch (e) {
      console.error(e);
    }
    renderCurrentView();
    updateBadges();
  }

  const elements = {};

  function cacheDOMElements() {
    elements.pageTitle = document.getElementById('page-title');
    elements.currentDateText = document.getElementById('current-date-text');
    elements.drawerDateText = document.getElementById('drawer-date-text');
    
    // Header & Mobile Drawer Buttons
    elements.btnOpenDrawer = document.getElementById('btn-open-drawer');
    elements.btnCloseDrawer = document.getElementById('btn-close-drawer');
    elements.drawerOverlay = document.getElementById('drawer-overlay');
    elements.mobileDrawer = document.getElementById('mobile-drawer');

    // Search Bar
    elements.btnToggleSearch = document.getElementById('btn-toggle-search');
    elements.mobileSearchBar = document.getElementById('mobile-search-bar');
    elements.globalSearchInput = document.getElementById('global-search-input');
    elements.searchClearBtn = document.getElementById('search-clear-btn');

    // Badges
    elements.badgeToday = document.getElementById('badge-today');
    elements.badgeTasks = document.getElementById('badge-tasks');
    elements.badgeInbox = document.getElementById('badge-inbox');

    // Navigation Triggers
    elements.drawerItems = document.querySelectorAll('.drawer-item');
    elements.bottomTabs = document.querySelectorAll('.nav-tab');
    elements.viewPanels = document.querySelectorAll('.view-panel');

    // Today View
    elements.focusCardBody = document.getElementById('focus-task-body');
    elements.focusCompleteBtn = document.getElementById('focus-complete-btn');
    elements.listTodayDo = document.getElementById('list-today-do');
    elements.listTodayLater = document.getElementById('list-today-later');
    elements.countTodayDo = document.getElementById('count-today-do');
    elements.countTodayLater = document.getElementById('count-today-later');
    elements.miniTimelineContainer = document.getElementById('mini-timeline-container');
    elements.btnGotoTimeline = document.getElementById('btn-goto-timeline');

    // Tasks View
    elements.listPureTasks = document.getElementById('list-pure-tasks');
    elements.filterChips = document.querySelectorAll('.chip-item');
    elements.sortSelect = document.getElementById('sort-select');

    // Timeline View (切り替えボタン & トグルコンテナ)
    elements.btnModeTimeline = document.getElementById('btn-mode-timeline');
    elements.btnModeCalendar = document.getElementById('btn-mode-calendar');
    elements.timelineViewModeContainer = document.getElementById('timeline-view-mode-container');
    elements.calendarViewModeContainer = document.getElementById('calendar-view-mode-container');

    elements.timelineHoursContainer = document.getElementById('timeline-hours-container');
    elements.timelineUnassignedList = document.getElementById('timeline-unassigned-list');
    elements.timelineCurrentDate = document.getElementById('timeline-current-date');
    elements.timelinePrevDay = document.getElementById('timeline-prev-day');
    elements.timelineNextDay = document.getElementById('timeline-next-day');
    elements.timelineTodayBtn = document.getElementById('timeline-today-btn');
    elements.timelineDatePickerTrigger = document.getElementById('timeline-date-picker-trigger');
    elements.timelineHiddenDateInput = document.getElementById('timeline-hidden-date-input');

    // Calendar Elements (Inline & Standalone)
    elements.calendarGrid = document.getElementById('calendar-grid');
    elements.calMonthYearLabel = document.getElementById('cal-month-year-label');
    elements.calPrevBtn = document.getElementById('cal-prev-btn');
    elements.calNextBtn = document.getElementById('cal-next-btn');
    elements.calTodayBtn = document.getElementById('cal-today-btn');

    elements.calendarGridAlt = document.getElementById('calendar-grid-alt');
    elements.calMonthYearLabelAlt = document.getElementById('cal-month-year-label-alt');
    elements.calPrevBtnAlt = document.getElementById('cal-prev-btn-alt');
    elements.calNextBtnAlt = document.getElementById('cal-next-btn-alt');
    elements.calTodayBtnAlt = document.getElementById('cal-today-btn-alt');

    // Visual Matrix View Elements
    elements.listQ1 = document.getElementById('list-q1');
    elements.listQ2 = document.getElementById('list-q2');
    elements.listQ3 = document.getElementById('list-q3');
    elements.listQ4 = document.getElementById('list-q4');
    elements.countQ1 = document.getElementById('count-q1');
    elements.countQ2 = document.getElementById('count-q2');
    elements.countQ3 = document.getElementById('count-q3');
    elements.countQ4 = document.getElementById('count-q4');

    elements.listQ1Full = document.getElementById('list-q1-full');
    elements.listQ2Full = document.getElementById('list-q2-full');
    elements.listQ3Full = document.getElementById('list-q3-full');
    elements.listQ4Full = document.getElementById('list-q4-full');

    // Inbox & Projects
    elements.listInboxTasks = document.getElementById('list-inbox-tasks');
    elements.projectNavList = document.getElementById('project-navigation-list');
    elements.projectDetailArea = document.getElementById('project-detail-area');
    elements.btnAddProject = document.getElementById('btn-add-project');

    // Task Modal Sheet
    elements.fabAddTask = document.getElementById('fab-add-task');
    elements.taskModal = document.getElementById('task-modal');
    elements.closeTaskModal = document.getElementById('close-task-modal');
    elements.cancelTaskBtn = document.getElementById('cancel-task-btn');
    elements.taskForm = document.getElementById('task-form');
    elements.mobileFormScrollBody = document.querySelector('.mobile-form-scroll-body');
    elements.bottomSheetCard = document.querySelector('.bottom-sheet-card');

    // Form Inputs
    elements.modalTaskTitle = document.getElementById('modal-task-title');
    elements.taskTitleInput = document.getElementById('task-title-input');
    elements.taskDueDate = document.getElementById('task-due-date');
    elements.taskDueDateEnd = document.getElementById('task-due-date-end');
    elements.taskStartTime = document.getElementById('task-start-time');
    elements.taskEndTime = document.getElementById('task-end-time');
    elements.taskMatrixSelect = document.getElementById('task-matrix-select');
    elements.taskProjectSelect = document.getElementById('task-project-select');
    elements.taskTagsInput = document.getElementById('task-tags-input');
    elements.taskMemoInput = document.getElementById('task-memo-input');

    // Subtasks Builder
    elements.newSubtaskInput = document.getElementById('new-subtask-input');
    elements.btnAddSubtaskItem = document.getElementById('btn-add-subtask-item');
    elements.subtaskBuilderList = document.getElementById('subtask-builder-list');

    // AI Modal Elements
    elements.btnAiAssist = document.getElementById('btn-ai-assist');
    elements.aiModal = document.getElementById('ai-modal');
    elements.closeAiModal = document.getElementById('close-ai-modal');
    elements.aiTargetTaskSelect = document.getElementById('ai-target-task-select');
    elements.btnAiRunBreakdown = document.getElementById('btn-ai-run-breakdown');
    elements.btnAiRunMatrix = document.getElementById('btn-ai-run-matrix');
    elements.aiResultsBox = document.getElementById('ai-results-box');
    elements.aiResultsContent = document.getElementById('ai-results-content');
    elements.btnAiApplyResults = document.getElementById('btn-ai-apply-results');
  }

  function bindEvents() {
    // Drawer Open / Close
    elements.btnOpenDrawer.addEventListener('click', openDrawer);
    elements.btnCloseDrawer.addEventListener('click', closeDrawer);
    elements.drawerOverlay.addEventListener('click', closeDrawer);

    // Search Toggle
    elements.btnToggleSearch.addEventListener('click', () => {
      elements.mobileSearchBar.classList.toggle('hidden');
      if (!elements.mobileSearchBar.classList.contains('hidden')) {
        elements.globalSearchInput.focus();
      }
    });

    elements.globalSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      elements.searchClearBtn.classList.toggle('hidden', state.searchQuery === '');
      renderCurrentView();
    });

    elements.searchClearBtn.addEventListener('click', () => {
      elements.globalSearchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.classList.add('hidden');
      renderCurrentView();
    });

    // Navigation Triggers
    elements.drawerItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) {
          switchView(view);
          closeDrawer();
        }
      });
    });

    elements.bottomTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        if (view) switchView(view);
      });
    });

    // Filter Chips
    elements.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.taskFilter = chip.dataset.filter;
        renderTasksView();
      });
    });

    elements.sortSelect.addEventListener('change', (e) => {
      state.sortOption = e.target.value;
      renderTasksView();
    });

    // TIMELINE ⇔ CALENDAR モード切替トグルイベント
    elements.btnModeTimeline.addEventListener('click', () => setTimelineMode('timeline'));
    elements.btnModeCalendar.addEventListener('click', () => setTimelineMode('calendar'));

    // TIMELINE DATE PICKER
    let pressTimer = null;

    const openDatePicker = () => {
      elements.timelineHiddenDateInput.value = state.selectedDate;
      if (typeof elements.timelineHiddenDateInput.showPicker === 'function') {
        elements.timelineHiddenDateInput.showPicker();
      } else {
        elements.timelineHiddenDateInput.click();
      }
    };

    elements.timelineDatePickerTrigger.addEventListener('touchstart', () => {
      pressTimer = setTimeout(openDatePicker, 400);
    });

    elements.timelineDatePickerTrigger.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    elements.timelineDatePickerTrigger.addEventListener('mousedown', () => {
      pressTimer = setTimeout(openDatePicker, 400);
    });

    elements.timelineDatePickerTrigger.addEventListener('mouseup', () => {
      clearTimeout(pressTimer);
    });

    elements.timelineDatePickerTrigger.addEventListener('click', (e) => {
      if (e.target !== elements.timelineHiddenDateInput) openDatePicker();
    });

    elements.timelineHiddenDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedDate = e.target.value;
        renderTimelineView();
      }
    });

    elements.timelinePrevDay.addEventListener('click', () => changeTimelineDay(-1));
    elements.timelineNextDay.addEventListener('click', () => changeTimelineDay(1));
    elements.timelineTodayBtn.addEventListener('click', () => {
      state.selectedDate = getTodayDateString();
      renderTimelineView();
    });
    elements.btnGotoTimeline.addEventListener('click', () => switchView('timeline'));

    // Calendar Controls
    if (elements.calPrevBtn) elements.calPrevBtn.addEventListener('click', () => changeCalendarMonth(-1));
    if (elements.calNextBtn) elements.calNextBtn.addEventListener('click', () => changeCalendarMonth(1));
    if (elements.calTodayBtn) elements.calTodayBtn.addEventListener('click', () => {
      state.calendarViewDate = new Date();
      renderCalendarView();
    });

    if (elements.calPrevBtnAlt) elements.calPrevBtnAlt.addEventListener('click', () => changeCalendarMonth(-1));
    if (elements.calNextBtnAlt) elements.calNextBtnAlt.addEventListener('click', () => changeCalendarMonth(1));
    if (elements.calTodayBtnAlt) elements.calTodayBtnAlt.addEventListener('click', () => {
      state.calendarViewDate = new Date();
      renderCalendarView();
    });

    // Modal Sheet Triggers
    elements.fabAddTask.addEventListener('click', () => openTaskModal());
    elements.closeTaskModal.addEventListener('click', closeTaskModalFunc);
    elements.cancelTaskBtn.addEventListener('click', closeTaskModalFunc);
    elements.taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Subtask Builder
    elements.btnAddSubtaskItem.addEventListener('click', addTempSubtask);
    elements.newSubtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTempSubtask();
      }
    });

    // Focus Task Complete
    elements.focusCompleteBtn.addEventListener('click', () => {
      const focusTask = state.tasks.find(t => t.isFocus && !t.completed);
      if (focusTask) {
        focusTask.completed = true;
        saveState();
      }
    });

    // AI Modal
    elements.btnAiAssist.addEventListener('click', openAiModal);
    elements.closeAiModal.addEventListener('click', closeAiModalFunc);
    elements.btnAiRunBreakdown.addEventListener('click', runAiBreakdown);
    elements.btnAiRunMatrix.addEventListener('click', runAiMatrixOptimize);
    elements.btnAiApplyResults.addEventListener('click', applyAiResults);

    // Add Project
    elements.btnAddProject.addEventListener('click', () => {
      const name = prompt('新規プロジェクト名:');
      if (name && name.trim()) {
        state.projects.push({ id: 'proj-' + Date.now(), name: name.trim(), color: '#3b82f6' });
        saveState();
      }
    });
  }

  function setTimelineMode(mode) {
    state.timelineMode = mode;
    elements.btnModeTimeline.classList.toggle('active', mode === 'timeline');
    elements.btnModeCalendar.classList.toggle('active', mode === 'calendar');

    if (mode === 'timeline') {
      elements.timelineViewModeContainer.classList.remove('hidden');
      elements.calendarViewModeContainer.classList.add('hidden');
    } else {
      elements.timelineViewModeContainer.classList.add('hidden');
      elements.calendarViewModeContainer.classList.remove('hidden');
    }
    renderTimelineView();
  }

  function openDrawer() {
    elements.mobileDrawer.classList.remove('hidden');
    elements.drawerOverlay.classList.remove('hidden');
  }

  function closeDrawer() {
    elements.mobileDrawer.classList.add('hidden');
    elements.drawerOverlay.classList.add('hidden');
  }

  function switchView(viewName) {
    state.currentView = viewName;
    
    elements.bottomTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });
    elements.drawerItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    elements.viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    const titleMap = {
      today: 'Today',
      tasks: 'Tasks',
      timeline: 'Timeline',
      calendar: 'Calendar',
      matrix: 'Eisenhower Matrix',
      inbox: 'Inbox',
      projects: 'Projects'
    };
    elements.pageTitle.textContent = titleMap[viewName] || viewName;

    renderCurrentView();
  }

  function renderCurrentView() {
    const todayStr = getTodayDateString();
    elements.currentDateText.textContent = formatDateJapanese(todayStr);
    elements.drawerDateText.textContent = formatDateJapanese(todayStr);

    switch (state.currentView) {
      case 'today': renderTodayView(); break;
      case 'tasks': renderTasksView(); break;
      case 'timeline': renderTimelineView(); break;
      case 'calendar': renderCalendarView(); break;
      case 'matrix': renderMatrixView(); break;
      case 'inbox': renderInboxView(); break;
      case 'projects': renderProjectsView(); break;
    }
  }

  function getFilteredTasks(taskList) {
    let result = taskList || state.tasks;
    if (state.searchQuery) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(state.searchQuery) ||
        (t.memo && t.memo.toLowerCase().includes(state.searchQuery)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(state.searchQuery)))
      );
    }
    return result;
  }

  function sortTasks(taskList) {
    const list = [...taskList];
    const opt = state.sortOption;

    if (opt === 'custom') {
      return list;
    } else if (opt === 'matrix') {
      const order = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
      list.sort((a, b) => (order[a.matrix] || 4) - (order[b.matrix] || 4));
    } else if (opt === 'dueDate') {
      list.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    } else if (opt === 'createdAt') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (opt === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }
    return list;
  }

  function moveTaskOrder(taskId, direction) {
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= state.tasks.length) return;

    const temp = state.tasks[index];
    state.tasks[index] = state.tasks[targetIndex];
    state.tasks[targetIndex] = temp;

    saveState();
  }

  function createTaskDOMElement(task) {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    item.dataset.id = task.id;
    item.setAttribute('draggable', 'true');

    const reorderControls = document.createElement('div');
    reorderControls.className = 'task-reorder-controls';

    const btnUp = document.createElement('button');
    btnUp.className = 'btn-reorder btn-reorder-up';
    btnUp.setAttribute('aria-label', '上へ移動');
    btnUp.innerHTML = '<svg class="icon"><use href="#icon-arrow-up"/></svg>';
    btnUp.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTaskOrder(task.id, -1);
    });

    const btnDown = document.createElement('button');
    btnDown.className = 'btn-reorder btn-reorder-down';
    btnDown.setAttribute('aria-label', '下へ移動');
    btnDown.innerHTML = '<svg class="icon"><use href="#icon-arrow-down"/></svg>';
    btnDown.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTaskOrder(task.id, 1);
    });

    reorderControls.appendChild(btnUp);
    reorderControls.appendChild(btnDown);

    item.addEventListener('dragstart', (e) => {
      state.draggedTaskId = task.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      state.draggedTaskId = null;
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = state.draggedTaskId;
      if (!draggedId || draggedId === task.id) return;

      const fromIndex = state.tasks.findIndex(t => t.id === draggedId);
      const toIndex = state.tasks.findIndex(t => t.id === task.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedTask] = state.tasks.splice(fromIndex, 1);
        state.tasks.splice(toIndex, 0, movedTask);
        saveState();
      }
    });

    const checkbox = document.createElement('div');
    checkbox.className = `task-checkbox ${task.completed ? 'checked' : ''}`;
    checkbox.innerHTML = task.completed ? '<svg class="icon"><use href="#icon-check"/></svg>' : '';
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      task.completed = !task.completed;
      saveState();
    });

    const content = document.createElement('div');
    content.className = 'task-content';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = task.title;

    const metaRow = document.createElement('div');
    metaRow.className = 'task-meta-row';

    const matrixChip = document.createElement('span');
    matrixChip.className = `meta-chip chip-${task.matrix.toLowerCase()}`;
    matrixChip.textContent = task.matrix;
    metaRow.appendChild(matrixChip);

    if (task.dueDate) {
      const dateChip = document.createElement('span');
      dateChip.className = 'meta-chip';
      const rangeText = task.dueDateEnd ? `${task.dueDate} 〜 ${task.dueDateEnd}` : task.dueDate;
      dateChip.innerHTML = `<svg class="icon"><use href="#icon-calendar"/></svg> ${rangeText}`;
      metaRow.appendChild(dateChip);
    }

    if (task.startTime) {
      const timeChip = document.createElement('span');
      timeChip.className = 'meta-chip';
      timeChip.innerHTML = `<svg class="icon"><use href="#icon-clock"/></svg> ${task.startTime}`;
      metaRow.appendChild(timeChip);
    }

    content.appendChild(title);
    content.appendChild(metaRow);

    if (task.memo && task.memo.trim()) {
      const memoBox = document.createElement('div');
      memoBox.className = 'task-memo-preview';
      memoBox.textContent = task.memo.trim();
      content.appendChild(memoBox);
    }

    if (task.subtasks && task.subtasks.length > 0) {
      const subtaskContainer = document.createElement('div');
      subtaskContainer.className = 'task-subtasks-preview';

      task.subtasks.forEach(sub => {
        const subItem = document.createElement('div');
        subItem.className = `task-subtask-item ${sub.completed ? 'completed' : ''}`;
        
        const subCheck = document.createElement('div');
        subCheck.className = 'subtask-mini-checkbox';
        subCheck.innerHTML = sub.completed ? '<svg class="icon icon-xs"><use href="#icon-check"/></svg>' : '';

        const subTitle = document.createElement('span');
        subTitle.textContent = sub.title;

        subItem.appendChild(subCheck);
        subItem.appendChild(subTitle);

        subItem.addEventListener('click', (e) => {
          e.stopPropagation();
          sub.completed = !sub.completed;

          const allCompleted = task.subtasks.every(s => s.completed);
          if (allCompleted) {
            task.completed = true;
          }

          saveState();
        });

        subtaskContainer.appendChild(subItem);
      });

      content.appendChild(subtaskContainer);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon-sm';
    editBtn.innerHTML = '<svg class="icon"><use href="#icon-edit"/></svg>';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(task.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-sm';
    deleteBtn.innerHTML = '<svg class="icon"><use href="#icon-trash"/></svg>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.tasks = state.tasks.filter(t => t.id !== task.id);
      saveState();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(reorderControls);
    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(actions);

    return item;
  }

  // 1. TODAY VIEW
  function renderTodayView() {
    const todayStr = getTodayDateString();
    const allFiltered = getFilteredTasks(state.tasks);

    const focusTask = allFiltered.find(t => t.isFocus && !t.completed) ||
                      allFiltered.find(t => t.matrix === 'Q1' && !t.completed && (t.dueDate === todayStr || !t.dueDate)) ||
                      allFiltered.find(t => !t.completed && t.dueDate === todayStr);

    elements.focusCardBody.innerHTML = '';
    if (focusTask) {
      const focusTitle = document.createElement('div');
      focusTitle.className = 'focus-title';
      focusTitle.textContent = focusTask.title;

      const focusMeta = document.createElement('div');
      focusMeta.className = 'focus-meta';
      focusMeta.innerHTML = `
        <span><svg class="icon"><use href="#icon-matrix"/></svg> ${focusTask.matrix}</span>
        ${focusTask.startTime ? `<span><svg class="icon"><use href="#icon-clock"/></svg> ${focusTask.startTime}</span>` : ''}
      `;

      elements.focusCardBody.appendChild(focusTitle);
      elements.focusCardBody.appendChild(focusMeta);
      elements.focusCompleteBtn.style.display = 'flex';
    } else {
      elements.focusCardBody.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">現在設定されている最優先タスクはありません</div>';
      elements.focusCompleteBtn.style.display = 'none';
    }

    const todayDoTasks = allFiltered.filter(t => !t.completed && (t.dueDate === todayStr || (t.dueDate <= todayStr && t.dueDateEnd >= todayStr)));
    const todayLaterTasks = allFiltered.filter(t => !t.completed && t.dueDate !== todayStr && t.id !== (focusTask ? focusTask.id : null));

    elements.listTodayDo.innerHTML = '';
    todayDoTasks.forEach(task => elements.listTodayDo.appendChild(createTaskDOMElement(task)));
    elements.countTodayDo.textContent = todayDoTasks.length;

    elements.listTodayLater.innerHTML = '';
    todayLaterTasks.forEach(task => elements.listTodayLater.appendChild(createTaskDOMElement(task)));
    elements.countTodayLater.textContent = todayLaterTasks.length;

    renderMiniTimeline();
  }

  function renderMiniTimeline() {
    const todayStr = getTodayDateString();
    const scheduled = state.tasks.filter(t => !t.completed && (t.dueDate === todayStr || (t.dueDate <= todayStr && t.dueDateEnd >= todayStr)) && t.startTime);
    scheduled.sort((a, b) => a.startTime.localeCompare(b.startTime));

    elements.miniTimelineContainer.innerHTML = '';
    if (scheduled.length === 0) {
      elements.miniTimelineContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px;">時間指定タスクなし</div>';
      return;
    }

    scheduled.forEach(t => {
      const item = document.createElement('div');
      item.className = 'mini-timeline-item';
      item.innerHTML = `
        <span class="mini-time">${t.startTime}</span>
        <span style="font-weight:500;">${t.title}</span>
      `;
      elements.miniTimelineContainer.appendChild(item);
    });
  }

  // 2. TASKS VIEW
  function renderTasksView() {
    let filtered = getFilteredTasks(state.tasks);
    const todayStr = getTodayDateString();

    switch (state.taskFilter) {
      case 'today': filtered = filtered.filter(t => t.dueDate === todayStr || (t.dueDate <= todayStr && t.dueDateEnd >= todayStr)); break;
      case 'uncompleted': filtered = filtered.filter(t => !t.completed); break;
      case 'overdue': filtered = filtered.filter(t => !t.completed && t.dueDate && (t.dueDateEnd ? t.dueDateEnd < todayStr : t.dueDate < todayStr)); break;
      case 'completed': filtered = filtered.filter(t => t.completed); break;
    }

    const sorted = sortTasks(filtered);

    elements.listPureTasks.innerHTML = '';
    if (sorted.length === 0) {
      elements.listPureTasks.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px;">該当するタスクはありません</div>';
      return;
    }

    sorted.forEach(t => elements.listPureTasks.appendChild(createTaskDOMElement(t)));
  }

  // 3. TIMELINE VIEW (Timeline ⇔ Calendar モード切り替え描画)
  function renderTimelineView() {
    elements.timelineCurrentDate.textContent = formatDateJapanese(state.selectedDate);

    if (state.timelineMode === 'timeline') {
      elements.timelineHoursContainer.innerHTML = '';
      const dayTasks = state.tasks.filter(t => (t.dueDate === state.selectedDate || (t.dueDate <= state.selectedDate && t.dueDateEnd >= state.selectedDate)) && t.startTime);

      for (let h = 0; h < 24; h++) {
        const hourStr = String(h).padStart(2, '0') + ':00';
        const row = document.createElement('div');
        row.className = 'hour-row';

        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = hourStr;

        const slot = document.createElement('div');
        slot.className = 'hour-slot';

        const matchingTasks = dayTasks.filter(t => t.startTime && parseInt(t.startTime.split(':')[0], 10) === h);
        matchingTasks.forEach(t => {
          const block = document.createElement('div');
          block.className = 'timeline-block';
          block.style.borderLeftColor = t.matrix === 'Q1' ? 'var(--color-q1-red)' : 'var(--color-q2-yellow)';
          block.innerHTML = `<strong>${t.startTime}</strong> ${t.title}`;
          slot.appendChild(block);
        });

        row.appendChild(label);
        row.appendChild(slot);
        elements.timelineHoursContainer.appendChild(row);
      }

      const unassigned = state.tasks.filter(t => !t.completed && (!t.dueDate || !t.startTime));
      elements.timelineUnassignedList.innerHTML = '';
      unassigned.forEach(t => elements.timelineUnassignedList.appendChild(createTaskDOMElement(t)));
    } else {
      // Calendar モードの描画 (インラインカレンダー)
      renderCalendarView();
    }
  }

  function changeTimelineDay(offset) {
    const d = new Date(state.selectedDate);
    d.setDate(d.getDate() + offset);
    state.selectedDate = d.toISOString().split('T')[0];
    renderTimelineView();
  }

  // 4. CALENDAR VIEW (日付タップで即座にその日のタイムライン表示へ切り替わる親切設計)
  function renderCalendarView() {
    const d = state.calendarViewDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthYearText = `${year}年 ${month + 1}月`;

    if (elements.calMonthYearLabel) elements.calMonthYearLabel.textContent = monthYearText;
    if (elements.calMonthYearLabelAlt) elements.calMonthYearLabelAlt.textContent = monthYearText;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayIndex = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const buildGrid = (targetGrid) => {
      if (!targetGrid) return;
      targetGrid.innerHTML = '';

      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      dayNames.forEach(name => {
        const header = document.createElement('div');
        header.style.padding = '4px';
        header.style.textAlign = 'center';
        header.style.fontSize = '10px';
        header.style.color = 'var(--text-muted)';
        header.textContent = name;
        targetGrid.appendChild(header);
      });

      for (let i = 0; i < startingDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day-cell';
        targetGrid.appendChild(emptyCell);
      }

      const todayStr = getTodayDateString();
      for (let day = 1; day <= totalDays; day++) {
        const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = `cal-day-cell ${cellDateStr === todayStr ? 'today' : ''}`;

        const num = document.createElement('div');
        num.className = 'cal-day-num';
        num.textContent = day;
        cell.appendChild(num);

        const dayTasks = state.tasks.filter(t => t.dueDate === cellDateStr || (t.dueDate <= cellDateStr && t.dueDateEnd >= cellDateStr));
        dayTasks.slice(0, 2).forEach(t => {
          const pill = document.createElement('div');
          pill.className = 'cal-task-pill';
          pill.textContent = t.title;
          cell.appendChild(pill);
        });

        // カレンダーの日付セルをタップすると、その日付のタイムライン軸表示へスムーズに切替
        cell.addEventListener('click', () => {
          state.selectedDate = cellDateStr;
          if (state.currentView === 'timeline') {
            setTimelineMode('timeline');
          } else {
            switchView('timeline');
            setTimelineMode('timeline');
          }
        });

        targetGrid.appendChild(cell);
      }
    };

    buildGrid(elements.calendarGrid);
    buildGrid(elements.calendarGridAlt);
  }

  function changeCalendarMonth(offset) {
    state.calendarViewDate.setMonth(state.calendarViewDate.getMonth() + offset);
    renderCalendarView();
  }

  // 5. EISENHOWER MATRIX VIEW
  function renderMatrixView() {
    const tasks = getFilteredTasks(state.tasks.filter(t => !t.completed));

    const q1List = tasks.filter(t => t.matrix === 'Q1');
    const q2List = tasks.filter(t => t.matrix === 'Q2');
    const q3List = tasks.filter(t => t.matrix === 'Q3');
    const q4List = tasks.filter(t => t.matrix === 'Q4');

    renderVisualQuadrant(elements.listQ1, q1List);
    renderVisualQuadrant(elements.listQ2, q2List);
    renderVisualQuadrant(elements.listQ3, q3List);
    renderVisualQuadrant(elements.listQ4, q4List);

    elements.countQ1.textContent = q1List.length;
    elements.countQ2.textContent = q2List.length;
    elements.countQ3.textContent = q3List.length;
    elements.countQ4.textContent = q4List.length;

    renderFullQuadrantList(elements.listQ1Full, q1List);
    renderFullQuadrantList(elements.listQ2Full, q2List);
    renderFullQuadrantList(elements.listQ3Full, q3List);
    renderFullQuadrantList(elements.listQ4Full, q4List);
  }

  function renderVisualQuadrant(container, taskList) {
    container.innerHTML = '';
    if (taskList.length === 0) {
      container.innerHTML = '<div style="font-size:11px; opacity:0.7; padding:4px;">タスクなし</div>';
      return;
    }
    taskList.forEach(task => {
      const chip = document.createElement('div');
      chip.className = 'v-task-chip';
      chip.textContent = task.title;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task.id);
      });
      container.appendChild(chip);
    });
  }

  function renderFullQuadrantList(container, taskList) {
    container.innerHTML = '';
    if (taskList.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:12px; padding:6px 0;">なし</div>';
      return;
    }
    taskList.forEach(task => {
      container.appendChild(createTaskDOMElement(task));
    });
  }

  // 6. INBOX & PROJECTS
  function renderInboxView() {
    const inboxTasks = state.tasks.filter(t => !t.completed && (!t.projectId || t.projectId === ''));
    elements.listInboxTasks.innerHTML = '';
    if (inboxTasks.length === 0) {
      elements.listInboxTasks.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px;">Inboxは空です</div>';
      return;
    }
    inboxTasks.forEach(t => elements.listInboxTasks.appendChild(createTaskDOMElement(t)));
  }

  function renderProjectsView() {
    elements.projectNavList.innerHTML = '';
    state.projects.forEach(proj => {
      const item = document.createElement('div');
      item.className = 'task-item';
      const count = state.tasks.filter(t => !t.completed && t.projectId === proj.id).length;
      item.innerHTML = `
        <div class="task-content">
          <div class="task-title">${proj.name}</div>
          <div style="font-size:11px; color:var(--text-muted);">${count} 件の未完了タスク</div>
        </div>
      `;
      item.addEventListener('click', () => {
        elements.projectDetailArea.innerHTML = `<h3 style="margin:12px 0;">${proj.name}</h3>`;
        const projTasks = state.tasks.filter(t => t.projectId === proj.id);
        const list = document.createElement('div');
        list.className = 'task-list';
        projTasks.forEach(t => list.appendChild(createTaskDOMElement(t)));
        elements.projectDetailArea.appendChild(list);
      });
      elements.projectNavList.appendChild(item);
    });
  }

  function updateBadges() {
    const todayStr = getTodayDateString();
    const todayCount = state.tasks.filter(t => !t.completed && (t.dueDate === todayStr || (t.dueDate <= todayStr && t.dueDateEnd >= todayStr))).length;
    const totalCount = state.tasks.filter(t => !t.completed).length;
    const inboxCount = state.tasks.filter(t => !t.completed && (!t.projectId || t.projectId === '')).length;

    elements.badgeToday.textContent = todayCount;
    elements.badgeTasks.textContent = totalCount;
    elements.badgeInbox.textContent = inboxCount;
  }

  // BOTTOM SHEET (ADD/EDIT TASK)
  function openTaskModal(taskId = null) {
    state.editingTaskId = taskId;
    state.tempSubtasks = [];

    elements.modalTaskTitle.textContent = '新規タスク';

    elements.taskProjectSelect.innerHTML = '<option value="">未分類 (Inbox)</option>';
    state.projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      elements.taskProjectSelect.appendChild(opt);
    });

    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        elements.taskTitleInput.value = task.title;
        elements.taskDueDate.value = task.dueDate || '';
        elements.taskDueDateEnd.value = task.dueDateEnd || '';
        elements.taskStartTime.value = task.startTime || '';
        elements.taskEndTime.value = task.endTime || '';
        elements.taskMatrixSelect.value = task.matrix || 'Q2';
        elements.taskProjectSelect.value = task.projectId || '';
        elements.taskTagsInput.value = task.tags ? task.tags.join(', ') : '';
        elements.taskMemoInput.value = task.memo || '';
        state.tempSubtasks = task.subtasks ? [...task.subtasks] : [];
      }
    } else {
      elements.taskForm.reset();
      elements.taskDueDate.value = getTodayDateString();
      elements.taskDueDateEnd.value = '';
      elements.taskMatrixSelect.value = 'Q2';
    }

    renderSubtaskBuilderList();

    elements.taskModal.classList.remove('hidden');

    requestAnimationFrame(() => {
      if (elements.mobileFormScrollBody) {
        elements.mobileFormScrollBody.scrollTop = 0;
      }
      if (elements.bottomSheetCard) {
        elements.bottomSheetCard.scrollTop = 0;
      }
      if (elements.taskForm) {
        elements.taskForm.scrollTop = 0;
      }
      elements.taskTitleInput.focus();
    });
  }

  function closeTaskModalFunc() {
    elements.taskModal.classList.add('hidden');
    state.editingTaskId = null;
    state.tempSubtasks = [];
  }

  function addTempSubtask() {
    const text = elements.newSubtaskInput.value.trim();
    if (text) {
      state.tempSubtasks.push({ id: 'sub-' + Date.now(), title: text, completed: false });
      elements.newSubtaskInput.value = '';
      renderSubtaskBuilderList();
    }
  }

  function renderSubtaskBuilderList() {
    elements.subtaskBuilderList.innerHTML = '';
    state.tempSubtasks.forEach((sub, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${sub.title}</span>
        <button type="button" class="btn-icon-sm" data-idx="${idx}">&times;</button>
      `;
      li.querySelector('button').addEventListener('click', () => {
        state.tempSubtasks.splice(idx, 1);
        renderSubtaskBuilderList();
      });
      elements.subtaskBuilderList.appendChild(li);
    });
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    const title = elements.taskTitleInput.value.trim();
    if (!title) return;

    const tagsArray = elements.taskTagsInput.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (state.editingTaskId) {
      const task = state.tasks.find(t => t.id === state.editingTaskId);
      if (task) {
        task.title = title;
        task.dueDate = elements.taskDueDate.value;
        task.dueDateEnd = elements.taskDueDateEnd.value;
        task.startTime = elements.taskStartTime.value;
        task.endTime = elements.taskEndTime.value;
        task.matrix = elements.taskMatrixSelect.value;
        task.projectId = elements.taskProjectSelect.value;
        task.tags = tagsArray;
        task.memo = elements.taskMemoInput.value.trim();
        task.subtasks = state.tempSubtasks;
      }
    } else {
      const newTask = {
        id: 'task-' + Date.now(),
        title: title,
        completed: false,
        dueDate: elements.taskDueDate.value || getTodayDateString(),
        dueDateEnd: elements.taskDueDateEnd.value || '',
        startTime: elements.taskStartTime.value || '',
        endTime: elements.taskEndTime.value || '',
        matrix: elements.taskMatrixSelect.value || 'Q2',
        projectId: elements.taskProjectSelect.value || '',
        tags: tagsArray,
        memo: elements.taskMemoInput.value.trim(),
        subtasks: state.tempSubtasks,
        createdAt: new Date().toISOString(),
        isFocus: false
      };
      state.tasks.unshift(newTask);
    }

    saveState();
    closeTaskModalFunc();
  }

  // AI ASSISTANT MODAL
  function openAiModal() {
    elements.aiTargetTaskSelect.innerHTML = '';
    state.tasks.filter(t => !t.completed).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      elements.aiTargetTaskSelect.appendChild(opt);
    });

    elements.aiResultsBox.classList.add('hidden');
    elements.aiModal.classList.remove('hidden');
  }

  function closeAiModalFunc() {
    elements.aiModal.classList.add('hidden');
  }

  function runAiBreakdown() {
    const taskId = elements.aiTargetTaskSelect.value;
    if (!taskId) return;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    let subtaskSuggestions = ['ステップ1: 現状整理', 'ステップ2: 具体作業の実行', 'ステップ3: 仕上げと確認'];
    if (task.title.includes('引っ越し') || task.title.includes('部屋')) {
      subtaskSuggestions = ['物件探し', '内見予約', '賃貸契約', '断捨離・荷造り', '引っ越し手続き'];
    } else if (task.title.includes('最適化') || task.title.includes('開発') || task.title.includes('UI')) {
      subtaskSuggestions = ['要件の確認', 'レスポンシブデザインの適用', '表示崩れの修正', '実機動作確認'];
    }

    state.aiProposedType = 'breakdown';
    state.aiTargetTaskId = taskId;
    state.aiProposedSubtasks = subtaskSuggestions;

    elements.aiResultsContent.innerHTML = `
      <div style="font-size:12px; font-weight:600; margin-bottom:4px;">「${task.title}」の分解案:</div>
      <ul style="padding-left:18px; font-size:12px; color:var(--text-secondary);">
        ${subtaskSuggestions.map(s => `<li>${s}</li>`).join('')}
      </ul>
    `;
    elements.aiResultsBox.classList.remove('hidden');
  }

  function runAiMatrixOptimize() {
    let reassignments = [];
    state.tasks.forEach(t => {
      let recMatrix = 'Q2';
      if (t.dueDate === getTodayDateString()) recMatrix = 'Q1';
      else recMatrix = 'Q2';

      if (t.matrix !== recMatrix) {
        reassignments.push({ task: t, newMatrix: recMatrix });
      }
    });

    state.aiProposedType = 'matrix';
    state.aiProposedMatrix = reassignments;

    elements.aiResultsContent.innerHTML = `
      <div style="font-size:12px; font-weight:600; margin-bottom:4px;">${reassignments.length}件の自動配置提案:</div>
      <ul style="padding-left:18px; font-size:12px; color:var(--text-secondary);">
        ${reassignments.map(r => `<li>${r.task.title} &rarr; <strong>${r.newMatrix}</strong></li>`).join('')}
      </ul>
    `;
    elements.aiResultsBox.classList.remove('hidden');
  }

  function applyAiResults() {
    if (state.aiProposedType === 'breakdown' && state.aiTargetTaskId) {
      const task = state.tasks.find(t => t.id === state.aiTargetTaskId);
      if (task && state.aiProposedSubtasks) {
        task.subtasks = state.aiProposedSubtasks.map(title => ({
          id: 'sub-' + Date.now() + Math.random(),
          title: title,
          completed: false
        }));
      }
    } else if (state.aiProposedType === 'matrix' && state.aiProposedMatrix) {
      state.aiProposedMatrix.forEach(r => r.task.matrix = r.newMatrix);
    }
    saveState();
    closeAiModalFunc();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('ServiceWorker registered', reg.scope))
        .catch(err => console.error('ServiceWorker error', err));
    }
  }

  function init() {
    cacheDOMElements();
    loadState();
    bindEvents();
    renderCurrentView();
    updateBadges();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
