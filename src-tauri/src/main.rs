// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        // Work around WebKitGTK DMA-BUF WebGL texture/framebuffer corruption on Linux hybrid GPUs
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    space_tactics_ui_lib::run()
}
