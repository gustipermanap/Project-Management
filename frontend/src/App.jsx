import React, { useState, useEffect } from 'react';
import { 
  Plus, Play, CheckCircle, AlertOctagon, RefreshCw, 
  User as UserIcon, Shield, Layers, HelpCircle, 
  Trash2, PlusCircle, ArrowRight, Clock, History,
  LogOut, Lock, LogIn, ChevronDown, Check, AlertTriangle,
  Settings, FolderKanban, Pencil, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8291`;

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

  const loadAuditTrail = async (task) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/v1/tasks/${task.id}/audit-trail`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
        setActiveAuditTask(task);
      }
    } catch (e) {
      console.error(e);
    }
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
          loadAuditTrail(activeAuditTask);
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
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-auto cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      )}

      {/* 3. Main Dashboard Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Kanban Board Area (takes 3 cols) */}
        <div className="xl:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {categories.map(category => {
              const catTasks = filteredTasks.filter(t => t.macro_status?.category === category && !isSubTaskOfActiveParent(t));
              const { title, color } = categoryLabels[category];
              const isCollapsed = collapsedColumns[category];

              if (isCollapsed) {
                return (
                  <div 
                    key={category} 
                    className="bg-slate-900/20 border border-slate-950 w-14 rounded-2xl p-3 flex flex-col items-center gap-4 min-h-[500px] transition-all duration-300"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, category)}
                  >
                    <button 
                      onClick={() => toggleCollapseColumn(category)} 
                      className="bg-slate-950 hover:bg-slate-900 p-1 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      title="Expand Kolom"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <span className="bg-slate-900 text-slate-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-slate-850">
                      {catTasks.length}
                    </span>
                    <h2 
                      className="text-xs font-bold text-slate-400 tracking-wider uppercase whitespace-nowrap mt-8" 
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
                  className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex flex-col min-h-[500px] transition-all duration-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, category)}
                >
                  
                  {/* Category Header */}
                  <div className={`border-b-2 ${color.split(' ')[0]} pb-3 mb-4 flex items-center justify-between`}>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${category === 'Done' ? 'bg-emerald-500' : category === 'Review' ? 'bg-indigo-500' : category === 'In_Progress' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <span>{title}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-slate-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-800">
                        {catTasks.length}
                      </span>
                      <button 
                        onClick={() => toggleCollapseColumn(category)} 
                        className="bg-slate-950 hover:bg-slate-900 p-1 border border-slate-850 rounded-lg text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        title="Collapse Kolom"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Cards Container */}
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {catTasks.length === 0 ? (
                      <div className="h-full border border-dashed border-slate-900/60 rounded-xl flex flex-col justify-center items-center py-12 text-slate-600 text-xs">
                        <span>Belum ada task</span>
                      </div>
                    ) : (
                      catTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer group relative"
                          onClick={() => loadAuditTrail(task)}
                          onDoubleClick={() => openTaskEditor(task)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="font-bold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors leading-normal">
                              {task.title}
                            </h3>
                            <span className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                              #{task.id}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-slate-400 text-[10px] leading-relaxed mb-3 line-clamp-2">
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
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
                          <div className="space-y-2.5 border-t border-slate-800/80 pt-3">
                            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Komponen Teknis:</p>
                            
                            {task.component_statuses.map(cs => {
                              const devUsers = users.filter(u => u.permissions?.includes('update_component_status') || u.role === 'Developer');
                              
                              return (
                                <div key={cs.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-300 font-mono">
                                      🔧 {cs.component?.name}
                                    </span>
                                    
                                    {(hasPermission('manage_tasks') || (hasPermission('update_component_status') && (cs.assignee_id === currentUser.id || !cs.assignee_id))) ? (
                                      <select 
                                        className="bg-slate-900 border border-slate-800 text-[9px] font-semibold text-indigo-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                                        value={cs.status_id}
                                        onChange={(e) => handleUpdateComponentStatus(task.id, cs.component_id, parseInt(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {statuses.map(s => (
                                          <option className="bg-slate-900 text-slate-200" key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        cs.status?.category === 'Done' ? 'bg-emerald-500/10 text-emerald-400' :
                                        cs.status?.category === 'Review' ? 'bg-indigo-500/10 text-indigo-400' :
                                        cs.status?.category === 'In_Progress' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-slate-800 text-slate-400'
                                      }`}>
                                        {cs.status?.name}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 text-[9px]">
                                    <div className="flex items-center gap-1 text-slate-400 font-mono">
                                      <UserIcon className="w-2.5 h-2.5 text-slate-500" />
                                      {hasPermission('assign_developers') ? (
                                        <select 
                                          className="bg-transparent border-0 text-[9px] text-slate-300 focus:outline-none cursor-pointer"
                                          value={cs.assignee_id || ''}
                                          onChange={(e) => handleAssignDeveloper(task.id, cs.component_id, e.target.value ? parseInt(e.target.value) : null)}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option className="bg-slate-900 text-slate-200" value="">Belum Ditugaskan</option>
                                          {devUsers.map(u => (
                                            <option className="bg-slate-900 text-slate-200" key={u.id} value={u.id}>@{u.username}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span>{cs.assignee ? `@${cs.assignee.username}` : 'No assignee'}</span>
                                      )}
                                    </div>

                                    {cs.estimated_hours > 0 && (
                                      <span className="text-slate-500 font-mono flex items-center gap-0.5">
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
                                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                                  <p className="text-[9px] uppercase tracking-wider font-bold text-indigo-400">Sub-Task Dependensi ({subTasks.length}):</p>
                                  <div className="space-y-1.5 pl-2 border-l border-indigo-500/30">
                                    {subTasks.map(sub => (
                                      <div 
                                        key={sub.id} 
                                        className="bg-slate-950/40 p-2 rounded border border-slate-850 hover:border-slate-800 transition-colors cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); loadAuditTrail(sub); }}
                                        onDoubleClick={(e) => { e.stopPropagation(); openTaskEditor(sub); }}
                                      >
                                        <div className="flex justify-between items-start gap-1">
                                          <span className="text-[10px] font-bold text-slate-300 line-clamp-1">
                                            #{sub.id} - {sub.title}
                                          </span>
                                          <span className="text-[8px] bg-slate-900 text-slate-400 px-1 rounded border border-slate-800 font-mono shrink-0">
                                            {sub.macro_status?.name}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {sub.component_statuses.map(cs => (
                                            <span 
                                              key={cs.id} 
                                              className="text-[7px] bg-slate-900 text-slate-400 px-1 py-0.5 rounded border border-slate-850"
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
                          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800/60 rounded px-2 py-0.5">
                                Makro: <span className="text-slate-200">{task.macro_status?.name}</span>
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
                                    className="bg-red-950/40 hover:bg-red-900/30 text-red-400 text-[9px] font-bold px-2 py-1 border border-red-500/20 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <AlertOctagon className="w-2.5 h-2.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {hasPermission('manage_tasks') && (
                              <select 
                                className="w-full bg-slate-950 border border-slate-800 text-[9px] font-semibold text-purple-400 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                                value={task.macro_status_id}
                                onChange={(e) => handleQAOverrideMacro(task.id, parseInt(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option className="bg-slate-900 text-slate-200" disabled>Override Status Makro</option>
                                {statuses.map(s => (
                                  <option className="bg-slate-900 text-slate-200" key={s.id} value={s.id}>{s.name} (PM Override)</option>
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
        </div>

        {/* Info Area, Active Rules & Audit Trail (takes 1 col) */}
        <div className="space-y-6">
          
          {/* Rules and aggregation logic list */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Aturan Otomatisasi</span>
              </h2>
              <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded font-mono font-bold">
                {rules.length} Aturan
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {rules.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">Belum ada aturan otomatisasi untuk proyek ini.</p>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl space-y-2 relative group">
                    {hasPermission('manage_rules') && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openRuleEditor(rule)}
                          className="text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded cursor-pointer"
                          title="Edit Rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded cursor-pointer"
                          title="Hapus Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                        Rule #{rule.id}
                      </span>
                      <span className="text-slate-300">Operator:</span>
                      <span className="bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded text-[10px]">
                        {rule.operator}
                      </span>
                    </div>

                    {/* Conditions */}
                    <div className="space-y-1 pl-2 border-l-2 border-slate-800 text-[11px] text-slate-400 leading-normal">
                      {rule.conditions.map((c, idx) => (
                        <div key={c.id || idx}>
                          ⚙️ {c.component?.name} &rarr; <span className="text-slate-300 font-semibold">{c.expected_status?.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] border-t border-slate-800/60 pt-2 text-slate-300">
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span>Ubah Makro ke:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded">
                        {rule.target_status?.name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit trail list panel */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Audit Trail Logs</span>
              </h2>
              {activeAuditTask && (
                <button 
                  onClick={() => loadAuditTrail(activeAuditTask)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {activeAuditTask ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Task Terpilih:</p>
                  <p className="text-xs font-bold text-indigo-400">{activeAuditTask.title}</p>
                </div>

                {activeAuditTask.dependencies && activeAuditTask.dependencies.length > 0 && (
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dependensi Task:</p>
                    <div className="space-y-1.5">
                      {activeAuditTask.dependencies.map(dep => {
                        const depTaskOnBoard = tasks.find(t => t.id === dep.id);
                        const isDone = depTaskOnBoard?.macro_status?.category === 'Done';
                        return (
                          <div key={dep.id} className="flex items-center justify-between text-[10px] leading-relaxed">
                            <span className="text-slate-300 truncate mr-2" title={dep.title}>
                              🔗 #{dep.id} - {dep.title}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isDone ? 'Selesai' : 'Belum Selesai'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <p className="text-slate-500 italic text-xs py-4 text-center">Belum ada aktivitas tercatat.</p>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="text-xs relative pl-3.5 border-l border-slate-800 space-y-1 leading-normal">
                        <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-950" />
                        
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
                          <span>@{log.changed_by}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        
                        <p className="text-slate-400 text-[11px]">
                          <span className="text-slate-500 line-through mr-1.5">{log.old_value}</span>
                          <span className="text-slate-300 font-medium">{log.new_value}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-900 rounded-xl py-10 flex flex-col justify-center items-center text-center px-4">
                <HelpCircle className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-slate-500 text-xs leading-normal">Pilih salah satu kartu tiket task di board untuk menampilkan log audit trail.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* ========================================== */}
      {/* 4. MODALS & PANELS                         */}
      {/* ========================================== */}

      {/* A. Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">Buat Tiket Task Baru</h2>
              <button onClick={() => setShowCreateTask(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Judul Task</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Misal: Checkout Gateway Integrasi"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Deskripsi Detail</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[80px]"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Penjelasan detil mengenai task ini..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Tenggat Waktu</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Komponen Teknis Terlibat</label>
                <div className="grid grid-cols-2 gap-2">
                  {components.map(comp => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleTaskComponentSelection(comp.id)}
                      className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        taskComponents.includes(comp.id) 
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{comp.name}</span>
                      {taskComponents.includes(comp.id) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Ketergantungan Task (Dependensi)</label>
                {tasks.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">Belum ada task lain di proyek ini yang dapat dijadikan dependensi.</p>
                ) : (
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 border border-slate-800 p-2.5 rounded-lg bg-slate-950/40">
                    {tasks.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTaskDependencySelection(t.id)}
                        className={`w-full py-1.5 px-3 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer text-[11px] ${
                          selectedTaskDependencies.includes(t.id)
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">#{t.id} - {t.title}</span>
                        {selectedTaskDependencies.includes(t.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowCreateTask(false)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">Edit Detail Tiket Task #{selectedTaskForEdit.id}</h2>
              <button onClick={() => { setShowEditTask(false); setSelectedTaskForEdit(null); }} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Judul Task</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Deskripsi Detail</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[80px]"
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Tenggat Waktu</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Ketergantungan Task (Dependensi)</label>
                {tasks.filter(t => t.id !== selectedTaskForEdit.id).length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">Belum ada task lain di proyek ini yang dapat dijadikan dependensi.</p>
                ) : (
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 border border-slate-800 p-2.5 rounded-lg bg-slate-950/40">
                    {tasks.filter(t => t.id !== selectedTaskForEdit.id).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleEditTaskDependencySelection(t.id)}
                        className={`w-full py-1.5 px-3 rounded-md border text-left flex items-center justify-between transition-colors cursor-pointer text-[11px] ${
                          editTaskDependencies.includes(t.id)
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">#{t.id} - {t.title}</span>
                        {editTaskDependencies.includes(t.id) && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => { setShowEditTask(false); setSelectedTaskForEdit(null); }}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Pemicu Rollback: Bug / Defect Found</span>
              </h2>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleQARejectTask} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl leading-normal text-slate-400">
                <p className="font-bold text-slate-300 mb-1">Task: {selectedTaskForReject.title}</p>
                Aksi ini akan menurunkan status makro task menjadi <span className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">Under Revision</span>, serta komponen terpilih kembali ke status <span className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">In Progress</span>.
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Pilih Komponen Bermasalah (Buggy)</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTaskForReject.component_statuses.map(cs => (
                    <button
                      key={cs.component_id}
                      type="button"
                      onClick={() => toggleBuggyComponentSelection(cs.component_id)}
                      className={`py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        buggyComponents.includes(cs.component_id) 
                          ? 'bg-red-600/10 border-red-500 text-red-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{cs.component?.name}</span>
                      {buggyComponents.includes(cs.component_id) && <AlertOctagon className="w-3.5 h-3.5 text-red-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Deskripsi Defect / Temuan Bug</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 min-h-[90px]"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan error, bug, atau kendala spesifik yang ditemukan QA agar dibaca Developer terkait..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowRejectModal(false)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-400" />
                <span>{selectedRuleForEdit ? 'Edit Aturan Agregasi' : 'Buat Aturan Agregasi Baru'}</span>
              </h2>
              <button onClick={() => { setShowCreateRule(false); setSelectedRuleForEdit(null); }} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Operator Logika</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                    value={ruleOperator}
                    onChange={(e) => setRuleOperator(e.target.value)}
                  >
                    <option value="AND">AND (Semua terpenuhi)</option>
                    <option value="OR">OR (Salah satu terpenuhi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Target Status Makro</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                    value={ruleTargetStatus}
                    onChange={(e) => setRuleTargetStatus(e.target.value)}
                    required
                  >
                    <option value="">Pilih Target Status...</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Kondisi yang Diharapkan</label>
                  <button 
                    type="button" 
                    onClick={() => setRuleConditions([...ruleConditions, { component_id: '', expected_status_id: '' }])}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Tambah Baris Kondisi
                  </button>
                </div>

                {ruleConditions.map((condition, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                        value={condition.component_id}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].component_id = e.target.value;
                          setRuleConditions(updated);
                        }}
                        required
                      >
                        <option value="">Pilih Komponen...</option>
                        {components.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                        value={condition.expected_status_id}
                        onChange={(e) => {
                          const updated = [...ruleConditions];
                          updated[idx].expected_status_id = e.target.value;
                          setRuleConditions(updated);
                        }}
                        required
                      >
                        <option value="">Pilih Status Diharapkan...</option>
                        {statuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {ruleConditions.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => setRuleConditions(ruleConditions.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-400 p-2 cursor-pointer font-bold"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateRule(false); setSelectedRuleForEdit(null); }}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-400" />
                <span>Kelola Pengguna Sistem</span>
              </h2>
              <button onClick={() => setShowUserManagement(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-400">Total terdaftar: <span className="text-slate-200 font-bold font-mono">{users.length} user</span></p>
              <button 
                onClick={() => {
                  resetUserForm();
                  setShowCreateUser(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah User</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800/60 rounded-xl bg-slate-950/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Group Akses</th>
                    <th className="py-3 px-4">Permission</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200 font-mono">@{u.username}</td>
                      <td className="py-3 px-4 text-slate-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          u.role === 'PM' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          u.role === 'QA' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.group_name || u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{u.permissions?.length || 0} akses</td>
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
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-1 px-2.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        {u.id !== currentUser.id && (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-red-950/20 hover:bg-red-900/20 text-red-400 font-bold py-1 px-2.5 border border-red-500/20 rounded-lg transition-colors cursor-pointer"
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

            <div className="flex justify-end pt-2 border-t border-slate-800 shrink-0">
              <button 
                onClick={() => setShowUserManagement(false)}
                className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-semibold py-2 px-5 rounded-xl cursor-pointer text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. Tambah User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Tambah Pengguna Baru</span>
              </h2>
              <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Username</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: dev3"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Contoh: dev3@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Password</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Group Akses</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                  value={newGroupId}
                  onChange={(e) => {
                    setNewGroupId(e.target.value);
                    setNewRole(getSelectedGroupName(e.target.value));
                  }}
                >
                  <option value="">Pilih group...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowCreateUser(false)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
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
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Edit Pengguna: @{selectedUserForEdit.username}</span>
              </h2>
              <button onClick={() => setShowEditUser(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Username</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Password Baru (Opsional)</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">Group Akses</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none"
                  value={newGroupId}
                  onChange={(e) => {
                    setNewGroupId(e.target.value);
                    setNewRole(getSelectedGroupName(e.target.value));
                  }}
                  disabled={selectedUserForEdit.id === currentUser.id}
                >
                  <option value="">Pilih group...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditUser(false)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-sky-400" />
                <span>Kelola Project</span>
              </h2>
              <button onClick={() => setShowProjectManagement(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-400">Total project: <span className="text-slate-200 font-bold font-mono">{projects.length}</span></p>
              <button 
                onClick={() => openProjectEditor()}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Project</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800/60 rounded-xl bg-slate-950/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Nama Project</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-200">{project.name}</td>
                      <td className="py-3 px-4 text-slate-400">{project.description || '-'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openProjectEditor(project)} className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-1 px-2.5 rounded-lg border border-slate-800 cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteProject(project.id)} className="bg-red-950/20 hover:bg-red-900/20 text-red-400 font-bold py-1 px-2.5 border border-red-500/20 rounded-lg cursor-pointer">
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
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">{selectedProjectForEdit ? 'Edit Project' : 'Tambah Project'}</h2>
              <button onClick={() => setShowProjectForm(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Nama Project</label>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-sky-500" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Deskripsi</label>
                <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-sky-500 min-h-[80px]" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowProjectForm(false)} className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* H. Status Management Modal */}
      {showStatusManagement && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>Kelola Status</span>
              </h2>
              <button onClick={() => setShowStatusManagement(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-400">Status dipakai sebagai target status makro dan status yang diharapkan pada kondisi rule.</p>
              <button onClick={() => openStatusEditor()} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Status</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800/60 rounded-xl bg-slate-950/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Nama Status</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map(statusItem => (
                    <tr key={statusItem.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-bold text-slate-200">{statusItem.name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{statusItem.category}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openStatusEditor(statusItem)} className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-1 px-2.5 rounded-lg border border-slate-800 cursor-pointer">Edit</button>
                        <button onClick={() => handleDeleteStatus(statusItem.id)} className="bg-red-950/20 hover:bg-red-900/20 text-red-400 font-bold py-1 px-2.5 border border-red-500/20 rounded-lg cursor-pointer">Hapus</button>
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
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">{selectedStatusForEdit ? 'Edit Status' : 'Tambah Status'}</h2>
              <button onClick={() => setShowStatusForm(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Nama Status</label>
                <input className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-amber-500" value={statusName} onChange={(e) => setStatusName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Kategori</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none" value={statusCategory} onChange={(e) => setStatusCategory(e.target.value)}>
                  <option value="Backlog">Backlog</option>
                  <option value="In_Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowStatusForm(false)} className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* I. Group Management Modal */}
      {showGroupManagement && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                <span>Kelola Group dan Akses</span>
              </h2>
              <button onClick={() => setShowGroupManagement(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="flex justify-between items-center shrink-0">
              <p className="text-xs text-slate-400">Group menentukan user bisa mengakses fitur apa saja.</p>
              <button onClick={() => openGroupEditor()} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Group</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-800/60 rounded-xl bg-slate-950/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">Permission</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.id} className="border-b border-slate-800/60 hover:bg-slate-900/40 align-top">
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {group.name}
                        {group.is_system && <span className="ml-2 text-[9px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">default</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{group.description || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {group.permissions?.map(permission => (
                            <span key={permission} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">{permission}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => openGroupEditor(group)} className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-1 px-2.5 rounded-lg border border-slate-800 cursor-pointer">Edit</button>
                        {!group.is_system && (
                          <button onClick={() => handleDeleteGroup(group.id)} className="bg-red-950/20 hover:bg-red-900/20 text-red-400 font-bold py-1 px-2.5 border border-red-500/20 rounded-lg cursor-pointer">Hapus</button>
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
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100">{selectedGroupForEdit ? 'Edit Group' : 'Tambah Group'}</h2>
              <button onClick={() => setShowGroupForm(false)} className="text-slate-400 hover:text-slate-200 text-lg cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleSaveGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Nama Group</label>
                <input 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)} 
                  required 
                  disabled={selectedGroupForEdit?.is_system} 
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Deskripsi</label>
                <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 min-h-[70px]" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Permission</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionCatalog.map(permission => (
                    <label key={permission} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${groupPermissions.includes(permission) ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                      <input type="checkbox" checked={groupPermissions.includes(permission)} onChange={() => toggleGroupPermission(permission)} className="accent-red-500" />
                      <span className="font-mono text-[11px]">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowGroupForm(false)} className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg cursor-pointer">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
