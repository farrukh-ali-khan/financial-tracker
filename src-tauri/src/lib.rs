use tauri_plugin_log::{Target, TargetKind};

pub fn run() {
    tauri::Builder::default()
        // Structured logging: file + stdout in dev, file-only in release
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("financial-tracker".into()),
                    }),
                ])
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .build(),
        )
        // Desktop notifications
        .plugin(tauri_plugin_notification::init())
        // SQLite database (file path handled by frontend)
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
