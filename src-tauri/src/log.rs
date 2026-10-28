// Local diagnostics (#246): one small text file in the app's log folder, never sent
// anywhere. Lines carry codes and source locations only: no names, rooms, window
// titles or tokens.
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::{Mutex, OnceLock},
    time::{SystemTime, UNIX_EPOCH},
};

const MAX_BYTES: u64 = 256 * 1024;
const MAX_LINE: usize = 400;
static FILE: OnceLock<PathBuf> = OnceLock::new();
static WRITING: Mutex<()> = Mutex::new(());

/// Opens `dir/vio.log` and records every panic before the default handler runs.
pub fn init(dir: PathBuf, version: &str) {
    if fs::create_dir_all(&dir).is_err() || FILE.set(dir.join("vio.log")).is_err() {
        return;
    }
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .copied()
            .or_else(|| info.payload().downcast_ref::<String>().map(String::as_str))
            .unwrap_or("?");
        let place = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_default();
        let thread = std::thread::current();
        write("panic", &format!("{} {place} {payload}", thread.name().unwrap_or("worker")));
        previous(info);
    }));
    write("start", version);
}

/// Appends one line; the file is rotated to `vio.old.log` past 256 KB.
pub fn write(kind: &str, message: &str) {
    let Some(path) = FILE.get() else { return };
    let _guard = WRITING.lock().unwrap_or_else(|e| e.into_inner());
    if fs::metadata(path).is_ok_and(|m| m.len() > MAX_BYTES) {
        let _ = fs::rename(path, path.with_file_name("vio.old.log"));
    }
    let seconds = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    let line: String = message.chars().filter(|c| !c.is_control()).take(MAX_LINE).collect();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{seconds} {kind} {line}");
    }
}
