use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct EncryptedVault {
    salt: String,
    iv: String,
    ciphertext: String,
}

fn get_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to get app data directory".to_string())?;

    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    path.push("data.vault");
    Ok(path)
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
    fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_vault(app: AppHandle) -> Result<EncryptedVault, String> {
    let path = get_vault_path(&app)?;
    if !path.exists() {
        return Err("Vault does not exist".to_string());
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let payload: EncryptedVault = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    Ok(payload)
}

#[tauri::command]
fn delete_vault(app: AppHandle) -> Result<(), String> {
    let path = get_vault_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
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

    path.push("app-config.json");
    Ok(path)
}

#[tauri::command]
fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_path(&app)?;
    let data = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            save_vault,
            load_vault,
            delete_vault,
            save_config,
            load_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
