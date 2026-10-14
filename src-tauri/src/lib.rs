//! Desktop shell for Founder's Dilemma (macOS and Windows).
//!
//! The whole game runs in the web view; Rust only provides native file dialogs
//! (through the dialog plugin) and reads or writes the files the user picked:
//! game files, decision files and CSV exports.

use std::fs;
use std::path::Path;

/// Game, decision and export files are small; anything larger is not ours.
const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS: [&str; 3] = ["json", "csv", "txt"];

fn check_extension(path: &Path) -> Result<(), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();
    if ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        Ok(())
    } else {
        Err(format!("Unsupported file type: .{ext}"))
    }
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let path = Path::new(&path);
    check_extension(path)?;
    fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    check_extension(path)?;
    let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if size > MAX_FILE_BYTES {
        return Err("File too large".into());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_text_file, read_text_file])
        .run(tauri::generate_context!())
        .expect("error while running Founder's Dilemma");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_and_extension_check() {
        let dir = std::env::temp_dir();
        let file = dir.join("fd_test.fddecision.json");
        let path = file.to_string_lossy().to_string();
        write_text_file(path.clone(), "{\"ok\":true}".into()).unwrap();
        assert_eq!(read_text_file(path).unwrap(), "{\"ok\":true}");
        let _ = fs::remove_file(file);

        let bad = dir.join("fd_test.exe").to_string_lossy().to_string();
        assert!(write_text_file(bad, "x".into()).is_err());
    }
}
