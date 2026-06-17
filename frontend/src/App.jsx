import React, { useState, useEffect } from 'react';
import { 
  Plus, Play, CheckCircle, AlertOctagon, RefreshCw, 
  User as UserIcon, Shield, Layers, HelpCircle, 
  Trash2, PlusCircle, ArrowRight, Clock, History,
  LogOut, Lock, LogIn, ChevronDown, Check, AlertTriangle,
  Settings, FolderKanban, Pencil, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8292`;

function App() {
  // Authentication & Session
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('pm');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [authError, setAuthError] = useState('');

  // Project and Workspace Data
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [components, setComponents] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rules, setRules] = useState([]);

  // Modals & Forms state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState(null);
  const [showProjectManagement, setShowProjectManagement] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState(null);
  const [showStatusManagement, setShowStatusManagement] = useState(false);
  const [showStatusForm, setShowStatusForm] = useState(false);

  // Filter & Search State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterComponent, setFilterComponent] = useState('');

  // Kanban Column Collapse State
  const [collapsedColumns, setCollapsedColumns] = useState({
    Backlog: false,
    In_Progress: false,
    Review: false,
    Done: false
  });

  // Edit Task State
  const [showEditTask, setShowEditTask] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskDependencies, setEditTaskDependencies] = useState([]);
  const [selectedStatusForEdit, setSelectedStatusForEdit] = useState(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  // User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Developer');
  const [newGroupId, setNewGroupId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  // Status Form State
  const [statusName, setStatusName] = useState('');
  const [statusCategory, setStatusCategory] = useState('Backlog');

  // Group Form State
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPermissions, setGroupPermissions] = useState([]);
  
  // Create Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskComponents, setTaskComponents] = useState([]);
  const [selectedTaskDependencies, setSelectedTaskDependencies] = useState([]);

  // Reject Modal Form State
  const [selectedTaskForReject, setSelectedTaskForReject] = useState(null);
  const [buggyComponents, setBuggyComponents] = useState([]);
  const [rejectReason, setRejectReason] = useState('');

  // Create Rule Form State
  const [ruleOperator, setRuleOperator] = useState('AND');
  const [ruleTargetStatus, setRuleTargetStatus] = useState('');
  const [ruleConditions, setRuleConditions] = useState([{ component_id: '', expected_status_id: '' }]);

  // Active Task for Audit Trail Side-Panel
  const [activeAuditTask, setActiveAuditTask] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // ClickUp-like Features States
  const [currentView, setCurrentView] = useState('board');
  const [activeDetailTab, setActiveDetailTab] = useState('comments');
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [timeLogs, setTimeLogs] = useState([]);
  const [activeRunningTimer, setActiveRunningTimer] = useState(null);
  const [showManualTimeModal, setShowManualTimeModal] = useState(false);
  const [manualTimeComponentStatusId, setManualTimeComponentStatusId] = useState(null);
  const [manualTimeSeconds, setManualTimeSeconds] = useState(3600);
  const [manualTimeDesc, setManualTimeDesc] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Stopwatch counter effect
  useEffect(() => {
    let interval = null;
    if (activeRunningTimer) {
      const start = new Date(activeRunningTimer.start_time).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        setTimerSeconds(diff > 0 ? diff : 0);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeRunningTimer]);

  // Synchronize running timer from database updates
  useEffect(() => {
    if (activeProject && tasks.length > 0 && currentUser) {
      let foundRunning = null;
      for (const t of tasks) {
        for (const tc of t.component_statuses) {
          if (tc.time_logs && tc.time_logs.length > 0) {
            const running = tc.time_logs.find(log => log.end_time === null && log.user_id === currentUser.id);
            if (running) {
              foundRunning = {
                ...running,
                task_id: t.id,
                component_id: tc.component_id,
                component_name: tc.component?.name || "Komponen"
              };
              break;
            }
          }
        }
        if (foundRunning) break;
      }
      setActiveRunningTimer(foundRunning);
    }
  }, [tasks, activeProject, currentUser]);

  const hasPermission = (permission) => (
    currentUser?.role === 'Supadmin' || currentUser?.permissions?.includes(permission)
  );

  const toggleCollapseColumn = (category) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("text/plain", task.id.toString());
  };

  const handleDrop = async (e, category) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData("text/plain");
    const taskId = parseInt(taskIdStr);
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.macro_status?.category === category) return;

    if (!hasPermission('manage_tasks') && !hasPermission('qa_gate')) {
      alert("Anda tidak memiliki akses untuk mengubah status makro task!");
      return;
    }

    const targetStatus = statuses.find(s => s.category === category);
    if (!targetStatus) {
      alert(`Status untuk kategori ${category} tidak ditemukan!`);
      return;
    }

    if (hasPermission('qa_gate') && !hasPermission('manage_tasks')) {
      if (category === 'Done') {
        handleQAOverrideMacro(taskId, targetStatus.id);
      } else if (category === 'In_Progress') {
        setSelectedTaskForReject(task);
        setBuggyComponents([]);
        setRejectReason('');
        setShowRejectModal(true);
      } else {
        alert("QA hanya diperbolehkan menyetujui ke 'Done' atau menolak ke 'In Progress'!");
      }
      return;
    }

    handleQAOverrideMacro(taskId, targetStatus.id);
  };

  const openTaskEditor = (task) => {
    if (!hasPermission('manage_tasks')) {
      alert("Anda tidak memiliki izin untuk mengedit detail task.");
      return;
    }
    setSelectedTaskForEdit(task);
    setEditTaskTitle(task.title || '');
    setEditTaskDesc(task.description || '');
    setEditTaskDueDate(task.due_date || '');
    setEditTaskDependencies(task.dependencies ? task.dependencies.map(d => d.id) : []);
    setShowEditTask(true);
  };

  const toggleEditTaskDependencySelection = (id) => {
    if (editTaskDependencies.includes(id)) {
      setEditTaskDependencies(editTaskDependencies.filter(depId => depId !== id));
    } else {
      setEditTaskDependencies([...editTaskDependencies, id]);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${selectedTaskForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDesc,
          due_date: editTaskDueDate || null,
          dependencies: editTaskDependencies
        })
      });
      if (res.ok) {
        setShowEditTask(false);
        setSelectedTaskForEdit(null);
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isSubTaskOfActiveParent = (task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(dep => {
      const parent = tasks.find(t => t.id === dep.id);
      return parent && parent.macro_status?.category === 'In_Progress';
    });
  };

  const getSubTasksForParent = (parentTask) => {
    if (parentTask.macro_status?.category !== 'In_Progress') return [];
    return tasks.filter(t => t.dependencies && t.dependencies.some(dep => dep.id === parentTask.id));
  };

  const getSelectedGroupName = (groupId) => {
    const selectedGroup = groups.find(group => group.id === parseInt(groupId));
    return selectedGroup?.name || newRole;
  };

  const resetUserForm = () => {
    setNewUsername('');
    setNewEmail('');
    setNewRole('Developer');
    setNewGroupId(groups.find(group => group.name === 'Developer')?.id?.toString() || '');
    setNewPassword('');
  };

  // Auto-refresh timer
  useEffect(() => {
    let interval;
    if (token && activeProject) {
      fetchBoardData();
      interval = setInterval(() => {
        fetchTasksAndAudit();
      }, 3000); // Poll every 3 seconds for real-time aggregation updates
    }
    return () => clearInterval(interval);
  }, [token, activeProject]);

  // Load User Profile on token update
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchMasterData();
    } else {
      setCurrentUser(null);
    }
  }, [token]);

  // Network Fetch Helpers
  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMasterData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Projects
      const projectsRes = await fetch(`${API_URL}/api/v1/projects/`, { headers });
      const projectsData = await projectsRes.json();
      setProjects(projectsData);
      if (projectsData.length > 0) {
        const stillExists = activeProject && projectsData.find(project => project.id === activeProject.id);
        setActiveProject(stillExists || projectsData[0]);
      } else {
        setActiveProject(null);
      }

      // Statuses
      const statusesRes = await fetch(`${API_URL}/api/v1/statuses/`, { headers });
      const statusesData = await statusesRes.json();
      setStatuses(statusesData);

      // Users
      const usersRes = await fetch(`${API_URL}/api/v1/users/`, { headers });
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Groups and permission catalog
      const groupsRes = await fetch(`${API_URL}/api/v1/groups/`, { headers });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
        if (!newGroupId) {
          const developerGroup = groupsData.find(group => group.name === 'Developer');
          if (developerGroup) setNewGroupId(developerGroup.id.toString());
        }
      }

      const permissionsRes = await fetch(`${API_URL}/api/v1/groups/permissions`, { headers });
      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissionCatalog(permissionsData.permissions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBoardData = async () => {
    if (!activeProject) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const projId = activeProject.id;

      // Components
      const compRes = await fetch(`${API_URL}/api/v1/components/?project_id=${projId}`, { headers });
      const compData = await compRes.json();
      setComponents(compData);

      // Rules
      const rulesRes = await fetch(`${API_URL}/api/v1/rules/?project_id=${projId}`, { headers });
      const rulesData = await rulesRes.json();
      setRules(rulesData);

      // Tasks
      await fetchTasksAndAudit();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasksAndAudit = async () => {
    if (!activeProject) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/v1/tasks/?project_id=${activeProject.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTaskDetails = async (task) => {
    if (!task) return;
    setActiveAuditTask(task);
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // 1. Audit logs
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${task.id}/audit-trail`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) { console.error("Error audit logs:", e); }
    
    // 2. Comments
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${task.id}/comments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) { console.error("Error comments:", e); }

    // 3. Checklists
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${task.id}/checklists`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChecklists(data);
      }
    } catch (e) { console.error("Error checklists:", e); }

    // 4. Time Logs
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${task.id}/time-logs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTimeLogs(data);
      }
    } catch (e) { console.error("Error time logs:", e); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${activeAuditTask.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newCommentText })
      });
      if (res.ok) {
        setNewCommentText('');
        loadTaskDetails(activeAuditTask);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Hapus komentar ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${activeAuditTask.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadTaskDetails(activeAuditTask);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklistName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${activeAuditTask.id}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newChecklistName })
      });
      if (res.ok) {
        setNewChecklistName('');
        loadTaskDetails(activeAuditTask);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleChecklist = async (checklistId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${activeAuditTask.id}/checklists/${checklistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_completed: !currentStatus })
      });
      if (res.ok) {
        loadTaskDetails(activeAuditTask);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChecklist = async (checklistId) => {
    if (!confirm('Hapus item checklist ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${activeAuditTask.id}/checklists/${checklistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadTaskDetails(activeAuditTask);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartTimeTracker = async (taskId, componentId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/components/${componentId}/time-logs/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: "Bekerja pada komponen" })
      });
      if (res.ok) {
        const data = await res.json();
        const componentName = components.find(c => c.id === componentId)?.name || "Komponen";
        setActiveRunningTimer({ ...data, task_id: taskId, component_id: componentId, component_name: componentName });
        fetchTasksAndAudit();
        if (activeAuditTask && activeAuditTask.id === taskId) {
          loadTaskDetails(activeAuditTask);
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopTimeTracker = async (taskId, componentId, desc = "") => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/components/${componentId}/time-logs/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: desc || "Selesai pengerjaan komponen" })
      });
      if (res.ok) {
        setActiveRunningTimer(null);
        fetchTasksAndAudit();
        if (activeAuditTask && activeAuditTask.id === taskId) {
          loadTaskDetails(activeAuditTask);
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveManualTime = async (e) => {
    e.preventDefault();
    if (!manualTimeComponentStatusId) return;
    
    let taskId = null;
    let componentId = null;
    for (const t of tasks) {
      const tc = t.component_statuses.find(x => x.id === manualTimeComponentStatusId);
      if (tc) {
        taskId = t.id;
        componentId = tc.component_id;
        break;
      }
    }

    if (!taskId || !componentId) {
      alert("Komponen tidak valid!");
      return;
    }

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (manualTimeSeconds * 1000));
      
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/components/${componentId}/time-logs/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          description: manualTimeDesc || "Log waktu manual"
        })
      });

      if (res.ok) {
        setShowManualTimeModal(false);
        setManualTimeDesc('');
        fetchTasksAndAudit();
        if (activeAuditTask && activeAuditTask.id === taskId) {
          loadTaskDetails(activeAuditTask);
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatSeconds = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const formatHours = (totalSeconds) => {
    if (!totalSeconds) return "0h";
    const hrs = totalSeconds / 3600;
    return `${hrs.toFixed(1)}h`;
  };

  // Auth Operations
  const handleLogin = async (e) => {
    e?.preventDefault();
    setAuthError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginUsername);
      formData.append('password', loginPassword);

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
      } else {
        const errorData = await res.json();
        setAuthError(errorData.detail || 'Login gagal. Cek kembali credentials Anda.');
      }
    } catch (e) {
      setAuthError('Koneksi server gagal.');
    }
  };

  const quickSwitchUser = async (username) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', 'password123');
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    setActiveProject(null);
    setTasks([]);
  };

  // Core Platform Operations
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (taskComponents.length === 0) {
      alert('Pilih minimal satu komponen teknis!');
      return;
    }
    const backlogStatus = statuses.find(s => s.name === 'Backlog');
    if (!backlogStatus) {
      alert('Status "Backlog" tidak terkonfigurasi di sistem.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          due_date: taskDueDate || null,
          project_id: activeProject.id,
          macro_status_id: backlogStatus.id,
          components: taskComponents,
          dependencies: selectedTaskDependencies
        })
      });

      if (res.ok) {
        setShowCreateTask(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskDueDate('');
        setTaskComponents([]);
        setSelectedTaskDependencies([]);
        fetchBoardData();
      } else {
        const error = await res.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateComponentStatus = async (taskId, componentId, statusId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/components/${componentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status_id: statusId })
      });

      if (res.ok) {
        fetchBoardData();
        if (activeAuditTask && activeAuditTask.id === taskId) {
          loadTaskDetails(activeAuditTask);
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignDeveloper = async (taskId, componentId, devId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/components/${componentId}/assignee?assignee_id=${devId || ''}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQAOverrideMacro = async (taskId, targetStatusId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/macro-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status_id: targetStatusId })
      });
      if (res.ok) {
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleQARejectTask = async (e) => {
    e.preventDefault();
    if (buggyComponents.length === 0) {
      alert('Pilih minimal satu komponen yang bermasalah!');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${selectedTaskForReject.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          buggy_component_ids: buggyComponents,
          description: rejectReason
        })
      });

      if (res.ok) {
        setShowRejectModal(false);
        setBuggyComponents([]);
        setRejectReason('');
        setSelectedTaskForReject(null);
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    // Validate inputs
    const validConditions = ruleConditions.filter(c => c.component_id && c.expected_status_id);
    if (validConditions.length === 0) {
      alert('Tambahkan minimal satu kondisi aturan yang valid!');
      return;
    }
    try {
      const url = selectedRuleForEdit
        ? `${API_URL}/api/v1/rules/${selectedRuleForEdit.id}`
        : `${API_URL}/api/v1/rules/`;
      const res = await fetch(url, {
        method: selectedRuleForEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: activeProject.id,
          operator: ruleOperator,
          target_status_id: parseInt(ruleTargetStatus),
          conditions: validConditions.map(c => ({
            component_id: parseInt(c.component_id),
            expected_status_id: parseInt(c.expected_status_id)
          }))
        })
      });

      if (res.ok) {
        setShowCreateRule(false);
        setSelectedRuleForEdit(null);
        setRuleConditions([{ component_id: '', expected_status_id: '' }]);
        setRuleOperator('AND');
        setRuleTargetStatus('');
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/v1/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          role: getSelectedGroupName(newGroupId),
          group_id: newGroupId ? parseInt(newGroupId) : null,
          password: newPassword
        })
      });
      if (res.ok) {
        setShowCreateUser(false);
        resetUserForm();
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const body = {
        username: newUsername,
        email: newEmail,
        role: getSelectedGroupName(newGroupId),
        group_id: newGroupId ? parseInt(newGroupId) : null
      };
      if (newPassword) {
        body.password = newPassword;
      }
      const res = await fetch(`${API_URL}/api/v1/users/${selectedUserForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowEditUser(false);
        resetUserForm();
        setSelectedUserForEdit(null);
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri!");
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aturan agregasi ini?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBoardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openRuleEditor = (rule = null) => {
    setSelectedRuleForEdit(rule);
    setRuleOperator(rule?.operator || 'AND');
    setRuleTargetStatus(rule?.target_status_id?.toString() || '');
    setRuleConditions(
      rule
        ? rule.conditions.map(condition => ({
            component_id: condition.component_id?.toString() || '',
            expected_status_id: condition.expected_status_id?.toString() || ''
          }))
        : [{ component_id: '', expected_status_id: '' }]
    );
    setShowCreateRule(true);
  };

  const openProjectEditor = (project = null) => {
    setSelectedProjectForEdit(project);
    setProjectName(project?.name || '');
    setProjectDesc(project?.description || '');
    setShowProjectForm(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    const url = selectedProjectForEdit
      ? `${API_URL}/api/v1/projects/${selectedProjectForEdit.id}`
      : `${API_URL}/api/v1/projects/`;
    try {
      const res = await fetch(url, {
        method: selectedProjectForEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: projectName, description: projectDesc || null })
      });
      if (res.ok) {
        setShowProjectForm(false);
        setSelectedProjectForEdit(null);
        setProjectName('');
        setProjectDesc('');
        await fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus project ini beserta task, komponen, dan rule di dalamnya?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (activeProject?.id === projectId) setActiveProject(null);
        await fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openStatusEditor = (statusItem = null) => {
    setSelectedStatusForEdit(statusItem);
    setStatusName(statusItem?.name || '');
    setStatusCategory(statusItem?.category || 'Backlog');
    setShowStatusForm(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    const url = selectedStatusForEdit
      ? `${API_URL}/api/v1/statuses/${selectedStatusForEdit.id}`
      : `${API_URL}/api/v1/statuses/`;
    try {
      const res = await fetch(url, {
        method: selectedStatusForEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: statusName, category: statusCategory })
      });
      if (res.ok) {
        setShowStatusForm(false);
        setSelectedStatusForEdit(null);
        setStatusName('');
        setStatusCategory('Backlog');
        fetchMasterData();
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus status ini? Status yang masih dipakai task/rule tidak bisa dihapus.')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/statuses/${statusId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMasterData();
        fetchBoardData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openGroupEditor = (group = null) => {
    setSelectedGroupForEdit(group);
    setGroupName(group?.name || '');
    setGroupDescription(group?.description || '');
    setGroupPermissions(group?.permissions || []);
    setShowGroupForm(true);
  };

  const toggleGroupPermission = (permission) => {
    setGroupPermissions(prev => (
      prev.includes(permission)
        ? prev.filter(item => item !== permission)
        : [...prev, permission]
    ));
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    const url = selectedGroupForEdit
      ? `${API_URL}/api/v1/groups/${selectedGroupForEdit.id}`
      : `${API_URL}/api/v1/groups/`;
    try {
      const res = await fetch(url, {
        method: selectedGroupForEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription || null,
          permissions: groupPermissions
        })
      });
      if (res.ok) {
        setShowGroupForm(false);
        setSelectedGroupForEdit(null);
        setGroupName('');
        setGroupDescription('');
        setGroupPermissions([]);
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus group ini? Group yang masih dipakai user tidak bisa dihapus.')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMasterData();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTaskComponentSelection = (id) => {
    if (taskComponents.includes(id)) {
      setTaskComponents(taskComponents.filter(c => c !== id));
    } else {
      setTaskComponents([...taskComponents, id]);
    }
  };

  const toggleTaskDependencySelection = (id) => {
    if (selectedTaskDependencies.includes(id)) {
      setSelectedTaskDependencies(selectedTaskDependencies.filter(depId => depId !== id));
    } else {
      setSelectedTaskDependencies([...selectedTaskDependencies, id]);
    }
  };

  const toggleBuggyComponentSelection = (id) => {
    if (buggyComponents.includes(id)) {
      setBuggyComponents(buggyComponents.filter(c => c !== id));
    } else {
      setBuggyComponents([...buggyComponents, id]);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterAssignee) {
      const assigneeId = parseInt(filterAssignee);
      const hasAssignee = task.component_statuses?.some(cs => cs.assignee_id === assigneeId);
      if (!hasAssignee) return false;
    }
    if (filterComponent) {
      const compId = parseInt(filterComponent);
      const hasComponent = task.component_statuses?.some(cs => cs.component_id === compId);
      if (!hasComponent) return false;
    }
    return true;
  });

  // Login view if unauthenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex justify-center items-center shadow-lg shadow-indigo-500/25 mb-4">
              <Layers className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 text-center">Smart Project Platform</h1>
            <p className="text-slate-400 text-sm mt-1 text-center">Ticketing Engine dengan Agregasi Status Otomatis</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="pm / developer1 / qa"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="password123"
                required
              />
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-2 px-3 rounded-lg flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded-lg flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Sistem</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Categories Mapping
  const categories = ["Backlog", "In_Progress", "Review", "Done"];
  const categoryLabels = {
    "Backlog": { title: "Backlog & Plan", color: "border-slate-800 text-slate-400 bg-slate-900/40" },
    "In_Progress": { title: "In Progress / Revise", color: "border-amber-500/30 text-amber-400 bg-amber-950/10" },
    "Review": { title: "Testing / Review", color: "border-indigo-500/30 text-indigo-400 bg-indigo-950/10" },
    "Done": { title: "Done & Released", color: "border-emerald-500/30 text-emerald-400 bg-emerald-950/10" }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Nav Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-lg flex justify-center items-center shadow-lg shadow-indigo-500/10">
            <Layers className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Smart Project Aggregator</h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Multi-Component SDLC Board</p>
          </div>
        </div>

        {/* User Role Switcher Nav Panel */}
        <div className="flex flex-wrap items-center gap-4">
          {currentUser && currentUser.role === 'Supadmin' && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2.5">Quick Switch Peran:</span>
              <button 
                onClick={() => quickSwitchUser('supadmin')} 
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${currentUser.username === 'supadmin' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Supadmin
              </button>
              <button 
                onClick={() => quickSwitchUser('pm')} 
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${currentUser.username === 'pm' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                PM
              </button>
              <button 
                onClick={() => quickSwitchUser('developer1')} 
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${currentUser.username === 'developer1' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Developer 1
              </button>
              <button 
                onClick={() => quickSwitchUser('developer2')} 
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${currentUser.username === 'developer2' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Developer 2
              </button>
              <button 
                onClick={() => quickSwitchUser('qa')} 
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${currentUser.username === 'qa' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                QA
              </button>
            </div>
          )}

          {/* Current User Badge */}
          {currentUser && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800/80 pl-3.5 pr-2 py-1.5 rounded-xl">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200 font-mono">@{currentUser.username}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Shield className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold">{currentUser.group_name || currentUser.role}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Top Banner Controls & Stats */}
      <section className="bg-slate-950 px-6 py-6 border-b border-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Project selector dropdown */}
        <div className="lg:col-span-4 flex items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Project:</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-4 pr-10 text-sm font-bold text-slate-100 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const p = projects.find(pr => pr.id === parseInt(e.target.value));
                  setActiveProject(p);
                }}
              >
                {projects.map(p => (
                  <option className="bg-slate-900 text-slate-200" key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button 
            onClick={fetchBoardData}
            className="mt-5 bg-slate-900 hover:bg-slate-850 p-2.5 border border-slate-800/80 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls for PM / QA */}
        <div className="lg:col-span-8 flex flex-wrap gap-3 justify-end items-center">
          <>
            {hasPermission('manage_tasks') && (
              <button 
                onClick={() => setShowCreateTask(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Tiket Task</span>
              </button>
            )}

            {hasPermission('manage_rules') && (
              <button 
                onClick={() => openRuleEditor()}
                className="bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold py-2.5 px-4 border border-slate-800/80 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-purple-400" />
                <span>Buat Rule Agregasi</span>
              </button>
            )}

            {hasPermission('manage_projects') && (
              <button 
                onClick={() => setShowProjectManagement(true)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold py-2.5 px-4 border border-slate-800/80 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-sky-400" />
                <span>Kelola Project</span>
              </button>
            )}

            {hasPermission('manage_statuses') && (
              <button 
                onClick={() => setShowStatusManagement(true)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold py-2.5 px-4 border border-slate-800/80 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Kelola Status</span>
              </button>
            )}

            {hasPermission('manage_users') && (
              <button 
                onClick={() => setShowUserManagement(true)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold py-2.5 px-4 border border-slate-800/80 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>Kelola Pengguna</span>
              </button>
            )}

            {hasPermission('manage_groups') && (
              <button 
                onClick={() => setShowGroupManagement(true)}
                className="bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-bold py-2.5 px-4 border border-slate-800/80 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Shield className="w-4 h-4 text-red-400" />
                <span>Kelola Group</span>
              </button>
            )}
          </>

          {/* Quick Engine Indicator */}
          <div className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-2 rounded-xl border border-indigo-500/20 font-medium max-w-xs leading-normal">
            ⚙️ <span className="font-semibold uppercase tracking-wider">Engine Status:</span> Active & Monitoring
          </div>
        </div>
      </section>

      {/* Filter & Search row */}
      {currentUser && (
        <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-900 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari task..." 
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-48"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Assignee:</span>
            <select 
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option className="bg-slate-900 text-slate-200" value="">Semua</option>
              {users.map(u => (
                <option className="bg-slate-900 text-slate-200" key={u.id} value={u.id}>@{u.username}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Komponen:</span>
            <select 
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
            >
              <option className="bg-slate-900 text-slate-200" value="">Semua</option>
              {components.map(c => (
                <option className="bg-slate-900 text-slate-200" key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {(filterSearch || filterAssignee || filterComponent) && (
            <button 
              onClick={() => { setFilterSearch(''); setFilterAssignee(''); setFilterComponent(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Reset Filter
            </button>
          )}

          {/* ClickUp Views Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 ml-auto">
            <button 
              onClick={() => setCurrentView('board')} 
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${currentView === 'board' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Board View
            </button>
            <button 
              onClick={() => setCurrentView('list')} 
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${currentView === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              List View
            </button>
            <button 
              onClick={() => setCurrentView('gantt')} 
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${currentView === 'gantt' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Gantt View
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Kanban Board Area (takes 3 cols) */}
        <div className="xl:col-span-3 space-y-6">
          {currentView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {categories.map(category => {
              const catTasks = filteredTasks.filter(t => t.macro_status?.category === category && !isSubTaskOfActiveParent(t));
              const { title, color } = categoryLabels[category];
              const isCollapsed = collapsedColumns[category];

              if (isCollapsed) {
                return (
                  <div 
                    key={category} 
                    className="bg-[#f0f1f4]/40 border border-slate-200 w-14 rounded-2xl p-3 flex flex-col items-center gap-4 min-h-[500px] transition-all duration-300"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, category)}
                  >
                    <button 
                      onClick={() => toggleCollapseColumn(category)} 
                      className="bg-white hover:bg-slate-50 p-1 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer shadow-sm"
                      title="Expand Kolom"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                      {catTasks.length}
                    </span>
                    <h2 
                      className="text-xs font-bold text-slate-500 tracking-wider uppercase whitespace-nowrap mt-8" 
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {title}
                    </h2>
                  </div>
                );
              }

              return (
                <div 
                  key={category} 
                  className="bg-[#f0f1f4]/30 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px] transition-all duration-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, category)}
                >
                  
                  {/* Category Header */}
                  <div className={`border-b-2 ${color.split(' ')[0]} pb-3 mb-4 flex items-center justify-between`}>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${category === 'Done' ? 'bg-emerald-500' : category === 'Review' ? 'bg-purple-500' : category === 'In_Progress' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <span>{title}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-200">
                        {catTasks.length}
                      </span>
                      <button 
                        onClick={() => toggleCollapseColumn(category)} 
                        className="bg-white hover:bg-slate-50 p-1 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer shadow-sm"
                        title="Collapse Kolom"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Cards Container */}
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {catTasks.length === 0 ? (
                      <div className="h-full border border-dashed border-slate-300/60 rounded-xl flex flex-col justify-center items-center py-12 text-slate-400 text-xs">
                        <span>Belum ada task</span>
                      </div>
                    ) : (
                      catTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                          onClick={() => loadTaskDetails(task)}
                          onDoubleClick={() => openTaskEditor(task)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-bold text-xs text-slate-800 group-hover:text-purple-650 transition-colors leading-normal">
                              {task.title}
                            </h3>
                            <span className="text-[10px] bg-slate-55 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                              #{task.id}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-slate-500 text-[10px] leading-relaxed mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {task.dependencies.map(dep => {
                                const depTaskOnBoard = tasks.find(t => t.id === dep.id);
                                const isDone = depTaskOnBoard?.macro_status?.category === 'Done';
                                return (
                                  <span 
                                    key={dep.id} 
                                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono ${
                                      isDone 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' 
                                        : 'bg-amber-50 text-amber-600 border border-amber-250'
                                    }`}
                                    title={dep.title}
                                  >
                                    🔗 #{dep.id} {isDone ? '✓' : '⚠️'}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Technical components status board inside card */}
                          <div className="space-y-2.5 border-t border-slate-200 pt-3">
                            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Komponen Teknis:</p>
                            
                            {task.component_statuses.map(cs => {
                              const devUsers = users.filter(u => u.permissions?.includes('update_component_status') || u.role === 'Developer');
                              
                              return (
                                <div key={cs.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-700 font-mono">
                                      🔧 {cs.component?.name}
                                    </span>
                                    
                                    {(hasPermission('manage_tasks') || (hasPermission('update_component_status') && (cs.assignee_id === currentUser.id || !cs.assignee_id))) ? (
                                      <select 
                                        className="bg-white border border-slate-200 text-[9px] font-semibold text-purple-650 rounded px-1.5 py-0.5 focus:outline-none focus:border-purple-400 cursor-pointer"
                                        value={cs.status_id}
                                        onChange={(e) => handleUpdateComponentStatus(task.id, cs.component_id, parseInt(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {statuses.map(s => (
                                          <option className="bg-white text-slate-755" key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        cs.status?.category === 'Done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        cs.status?.category === 'Review' ? 'bg-purple-50 text-purple-650 border border-purple-100' :
                                        cs.status?.category === 'In_Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-slate-100 text-slate-500'
                                      }`}>
                                        {cs.status?.name}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 text-[9px]">
                                    <div className="flex items-center gap-1 text-slate-500 font-mono">
                                      <UserIcon className="w-2.5 h-2.5 text-slate-450" />
                                      {hasPermission('assign_developers') ? (
                                        <select 
                                          className="bg-transparent border-0 text-[9px] text-slate-655 focus:outline-none cursor-pointer"
                                          value={cs.assignee_id || ''}
                                          onChange={(e) => handleAssignDeveloper(task.id, cs.component_id, e.target.value ? parseInt(e.target.value) : null)}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option className="bg-white text-slate-755" value="">Belum Ditugaskan</option>
                                          {devUsers.map(u => (
                                            <option className="bg-white text-slate-755" key={u.id} value={u.id}>@{u.username}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span>{cs.assignee ? `@${cs.assignee.username}` : 'No assignee'}</span>
                                      )}
                                    </div>

                                    {cs.estimated_hours > 0 && (
                                      <span className="text-slate-400 font-mono flex items-center gap-0.5">
                                        <Clock className="w-2 h-2" />
                                        {cs.estimated_hours}h
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Nested Sub-tasks (Dependents) if parent is In Progress */}
                          {task.macro_status?.category === 'In_Progress' && (
                            (() => {
                              const subTasks = getSubTasksForParent(task);
                              if (subTasks.length === 0) return null;
                              return (
                                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                  <p className="text-[9px] uppercase tracking-wider font-bold text-purple-650">Sub-Task Dependensi ({subTasks.length}):</p>
                                  <div className="space-y-1.5 pl-2 border-l border-purple-200">
                                    {subTasks.map(sub => (
                                      <div 
                                        key={sub.id} 
                                        className="bg-white p-2 rounded border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); loadTaskDetails(sub); }}
                                        onDoubleClick={(e) => { e.stopPropagation(); openTaskEditor(sub); }}
                                      >
                                        <div className="flex justify-between items-start gap-1">
                                          <span className="text-[10px] font-bold text-slate-755 line-clamp-1">
                                            #{sub.id} - {sub.title}
                                          </span>
                                          <span className="text-[8px] bg-slate-55 text-slate-500 px-1 rounded border border-slate-200 font-mono shrink-0">
                                            {sub.macro_status?.name}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {sub.component_statuses.map(cs => (
                                            <span 
                                              key={cs.id} 
                                              className="text-[7px] bg-slate-50 text-slate-500 px-1 py-0.5 rounded border border-slate-200"
                                              title={`${cs.component?.name}: ${cs.status?.name}`}
                                            >
                                              {cs.component?.name[0]}: {cs.status?.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()
                          )}

                          {/* Footer Card: Macro Actions */}
                          <div className="mt-3.5 pt-3 border-t border-slate-200 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-550 font-bold bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
                                Makro: <span className="text-slate-700">{task.macro_status?.name}</span>
                              </span>

                              {hasPermission('qa_gate') && (
                                <div className="flex items-center gap-1.5">
                                  {task.macro_status?.category !== 'Done' && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const doneStatus = statuses.find(s => s.name === 'Done');
                                        if (doneStatus) handleQAOverrideMacro(task.id, doneStatus.id);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Approve</span>
                                    </button>
                                  )}

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTaskForReject(task);
                                      setShowRejectModal(true);
                                    }}
                                    className="bg-red-50 hover:bg-red-100 text-red-650 text-[9px] font-bold px-2 py-1 border border-red-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <AlertOctagon className="w-2.5 h-2.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {hasPermission('manage_tasks') && (
                              <select 
                                className="w-full bg-white border border-slate-200 text-[9px] font-semibold text-purple-650 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                                value={task.macro_status_id}
                                onChange={(e) => handleQAOverrideMacro(task.id, parseInt(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option className="bg-white text-slate-755" disabled>Override Status Makro</option>
                                {statuses.map(s => (
                                  <option className="bg-white text-slate-755" key={s.id} value={s.id}>{s.name} (PM Override)</option>
                                ))}
                              </select>
                            )}
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                </div>
              );
            })}
          </div>
          )}

          {currentView === 'list' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50">
                      <th className="pb-3 pt-3 pl-4">ID & Judul Task</th>
                      <th className="pb-3 pt-3">Status Makro</th>
                      <th className="pb-3 pt-3">Komponen (Status & Assignee)</th>
                      <th className="pb-3 pt-3">Estimasi vs Riil</th>
                      <th className="pb-3 pt-3">Due Date</th>
                      <th className="pb-3 pt-3 pr-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-slate-400 italic">
                          Tidak ada task yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => {
                        const totalEst = task.component_statuses.reduce((acc, curr) => acc + curr.estimated_hours, 0);
                        const totalLoggedSeconds = task.component_statuses.reduce((acc, curr) => {
                          const logsDuration = curr.time_logs ? curr.time_logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) : 0;
                          return acc + logsDuration;
                        }, 0);
                        const totalLoggedHours = totalLoggedSeconds / 3600;

                        return (
                          <tr 
                            key={task.id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => loadTaskDetails(task)}
                          >
                            <td className="py-4 pl-4 font-medium text-slate-800 max-w-xs">
                              <div className="flex flex-col gap-1">
                                <span className="text-slate-450 font-mono text-[10px]">#{task.id}</span>
                                <span className="text-sm font-semibold group-hover:text-purple-650 transition-colors">{task.title}</span>
                                {task.dependencies && task.dependencies.length > 0 && (
                                  <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-250 w-fit">
                                    ⚠️ Dependensi: {task.dependencies.map(d => `#${d.id}`).join(', ')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                task.macro_status?.category === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                task.macro_status?.category === 'Review' ? 'bg-purple-50 text-purple-650 border-purple-200' :
                                task.macro_status?.name === 'Under Revision' ? 'bg-red-50 text-red-650 border-red-200' :
                                'bg-slate-100 text-slate-650 border-slate-200'
                              }`}>
                                {task.macro_status?.name}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-wrap gap-2 max-w-sm">
                                {task.component_statuses.map(tc => (
                                  <div key={tc.id} className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1.5 text-[10px]">
                                    <span className="font-semibold text-slate-505">{tc.component?.name}:</span>
                                    <span className="text-slate-700">{tc.status?.name}</span>
                                    <span className="text-slate-500 font-mono">(@{tc.assignee?.username || 'Unassigned'})</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 font-mono text-[11px] text-slate-650">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{totalEst.toFixed(1)}h est</span>
                                <span className="text-slate-400">/</span>
                                <span className={totalLoggedHours > totalEst && totalEst > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                  {totalLoggedHours.toFixed(1)}h logged
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-slate-500">
                              {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                            </td>
                            <td className="py-4 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1.5">
                                {hasPermission('manage_tasks') && (
                                  <button 
                                    onClick={() => openTaskEditor(task)}
                                    className="p-1.5 hover:bg-slate-105 text-slate-450 hover:text-purple-655 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Task"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'gantt' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-in fade-in duration-200 overflow-x-auto shadow-sm">
              <div className="min-w-[800px]">
                <div className="flex border-b border-slate-100 pb-3 mb-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <div className="w-1/3">Task / Judul Pekerjaan</div>
                  <div className="w-2/3 pl-4">Timeline (30 Hari)</div>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-10">Tidak ada task untuk ditampilkan pada timeline.</p>
                ) : (() => {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const dates = Array.from({ length: 30 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(today.getDate() + i);
                    return d;
                  });

                  return (
                    <div className="space-y-3">
                      {filteredTasks.map((task, idx) => {
                        const taskDue = task.due_date ? new Date(task.due_date) : null;
                        if (taskDue) taskDue.setHours(0,0,0,0);
                        
                        const taskStart = taskDue ? new Date(taskDue) : new Date(today);
                        if (taskDue) taskStart.setDate(taskDue.getDate() - 4);
                        else taskStart.setDate(today.getDate() + 2);
                        
                        const startDiff = Math.floor((taskStart.getTime() - today.getTime()) / (1000 * 3600 * 24));
                        const duration = taskDue ? Math.max(1, Math.floor((taskDue.getTime() - taskStart.getTime()) / (1000 * 3600 * 24)) + 1) : 4;
                        
                        const leftPercent = Math.max(0, Math.min(100, (startDiff / 30) * 100));
                        const widthPercent = Math.max(3, Math.min(100 - leftPercent, (duration / 30) * 100));

                        return (
                          <div 
                            key={task.id} 
                            className="flex items-center hover:bg-slate-50 p-2 rounded-xl transition-all cursor-pointer group"
                            onClick={() => loadTaskDetails(task)}
                          >
                            <div className="w-1/3 flex flex-col pr-4">
                              <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-purple-600 transition-colors">
                                {task.title}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Tidak ada due date'}
                              </span>
                            </div>

                            <div className="w-2/3 relative h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center overflow-hidden">
                              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-40">
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <div key={i} className="h-full border-r border-slate-200" style={{ left: `${(i / 6) * 100}%` }} />
                                ))}
                              </div>

                              <div 
                                className={`absolute h-5 rounded-lg flex items-center px-2 shadow-sm transition-all ${
                                  task.macro_status?.category === 'Done' ? 'bg-gradient-to-r from-emerald-600 to-teal-500' :
                                  task.macro_status?.category === 'Review' ? 'bg-gradient-to-r from-purple-600 to-indigo-500' :
                                  task.macro_status?.name === 'Under Revision' ? 'bg-gradient-to-r from-rose-600 to-red-500' :
                                  'bg-gradient-to-r from-slate-500 to-slate-450'
                                }`}
                                style={{ 
                                  left: `${leftPercent}%`, 
                                  width: `${widthPercent}%` 
                                }}
                                title={`${task.title} (${duration} hari)`}
                              >
                                <span className="text-[8px] font-bold text-white font-mono truncate">
                                  {task.macro_status?.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Info Area, Active Rules & Audit Trail (takes 1 col) */}
        <div className="space-y-6">
          
          {/* Rules and aggregation logic list */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-650" />
                <span>Aturan Otomatisasi</span>
              </h2>
              <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded font-mono font-bold">
                {rules.length} Aturan
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {rules.length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">Belum ada aturan otomatisasi untuk proyek ini.</p>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2 relative group">
                    {hasPermission('manage_rules') && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openRuleEditor(rule)}
                          className="text-slate-400 hover:text-purple-600 transition-colors p-1 rounded cursor-pointer"
                          title="Edit Rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
                          title="Hapus Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                        Rule #{rule.id}
                      </span>
                      <span className="text-slate-500">Operator:</span>
                      <span className="bg-purple-100/50 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        {rule.operator}
                      </span>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-1 pl-2 border-l-2 border-slate-200 text-[11px] text-slate-500 leading-normal">
                      {rule.conditions.map((c, idx) => (
                        <div key={c.id || idx}>
                          ⚙️ {c.component?.name} &rarr; <span className="text-slate-700 font-semibold">{c.expected_status?.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] border-t border-slate-200/60 pt-2 text-slate-650">
                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                      <span>Ubah Makro ke:</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        {rule.target_status?.name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ClickUp-like Details Panel */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-650" />
                <span>Detail Pekerjaan</span>
              </h2>
              {activeAuditTask && (
                <button 
                  onClick={() => loadTaskDetails(activeAuditTask)}
                  className="text-slate-400 hover:text-purple-600 transition-colors p-1"
                  title="Sinkronisasi Ulang"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {activeAuditTask ? (
              <div className="space-y-5">
                {/* Task basic card */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tiket Terpilih:</p>
                  <p className="text-xs font-bold text-purple-600">{activeAuditTask.title}</p>
                  {activeAuditTask.description && (
                    <p className="text-[11px] text-slate-650 leading-normal mt-1.5">{activeAuditTask.description}</p>
                  )}
                </div>

                {/* Tab selectors */}
                <div className="flex flex-wrap border-b border-slate-100 gap-1 pb-1">
                  {[
                    { id: 'comments', label: 'Comments', icon: HelpCircle },
                    { id: 'checklist', label: 'Checklist', icon: CheckCircle },
                    { id: 'time', label: 'Time Logs', icon: Clock },
                    { id: 'audit', label: 'Audit Trail', icon: History }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeDetailTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDetailTab(tab.id)}
                        className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          isActive ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content 1: Comments */}
                {activeDetailTab === 'comments' && (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {comments.length === 0 ? (
                        <p className="text-slate-400 italic text-xs py-4 text-center">Belum ada diskusi. Tulis komentar pertama!</p>
                      ) : (
                        comments.map(c => (
                          <div key={c.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="font-bold text-purple-600">@{c.user?.username} ({c.user?.role})</span>
                              <div className="flex items-center gap-2 text-slate-400 font-mono">
                                <span>{new Date(c.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                {(c.user_id === currentUser?.id || hasPermission('manage_tasks')) && (
                                  <button 
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-slate-400 hover:text-red-500 text-xs transition-colors p-0.5"
                                    title="Hapus"
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-700 text-xs leading-normal whitespace-pre-wrap">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Tulis pesan diskusi..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                        required
                      />
                      <button 
                        type="submit" 
                        className="bg-purple-650 hover:bg-[#6a56e5] text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Kirim
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab content 2: Checklist */}
                {activeDetailTab === 'checklist' && (
                  <div className="space-y-4">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {checklists.length === 0 ? (
                        <p className="text-slate-400 italic text-xs py-4 text-center">Belum ada item checklist tugas.</p>
                      ) : (
                        checklists.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 group/item">
                            <div className="flex items-center gap-2.5">
                              <input 
                                type="checkbox" 
                                checked={item.is_completed}
                                onChange={() => handleToggleChecklist(item.id, item.is_completed)}
                                className="w-4 h-4 text-purple-650 border-slate-300 rounded focus:ring-purple-500 bg-white cursor-pointer"
                              />
                              <span className={`text-xs ${item.is_completed ? 'line-through text-slate-400 font-normal' : 'text-slate-700 font-semibold'}`}>
                                {item.name}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleDeleteChecklist(item.id)}
                              className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 text-xs transition-opacity p-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddChecklist} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newChecklistName}
                        onChange={(e) => setNewChecklistName(e.target.value)}
                        placeholder="Tambahkan tugas kecil..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                        required
                      />
                      <button 
                        type="submit" 
                        className="bg-emerald-650 hover:bg-emerald-650 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Tambah
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab content 3: Time Logs */}
                {activeDetailTab === 'time' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tracker Waktu Aktif</p>
                      
                      {activeRunningTimer ? (
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5 animate-pulse">
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" />
                              <span>Stopwatch Berjalan...</span>
                            </p>
                            <p className="text-[10px] text-slate-500">Komponen: <span className="font-semibold text-slate-700">{activeRunningTimer.component_name}</span></p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-base font-bold text-slate-800">{formatSeconds(timerSeconds)}</span>
                            <button
                              onClick={() => handleStopTimeTracker(activeRunningTimer.task_id, activeRunningTimer.component_id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white p-2 rounded-lg transition-colors cursor-pointer"
                              title="Stop Timer"
                            >
                              <div className="w-3 h-3 bg-white rounded-sm" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-slate-500 text-[11px] leading-normal">
                            Pilih komponen Anda dan klik **Start** untuk merekam waktu kerja secara *real-time*.
                          </p>
                          <div className="space-y-2">
                            {activeAuditTask.component_statuses.map(tc => {
                              const isAssignedToMe = tc.assignee_id === currentUser?.id;
                              return (
                                <div key={tc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-150">
                                  <span className="font-semibold text-slate-700 text-[11px]">
                                    {tc.component?.name} 
                                    {!isAssignedToMe && <span className="text-[9px] text-slate-400 ml-1.5 font-normal">(@{tc.assignee?.username || 'Unassigned'})</span>}
                                  </span>
                                  {isAssignedToMe && (
                                    <button
                                      onClick={() => handleStartTimeTracker(activeAuditTask.id, tc.component_id)}
                                      className="bg-purple-650 hover:bg-[#6a56e5] text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Play className="w-2 h-2" />
                                      <span>Start</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider font-bold">Riwayat Jam Kerja</span>
                      <button 
                        onClick={() => {
                          if (activeAuditTask.component_statuses.length > 0) {
                            setManualTimeComponentStatusId(activeAuditTask.component_statuses[0].id);
                            setShowManualTimeModal(true);
                          }
                        }}
                        className="text-purple-605 hover:text-purple-600 font-bold transition-colors cursor-pointer text-[10px]"
                      >
                        + Log Manual
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 text-xs">
                      {timeLogs.length === 0 ? (
                        <p className="text-slate-400 italic py-4 text-center">Belum ada catatan waktu.</p>
                      ) : (
                        timeLogs.map(log => {
                          const compStatus = activeAuditTask.component_statuses.find(x => x.id === log.task_component_status_id);
                          const compName = compStatus?.component?.name || "Komponen";

                          return (
                            <div key={log.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between font-mono text-[8px] text-slate-400">
                                <span>@{log.user?.username} &bull; {compName}</span>
                                <span>{new Date(log.start_time).toLocaleDateString('id-ID')}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-650 text-[11px] italic truncate">"{log.description || 'Tidak ada deskripsi'}"</p>
                                <span className="text-[10px] font-bold text-slate-700 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                  {formatHours(log.duration_seconds)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Tab content 4: Audit Trail */}
                {activeDetailTab === 'audit' && (
                  <div className="space-y-4">
                    {activeAuditTask.dependencies && activeAuditTask.dependencies.length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dependensi Task:</p>
                        <div className="space-y-1.5">
                          {activeAuditTask.dependencies.map(dep => {
                            const depTaskOnBoard = tasks.find(t => t.id === dep.id);
                            const isDone = depTaskOnBoard?.macro_status?.category === 'Done';
                            return (
                              <div key={dep.id} className="flex items-center justify-between text-[10px] leading-relaxed">
                                <span className="text-slate-600 truncate mr-2" title={dep.title}>
                                  🔗 #{dep.id} - {dep.title}
                                </span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  isDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {isDone ? 'Selesai' : 'Belum Selesai'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {auditLogs.length === 0 ? (
                        <p className="text-slate-400 italic text-xs py-4 text-center">Belum ada aktivitas tercatat.</p>
                      ) : (
                        auditLogs.map(log => (
                          <div key={log.id} className="text-[11px] relative pl-3.5 border-l border-slate-200 space-y-1 leading-normal">
                            <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-slate-400 border border-white" />
                            <div className="flex items-center justify-between gap-1 text-[9px] text-slate-400 font-mono">
                              <span>@{log.changed_by}</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-600">
                              <span className="text-slate-400 line-through mr-1.5">{log.old_value}</span>
                              <span className="text-slate-700 font-medium">{log.new_value}</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl py-12 flex flex-col justify-center items-center text-center px-4 bg-slate-50/50">
                <HelpCircle className="w-8 h-8 text-slate-350 mb-2.5" />
                <p className="text-slate-450 text-xs leading-normal">Pilih salah satu kartu tiket task di board atau baris di tabel untuk menampilkan panel detail pekerjaan ClickUp.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* ========================================== */}
      {/* 4. MODALS & PANELS                         */}
      {/* =====================      {/* Manual Time Tracker Modal */}
      {showManualTimeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Log Waktu Pengerjaan</h2>
              <button onClick={() => setShowManualTimeModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSaveManualTime} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Pilih Komponen</label>
                <select 
                  value={manualTimeComponentStatusId || ""}
                  onChange={(e) => setManualTimeComponentStatusId(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                  required
                >
                  {activeAuditTask?.component_statuses.map(tc => (
                    <option className="bg-white text-slate-800" key={tc.id} value={tc.id}>{tc.component?.name} (Assignee: @{tc.assignee?.username || 'None'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Durasi Waktu Kerja</label>
                <select
                  value={manualTimeSeconds}
                  onChange={(e) => setManualTimeSeconds(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                  required
                >
                  <option className="bg-white text-slate-800" value="1800">0.5 Jam (30 Menit)</option>
                  <option className="bg-white text-slate-800" value="3600">1.0 Jam</option>
                  <option className="bg-white text-slate-800" value="7200">2.0 Jam</option>
                  <option className="bg-white text-slate-800" value="14400">4.0 Jam</option>
                  <option className="bg-white text-slate-800" value="28800">8.0 Jam (Full day)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi Aktivitas</label>
                <textarea 
                  value={manualTimeDesc}
                  onChange={(e) => setManualTimeDesc(e.target.value)}
                  placeholder="Menulis kode unit testing, slicing UI, dsb..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 min-h-[60px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowManualTimeModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-purple-650 hover:bg-[#6a56e5] text-white font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Simpan Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A. Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Buat Tiket Task Baru</h2>
              <button onClick={() => setShowCreateTask(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Judul Task</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Misal: Checkout Gateway Integrasi"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi Detail</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 min-h-[80px]"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Penjelasan detil mengenai task ini..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-2">Tenggat Waktu</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-600 font-semibold">Komponen Teknis Terlibat</label>
                <div className="grid grid-cols-2 gap-2">
                  {components.map(comp => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleTaskComponentSelection(comp.id)}
                      className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        taskComponents.includes(comp.id) 
                          ? 'bg-purple-50 border-purple-200 text-purple-650' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>{comp.name}</span>
                      {taskComponents.includes(comp.id) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-600 font-semibold">Ketergantungan Task (Dependensi)</label>
                {tasks.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Belum ada task lain di proyek ini yang dapat dijadikan dependensi.</p>
                ) : (
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                    {tasks.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTaskDependencySelection(t.id)}
                        className={`w-full py-1.5 px-3 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer text-[11px] ${
                          selectedTaskDependencies.includes(t.id)
                            ? 'bg-purple-50 border-purple-200 text-purple-650'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="truncate">#{t.id} - {t.title}</span>
                        {selectedTaskDependencies.includes(t.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateTask(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
                >
                  Simpan Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && selectedTaskForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Edit Detail Tiket Task #{selectedTaskForEdit.id}</h2>
              <button onClick={() => { setShowEditTask(false); setSelectedTaskForEdit(null); }} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Judul Task</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi Detail</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 min-h-[80px]"
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Tenggat Waktu</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-600 font-semibold">Ketergantungan Task (Dependensi)</label>
                {tasks.filter(t => t.id !== selectedTaskForEdit.id).length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Belum ada task lain di proyek ini yang dapat dijadikan dependensi.</p>
                ) : (
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 border border-slate-200 p-2.5 rounded-lg bg-slate-50">
                    {tasks.filter(t => t.id !== selectedTaskForEdit.id).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleEditTaskDependencySelection(t.id)}
                        className={`w-full py-1.5 px-3 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer text-[11px] ${
                          editTaskDependencies.includes(t.id)
                            ? 'bg-purple-50 border-purple-200 text-purple-650'
                            : 'bg-white border-slate-200 text-slate-650 hover:border-slate-350 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="truncate">#{t.id} - {t.title}</span>
                        {editTaskDependencies.includes(t.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setShowEditTask(false); setSelectedTaskForEdit(null); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. QA Reject Modal */}
      {showRejectModal && selectedTaskForReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-red-650 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Pemicu Rollback: Bug / Defect Found</span>
              </h2>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleQARejectTask} className="space-y-4 text-xs">
              <div className="bg-red-50/50 p-3.5 border border-red-100 rounded-xl leading-normal text-slate-650">
                <p className="font-bold text-slate-800 mb-1">Task: {selectedTaskForReject.title}</p>
                Aksi ini akan menurunkan status makro task menjadi <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">Under Revision</span>, serta komponen terpilih kembali ke status <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">In Progress</span>.
              </div>

              <div className="space-y-2">
                <label className="block text-slate-600 font-semibold">Pilih Komponen Bermasalah (Buggy)</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTaskForReject.component_statuses.map(cs => (
                    <button
                      key={cs.component_id}
                      type="button"
                      onClick={() => toggleBuggyComponentSelection(cs.component_id)}
                      className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        buggyComponents.includes(cs.component_id) 
                          ? 'bg-red-50 border-red-200 text-red-600 font-semibold' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>{cs.component?.name}</span>
                      {buggyComponents.includes(cs.component_id) && <AlertOctagon className="w-3.5 h-3.5 text-red-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi Defect / Temuan Bug</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-red-550 min-h-[90px]"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan error, bug, atau kendala spesifik yang ditemukan QA agar dibaca Developer terkait..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowRejectModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
                >
                  Kirim Bug & Rollback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Create Automation Rule Modal */}
      {showCreateRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-650" />
                <span>{selectedRuleForEdit ? 'Edit Aturan Agregasi' : 'Buat Aturan Agregasi Baru'}</span>
              </h2>
              <button onClick={() => { setShowCreateRule(false); setSelectedRuleForEdit(null); }} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-650 font-semibold mb-2">Operator Logika</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                    value={ruleOperator}
                    onChange={(e) => setRuleOperator(e.target.value)}
                  >
                    <option className="bg-white text-slate-800" value="AND">AND (Semua terpenuhi)</option>
                    <option className="bg-white text-slate-800" value="OR">OR (Salah satu terpenuhi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-650 font-semibold mb-2">Target Status Makro</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                    value={ruleTargetStatus}
                    onChange={(e) => setRuleTargetStatus(e.target.value)}
                    required
                  >
                    <option className="bg-white text-slate-800" value="">Pilih Target Status...</option>
                    {statuses.map(s => (
                      <option className="bg-white text-slate-800" key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-650 font-semibold">Kondisi yang Diharapkan</label>
                  <button 
                    type="button" 
                    onClick={() => setRuleConditions([...ruleConditions, { component_id: '', expected_status_id: '' }])}
                    className="text-[10px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Tambah Baris Kondisi
                  </button>
                </div>

                {ruleConditions.map((condition, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                        value={condition.component_id}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].component_id = e.target.value;
                          setRuleConditions(updated);
                        }}
                        required
                      >
                        <option className="bg-white text-slate-800" value="">Pilih Komponen...</option>
                        {components.map(c => (
                          <option className="bg-white text-slate-800" key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                        value={condition.expected_status_id}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].expected_status_id = e.target.value;
                          setRuleConditions(updated);
                        }}
                        required
                      >
                        <option className="bg-white text-slate-800" value="">Pilih Status Diharapkan...</option>
                        {statuses.map(s => (
                          <option className="bg-white text-slate-800" key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {ruleConditions.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => setRuleConditions(ruleConditions.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-650 p-2 cursor-pointer font-bold text-lg"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateRule(false); setSelectedRuleForEdit(null); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
                >
                  {selectedRuleForEdit ? 'Simpan Perubahan' : 'Simpan Aturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-600" />
                <span>Kelola Pengguna Sistem</span>
              </h2>
              <button onClick={() => setShowUserManagement(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-500 font-medium font-semibold">Total terdaftar: <span className="text-purple-600 font-bold font-mono">{users.length} user</span></p>
              <button 
                onClick={() => {
                  resetUserForm();
                  setShowCreateUser(true);
                }}
                className="bg-emerald-650 hover:bg-emerald-650 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah User</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-150 rounded-xl bg-slate-50/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Group Akses</th>
                    <th className="py-3 px-4">Permission</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700 font-mono">@{u.username}</td>
                      <td className="py-3 px-4 text-slate-500">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          u.role === 'PM' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                          u.role === 'QA' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {u.group_name || u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-555 font-mono">{u.permissions?.length || 0} akses</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedUserForEdit(u);
                            setNewUsername(u.username);
                            setNewEmail(u.email);
                            setNewRole(u.role);
                            setNewGroupId(u.group_id?.toString() || '');
                            setNewPassword('');
                            setShowEditUser(true);
                          }}
                          className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-1 px-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        {u.id !== currentUser.id && (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-2.5 border border-red-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setShowUserManagement(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-5 rounded-xl cursor-pointer text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Tambah User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Pengguna Baru</span>
              </h2>
              <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Username</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: dev3"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Contoh: dev3@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Password</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Group Akses</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                  value={newGroupId}
                  onChange={(e) => {
                    setNewGroupId(e.target.value);
                    setNewRole(getSelectedGroupName(e.target.value));
                  }}
                >
                  <option className="bg-white text-slate-800" value="">Pilih group...</option>
                  {groups.map(group => (
                    <option className="bg-white text-slate-800" key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowCreateUser(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F. Edit User Modal */}
      {showEditUser && selectedUserForEdit && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Edit Pengguna: @{selectedUserForEdit.username}</span>
              </h2>
              <button onClick={() => setShowEditUser(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Username</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Password Baru (Opsional)</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-2">Group Akses</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer"
                  value={newGroupId}
                  onChange={(e) => {
                    setNewGroupId(e.target.value);
                    setNewRole(getSelectedGroupName(e.target.value));
                  }}
                  disabled={selectedUserForEdit.id === currentUser.id}
                >
                  <option className="bg-white text-slate-800" value="">Pilih group...</option>
                  {groups.map(group => (
                    <option className="bg-white text-slate-800" key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowEditUser(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* G. Project Management Modal */}
      {showProjectManagement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] flex flex-col text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-purple-650" />
                <span>Kelola Project</span>
              </h2>
              <button onClick={() => setShowProjectManagement(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-500 font-semibold">Total project: <span className="text-purple-600 font-bold font-mono">{projects.length}</span></p>
              <button 
                onClick={() => openProjectEditor()}
                className="bg-purple-650 hover:bg-[#6a56e5] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse-once"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Project</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-xl bg-slate-50/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Nama Project</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-700">{project.name}</td>
                      <td className="py-3 px-4 text-slate-500">{project.description || '-'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openProjectEditor(project)} className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-1 px-2.5 rounded-lg border border-slate-200 cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteProject(project.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-2.5 border border-red-200 rounded-lg cursor-pointer">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{selectedProjectForEdit ? 'Edit Project' : 'Tambah Project'}</h2>
              <button onClick={() => setShowProjectForm(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Nama Project</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 min-h-[80px]" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowProjectForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* H. Status Management Modal */}
      {showStatusManagement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] flex flex-col text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-650" />
                <span>Kelola Status</span>
              </h2>
              <button onClick={() => setShowStatusManagement(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-500 font-medium">Status dipakai sebagai target status makro dan status yang diharapkan pada kondisi rule.</p>
              <button onClick={() => openStatusEditor()} className="bg-purple-650 hover:bg-[#6a56e5] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Status</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-xl bg-slate-50/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Nama Status</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map(statusItem => (
                    <tr key={statusItem.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-700">{statusItem.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{statusItem.category}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openStatusEditor(statusItem)} className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-1 px-2.5 rounded-lg border border-slate-200 cursor-pointer">Edit</button>
                        <button onClick={() => handleDeleteStatus(statusItem.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-2.5 border border-red-200 rounded-lg cursor-pointer">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showStatusForm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{selectedStatusForEdit ? 'Edit Status' : 'Tambah Status'}</h2>
              <button onClick={() => setShowStatusForm(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Nama Status</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500" value={statusName} onChange={(e) => setStatusName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Kategori</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 cursor-pointer" value={statusCategory} onChange={(e) => setStatusCategory(e.target.value)}>
                  <option className="bg-white text-slate-800" value="Backlog">Backlog</option>
                  <option className="bg-white text-slate-800" value="In_Progress">In Progress</option>
                  <option className="bg-white text-slate-800" value="Review">Review</option>
                  <option className="bg-white text-slate-800" value="Done">Done</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowStatusForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* I. Group Management Modal */}
      {showGroupManagement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-5xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[88vh] flex flex-col text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-650" />
                <span>Kelola Group dan Akses</span>
              </h2>
              <button onClick={() => setShowGroupManagement(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-500 font-medium">Group menentukan user bisa mengakses fitur apa saja.</p>
              <button onClick={() => openGroupEditor()} className="bg-purple-650 hover:bg-[#6a56e5] text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Group</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-xl bg-slate-50/30">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">Permission</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {group.name}
                        {group.is_system && <span className="ml-2 text-[9px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">default</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{group.description || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {group.permissions?.map(permission => (
                            <span key={permission} className="text-[9px] bg-slate-50 border border-slate-150 text-slate-600 px-1.5 py-0.5 rounded font-mono">{permission}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openGroupEditor(group)} className="bg-white hover:bg-slate-50 text-slate-650 font-bold py-1 px-2.5 rounded-lg border border-slate-200 cursor-pointer">Edit</button>
                        {!group.is_system && (
                          <button onClick={() => handleDeleteGroup(group.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-2.5 border border-red-200 rounded-lg cursor-pointer">Hapus</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto text-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">{selectedGroupForEdit ? 'Edit Group' : 'Tambah Group'}</h2>
              <button onClick={() => setShowGroupForm(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Nama Group</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)} 
                  required 
                  disabled={selectedGroupForEdit?.is_system} 
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Deskripsi</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 min-h-[70px]" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-2">Permission</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionCatalog.map(permission => (
                    <label key={permission} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${groupPermissions.includes(permission) ? 'bg-purple-50 border-purple-200 text-purple-650' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-350 hover:bg-slate-100/50'}`}>
                      <input type="checkbox" checked={groupPermissions.includes(permission)} onChange={() => toggleGroupPermission(permission)} className="accent-purple-600 text-purple-600" />
                      <span className="font-mono text-[11px]">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowGroupForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-purple-650 hover:bg-[#6a56e5] text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
