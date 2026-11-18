use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct EncryptedVault {
    pub salt: String,
    pub iv: String,
    pub ciphertext: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct VaultSnapshotInfo {
    pub filename: String,
    pub timestamp: u64,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "isPreUpdate")]
    pub is_pre_update: bool,
    pub reason: String,
}

fn write_atomic(dest_path: &Path, data: &str) -> Result<(), String> {
    let parent = dest_path
        .parent()
        .ok_or_else(|| "Failed to get parent directory".to_string())?;

    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let file_stem = dest_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");

    let tmp_path = parent.join(format!(".{}.tmp.{}", file_stem, millis));

    // 1. Write and sync to temporary file
    {
        let mut file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        file.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }

    // 2. Keep .prev file if target already exists
    let prev_path = parent.join(format!("{}.prev", file_stem));
    if dest_path.exists() {
        let _ = fs::copy(dest_path, &prev_path);
    }

    // 3. Atomically replace target
    #[cfg(windows)]
    {
        let old_path = parent.join(format!(".{}.old.{}", file_stem, millis));
        if dest_path.exists() {
            fs::rename(dest_path, &old_path).map_err(|e| e.to_string())?;
        }
        if let Err(e) = fs::rename(&tmp_path, dest_path) {
            if old_path.exists() {
                let _ = fs::rename(&old_path, dest_path);
            }
            let _ = fs::remove_file(&tmp_path);
            return Err(e.to_string());
        }
        if old_path.exists() {
            let _ = fs::remove_file(&old_path);
        }
    }

    #[cfg(not(windows))]
    {
        fs::rename(&tmp_path, dest_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn migrate_legacy_data(target_dir: &PathBuf) {
    if let Some(parent_dir) = target_dir.parent() {
        let legacy_dirs = ["com.cryptex.app", "Cryptex", "com.enclave.app", "Enclave"];

        // 1. Migrate data.vault if target does not have it
        let target_vault = target_dir.join("data.vault");
        if !target_vault.exists() {
            for legacy in &legacy_dirs {
                let legacy_vault = parent_dir.join(legacy).join("data.vault");
                if legacy_vault.exists() {
                    let _ = fs::copy(&legacy_vault, &target_vault);
                    break;
                }
            }
        }

        // 2. Migrate app-config.json if target does not have it
        let target_config = target_dir.join("app-config.json");
        if !target_config.exists() {
            for legacy in &legacy_dirs {
                let legacy_config = parent_dir.join(legacy).join("app-config.json");
                if legacy_config.exists() {
                    let _ = fs::copy(&legacy_config, &target_config);
                    break;
                }
            }
        }
    }
}

fn get_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    migrate_legacy_data(&path);

    path.push("data.vault");
    Ok(path)
}

fn get_backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;
    let backups_dir = app_dir.join("backups");
    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    }
    Ok(backups_dir)
}

fn prune_snapshots(backups_dir: &Path) {
    if let Ok(entries) = fs::read_dir(backups_dir) {
        let mut normal_snapshots = Vec::new();
        let mut pre_update_snapshots = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.ends_with(".vault.bak") {
                        if let Ok(meta) = entry.metadata() {
                            let modified = meta.modified().unwrap_or(UNIX_EPOCH);
                            if name.contains("pre-update") {
                                pre_update_snapshots.push((path, modified));
                            } else {
                                normal_snapshots.push((path, modified));
                            }
                        }
                    }
                }
            }
        }

        normal_snapshots.sort_by(|a, b| b.1.cmp(&a.1));
        pre_update_snapshots.sort_by(|a, b| b.1.cmp(&a.1));

        // Keep 30 normal rolling backups
        if normal_snapshots.len() > 30 {
            for (path, _) in &normal_snapshots[30..] {
                let _ = fs::remove_file(path);
            }
        }

        // Keep up to 10 pre-update backups
        if pre_update_snapshots.len() > 10 {
            for (path, _) in &pre_update_snapshots[10..] {
                let _ = fs::remove_file(path);
            }
        }
    }
}

fn create_snapshot_internal(app: &AppHandle, reason: &str) -> Result<String, String> {
    let vault_path = get_vault_path(app)?;
    if !vault_path.exists() {
        return Err("Cannot snapshot: vault does not exist".to_string());
    }

    let content = fs::read_to_string(&vault_path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() {
        return Err("Cannot snapshot empty vault".to_string());
    }

    let payload: Result<EncryptedVault, _> = serde_json::from_str(&content);
    let payload = payload.map_err(|e| format!("Vault content invalid, refusing to snapshot: {}", e))?;
    if payload.ciphertext.is_empty() || payload.salt.is_empty() || payload.iv.is_empty() {
        return Err("Vault content missing cryptographic fields".to_string());
    }

    let backups_dir = get_backups_dir(app)?;
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let clean_reason: String = reason
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();

    let filename = format!("vault-{}-{}.vault.bak", clean_reason, millis);
    let snapshot_path = backups_dir.join(&filename);

    write_atomic(&snapshot_path, &content)?;
    prune_snapshots(&backups_dir);

    Ok(filename)
}

#[tauri::command]
fn vault_exists(app: AppHandle) -> Result<bool, String> {
    let path = get_vault_path(&app)?;
    Ok(path.exists())
}

#[tauri::command]
fn save_vault(app: AppHandle, payload: EncryptedVault) -> Result<(), String> {
    let path = get_vault_path(&app)?;
    let data = serde_json::to_string(&payload).map_err(|e| e.to_string())?;

    // 1. Snapshot previous state if valid vault already exists on disk
    if path.exists() {
        let _ = create_snapshot_internal(&app, "auto");
    }

    // 2. Atomic write with fsync and .prev retention
    write_atomic(&path, &data)?;
    Ok(())
}

#[tauri::command]
fn load_vault(app: AppHandle) -> Result<EncryptedVault, String> {
    let path = get_vault_path(&app)?;

    // 1. Try reading active vault
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(payload) = serde_json::from_str::<EncryptedVault>(&data) {
                if !payload.ciphertext.is_empty() && !payload.salt.is_empty() && !payload.iv.is_empty() {
                    return Ok(payload);
                }
            }
        }
    }

    // 2. Self-healing fallback: try data.vault.prev
    if let Some(parent) = path.parent() {
        let prev_path = parent.join("data.vault.prev");
        if prev_path.exists() {
            if let Ok(data) = fs::read_to_string(&prev_path) {
                if let Ok(payload) = serde_json::from_str::<EncryptedVault>(&data) {
                    if !payload.ciphertext.is_empty() && !payload.salt.is_empty() && !payload.iv.is_empty() {
                        let _ = fs::copy(&prev_path, &path);
                        eprintln!("[Tectoryx] Self-healed active vault from data.vault.prev");
                        return Ok(payload);
                    }
                }
            }
        }
    }

    // 3. Self-healing fallback: try latest valid snapshot in backups/
    if let Ok(backups_dir) = get_backups_dir(&app) {
        if let Ok(entries) = fs::read_dir(&backups_dir) {
            let mut snapshots: Vec<(PathBuf, SystemTime)> = Vec::new();
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() && p.extension().map_or(false, |ext| ext == "bak") {
                    if let Ok(meta) = p.metadata() {
                        snapshots.push((p, meta.modified().unwrap_or(UNIX_EPOCH)));
                    }
                }
            }
            snapshots.sort_by(|a, b| b.1.cmp(&a.1));

            for (snap_path, _) in snapshots {
                if let Ok(data) = fs::read_to_string(&snap_path) {
                    if let Ok(payload) = serde_json::from_str::<EncryptedVault>(&data) {
                        if !payload.ciphertext.is_empty() && !payload.salt.is_empty() && !payload.iv.is_empty() {
                            let _ = fs::copy(&snap_path, &path);
                            eprintln!("[Tectoryx] Self-healed active vault from backup: {:?}", snap_path.file_name());
                            return Ok(payload);
                        }
                    }
                }
            }
        }
    }

    if !path.exists() {
        return Err("Vault does not exist".to_string());
    }

    Err("Vault is corrupted and no valid recovery snapshots could be restored".to_string())
}

#[tauri::command]
fn delete_vault(app: AppHandle) -> Result<(), String> {
    let path = get_vault_path(&app)?;
    if path.exists() {
        let _ = create_snapshot_internal(&app, "pre-erase");
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn list_vault_snapshots(app: AppHandle) -> Result<Vec<VaultSnapshotInfo>, String> {
    let backups_dir = get_backups_dir(&app)?;
    let mut snapshots = Vec::new();

    if let Ok(entries) = fs::read_dir(&backups_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "bak") {
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    if let Ok(meta) = path.metadata() {
                        let modified = meta.modified().unwrap_or(UNIX_EPOCH);
                        let timestamp_sec = modified
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();

                        let is_pre_update = filename.contains("pre-update");
                        let reason = if is_pre_update {
                            "pre-update"
                        } else if filename.contains("pre-restore") {
                            "pre-restore"
                        } else if filename.contains("pre-erase") {
                            "pre-erase"
                        } else if filename.contains("manual") {
                            "manual"
                        } else {
                            "auto"
                        };

                        snapshots.push(VaultSnapshotInfo {
                            filename: filename.to_string(),
                            timestamp: timestamp_sec,
                            size_bytes: meta.len(),
                            is_pre_update,
                            reason: reason.to_string(),
                        });
                    }
                }
            }
        }
    }

    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(snapshots)
}

#[tauri::command]
fn restore_vault_snapshot(app: AppHandle, filename: String) -> Result<(), String> {
    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
        return Err("Invalid snapshot filename".to_string());
    }

    let backups_dir = get_backups_dir(&app)?;
    let target_snapshot = backups_dir.join(&filename);

    if !target_snapshot.exists() {
        return Err("Snapshot file not found".to_string());
    }

    let content = fs::read_to_string(&target_snapshot).map_err(|e| e.to_string())?;
    let payload: EncryptedVault = serde_json::from_str(&content)
        .map_err(|e| format!("Snapshot data is corrupted or invalid: {}", e))?;

    if payload.ciphertext.is_empty() || payload.salt.is_empty() || payload.iv.is_empty() {
        return Err("Snapshot is missing required cryptographic fields".to_string());
    }

    let vault_path = get_vault_path(&app)?;

    // Create a safety snapshot of the CURRENT vault before restoring
    if vault_path.exists() {
        let _ = create_snapshot_internal(&app, "pre-restore");
    }

    write_atomic(&vault_path, &content)?;

    Ok(())
}

#[tauri::command]
fn create_manual_snapshot(app: AppHandle, reason: Option<String>) -> Result<String, String> {
    let r = reason.unwrap_or_else(|| "manual".to_string());
    create_snapshot_internal(&app, &r)
}

#[tauri::command]
fn create_pre_update_snapshot(app: AppHandle, version: String) -> Result<String, String> {
    let reason = format!("pre-update-v{}", version);
    create_snapshot_internal(&app, &reason)
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct AppConfig {
    #[serde(rename = "workspaceName")]
    workspace_name: Option<String>,
    subtitle: Option<String>,
    #[serde(rename = "avatarBase64")]
    avatar_base64: Option<String>,
    #[serde(rename = "accentColor")]
    accent_color: Option<String>,
    theme: Option<String>,
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    migrate_legacy_data(&path);

    path.push("app-config.json");
    Ok(path)
}

#[tauri::command]
fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app)?;
    let data = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    write_atomic(&path, &data)?;
    Ok(())
}

#[tauri::command]
fn load_config(app: AppHandle) -> Result<Option<AppConfig>, String> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(Some(config))
}

fn get_ghost_vault_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;
    let ghost_dir = app_dir.join("ghost_vault");
    if !ghost_dir.exists() {
        fs::create_dir_all(&ghost_dir).map_err(|e| e.to_string())?;
    }
    Ok(ghost_dir)
}

#[tauri::command]
fn ghost_vault_exists(app: AppHandle) -> Result<bool, String> {
    let ghost_dir = get_ghost_vault_dir(&app)?;
    let index_file = ghost_dir.join("index.vault");
    Ok(index_file.exists())
}

#[tauri::command]
fn save_ghost_index(app: AppHandle, payload: EncryptedVault) -> Result<(), String> {
    let ghost_dir = get_ghost_vault_dir(&app)?;
    let index_file = ghost_dir.join("index.vault");
    let data = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    write_atomic(&index_file, &data)?;
    Ok(())
}

#[tauri::command]
fn load_ghost_index(app: AppHandle) -> Result<Option<EncryptedVault>, String> {
    let ghost_dir = get_ghost_vault_dir(&app)?;
    let index_file = ghost_dir.join("index.vault");
    if !index_file.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(index_file).map_err(|e| e.to_string())?;
    let payload: EncryptedVault = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(Some(payload))
}

#[tauri::command]
fn save_ghost_file(app: AppHandle, request: tauri::ipc::Request) -> Result<(), String> {
    let headers = request.headers();
    let id = headers
        .get("x-file-id")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| "Missing x-file-id header".to_string())?;

    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("Invalid file id".to_string());
    }

    let ghost_dir = get_ghost_vault_dir(&app)?;
    let file_path = ghost_dir.join(format!("{}.bin", id));

    let is_append = headers
        .get("x-append")
        .and_then(|v| v.to_str().ok())
        .map(|v| v == "1" || v == "true")
        .unwrap_or(false);

    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(data) => data.as_slice(),
        _ => return Err("Expected raw binary body".to_string()),
    };

    use std::fs::OpenOptions;
    use std::io::Write;

    if is_append {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(file_path)
            .map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())?;
    } else {
        fs::write(file_path, bytes).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn load_ghost_file(app: AppHandle, id: String) -> Result<tauri::ipc::Response, String> {
    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("Invalid file id".to_string());
    }
    let ghost_dir = get_ghost_vault_dir(&app)?;
    let file_path = ghost_dir.join(format!("{}.bin", id));
    if !file_path.exists() {
        return Err("Ghost file not found".to_string());
    }
    let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn delete_ghost_file(app: AppHandle, id: String) -> Result<(), String> {
    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("Invalid file id".to_string());
    }
    let ghost_dir = get_ghost_vault_dir(&app)?;
    let file_path = ghost_dir.join(format!("{}.bin", id));
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn wipe_ghost_vault(app: AppHandle) -> Result<(), String> {
    let ghost_dir = get_ghost_vault_dir(&app)?;
    if ghost_dir.exists() {
        fs::remove_dir_all(&ghost_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            save_vault,
            load_vault,
            delete_vault,
            save_config,
            load_config,
            list_vault_snapshots,
            restore_vault_snapshot,
            create_manual_snapshot,
            create_pre_update_snapshot,
            ghost_vault_exists,
            save_ghost_index,
            load_ghost_index,
            save_ghost_file,
            load_ghost_file,
            delete_ghost_file,
            wipe_ghost_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
