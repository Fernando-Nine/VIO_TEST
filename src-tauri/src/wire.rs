pub const HEADER_SIZE: usize = 32;
pub const MAX_FRAMES: usize = 4800;

pub fn packet(state: u32, sequence: u32, dropped: u32, error: u32, pcm: &[f32]) -> Vec<u8> {
    assert!(pcm.len() <= MAX_FRAMES * 2 && pcm.len() % 2 == 0);
    let mut bytes = Vec::with_capacity(HEADER_SIZE + pcm.len() * 4);
    for value in [
        0x56494f41,
        1,
        state,
        sequence,
        dropped,
        (pcm.len() / 2) as u32,
        48000,
        error,
    ] {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    for value in pcm {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes
}

pub const THUMB_WIDTH: u32 = 320;
pub const THUMB_HEIGHT: u32 = 180;
const THUMB_HEADER: usize = 16;

/// The thumbnail box for a source: its aspect kept, never upscaled.
pub fn thumb_size(width: u32, height: u32) -> (u32, u32) {
    let (width, height) = (width.max(1), height.max(1));
    let scale = (THUMB_WIDTH as f64 / width as f64)
        .min(THUMB_HEIGHT as f64 / height as f64)
        .min(1.0);
    (((width as f64 * scale).round() as u32).max(1), ((height as f64 * scale).round() as u32).max(1))
}

/// `VIOT` + RGBA of an already small image, alpha kept (program icons, #247).
pub fn icon(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
    assert!(width <= THUMB_WIDTH && height <= THUMB_HEIGHT && rgba.len() == (width * height * 4) as usize);
    let mut bytes = Vec::with_capacity(THUMB_HEADER + rgba.len());
    for value in [0x56494f54u32, 1, width, height] {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    bytes.extend_from_slice(rgba);
    bytes
}

/// Fits a BGRA frame into the thumbnail box and returns `VIOT` + RGBA pixels.
/// Each output pixel averages up to 4×4 samples of its source cell.
pub fn thumbnail(bgra: &[u8], width: u32, height: u32, stride: u32) -> Vec<u8> {
    assert!(width > 0 && height > 0 && stride >= width * 4);
    assert!(bgra.len() >= (stride * (height - 1) + width * 4) as usize);
    let (w, h) = thumb_size(width, height);
    let mut bytes = Vec::with_capacity(THUMB_HEADER + (w * h * 4) as usize);
    for value in [0x56494f54u32, 1, w, h] {
        bytes.extend_from_slice(&value.to_le_bytes());
    }
    for y in 0..h {
        let (y0, y1) = (y * height / h, ((y + 1) * height / h).max(y * height / h + 1));
        for x in 0..w {
            let (x0, x1) = (x * width / w, ((x + 1) * width / w).max(x * width / w + 1));
            let (sx, sy) = ((x1 - x0).div_ceil(4), (y1 - y0).div_ceil(4));
            let mut sum = [0u32; 3];
            let mut count = 0u32;
            for py in (y0..y1).step_by(sy as usize) {
                for px in (x0..x1).step_by(sx as usize) {
                    let i = (py * stride + px * 4) as usize;
                    sum[0] += bgra[i + 2] as u32;
                    sum[1] += bgra[i + 1] as u32;
                    sum[2] += bgra[i] as u32;
                    count += 1;
                }
            }
            bytes.extend_from_slice(&[
                (sum[0] / count) as u8,
                (sum[1] / count) as u8,
                (sum[2] / count) as u8,
                255,
            ]);
        }
    }
    bytes
}

/// Shared video buffer (#192): a 64-byte header, then `VIDEO_SLOTS` NV12 slots.
/// Header u32 LE: `VIOV`, version, width, height, slots, slot size.
/// Each slot: u32 sequence before, u32 sequence after, u64 timestamp µs, then Y and UV
/// planes packed (no row padding). The page drops a frame whose two sequences differ.
pub const VIDEO_HEADER: usize = 64;
pub const VIDEO_SLOT_HEADER: usize = 16;
pub const VIDEO_SLOTS: u32 = 3;

pub fn nv12_size(width: u32, height: u32) -> usize {
    (width * height + width * height / 2) as usize
}

pub fn video_slot_size(width: u32, height: u32) -> usize {
    (VIDEO_SLOT_HEADER + nv12_size(width, height)).next_multiple_of(64)
}

pub fn video_header(width: u32, height: u32) -> [u8; 24] {
    let mut bytes = [0u8; 24];
    for (i, value) in [0x56494f56, 1, width, height, VIDEO_SLOTS, video_slot_size(width, height) as u32]
        .into_iter()
        .enumerate()
    {
        bytes[i * 4..i * 4 + 4].copy_from_slice(&value.to_le_bytes());
    }
    bytes
}

/// Largest even size with the source aspect that fits the requested box, never upscaled.
pub fn fit(width: u32, height: u32, max_width: u32, max_height: u32) -> (u32, u32) {
    let (width, height) = (width.max(2), height.max(2));
    let scale = (max_width as f64 / width as f64)
        .min(max_height as f64 / height as f64)
        .min(1.0);
    let even = |v: f64| ((v.round() as u32) & !1).max(2);
    (even(width as f64 * scale), even(height as f64 * scale))
}

/// CPU fallback when the GPU has no video processor (basic display driver, VMs):
/// BGRA → NV12 BT.709 studio range, letterboxed with the source aspect, nearest sample.
/// `dst` holds the packed Y plane then the UV plane (`nv12_size`).
pub fn bgra_to_nv12(src: &[u8], width: u32, height: u32, stride: u32, out_w: u32, out_h: u32, dst: &mut [u8]) {
    assert!(width > 0 && height > 0 && stride >= width * 4 && out_w % 2 == 0 && out_h % 2 == 0);
    assert!(src.len() >= (stride * (height - 1) + width * 4) as usize && dst.len() >= nv12_size(out_w, out_h));
    let scale = (out_w as f64 / width as f64).min(out_h as f64 / height as f64);
    let dw = (((width as f64 * scale).round() as u32) & !1).clamp(2, out_w);
    let dh = (((height as f64 * scale).round() as u32) & !1).clamp(2, out_h);
    let (dx, dy) = (((out_w - dw) / 2) & !1, ((out_h - dh) / 2) & !1);
    let (luma, chroma) = dst[..nv12_size(out_w, out_h)].split_at_mut((out_w * out_h) as usize);
    luma.fill(16);
    chroma.fill(128);
    let columns: Vec<usize> = (0..dw).map(|x| ((x * width / dw).min(width - 1) * 4) as usize).collect();
    for y in 0..dh {
        let row = ((y * height / dh).min(height - 1) * stride) as usize;
        let out = ((dy + y) * out_w + dx) as usize;
        for (x, &column) in columns.iter().enumerate() {
            let i = row + column;
            let (b, g, r) = (src[i] as i32, src[i + 1] as i32, src[i + 2] as i32);
            luma[out + x] = (16 + ((47 * r + 157 * g + 16 * b + 128) >> 8)) as u8;
            if y % 2 == 0 && x % 2 == 0 {
                let uv = (((dy + y) / 2) * out_w + dx) as usize + x;
                chroma[uv] = (128 + ((-26 * r - 86 * g + 112 * b + 128) >> 8)).clamp(16, 240) as u8;
                chroma[uv + 1] = (128 + ((112 * r - 102 * g - 10 * b + 128) >> 8)).clamp(16, 240) as u8;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cpu_nv12_is_studio_range_and_letterboxed() {
        // 4×2 white source into an 8×8 box: 8×4 picture, black bars above and below.
        let src = vec![255u8; 4 * 2 * 4];
        let mut dst = vec![0u8; nv12_size(8, 8)];
        bgra_to_nv12(&src, 4, 2, 16, 8, 8, &mut dst);
        assert_eq!(dst[0], 16, "bar is black");
        assert_eq!(dst[2 * 8], 235, "picture is white");
        assert_eq!(dst[6 * 8], 16);
        assert!(dst[64..].iter().all(|&c| c == 128), "grey has neutral chroma");
        // Pure blue: low luma, high Cb.
        let blue: Vec<u8> = [255u8, 0, 0, 255].repeat(4);
        let mut dst = vec![0u8; nv12_size(2, 2)];
        bgra_to_nv12(&blue, 2, 2, 8, 2, 2, &mut dst);
        assert_eq!(dst[0], 32);
        assert!(dst[4] > 230 && dst[5] < 130);
    }
    #[test]
    fn video_fits_even_without_upscaling() {
        assert_eq!(fit(2560, 1440, 1920, 1080), (1920, 1080));
        assert_eq!(fit(3440, 1440, 1920, 1080), (1920, 804));
        assert_eq!(fit(1280, 720, 1920, 1080), (1280, 720));
        assert_eq!(fit(801, 601, 1920, 1080), (800, 600));
        assert_eq!(fit(0, 0, 1920, 1080), (2, 2));
        assert_eq!(video_slot_size(1920, 1080) % 64, 0);
        assert!(video_slot_size(1920, 1080) >= 16 + 1920 * 1080 * 3 / 2);
        let header = video_header(1920, 1080);
        assert_eq!(&header[0..4], &0x56494f56u32.to_le_bytes());
        assert_eq!(&header[16..20], &3u32.to_le_bytes());
    }
    #[test]
    fn thumbnails_fit_the_box_and_swap_to_rgba() {
        // 1920×1080 BGRA with 64 bytes of row padding, pure blue-ish.
        let (width, height, stride) = (1920u32, 1080u32, 1920 * 4 + 64);
        let mut frame = vec![0u8; (stride * height) as usize];
        for row in frame.chunks_mut(stride as usize) {
            for pixel in row[..(width * 4) as usize].chunks_mut(4) {
                pixel.copy_from_slice(&[200, 100, 10, 0]);
            }
        }
        let bytes = thumbnail(&frame, width, height, stride);
        assert_eq!(&bytes[0..4], &0x56494f54u32.to_le_bytes());
        assert_eq!(&bytes[8..12], &320u32.to_le_bytes());
        assert_eq!(&bytes[12..16], &180u32.to_le_bytes());
        assert_eq!(bytes.len(), 16 + 320 * 180 * 4);
        assert_eq!(&bytes[16..20], &[10, 100, 200, 255]);
        // Tall windows keep their aspect; tiny ones are never upscaled.
        let tall = thumbnail(&vec![0; 600 * 1200 * 4], 600, 1200, 600 * 4);
        assert_eq!((&tall[8..12], &tall[12..16]), (&90u32.to_le_bytes()[..], &180u32.to_le_bytes()[..]));
        let tiny = thumbnail(&[1, 2, 3, 4], 1, 1, 4);
        assert_eq!(&tiny[16..], &[3, 2, 1, 255]);
    }
    #[test]
    fn pcm_packet_is_little_endian_stereo_with_bounded_header() {
        let bytes = packet(1, 7, 12, 0, &[0.5, -0.25]);
        assert_eq!(bytes.len(), 40);
        assert_eq!(&bytes[0..4], &0x56494f41u32.to_le_bytes());
        assert_eq!(&bytes[20..24], &1u32.to_le_bytes());
        assert_eq!(&bytes[32..36], &0.5f32.to_le_bytes());
        assert_eq!(&bytes[36..40], &(-0.25f32).to_le_bytes());
        assert_eq!(packet(3, 8, 0, 0x80004005, &[]).len(), HEADER_SIZE);
    }
    #[test]
    #[should_panic]
    fn oversize_packets_are_rejected() {
        packet(1, 0, 0, 0, &vec![0.0; MAX_FRAMES * 2 + 2]);
    }
}
