ALL_PERMISSION_KEYS = [
    "view_dashboard",
    "manage_projects",
    "manage_components",
    "manage_tasks",
    "manage_rules",
    "manage_statuses",
    "manage_users",
    "manage_groups",
    "assign_developers",
    "update_component_status",
    "qa_gate",
]

DEFAULT_GROUPS = {
    "Supadmin": {
        "description": "Akses penuh untuk konfigurasi sistem, user, group, project, status, dan rule.",
        "permissions": ALL_PERMISSION_KEYS,
    },
    "PM": {
        "description": "Project manager default untuk operasional project dan task.",
        "permissions": [
            "view_dashboard",
            "manage_projects",
            "manage_components",
            "manage_tasks",
            "manage_rules",
            "manage_users",
            "assign_developers",
        ],
    },
    "Developer": {
        "description": "Developer yang mengerjakan status komponen task.",
        "permissions": [
            "view_dashboard",
            "update_component_status",
        ],
    },
    "QA": {
        "description": "Quality assurance untuk approve atau reject task.",
        "permissions": [
            "view_dashboard",
            "qa_gate",
        ],
    },
}
